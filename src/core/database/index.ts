/**
 * Database Layer - Export centralisé de la couche base de données
 * Point d'entrée unique pour IndexedDB avec Dexie
 */

// ==================== SCHEMA & DATABASE ====================

export {
  database,
  TrackBeeDatabase,
  withTransaction
} from './schema'

export type {
  DatabaseUser,
  DatabaseMachine,
  DatabaseSite,
  DatabaseInstallation,
  DatabaseCampaign,
  DatabaseCalculation,
  DatabaseFile,
  DatabaseTransferTask,
  DatabaseSyncLog,
  DatabaseSystemEvent,
  DatabaseAppState
} from './schema'

// ==================== BASE REPOSITORY ====================

export {
  BaseRepository,
  WithSearch
} from './repositories/BaseRepository'

export type {
  BaseEntity,
  RepositoryOptions,
  QueryOptions,
  SyncOptions
} from './repositories/BaseRepository'

// ==================== SPECIALIZED REPOSITORIES ====================

export {
  MachineRepository,
  machineRepository
} from './repositories/MachineRepository'

export type {
  MachineRepositoryType
} from './repositories/MachineRepository'

export {
  transferRepository,
  fileRepository
} from './repositories/TransferRepository'

export type {
  TransferRepository,
  FileRepository
} from './repositories/TransferRepository'

// ==================== DATABASE MANAGER ====================

/**
 * Manager centralisé pour la base de données
 * Fournit des utilitaires de haut niveau
 */
import { databaseLog } from '@/core/utils/logger'
import { database } from './schema'
import { transferRepository, fileRepository } from './repositories/TransferRepository'
import { machineRepository } from './repositories/MachineRepository'

class DatabaseManager {
  private initialized = false
  private initPromise: Promise<void> | null = null

  /**
   * Initialiser la base de données
   */
  async initialize(): Promise<void> {
    if (this.initialized) return
    if (this.initPromise) return this.initPromise

    this.initPromise = this.performInitialization()
    await this.initPromise
  }

  private async performInitialization(): Promise<void> {
    const timer = databaseLog.time('Database initialization')

    try {
      databaseLog.debug('🔧 Initializing database...')

      // Ouvrir la base de données
      await database.open()

      // Vérifier la version et l'état
      const isOpen = database.isOpen()
      const version = database.verno

      if (!isOpen) {
        throw new Error('Failed to open database')
      }

      // Nettoyer les données expirées au démarrage
      await this.performStartupCleanup()

      this.initialized = true

      timer.end({ success: true, version })
      databaseLog.info('✅ Database initialized successfully', { version })

    } catch (error) {
      timer.end({ error })
      databaseLog.error('❌ Database initialization failed', { error })
      throw error
    } finally {
      this.initPromise = null
    }
  }

  /**
   * Nettoyage au démarrage
   */
  private async performStartupCleanup(): Promise<void> {
    try {
      databaseLog.debug('🧹 Performing startup cleanup...')

      // Nettoyer les logs de sync anciens (> 30 jours)
      const syncLogsCleaned = await database.table('syncLogs')
        .where('timestamp')
        .below(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
        .delete()

      // Nettoyer les événements système traités (> 7 jours)
      const eventsCleaned = await database.table('systemEvents')
        .where('timestamp')
        .below(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .and((event: any) => event.processed === true)
        .delete()

      // Nettoyer les tâches de transfert terminées (> 14 jours)
      const transfersCleaned = await transferRepository.cleanupCompletedTasks(14)

      databaseLog.info('Startup cleanup completed', {
        syncLogsCleaned,
        eventsCleaned,
        transfersCleaned
      })

    } catch (error) {
      databaseLog.warn('Startup cleanup partially failed', { error })
      // Ne pas faire échouer l'initialisation pour ça
    }
  }

  /**
   * Obtenir les statistiques globales
   */
  async getGlobalStats(): Promise<{
    isOpen: boolean
    version: number
    tables: Record<string, number>
    totalRecords: number
    unsyncedRecords: number
    storageSize?: number
  }> {
    const timer = databaseLog.time('Get global stats')

    try {
      const stats = await database.getStats()
      const isOpen = database.isOpen()
      const version = database.verno

      const totalRecords = Object.values(stats.tables).reduce((sum, count) => sum + (count as number), 0)

      timer.end({ success: true, totalRecords })

      return {
        isOpen,
        version,
        tables: stats.tables,
        totalRecords,
        unsyncedRecords: (stats.unsyncedCount as number) || 0,
        storageSize: stats.totalSize
      }

    } catch (error) {
      timer.end({ error })
      databaseLog.error('Failed to get global stats', { error })
      throw error
    }
  }

  /**
   * Sauvegarder l'état de l'application
   */
  async saveAppState<T>(key: string, value: T, expiresInHours?: number): Promise<void> {
    const expiresAt = expiresInHours
      ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
      : undefined

    await database.saveAppState(key, value, expiresAt)
  }

  /**
   * Récupérer l'état de l'application
   */
  async getAppState<T>(key: string): Promise<T | null> {
    return database.getAppState<T>(key)
  }

  /**
   * Nettoyer toutes les données utilisateur
   */
  async clearUserData(userId: string): Promise<void> {
    const timer = databaseLog.time('Clear user data')

    try {
      databaseLog.debug('🧹 Clearing user data...', { userId })

      await database.transaction('rw', [
        database.machines,
        database.sites,
        database.installations,
        database.campaigns,
        database.calculations,
        database.files,
        database.transferTasks
      ], async () => {
        // Supprimer toutes les données liées à l'utilisateur
        await Promise.all([
          database.machines.where('userId').equals(userId).delete(),
          database.sites.where('userId').equals(userId).delete(),
          database.installations.where('userId').equals(userId).delete(),
          database.campaigns.where('userId').equals(userId).delete(),
          database.calculations.where('userId').equals(userId).delete(),
          database.files.where('userId').equals(userId).delete(),
          // Les transferTasks n'ont pas de userId direct, on les garde pour l'historique
        ])
      })

      // Vider les caches des repositories
      machineRepository.clearCache()
      transferRepository.clearCache()
      fileRepository.clearCache()

      timer.end({ success: true, userId })
      databaseLog.info('✅ User data cleared successfully', { userId })

    } catch (error) {
      timer.end({ error })
      databaseLog.error('❌ Failed to clear user data', { userId, error })
      throw error
    }
  }

  /**
   * Exporter toutes les données pour debug
   */
  async exportAllData(): Promise<{
    metadata: {
      version: number
      exportDate: Date
      totalRecords: number
    }
    data: Record<string, any[]>
  }> {
    const timer = databaseLog.time('Export all data')

    try {
      const stats = await this.getGlobalStats()

      const data: Record<string, any[]> = {}

      // Exporter toutes les tables principales
      const tables = [
        'users', 'machines', 'sites', 'installations',
        'campaigns', 'calculations', 'files'
      ]

      for (const tableName of tables) {
        const table = database.table(tableName)
        data[tableName] = await table.toArray()
      }

      const exportData = {
        metadata: {
          version: stats.version,
          exportDate: new Date(),
          totalRecords: stats.totalRecords
        },
        data
      }

      timer.end({ success: true, totalRecords: stats.totalRecords })
      databaseLog.info('Data export completed', { totalRecords: stats.totalRecords })

      return exportData

    } catch (error) {
      timer.end({ error })
      databaseLog.error('Failed to export data', { error })
      throw error
    }
  }

  /**
   * Réinitialiser complètement la base de données
   */
  async reset(): Promise<void> {
    const timer = databaseLog.time('Database reset')

    try {
      databaseLog.warn('🔄 Resetting database...')

      // Fermer la base de données
      database.close()

      // Supprimer complètement la base de données
      await database.delete()

      // Rouvrir
      await database.open()

      this.initialized = true

      timer.end({ success: true })
      databaseLog.info('✅ Database reset completed')

    } catch (error) {
      timer.end({ error })
      databaseLog.error('❌ Database reset failed', { error })
      throw error
    }
  }

  /**
   * Vérifier l'intégrité de la base de données
   */
  async checkIntegrity(): Promise<{
    isHealthy: boolean
    issues: string[]
    recommendations: string[]
  }> {
    const timer = databaseLog.time('Check integrity')
    const issues: string[] = []
    const recommendations: string[] = []

    try {
      // Vérifier que la DB est ouverte
      if (!database.isOpen()) {
        issues.push('Database is not open')
      }

      // Vérifier les orphelins
      const [machines, installations, campaigns] = await Promise.all([
        database.machines.toArray(),
        database.installations.toArray(),
        database.campaigns.toArray()
      ])

      // Installations sans machine
      const orphanInstallations = installations.filter(inst =>
        !machines.find(m => m.id === inst.machineId)
      )
      if (orphanInstallations.length > 0) {
        issues.push(`${orphanInstallations.length} installations without machine`)
        recommendations.push('Clean orphan installations')
      }

      // Campagnes sans installation
      const orphanCampaigns = campaigns.filter(camp =>
        !installations.find(inst => inst.id === camp.installationId)
      )
      if (orphanCampaigns.length > 0) {
        issues.push(`${orphanCampaigns.length} campaigns without installation`)
        recommendations.push('Clean orphan campaigns')
      }

      const isHealthy = issues.length === 0

      timer.end({ success: true, isHealthy, issuesCount: issues.length })
      databaseLog.info('Database integrity check completed', {
        isHealthy,
        issuesCount: issues.length
      })

      return { isHealthy, issues, recommendations }

    } catch (error) {
      timer.end({ error })
      databaseLog.error('Database integrity check failed', { error })
      return {
        isHealthy: false,
        issues: ['Integrity check failed'],
        recommendations: ['Check database logs']
      }
    }
  }
}

// ==================== SINGLETON ====================

export const databaseManager = new DatabaseManager()

// ==================== UTILITIES ====================

/**
 * Utilitaires pour la base de données
 */
export const databaseUtils = {
  /**
   * Initialiser la base de données
   */
  initialize: () => databaseManager.initialize(),

  /**
   * Obtenir les statistiques
   */
  getStats: () => databaseManager.getGlobalStats(),

  /**
   * Nettoyer les données utilisateur
   */
  clearUserData: (userId: string) => databaseManager.clearUserData(userId),

  /**
   * Exporter les données
   */
  exportData: () => databaseManager.exportAllData(),

  /**
   * Réinitialiser la base
   */
  reset: () => databaseManager.reset(),

  /**
   * Vérifier l'intégrité
   */
  checkIntegrity: () => databaseManager.checkIntegrity(),

  /**
   * État de l'application
   */
  saveAppState: <T>(key: string, value: T, expiresInHours?: number) =>
    databaseManager.saveAppState(key, value, expiresInHours),

  getAppState: <T>(key: string) =>
    databaseManager.getAppState<T>(key)
} as const

// ==================== DEBUG GLOBALS ====================

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Exposer les utilitaires de base de données en dev
  Object.assign(window, {
    TrackBeeDB: {
      database,
      manager: databaseManager,
      repositories: {
        machine: machineRepository,
        transfer: transferRepository,
        file: fileRepository
      },
      utils: databaseUtils
    }
  })
}

// Types exportés
export type { DatabaseManager }