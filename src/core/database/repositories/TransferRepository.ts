/**
 * Transfer Repository - Gestion des transferts et queue offline
 * Repository spécialisé pour les tâches de transfert BLE/WiFi/Upload
 */

import { BaseRepository, type QueryOptions } from './BaseRepository'
import type {
  TrackBeeDatabase,
  DatabaseTransferTask,
  DatabaseFile
} from '@/core/database/schema'
import type { TransferProgress } from '@/core/types/transport'
import { databaseLog } from '@/core/utils/logger'

// ==================== TRANSFER REPOSITORY ====================

export class TransferRepository extends BaseRepository<DatabaseTransferTask> {
  constructor(db: TrackBeeDatabase) {
    super(db, db.transferTasks, 'transferTasks', {
      enableCache: true,
      cacheTimeout: 5, // 5 minutes pour les transferts
      enableSync: false // Les transferts ne se synchronisent pas
    })
  }

  // ==================== SPECIALIZED QUERIES ====================

  /**
   * Lister les tâches par statut
   */
  async findByStatus(
    status: DatabaseTransferTask['status'],
    options?: QueryOptions
  ): Promise<{
    data: DatabaseTransferTask[]
    total: number
    hasMore: boolean
  }> {
    const timer = databaseLog.time('Find transfers by status')
    const { limit = 50, offset = 0 } = options || {}

    try {
      const data = await this.table
        .where('status')
        .equals(status)
        .reverse()
        .offset(offset)
        .limit(limit)
        .toArray()

      const total = await this.table
        .where('status')
        .equals(status)
        .count()

      const hasMore = offset + limit < total

      timer.end({ success: true, status, count: data.length, total })
      databaseLog.debug('Transfers found by status', { status, count: data.length, total })

      return { data, total, hasMore }

    } catch (error) {
      timer.end({ error })
      databaseLog.error('Failed to find transfers by status', { status, error })
      throw error
    }
  }

  /**
   * Lister les tâches par machine
   */
  async findByMachine(
    machineId: string,
    options?: QueryOptions
  ): Promise<DatabaseTransferTask[]> {
    try {
      const transfers = await this.table
        .where('machineId')
        .equals(machineId)
        .reverse()
        .limit(options?.limit || 50)
        .toArray()

      databaseLog.debug('Transfers found by machine', { machineId, count: transfers.length })
      return transfers

    } catch (error) {
      databaseLog.error('Failed to find transfers by machine', { machineId, error })
      return []
    }
  }

  /**
   * Obtenir les tâches actives
   */
  async getActiveTasks(): Promise<DatabaseTransferTask[]> {
    try {
      const activeTasks = await this.table
        .where('status')
        .anyOf(['pending', 'running', 'paused'])
        .toArray()

      databaseLog.debug('Active transfers retrieved', { count: activeTasks.length })
      return activeTasks

    } catch (error) {
      databaseLog.error('Failed to get active transfers', { error })
      return []
    }
  }

  /**
   * Obtenir les tâches échouées à retenter
   */
  async getRetryableTasks(): Promise<DatabaseTransferTask[]> {
    try {
      const retryableTasks = await this.table
        .where('status')
        .equals('failed')
        .and(task => (task.retryCount || 0) < 3)
        .toArray()

      databaseLog.debug('Retryable transfers retrieved', { count: retryableTasks.length })
      return retryableTasks

    } catch (error) {
      databaseLog.error('Failed to get retryable transfers', { error })
      return []
    }
  }

  // ==================== PROGRESS TRACKING ====================

  /**
   * Mettre à jour le progrès d'une tâche
   */
  async updateProgress(
    taskId: string,
    progress: TransferProgress
  ): Promise<void> {
    try {
      await this.update(taskId, {
        progress,
        updatedAt: new Date()
      })

      databaseLog.trace('Transfer progress updated', {
        taskId,
        percentage: progress.percentage,
        speed: progress.speed
      })

    } catch (error) {
      databaseLog.error('Failed to update transfer progress', { taskId, error })
    }
  }

  /**
   * Marquer une tâche comme terminée
   */
  async markAsCompleted(
    taskId: string,
    result?: {
      filesTransferred: number
      totalSize: number
      duration: number
    }
  ): Promise<void> {
    const timer = databaseLog.time('Mark transfer completed')

    try {
      const task = await this.findById(taskId)
      if (!task) {
        throw new Error(`Transfer task ${taskId} not found`)
      }

      const updates: Partial<DatabaseTransferTask> = {
        status: 'completed',
        endTime: new Date(),
        progress: {
          transferred: result?.totalSize || 0,
          total: result?.totalSize || 0,
          percentage: 100,
          speed: 0,
          estimatedTimeRemaining: 0
        }
      }

      if (task.files) {
        updates.files = task.files.map(file => ({
          ...file,
          transferred: true
        }))
      }

      await this.update(taskId, updates)

      timer.end({ success: true, taskId })
      databaseLog.info('Transfer marked as completed', { taskId, result })

    } catch (error) {
      timer.end({ error })
      databaseLog.error('Failed to mark transfer as completed', { taskId, error })
      throw error
    }
  }

  /**
   * Marquer une tâche comme échouée
   */
  async markAsFailed(
    taskId: string,
    error: string,
    retryable: boolean = true
  ): Promise<void> {
    const timer = databaseLog.time('Mark transfer failed')

    try {
      const task = await this.findById(taskId)
      if (!task) {
        throw new Error(`Transfer task ${taskId} not found`)
      }

      const retryCount = (task.retryCount || 0) + (retryable ? 1 : 0)

      const updates: Partial<DatabaseTransferTask> = {
        status: 'failed',
        endTime: new Date(),
        failureReason: error,
        retryCount
      }

      if (retryable) {
        updates.lastRetryAt = new Date()
      } else if (task.lastRetryAt !== undefined) {
        updates.lastRetryAt = task.lastRetryAt
      }

      await this.update(taskId, updates)

      timer.end({ success: true, taskId, retryCount })
      databaseLog.warn('Transfer marked as failed', { taskId, error, retryCount })

    } catch (updateError) {
      timer.end({ error: updateError })
      databaseLog.error('Failed to mark transfer as failed', { taskId, error: updateError })
      throw updateError
    }
  }

  // ==================== RETRY MANAGEMENT ====================

  /**
   * Retenter une tâche échouée
   */
  async retryTask(taskId: string): Promise<void> {
    const timer = databaseLog.time('Retry transfer task')

    try {
      const task = await this.findById(taskId)
      if (!task) {
        throw new Error(`Transfer task ${taskId} not found`)
      }

      if (task.status !== 'failed') {
        throw new Error(`Cannot retry task with status: ${task.status}`)
      }

      const updates: Partial<DatabaseTransferTask> = {
        status: 'pending',
        progress: {
          transferred: 0,
          total: task.progress?.total || 0,
          percentage: 0,
          speed: 0,
          estimatedTimeRemaining: 0
        }
      }

      // Supprimer les champs d'échec
      await this.update(taskId, updates)

      timer.end({ success: true, taskId })
      databaseLog.info('Transfer task retried', { taskId })

    } catch (error) {
      timer.end({ error })
      databaseLog.error('Failed to retry transfer task', { taskId, error })
      throw error
    }
  }

  /**
   * Retenter toutes les tâches échouées
   */
  async retryAllFailed(): Promise<number> {
    const timer = databaseLog.time('Retry all failed transfers')

    try {
      const retryableTasks = await this.getRetryableTasks()
      let retriedCount = 0

      for (const task of retryableTasks) {
        try {
          await this.retryTask(task.id)
          retriedCount++
        } catch (error) {
          databaseLog.error('Failed to retry individual task', { taskId: task.id, error })
        }
      }

      timer.end({ success: true, retriedCount })
      databaseLog.info('All failed transfers retried', { retriedCount })

      return retriedCount

    } catch (error) {
      timer.end({ error })
      databaseLog.error('Failed to retry all failed transfers', { error })
      return 0
    }
  }

  // ==================== CLEANUP ====================

  /**
   * Nettoyer les anciennes tâches terminées
   */
  async cleanupCompletedTasks(olderThanDays: number = 7): Promise<number> {
    const timer = databaseLog.time('Cleanup completed transfers')

    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

      const tasksToDelete = await this.table
        .where('status')
        .anyOf(['completed', 'cancelled'])
        .and(task => task.endTime !== undefined && task.endTime < cutoffDate)
        .toArray()

      let deletedCount = 0
      for (const task of tasksToDelete) {
        const success = await this.delete(task.id)
        if (success) deletedCount++
      }

      timer.end({ success: true, deletedCount })
      databaseLog.info('Completed transfers cleanup completed', { deletedCount })

      return deletedCount

    } catch (error) {
      timer.end({ error })
      databaseLog.error('Failed to cleanup completed transfers', { error })
      return 0
    }
  }

  /**
   * Supprimer les tâches définitivement échouées
   */
  async cleanupFailedTasks(maxRetries: number = 3): Promise<number> {
    const timer = databaseLog.time('Cleanup failed transfers')

    try {
      const tasksToDelete = await this.table
        .where('status')
        .equals('failed')
        .and(task => (task.retryCount || 0) >= maxRetries)
        .toArray()

      let deletedCount = 0
      for (const task of tasksToDelete) {
        const success = await this.delete(task.id)
        if (success) deletedCount++
      }

      timer.end({ success: true, deletedCount })
      databaseLog.info('Failed transfers cleanup completed', { deletedCount })

      return deletedCount

    } catch (error) {
      timer.end({ error })
      databaseLog.error('Failed to cleanup failed transfers', { error })
      return 0
    }
  }

  // ==================== STATISTICS ====================

  /**
   * Obtenir les statistiques des transferts
   */
  async getTransferStats(): Promise<{
    total: number
    byStatus: Record<string, number>
    averageSpeed: number
    successRate: number
    totalDataTransferred: number
    activeCount: number
  }> {
    try {
      const [total, allTasks] = await Promise.all([
        this.table.count(),
        this.table.toArray()
      ])

      // Grouper par statut
      const byStatus: Record<string, number> = {}
      let totalSpeed = 0
      let speedCount = 0
      let totalDataTransferred = 0
      let completedCount = 0

      allTasks.forEach(task => {
        // Compter par statut
        byStatus[task.status] = (byStatus[task.status] || 0) + 1

        // Calculer vitesse moyenne
        if (task.progress?.speed && task.progress.speed > 0) {
          totalSpeed += task.progress.speed
          speedCount++
        }

        // Calculer données totales transférées
        if (task.status === 'completed' && task.progress?.transferred) {
          totalDataTransferred += task.progress.transferred
          completedCount++
        }
      })

      const averageSpeed = speedCount > 0 ? totalSpeed / speedCount : 0
      const successRate = total > 0 ? (completedCount / total) * 100 : 0
      const activeCount = (byStatus['pending'] || 0) + (byStatus['running'] || 0)

      const stats = {
        total,
        byStatus,
        averageSpeed,
        successRate,
        totalDataTransferred,
        activeCount
      }

      databaseLog.debug('Transfer stats calculated', stats)
      return stats

    } catch (error) {
      databaseLog.error('Failed to get transfer stats', { error })
      throw error
    }
  }

  /**
   * Obtenir les statistiques par machine
   */
  async getStatsByMachine(machineId: string): Promise<{
    total: number
    completed: number
    failed: number
    totalDataTransferred: number
    averageSpeed: number
    successRate: number
  }> {
    try {
      const tasks = await this.findByMachine(machineId)

      const total = tasks.length
      const completed = tasks.filter(t => t.status === 'completed').length
      const failed = tasks.filter(t => t.status === 'failed').length

      let totalDataTransferred = 0
      let totalSpeed = 0
      let speedCount = 0

      tasks.forEach(task => {
        if (task.status === 'completed' && task.progress?.transferred) {
          totalDataTransferred += task.progress.transferred
        }

        if (task.progress?.speed && task.progress.speed > 0) {
          totalSpeed += task.progress.speed
          speedCount++
        }
      })

      const averageSpeed = speedCount > 0 ? totalSpeed / speedCount : 0
      const successRate = total > 0 ? (completed / total) * 100 : 0

      const stats = {
        total,
        completed,
        failed,
        totalDataTransferred,
        averageSpeed,
        successRate
      }

      databaseLog.debug('Transfer stats by machine calculated', { machineId, stats })
      return stats

    } catch (error) {
      databaseLog.error('Failed to get transfer stats by machine', { machineId, error })
      throw error
    }
  }
}

// ==================== FILE REPOSITORY ====================

export class FileRepository extends BaseRepository<DatabaseFile> {
  constructor(db: TrackBeeDatabase) {
    super(db, db.files, 'files', {
      enableCache: true,
      cacheTimeout: 15, // 15 minutes pour les fichiers
      enableSync: true
    })
  }

  /**
   * Trouver les fichiers par campagne
   */
  async findByCampaign(campaignId: string): Promise<DatabaseFile[]> {
    try {
      const files = await this.table
        .where('campaignId')
        .equals(campaignId)
        .toArray()

      databaseLog.debug('Files found by campaign', { campaignId, count: files.length })
      return files

    } catch (error) {
      databaseLog.error('Failed to find files by campaign', { campaignId, error })
      return []
    }
  }

  /**
   * Trouver les fichiers disponibles offline
   */
  async findAvailableOffline(): Promise<DatabaseFile[]> {
    try {
      const files = await this.table
        .filter(file => file.isAvailableOffline === true)
        .toArray()

      databaseLog.debug('Offline files retrieved', { count: files.length })
      return files

    } catch (error) {
      databaseLog.error('Failed to find offline files', { error })
      return []
    }
  }

  /**
   * Marquer un fichier comme disponible offline
   */
  async markAsOfflineAvailable(
    fileId: string,
    localPath: string,
    localSize: number
  ): Promise<void> {
    try {
      await this.update(fileId, {
        isAvailableOffline: true,
        localPath,
        localSize
      })

      databaseLog.debug('File marked as offline available', { fileId, localPath })

    } catch (error) {
      databaseLog.error('Failed to mark file as offline available', { fileId, error })
    }
  }
}

// ==================== EXPORTS ====================

import { database } from '@/core/database/schema'

export const transferRepository = new TransferRepository(database)
export const fileRepository = new FileRepository(database)
