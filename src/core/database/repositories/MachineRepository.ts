// @ts-nocheck

/**
 * Machine Repository - Gestion des machines/devices IoT
 * Repository spécialisé pour les machines avec connexions BLE
 */

import { BaseRepository, type QueryOptions } from './BaseRepository'
import type {
  TrackBeeDatabase,
  DatabaseMachine
} from '@/core/database/schema'
import type { BleConnectionState } from '@/core/types/transport'
import { databaseLog } from '@/core/utils/logger'

/**
 * Repository spécialisé pour les machines (ID numérique)
 */
// @ts-expect-error - DatabaseMachine has createdAt as string but BaseEntity expects Date
export class MachineRepository extends BaseRepository<DatabaseMachine, number> {
  constructor(db: TrackBeeDatabase) {
    super(db, db.machines, 'machines', {
      cacheTimeout: 10
    })
  }

  // ==================== SPECIALIZED QUERIES ====================

  /** Trouve une machine par adresse MAC. */
  async findByMacAddress(macAddress: string): Promise<DatabaseMachine | null> {
    const timer = databaseLog.time('Find machine by MAC')

    try {
      const machine = await this.table
        .where('macAddress')
        .equals(macAddress)
        .first()

      timer.end({ success: true, found: Boolean(machine) })
      databaseLog.debug('Machine found by MAC', { macAddress, found: Boolean(machine) })

      if (machine) {
        this.setCacheItem(machine.id, machine)
      }

      return machine ?? null
    } catch (error) {
      timer.end({ error })
      databaseLog.error('Failed to find machine by MAC', { macAddress, error })
      return null
    }
  }

  /** Liste les machines d'un utilisateur avec pagination. */
  async findByUserId(userId: string, options: QueryOptions = {}): Promise<{
    data: DatabaseMachine[]
    total: number
    hasMore: boolean
  }> {
    const timer = databaseLog.time('Find machines by user')
    const { limit = 50, offset = 0 } = options

    try {
      const query = this.table.where('userId').equals(userId)
      const [data, total] = await Promise.all([
        query.offset(offset).limit(limit).toArray(),
        query.count()
      ])

      const hasMore = offset + limit < total

      if (this.options.enableCache) {
        data.forEach(machine => this.setCacheItem(machine.id, machine))
      }

      timer.end({ success: true, count: data.length, total })
      databaseLog.debug('Machines found by user', { userId, count: data.length, total })

      return { data, total, hasMore }
    } catch (error) {
      timer.end({ error })
      databaseLog.error('Failed to find machines by user', { userId, error })
      throw error
    }
  }

  /** Liste les machines favorites d'un utilisateur. */
  async findFavorites(userId: string): Promise<DatabaseMachine[]> {
    try {
      const machines = await this.table
        .where('userId')
        .equals(userId)
        .and(machine => Boolean(machine.isFavorite))
        .toArray()

      databaseLog.debug('Favorite machines retrieved', { userId, count: machines.length })
      return machines
    } catch (error) {
      databaseLog.error('Failed to find favorite machines', { userId, error })
      return []
    }
  }

  /** Machines récemment vues (dernières heures). */
  async findRecentlyActive(userId: string, hours = 24): Promise<DatabaseMachine[]> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setHours(cutoffDate.getHours() - hours)

      const machines = await this.table
        .where('userId')
        .equals(userId)
        .and(machine => {
          if (!machine.lastSeenAt) {
            return false
          }
          const lastSeen = new Date(machine.lastSeenAt)
          return lastSeen >= cutoffDate
        })
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

  /** Met à jour l'état de connexion BLE en base. */
  async updateConnectionState(machineId: number, connectionState: BleConnectionState): Promise<void> {
    const timer = databaseLog.time('Update connection state')

    try {
      const updates: Partial<DatabaseMachine> = {
        lastConnectionState: connectionState,
        lastSeenAt: connectionState.status === 'connected' ? new Date() : undefined
      }

      await this.table.update(machineId, updates)

      timer.end({ success: true, machineId, status: connectionState.status })
      databaseLog.debug('Machine connection state updated', {
        machineId,
        status: connectionState.status
      })

      const cached = this.getCacheItem(machineId)
      if (cached) {
        this.setCacheItem(machineId, { ...cached, ...updates })
      }
    } catch (error) {
      timer.end({ error })
      databaseLog.error('Failed to update connection state', { machineId, error })
      throw error
    }
  }

  /** Récupère l'état de connexion stocké. */
  async getConnectionState(machineId: number): Promise<BleConnectionState | null> {
    try {
      const machine = await this.findById(machineId)
      return machine?.lastConnectionState ?? null
    } catch (error) {
      databaseLog.error('Failed to get connection state', { machineId, error })
      return null
    }
  }

  /** Liste les machines filtrées par statut de connexion. */
  async findWithConnectionState(userId: string, status?: BleConnectionState['status']): Promise<DatabaseMachine[]> {
    try {
      let query = this.table.where('userId').equals(userId)

      if (status) {
        query = query.and(machine => machine.lastConnectionState?.status === status)
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

  /** Marque/démarque une machine comme favorite. */
  async toggleFavorite(machineId: number): Promise<boolean> {
    const timer = databaseLog.time('Toggle machine favorite')

    try {
      const machine = await this.table.get(machineId)
      if (!machine) {
        throw new Error()
      }

      const newFavoriteState = !machine.isFavorite
      await this.table.update(machineId, { isFavorite: newFavoriteState })

      timer.end({ success: true, machineId, isFavorite: newFavoriteState })
      databaseLog.debug('Machine favorite toggled', { machineId, isFavorite: newFavoriteState })

      this.setCacheItem(machineId, { ...machine, isFavorite: newFavoriteState })
      return newFavoriteState
    } catch (error) {
      timer.end({ error })
      databaseLog.error('Failed to toggle machine favorite', { machineId, error })
      throw error
    }
  }

  // ==================== BULK OPERATIONS ====================

  /** Importe les machines depuis le serveur et fusionne avec le local. */
  async importFromServer(
    userId: string,
    serverMachines: Array<Omit<DatabaseMachine, 'syncedAt' | 'lastSeenAt' | 'isFavorite'>>
  ): Promise<{ created: number; updated: number; errors: number }> {
    const timer = databaseLog.time('Import machines from server')
    let created = 0
    let updated = 0
    let errors = 0

    try {
      for (const serverMachine of serverMachines) {
        try {
          const existing = await this.table.get(serverMachine.id)

          if (existing) {
            await this.table.update(serverMachine.id, {
              ...serverMachine,
              isFavorite: existing.isFavorite,
              localNotes: existing.localNotes,
              lastSeenAt: existing.lastSeenAt ?? (serverMachine.updatedAt ? new Date(serverMachine.updatedAt) : undefined)
            } as Partial<DatabaseMachine>)
            updated += 1
          } else {
            await this.table.add({
              ...serverMachine,
              userId,
              syncedAt: new Date(),
              isFavorite: false
            } as DatabaseMachine)
            created += 1
          }

          await this.markAsSynced(serverMachine.id)
        } catch (error) {
          databaseLog.error('Failed to import machine', {
            machineId: serverMachine.id,
            error
          })
          errors += 1
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

  /** Supprime les machines anciennes et inactives. */
  async cleanupOldMachines(userId: string, olderThanDays = 90): Promise<number> {
    const timer = databaseLog.time('Cleanup old machines')

    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

      const machinesToDelete = await this.table
        .where('userId')
        .equals(userId)
        .and(machine => {
          if (!machine.lastSeenAt || machine.isFavorite || !machine.syncedAt) {
            return false
          }
          return new Date(machine.lastSeenAt) < cutoffDate
        })
        .toArray()

      let deletedCount = 0
      for (const machine of machinesToDelete) {
        const success = await this.delete(machine.id)
        if (success) {
          deletedCount += 1
        }
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

  /** Calcule diverses statistiques côté client. */
  async getMachineStats(userId: string): Promise<{
    total: number
    favorites: number
    recentlyActive: number
    connected: number
    unsynced: number
    byModel: Record<string, number>
  }> {
    try {
      const [total, favorites, unsynced, allMachines] = await Promise.all([
        this.table.where('userId').equals(userId).count(),
        this.table.where('userId').equals(userId).and(m => Boolean(m.isFavorite)).count(),
        this.table.where('userId').equals(userId).and(m => !m.syncedAt).count(),
        this.table.where('userId').equals(userId).toArray()
      ])

      const recentCutoff = new Date()
      recentCutoff.setHours(recentCutoff.getHours() - 24)

      const recentlyActive = allMachines.filter(machine => {
        if (!machine.lastSeenAt) {
          return false
        }
        return new Date(machine.lastSeenAt) >= recentCutoff
      }).length

      const connected = allMachines.filter(machine =>
        machine.lastConnectionState?.status === 'connected'
      ).length

      const byModel = allMachines.reduce<Record<string, number>>((accumulator, machine) => {
        const model = machine.model || 'Unknown'
        accumulator[model] = (accumulator[model] ?? 0) + 1
        return accumulator
      }, {})

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

  // ==================== SEARCH & CACHE ====================

  async search(query: string, limit = 50): Promise<DatabaseMachine[]> {
    try {
      const queryLower = query.toLowerCase()
      return await this.table
        .filter(machine =>
          machine.name.toLowerCase().includes(queryLower) ||
          machine.macAddress.toLowerCase().includes(queryLower) ||
          (machine.description?.toLowerCase().includes(queryLower) ?? false)
        )
        .limit(limit)
        .toArray()
    } catch (error) {
      databaseLog.error('Failed to search machines', { query, error })
      return []
    }
  }

  clearCache(): void {
    const clearedCount = this.cache.size
    super.clearCache()
    databaseLog.debug('Machine cache cleared', { clearedCount })
  }
}

export type MachineRepositoryType = MachineRepository

import { database } from '@/core/database/schema'
export const machineRepository = new MachineRepository(database)
// @ts-nocheck
