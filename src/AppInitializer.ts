/**
 * App Initializer - Initialisation des services et configuration
 * Bootstrap centralisé de l'application TrackBee v2
 */

import { databaseUtils } from '@/core/database'
import { storageManager } from '@/core/services/storage/StorageManager'
import { bleManager } from '@/core/services/ble/BleManager'
import { httpClient } from '@/core/services/api/HttpClient'
import { eventBus } from '@/core/orchestrator/EventBus'
import { transferOrchestrator } from '@/core/orchestrator/TransferOrchestrator'
import { appConfig, detectPlatform } from '@/core/utils/env'
import { stateLog, logger } from '@/core/utils/logger'

// ==================== APP INITIALIZER CLASS ====================

export class AppInitializer {
  private static initialized = false
  private static initPromise: Promise<void> | null = null

  /**
   * Initialiser l'application complète
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return
    if (this.initPromise) return this.initPromise

    this.initPromise = this.performInitialization()
    await this.initPromise
    this.initialized = true
  }

  private static async performInitialization(): Promise<void> {
    const timer = stateLog.time('Core services initialization')

    try {
      stateLog.info('🔧 Initializing TrackBee core services...')

      // 1. Initialiser l'environnement et la plateforme
      await this.initializeEnvironment()

      // 2. Initialiser le stockage
      await this.initializeStorage()

      // 3. Initialiser la base de données
      await this.initializeDatabase()

      // 4. Initialiser les services réseau
      await this.initializeNetworkServices()

      // 5. Initialiser les services IoT
      await this.initializeIoTServices()

      // 6. Initialiser l'orchestration
      await this.initializeOrchestration()

      // 7. Initialiser les permissions et capacités
      await this.initializePermissions()

      // 8. Configuration finale
      await this.finalizeInitialization()

      timer.end({ success: true })
      stateLog.info('✅ All core services initialized successfully')

    } catch (error) {
      timer.end({ error })
      stateLog.error('❌ Core services initialization failed', { error })
      throw error
    } finally {
      this.initPromise = null
    }
  }

  // ==================== INITIALIZATION STEPS ====================

  /**
   * Étape 1: Initialiser l'environnement
   */
  private static async initializeEnvironment(): Promise<void> {
    const timer = stateLog.time('Environment initialization')

    try {
      const platform = detectPlatform()

      stateLog.debug('Environment detected', {
        platform: platform.name,
        isCapacitor: platform.isCapacitor,
        isMobile: platform.isMobile,
        isDev: appConfig.isDev,
        debug: appConfig.debug
      })

      // Configurer les variables d'environnement
      if (appConfig.debug) {
        stateLog.info('🐛 Debug mode enabled')
        // Exposer les utilitaires de debug
        this.exposeDebugUtils()
      }

      timer.end({ success: true })

    } catch (error) {
      timer.end({ error })
      throw new Error(`Environment initialization failed: ${error}`)
    }
  }

  /**
   * Étape 2: Initialiser le stockage
   */
  private static async initializeStorage(): Promise<void> {
    const timer = stateLog.time('Storage initialization')

    try {
      stateLog.debug('🗄️ Initializing storage systems...')

      // Vérifier la disponibilité du stockage
      const isStorageAvailable = await storageManager.isAvailable()
      if (!isStorageAvailable) {
        throw new Error('Storage is not available')
      }

      // Tester le stockage sécurisé
      await storageManager.testSecureStorage()

      timer.end({ success: true })
      stateLog.info('✅ Storage systems ready')

    } catch (error) {
      timer.end({ error })
      throw new Error(`Storage initialization failed: ${error}`)
    }
  }

  /**
   * Étape 3: Initialiser la base de données
   */
  private static async initializeDatabase(): Promise<void> {
    const timer = stateLog.time('Database initialization')

    try {
      stateLog.debug('💾 Initializing offline database...')

      // Initialiser Dexie
      await databaseUtils.initialize()

      // Vérifier l'intégrité
      const integrity = await databaseUtils.checkIntegrity()
      if (!integrity.isHealthy) {
        stateLog.warn('Database integrity issues detected', {
          issues: integrity.issues,
          recommendations: integrity.recommendations
        })
      }

      // Obtenir les statistiques
      const stats = await databaseUtils.getStats()
      stateLog.debug('Database ready', {
        version: stats.version,
        totalRecords: stats.totalRecords,
        unsyncedRecords: stats.unsyncedRecords
      })

      timer.end({ success: true })
      stateLog.info('✅ Offline database ready')

    } catch (error) {
      timer.end({ error })
      throw new Error(`Database initialization failed: ${error}`)
    }
  }

  /**
   * Étape 4: Initialiser les services réseau
   */
  private static async initializeNetworkServices(): Promise<void> {
    const timer = stateLog.time('Network services initialization')

    try {
      stateLog.debug('🌐 Initializing network services...')

      // Tester la connectivité réseau
      const isOnline = navigator.onLine
      stateLog.debug('Network status', { isOnline })

      // Tester l'API si en ligne
      if (isOnline) {
        try {
          const pingResult = await httpClient.ping({ timeoutMs: 5000 })
          stateLog.debug('API connectivity test', pingResult)
        } catch (error) {
          stateLog.warn('API ping failed', { error })
          // Ne pas faire échouer l'init pour ça
        }
      }

      timer.end({ success: true })
      stateLog.info('✅ Network services ready')

    } catch (error) {
      timer.end({ error })
      throw new Error(`Network services initialization failed: ${error}`)
    }
  }

  /**
   * Étape 5: Initialiser les services IoT
   */
  private static async initializeIoTServices(): Promise<void> {
    const timer = stateLog.time('IoT services initialization')

    try {
      stateLog.debug('📡 Initializing IoT services...')

      const platform = detectPlatform()

      // Initialiser BLE seulement sur les plateformes supportées
      if (platform.isCapacitor || platform.isMobile) {
        try {
          await bleManager.initialize()
          stateLog.info('✅ BLE manager ready')
        } catch (error) {
          stateLog.warn('BLE initialization failed', { error })
          // Ne pas faire échouer l'init, BLE peut être indisponible
        }
      } else {
        stateLog.debug('BLE not available on this platform')
      }

      timer.end({ success: true })
      stateLog.info('✅ IoT services ready')

    } catch (error) {
      timer.end({ error })
      throw new Error(`IoT services initialization failed: ${error}`)
    }
  }

  /**
   * Étape 6: Initialiser l'orchestration
   */
  private static async initializeOrchestration(): Promise<void> {
    const timer = stateLog.time('Orchestration initialization')

    try {
      stateLog.debug('🎯 Initializing orchestration services...')

      // Vérifier que l'EventBus est prêt
      if (!eventBus.isEventBusEnabled()) {
        eventBus.setEnabled(true)
      }

      // Initialiser le TransferOrchestrator
      await transferOrchestrator.initialize()

      timer.end({ success: true })
      stateLog.info('✅ Orchestration services ready')

    } catch (error) {
      timer.end({ error })
      throw new Error(`Orchestration initialization failed: ${error}`)
    }
  }

  /**
   * Étape 7: Initialiser les permissions
   */
  private static async initializePermissions(): Promise<void> {
    const timer = stateLog.time('Permissions initialization')

    try {
      const platform = detectPlatform()

      stateLog.debug('🔐 Checking permissions...')

      // Permissions spécifiques à la plateforme
      if (platform.isCapacitor) {
        // Sur mobile, les permissions seront demandées à la première utilisation
        stateLog.debug('Mobile platform: permissions will be requested on demand')
      } else {
        // Sur web, vérifier les permissions disponibles
        if ('permissions' in navigator) {
          try {
            // Vérifier les permissions Bluetooth si disponible
            if ('bluetooth' in navigator) {
              const bluetoothPermission = await navigator.permissions.query({ name: 'bluetooth' as any })
              stateLog.debug('Bluetooth permission', { state: bluetoothPermission.state })
            }
          } catch (error) {
            stateLog.debug('Permission check failed', { error })
          }
        }
      }

      timer.end({ success: true })
      stateLog.info('✅ Permissions checked')

    } catch (error) {
      timer.end({ error })
      throw new Error(`Permissions initialization failed: ${error}`)
    }
  }

  /**
   * Étape 8: Configuration finale
   */
  private static async finalizeInitialization(): Promise<void> {
    const timer = stateLog.time('Finalization')

    try {
      stateLog.debug('🏁 Finalizing initialization...')

      // Émettre un événement d'initialisation terminée
      await eventBus.emit({
        type: 'system:initialized',
        data: {
          version: appConfig.version || '2.0.0',
          platform: detectPlatform().name,
          debug: appConfig.debug.enabled
        }
      })

      // Sauvegarder la date d'initialisation
      await storageManager.set('app:last_initialized', new Date().toISOString())

      timer.end({ success: true })
      stateLog.info('✅ Application initialization completed')

    } catch (error) {
      timer.end({ error })
      throw new Error(`Finalization failed: ${error}`)
    }
  }

  // ==================== DEBUG UTILITIES ====================

  /**
   * Exposer les utilitaires de debug
   */
  private static exposeDebugUtils(): void {
    if (typeof window === 'undefined') return

    const debugUtils = {
      // Services
      storage: storageManager,
      database: databaseUtils,
      eventBus,
      transferOrchestrator,
      bleManager,
      httpClient,

      // Utilitaires
      logger,
      config: appConfig,
      platform: detectPlatform(),

      // Actions de debug
      async clearAllData() {
        await databaseUtils.reset()
        await storageManager.clear()
        stateLog.info('🧹 All data cleared')
      },

      async exportLogs() {
        const logs = logger.exportLogs()
        const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.href = url
        link.download = `trackbee-logs-${new Date().toISOString()}.json`
        link.click()

        URL.revokeObjectURL(url)
        stateLog.info('📄 Logs exported')
      },

      async getSystemInfo() {
        const [dbStats, storageStats] = await Promise.all([
          databaseUtils.getStats(),
          storageManager.getStats?.() || {}
        ])

        return {
          platform: detectPlatform(),
          config: appConfig,
          database: dbStats,
          storage: storageStats,
          eventBus: eventBus.getStats(),
          transfer: transferOrchestrator.getStatus(),
          timestamp: new Date()
        }
      }
    }

    // Exposer globalement
    Object.assign(window, {
      TrackBeeDebug: debugUtils
    })

    stateLog.debug('🐛 Debug utilities exposed on window.TrackBeeDebug')
  }

  // ==================== CLEANUP ====================

  /**
   * Nettoyer l'application (appelé à la fermeture)
   */
  static async cleanup(): Promise<void> {
    const timer = stateLog.time('Application cleanup')

    try {
      stateLog.info('🧹 Cleaning up application...')

      // Nettoyer les services dans l'ordre inverse
      await transferOrchestrator.shutdown()
      // await bleManager.cleanup() // TODO: Implement cleanup method in BleManager
      // Les autres services se nettoient automatiquement

      this.initialized = false

      timer.end({ success: true })
      stateLog.info('✅ Application cleanup completed')

    } catch (error) {
      timer.end({ error })
      stateLog.error('❌ Application cleanup failed', { error })
    }
  }

  // ==================== STATUS ====================

  /**
   * Vérifier si l'application est initialisée
   */
  static isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Obtenir le statut des services
   */
  static async getServicesStatus(): Promise<Record<string, boolean | string>> {
    return {
      storage: await storageManager.isAvailable(),
      database: this.initialized, // Simplifié
      eventBus: eventBus.isEventBusEnabled(),
      ble: bleManager.isInitialized(),
      transfer: transferOrchestrator.isInitialized(),
      platform: detectPlatform().name
    }
  }
}