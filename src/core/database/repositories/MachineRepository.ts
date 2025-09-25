/**
 * Machine Repository - Gestion des machines/devices IoT
 * Repository spécialisé pour les machines avec connexions BLE
 */

import type { QueryOptions } from './BaseRepository'
import type {
  TrackBeeDatabase,
  DatabaseMachine
} from '@/core/database/schema'
import type { BleConnectionState } from '@/core/types/transport'
import { databaseLog } from '@/core/utils/logger'

// ==================== MACHINE REPOSITORY ====================

// Repository spécialisé pour les machines avec ID numérique
class BaseMachineRepository {
  protected table: any
  protected db: TrackBeeDatabase
  protected tableName: string
  protected cache = new Map<number, { data: DatabaseMachine; timestamp: Date }>()

  protected options = {
    enableCache: true,
    cacheTimeout: 10, // 10 minutes
    enableSync: true
  }

  constructor(db: TrackBeeDatabase) {
    this.db = db
    this.table = db.machines
    this.tableName = 'machines'

    databaseLog.debug(`Machine repository initialized`, {
      enableCache: this.options.enableCache,
      enableSync: this.options.enableSync
    })
  }

  // ==================== BASE OPERATIONS ====================

  /**
   * Trouver une machine par ID
   */
  async findById(id: number): Promise<DatabaseMachine | null> {
    try {
      const machine = await this.table.get(id)
      return machine || null
    } catch (error) {
      databaseLog.error('Failed to find machine by ID', { id, error })
      return null
    }
  }

  /**
   * Supprimer une machine
   */
  async delete(id: number): Promise<boolean> {
    try {
      await this.table.delete(id)
      this.cache.delete(id)
      return true
    } catch (error) {
      databaseLog.error('Failed to delete machine', { id, error })
      return false
    }
  }

  /**
   * Marquer comme synchronisé
   */
  async markAsSynced(id: number): Promise<void> {
    try {
      await this.table.update(id, { syncedAt: new Date() })
    } catch (error) {
      databaseLog.error('Failed to mark machine as synced', { id, error })
    }
  }

  // ==================== SPECIALIZED QUERIES ====================

  /**
   * Trouver une machine par adresse MAC
   */
  async findByMacAddress(macAddress: string): Promise<DatabaseMachine | null> {
    const timer = databaseLog.time('Find machine by MAC')

    try {
      const machine = await this.table
        .where('macAddress')
        .equals(macAddress)
        .first()

      timer.end({ success: true, found: !!machine })
      databaseLog.debug('Machine found by MAC', { macAddress, found: !!machine })

      return machine || null

    } catch (error) {
      timer.end({ error })
      databaseLog.error('Failed to find machine by MAC', { macAddress, error })
      return null
    }
  }

  /**
   * Lister les machines par utilisateur
   */
  async findByUserId(userId: string, options?: QueryOptions): Promise<{
    data: DatabaseMachine[]
    total: number
    hasMore: boolean
  }> {
    const timer = databaseLog.time('Find machines by user')
    const { limit = 50, offset = 0 } = options || {}

    try {
      const data = await this.table
        .where('userId')
        .equals(userId)
        .offset(offset)
        .limit(limit)
        .toArray()

      const total = await this.table
        .where('userId')
        .equals(userId)
        .count()

      const hasMore = offset + limit < total

      timer.end({ success: true, count: data.length, total })
      databaseLog.debug('Machines found by user', { userId, count: data.length, total })

      return { data, total, hasMore }

    } catch (error) {
      timer.end({ error })
      databaseLog.error('Failed to find machines by user', { userId, error })
      throw error
    }
  }

  /**
   * Lister les machines favorites
   */
  async findFavorites(userId: string): Promise<DatabaseMachine[]> {
    try {
      const machines = await this.table
        .where('userId')
        .equals(userId)
        .and((machine: DatabaseMachine) => !!machine.isFavorite)
        .toArray()

      databaseLog.debug('Favorite machines retrieved', { userId, count: machines.length })
      return machines

    } catch (error) {
      databaseLog.error('Failed to find favorite machines', { userId, error })
      return []
    }
  }

  /**
   * Lister les machines récemment vues
   */
  async findRecentlyActive(
    userId: string,
    hours: number = 24
  ): Promise<DatabaseMachine[]> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setHours(cutoffDate.getHours() - hours)

      const machines = await this.table
        .where('userId')
        .equals(userId)
        .and((machine: DatabaseMachine) => machine.lastSeenAt && new Date(machine.lastSeenAt) >= cutoffDate)
        .reverse()
        .sortBy('lastSeenAt')

      databaseLog.debug('Recently active machines retrieved', {
        userId,
        hours,
        count: machines.length
      })

      return machines

    } catch (error) {
      databaseLog.error('Failed to find recently active machines', { userId, hours, error })
      return []
    }
  }

  // ==================== CONNECTION STATE ====================

  /**
   * Mettre à jour l'état de connexion BLE
   */
  async updateConnectionState(
    machineId: number,
    connectionState: BleConnectionState
  ): Promise<void> {
    const timer = databaseLog.time('Update connection state')

    try {
      const updates: Partial<DatabaseMachine> = {
        lastConnectionState: connectionState,
        lastSeenAt: new Date()
      }

      // Si connecté, mettre à jour la date de dernière vue
      if (connectionState.status === 'connected') {
        updates.lastSeenAt = new Date()
      }

      await this.table.update(machineId, updates as Partial<DatabaseMachine>)

      timer.end({ success: true, machineId, status: connectionState.status })
      databaseLog.debug('Machine connection state updated', {
        machineId,
        status: connectionState.status
      })

    } catch (error) {
      timer.end({ error })
      databaseLog.error('Failed to update connection state', { machineId, error })
      throw error
    }
  }

  /**
   * Obtenir l'état de connexion stocké
   */
  async getConnectionState(machineId: number): Promise<BleConnectionState | null> {
    try {
      const machine = await this.table.get(machineId)
      return machine?.lastConnectionState || null

    } catch (error) {
      databaseLog.error('Failed to get connection state', { machineId, error })
      return null
    }
  }

  /**
   * Lister les machines avec état de connexion
   */
  async findWithConnectionState(
    userId: string,
    status?: BleConnectionState['status']
  ): Promise<DatabaseMachine[]> {
    try {
      let query = this.table.where('userId').equals(userId)

      if (status) {
        query = query.and((machine: DatabaseMachine) =>
          machine.lastConnectionState?.status === status
        )
      }

      const machines = await query.toArray()

      databaseLog.debug('Machines with connection state retrieved', {
        userId,
        status,
        count: machines.length
      })

      return machines

    } catch (error) {
      databaseLog.error('Failed to find machines with connection state', {
        userId,
        status,
        error
      })
      return []
    }
  }

  // ==================== FAVORITES MANAGEMENT ====================

  /**
   * Marquer/démarquer comme favori
   */
  async toggleFavorite(machineId: number): Promise<boolean> {
    const timer = databaseLog.time('Toggle machine favorite')

    try {
      const machine = await this.table.get(machineId)
      if (!machine) {
        throw new Error(`Machine ${machineId} not found`)
      }

      const newFavoriteState = !machine.isFavorite
      await this.table.update(machineId, { isFavorite: newFavoriteState })

      timer.end({ success: true, machineId, isFavorite: newFavoriteState })
      databaseLog.debug('Machine favorite toggled', { machineId, isFavorite: newFavoriteState })

      return newFavoriteState

    } catch (error) {
      timer.end({ error })
      databaseLog.error('Failed to toggle machine favorite', { machineId, error })
      throw error
    }
  }

  // ==================== BULK OPERATIONS ====================

  /**
   * Importer des machines depuis le serveur
   */
  async importFromServer(
    userId: string,
    serverMachines: Array<Omit<DatabaseMachine, 'syncedAt' | 'lastSeenAt' | 'isFavorite'>>
  ): Promise<{
    created: number
    updated: number
    errors: number
  }> {
    const timer = databaseLog.time('Import machines from server')
    let created = 0
    let updated = 0
    let errors = 0

    try {
      for (const serverMachine of serverMachines) {
        try {
          const existing = await this.table.get(serverMachine.id)

          if (existing) {
            // Mettre à jour en gardant les données locales
            await this.table.update(serverMachine.id, {
              ...serverMachine,
              // Garder les préférences locales
              isFavorite: existing.isFavorite,
              localNotes: existing.localNotes,
              lastSeenAt: existing.lastSeenAt || serverMachine.updatedAt
            })
            updated++
          } else {
            // Créer nouveau - s'assurer que l'userId est correct
            await this.table.add({
              ...serverMachine,
              userId, // Associer à l'utilisateur
              syncedAt: new Date(),
              isFavorite: false
            })
            created++
          }

          // Marquer comme synchronisé
          await this.markAsSynced(serverMachine.id)

        } catch (error) {
          databaseLog.error('Failed to import machine', {
            machineId: serverMachine.id,
            error
          })
          errors++
        }
      }

      timer.end({ success: true, created, updated, errors })
      databaseLog.info('Machines import completed', { created, updated, errors })

      return { created, updated, errors }

    } catch (error) {
      timer.end({ error })
      databaseLog.error('Failed to import machines', { error })
      throw error
    }
  }

  /**
   * Nettoyer les anciennes machines
   */
  async cleanupOldMachines(
    userId: string,
    olderThanDays: number = 90
  ): Promise<number> {
    const timer = databaseLog.time('Cleanup old machines')

    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

      const machinesToDelete = await this.table
        .where('userId')
        .equals(userId)
        .and((machine: DatabaseMachine) =>
          // Supprimer si pas vue depuis longtemps ET pas favorite ET synchronisée
          machine.lastSeenAt &&
          new Date(machine.lastSeenAt) < cutoffDate &&
          !machine.isFavorite &&
          machine.syncedAt
        )
        .toArray()

      let deletedCount = 0
      for (const machine of machinesToDelete) {
        const success = await this.delete(machine.id)
        if (success) deletedCount++
      }

      timer.end({ success: true, deletedCount })
      databaseLog.info('Old machines cleanup completed', { deletedCount })

      return deletedCount

    } catch (error) {
      timer.end({ error })
      databaseLog.error('Failed to cleanup old machines', { error })
      return 0
    }
  }

  // ==================== STATISTICS ====================

  /**
   * Obtenir les statistiques des machines
   */
  async getMachineStats(userId: string): Promise<{
    total: number
    favorites: number
    recentlyActive: number
    connected: number
    unsynced: number
    byModel: Record<string, number>
  }> {
    try {
      const [
        total,
        favorites,
        unsynced,
        allMachines
      ] = await Promise.all([
        this.table.where('userId').equals(userId).count(),
        this.table.where('userId').equals(userId).and((m: DatabaseMachine) => !!m.isFavorite).count(),
        this.table.where('userId').equals(userId).and((m: DatabaseMachine) => !m.syncedAt).count(),
        this.table.where('userId').equals(userId).toArray()
      ])

      // Calculer les stats dérivées
      const recentCutoff = new Date()
      recentCutoff.setHours(recentCutoff.getHours() - 24)

      const recentlyActive = allMachines.filter((m: DatabaseMachine) =>
        m.lastSeenAt && new Date(m.lastSeenAt) >= recentCutoff
      ).length

      const connected = allMachines.filter((m: DatabaseMachine) =>
        m.lastConnectionState?.status === 'connected'
      ).length

      // Grouper par modèle
      const byModel: Record<string, number> = {}
      allMachines.forEach((machine: DatabaseMachine) => {
        const model = machine.model || 'Unknown'
        byModel[model] = (byModel[model] || 0) + 1
      })

      const stats = {
        total,
        favorites,
        recentlyActive,
        connected,
        unsynced,
        byModel
      }

      databaseLog.debug('Machine stats calculated', { userId, stats })
      return stats

    } catch (error) {
      databaseLog.error('Failed to get machine stats', { userId, error })
      throw error
    }
  }
}

// ==================== EXPORT ====================

export class MachineRepository extends BaseMachineRepository {
  // Méthode de recherche simple
  async search(query: string, limit: number = 50): Promise<DatabaseMachine[]> {
    try {
      const queryLower = query.toLowerCase()
      return await this.table
        .filter((machine: DatabaseMachine) =>
          machine.name.toLowerCase().includes(queryLower) ||
          machine.macAddress.toLowerCase().includes(queryLower) ||
          (machine.description && machine.description.toLowerCase().includes(queryLower))
        )
        .limit(limit)
        .toArray()
    } catch (error) {
      databaseLog.error('Failed to search machines', { query, error })
      return []
    }
  }

  // Vider le cache
  clearCache(): void {
    const size = this.cache.size
    this.cache.clear()
    databaseLog.debug('Machine cache cleared', { clearedCount: size })
  }
}

export type MachineRepositoryType = MachineRepository

// Instance pour usage
import { database } from '@/core/database/schema'
export const machineRepository = new MachineRepository(database)