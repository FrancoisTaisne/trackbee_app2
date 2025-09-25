/**
 * Database Schema - Schémas Dexie pour stockage offline
 * Structure de base de données locale avec IndexedDB
 */

import Dexie, { type Table } from 'dexie'
import type {
  User,
  Machine,
  Site,
  Installation,
  Campaign,
  Calculation,
  FileMeta
} from '@/core/types/domain'
import type {
  TransferTask,
  BleConnectionState
} from '@/core/types/transport'
import { databaseLog } from '@/core/utils/logger'

// ==================== DATABASE TABLES ====================

export interface DatabaseUser extends User {
  // Ajout de champs spécifiques à la DB locale
  lastLoginAt?: Date
  syncedAt?: Date
}

export interface DatabaseMachine extends Machine {
  // Informations de synchronisation
  syncedAt?: Date
  lastSeenAt?: Date

  // État de connexion BLE persisté
  lastConnectionState?: BleConnectionState

  // Métadonnées locales
  localNotes?: string
  isFavorite?: boolean
}

export interface DatabaseSite extends Site {
  // Synchronisation
  syncedAt?: Date

  // Cache local
  installationCount?: number
  lastActivity?: Date

  // Métadonnées
  localNotes?: string
  tags?: string[]
}

export interface DatabaseInstallation extends Installation {
  // Synchronisation
  syncedAt?: Date

  // Données dérivées
  machineInfo?: {
    name: string
    macAddress: string
    model?: string
  }
  siteInfo?: {
    name: string
    location?: { lat: number; lng: number }
  }

  // État local
  isActive?: boolean
  lastActivity?: Date
}

export interface DatabaseCampaign extends Omit<Campaign, 'priority'> {
  // Synchronisation
  syncedAt?: Date

  // État de progression
  filesCollected?: number
  lastFileAt?: Date

  // Calculs associés
  calculationIds?: string[]

  // État local
  isMonitoring?: boolean
  priority?: number // PUSH FINAL: Aligné sur Campaign.priority (number)
}

export interface DatabaseCalculation extends Calculation {
  // Synchronisation
  syncedAt?: Date

  // Fichiers de résultats en local
  localResultFiles?: Array<{
    filename: string
    path: string
    size: number
    type: string
  }>

  // Métadonnées de traitement
  processingDuration?: number
  retryCount?: number
  lastRetryAt?: Date
}

export interface DatabaseFile extends Omit<FileMeta, 'campaignId'> {
  id: string  // Ajouter l'ID requis par BaseEntity
  // État de synchronisation
  syncedAt?: Date
  uploadedAt?: Date

  // Stockage local
  localPath?: string
  localSize?: number
  isAvailableOffline?: boolean

  // Métadonnées
  checksumMD5?: string
  compressionRatio?: number
  source: 'ble' | 'wifi' | 'upload' | 'download'

  // Relations - override types from FileMeta pour être cohérent avec la DB
  campaignId?: string    // Override: FileMeta a number, mais DB utilise string
  calculationId?: string
  machineId?: string
}

// Tables système pour la gestion offline
export interface DatabaseTransferTask extends TransferTask {
  // Persistence de l'état de transfert
  syncedAt?: Date
  localFiles?: string[] // Paths vers fichiers locaux

  // Retry et resilience
  retryCount?: number
  lastRetryAt?: Date
  failureReason?: string
}

export interface DatabaseSyncLog {
  id: string
  table: string
  operation: 'create' | 'update' | 'delete' | 'sync'
  recordId: string
  timestamp: Date
  success: boolean
  error?: string

  // Détails de synchronisation
  localVersion?: number
  serverVersion?: number
  conflictResolution?: 'server' | 'local' | 'merge'
}

export interface DatabaseSystemEvent {
  id: string

  // Propriétés de SystemEvent
  type: string
  data: Record<string, any>

  // Propriétés spécifiques à la DB
  persisted: boolean
  processed: boolean
  retryCount?: number

  // Métadonnées temporelles
  createdAt: Date
  updatedAt?: Date
}

export interface DatabaseAppState {
  key: string
  value: any
  updatedAt: Date
  expiresAt?: Date

  // Métadonnées
  version: number
  checksum?: string
}

// ==================== DATABASE CLASS ====================

export class TrackBeeDatabase extends Dexie {
  // Tables principales
  users!: Table<DatabaseUser, string>
  machines!: Table<DatabaseMachine, string>
  sites!: Table<DatabaseSite, string>
  installations!: Table<DatabaseInstallation, string>
  campaigns!: Table<DatabaseCampaign, string>
  calculations!: Table<DatabaseCalculation, string>
  files!: Table<DatabaseFile, string>

  // Tables système
  transferTasks!: Table<DatabaseTransferTask, string>
  syncLogs!: Table<DatabaseSyncLog, string>
  systemEvents!: Table<DatabaseSystemEvent, string>
  appState!: Table<DatabaseAppState, string>

  constructor() {
    super('TrackBeeDB')

    this.version(1).stores({
      // Tables principales avec index optimisés
      users: '&id, email, syncedAt',

      machines: '&id, macAddress, name, userId, syncedAt, lastSeenAt, isFavorite',

      sites: '&id, name, userId, syncedAt, lastActivity, *tags',

      installations: '&id, machineId, siteId, userId, syncedAt, isActive, lastActivity',

      campaigns: '&id, installationId, type, status, syncedAt, isMonitoring, priority, lastFileAt',

      calculations: '&id, campaignId, status, syncedAt, retryCount',

      files: '&id, filename, campaignId, calculationId, machineId, syncedAt, uploadedAt, source, isAvailableOffline',

      // Tables système
      transferTasks: '&id, machineId, status, syncedAt, retryCount',

      syncLogs: '&id, table, operation, recordId, timestamp, success',

      systemEvents: '&id, type, timestamp, persisted, processed',

      appState: '&key, updatedAt, expiresAt, version'
    })

    // Hooks de synchronisation et logging
    this.setupHooks()

    databaseLog.info('TrackBeeDatabase initialized', {
      version: this.verno,
      tables: Object.keys(this._allTables).length
    })
  }

  // ==================== HOOKS & LIFECYCLE ====================

  private setupHooks() {
    // TODO: Implémenter les hooks Dexie v4+ au niveau des repositories
    // Note: this.hook n'existe plus dans Dexie v4, remplacé par les événements de table

    databaseLog.debug('Database hooks setup completed (using repository-level logic)')

    // Les timestamps et la sync logic sont maintenant gérés dans les BaseRepository methods:
    // - create() ajoute createdAt et updatedAt
    // - update() met à jour updatedAt et supprime syncedAt
    // - delete() appelle logSyncOperation

    // Hook de ready pour initialisation
    this.on('ready', () => {
      databaseLog.info('Database ready', {
        isOpen: this.isOpen(),
        name: this.name,
        version: this.verno
      })
    })
  }

  // ==================== SYNC OPERATIONS ====================

  /**
   * Logger une opération de synchronisation
   */
  async logSyncOperation(
    table: string,
    operation: 'create' | 'update' | 'delete' | 'sync',
    recordId: string,
    success: boolean,
    error?: string
  ): Promise<void> {
    try {
      const logEntry: DatabaseSyncLog = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        table,
        operation,
        recordId,
        timestamp: new Date(),
        success
      }

      if (error !== undefined) {
        logEntry.error = error
      }

      await this.syncLogs.add(logEntry)
    } catch (logError) {
      databaseLog.error('Failed to log sync operation', { logError })
    }
  }

  /**
   * Marquer un enregistrement comme synchronisé
   */
  async markAsSynced(table: string, id: string): Promise<void> {
    try {
      const tableObj = this.table(table)
      await tableObj.update(id, { syncedAt: new Date() })

      databaseLog.debug('Record marked as synced', { table, id })
    } catch (error) {
      databaseLog.error('Failed to mark as synced', { table, id, error })
    }
  }

  /**
   * Obtenir les enregistrements non synchronisés
   */
  async getUnsyncedRecords(table: string): Promise<any[]> {
    try {
      const tableObj = this.table(table)
      const records = await tableObj
        .filter(record => record.syncedAt === undefined)
        .toArray()

      databaseLog.debug('Retrieved unsynced records', {
        table,
        count: records.length
      })

      return records
    } catch (error) {
      databaseLog.error('Failed to get unsynced records', { table, error })
      return []
    }
  }

  // ==================== CACHE MANAGEMENT ====================

  /**
   * Nettoyer les anciennes données
   */
  async cleanup(options: {
    olderThanDays?: number
    keepUnsynced?: boolean
    tables?: string[]
  } = {}): Promise<void> {
    const timer = databaseLog.time('Cleanup operation')
    const {
      olderThanDays = 30,
      keepUnsynced = true,
      tables = ['syncLogs', 'systemEvents', 'transferTasks']
    } = options

    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

      let totalDeleted = 0

      for (const tableName of tables) {
        const table = this.table(tableName)

        const toDelete = await table
          .where('timestamp')
          .below(cutoffDate)
          .toArray()

        const filtered = keepUnsynced && tableName !== 'syncLogs' && tableName !== 'systemEvents'
          ? toDelete.filter(record => record.syncedAt !== undefined)
          : toDelete

        let count = 0
        for (const record of filtered) {
          await table.delete(record.id)
          count++
        }
        totalDeleted += count

        databaseLog.debug(`Cleaned ${tableName}`, { deleted: count })
      }

      timer.end({ success: true, totalDeleted })
      databaseLog.info('Database cleanup completed', { totalDeleted })

    } catch (error) {
      timer.end({ error })
      databaseLog.error('Database cleanup failed', { error })
    }
  }

  /**
   * Vider complètement la base de données
   */
  async clearAll(): Promise<void> {
    const timer = databaseLog.time('Clear all data')

    try {
      await this.transaction('rw', this.tables, async () => {
        await Promise.all(
          this.tables.map(table => table.clear())
        )
      })

      timer.end({ success: true })
      databaseLog.info('Database cleared completely')

    } catch (error) {
      timer.end({ error })
      databaseLog.error('Failed to clear database', { error })
      throw error
    }
  }

  // ==================== STATE MANAGEMENT ====================

  /**
   * Sauvegarder l'état de l'application
   */
  async saveAppState<T>(key: string, value: T, expiresAt?: Date): Promise<void> {
    try {
      const stateData: DatabaseAppState = {
        key,
        value,
        updatedAt: new Date(),
        version: 1,
        checksum: JSON.stringify(value).length.toString() // Simple checksum
      }

      if (expiresAt !== undefined) {
        stateData.expiresAt = expiresAt
      }

      await this.appState.put(stateData)

      databaseLog.debug('App state saved', { key })
    } catch (error) {
      databaseLog.error('Failed to save app state', { key, error })
    }
  }

  /**
   * Récupérer l'état de l'application
   */
  async getAppState<T>(key: string): Promise<T | null> {
    try {
      const state = await this.appState.get(key)

      if (!state) {
        return null
      }

      // Vérifier expiration
      if (state.expiresAt && state.expiresAt < new Date()) {
        await this.appState.delete(key)
        databaseLog.debug('Expired app state removed', { key })
        return null
      }

      return state.value
    } catch (error) {
      databaseLog.error('Failed to get app state', { key, error })
      return null
    }
  }

  // ==================== STATISTICS ====================

  /**
   * Obtenir les statistiques de la base de données
   */
  async getStats(): Promise<{
    tables: Record<string, number>
    unsyncedCount: number
    totalSize: number
    lastCleanup?: Date
  }> {
    try {
      const tableStats: Record<string, number> = {}
      let unsyncedCount = 0

      // Compter les enregistrements par table
      for (const [name, table] of Object.entries(this._allTables)) {
        const count = await table.count()
        tableStats[name] = count

        // Compter les non-synchronisés (table sans index syncedAt, on skip)
        try {
          const unsynced = await table
            .filter(record => record.syncedAt === undefined)
            .count()
          unsyncedCount += unsynced
        } catch {
          // Table n'a pas d'index syncedAt, ignorer
        }
      }

      // Récupérer la date du dernier nettoyage
      const lastCleanupState = await this.getAppState<string>('lastCleanup')
      const lastCleanup = lastCleanupState ? new Date(lastCleanupState) : undefined

      const result: {
        tables: Record<string, number>
        unsyncedCount: number
        totalSize: number
        lastCleanup?: Date
      } = {
        tables: tableStats,
        unsyncedCount,
        totalSize: 0 // IndexedDB ne fournit pas facilement la taille
      }

      if (lastCleanup !== undefined) {
        result.lastCleanup = lastCleanup
      }

      return result
    } catch (error) {
      databaseLog.error('Failed to get database stats', { error })
      throw error
    }
  }
}

// ==================== SINGLETON ====================

export const database = new TrackBeeDatabase()

// ==================== HELPERS ====================

/**
 * Helper pour les transactions sécurisées
 */
export const withTransaction = async <T>(
  tables: Table[],
  mode: 'r' | 'rw',
  operation: () => Promise<T>
): Promise<T> => {
  const timer = databaseLog.time('Transaction')

  try {
    const result = await database.transaction(mode, tables, operation)
    timer.end({ success: true })
    return result
  } catch (error) {
    timer.end({ error })
    databaseLog.error('Transaction failed', { error })
    throw error
  }
}

