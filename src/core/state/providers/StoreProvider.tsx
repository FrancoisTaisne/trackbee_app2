/**
 * Store Provider - Provider Zustand Stores
 * Initialisation et configuration des stores Zustand
 */

import React, { type ReactNode } from 'react'
import { useAuthStore } from '@/core/state/stores/auth.store'
import { useDeviceStore } from '@/core/state/stores/device.store'
import { useTransferStore } from '@/core/state/stores/transfer.store'
import { useUIStore } from '@/core/state/stores/ui.store'
import { stateLog, logger } from '@/core/utils/logger'
import { appConfig } from '@/core/utils/env'

// ==================== TYPES ====================

interface StoreProviderProps {
  children: ReactNode
}

// ==================== STORE INITIALIZATION ====================

/**
 * Hook pour initialiser tous les stores
 * Centralise l'initialisation et la récupération des données persistées
 */
const useStoreInitialization = () => {
  const [isInitialized, setIsInitialized] = React.useState(false)
  const [initError, setInitError] = React.useState<Error | null>(null)
  const cleanupExecutedRef = React.useRef(false)
  const initializationStartedRef = React.useRef(false)

  const authStore = useAuthStore()
  const deviceStore = useDeviceStore()
  const transferStore = useTransferStore()
  const uiStore = useUIStore()

  React.useEffect(() => {
    // Protection contre les initialisations multiples
    if (initializationStartedRef.current) {
      return
    }
    initializationStartedRef.current = true

    const initializeStores = async () => {
      const timer = logger.time('state', 'Store initialization')

      try {
        stateLog.debug('🔧 Initializing all stores...')

        // Initialiser les stores en parallèle pour optimiser le démarrage
        await Promise.all([
          // Auth store - critique, doit être initialisé en premier
          authStore.initialize(),

          // UI store - charger les préférences utilisateur
          uiStore.loadPreferences(),

          // Transfer store - charger la queue d'upload persistée
          transferStore.loadPersistedQueue()

          // Device store n'a pas besoin d'initialisation async pour le moment
        ])

        // 🔧 DIAGNOSTIC ET CORRECTION POST-INITIALISATION
        try {
          // Attendre un peu que l'initialisation se stabilise
          await new Promise(resolve => setTimeout(resolve, 500))

          // Importer et utiliser le correctif complet
          const { AuthComprehensiveFix } = await import('@/core/state/stores/auth.fix.comprehensive')
          const diagnostic = await AuthComprehensiveFix.quickDiagnostic()

          stateLog.debug('🔍 Post-init auth diagnostic:', diagnostic.summary)

          // Si des problèmes sont détectés, tenter une correction
          if (diagnostic.recommendations.includes('Force reload auth state')) {
            stateLog.info('🔧 Running post-init auth correction...')
            await AuthComprehensiveFix.forceFullSync()
          }
        } catch (error) {
          stateLog.warn('⚠️ Post-init auth diagnostic failed (non-critical)', { error })
        }

        timer.end({ success: true })
        stateLog.info('✅ All stores initialized successfully')

        setIsInitialized(true)

      } catch (error) {
        timer.end({ error })
        const initializationError = error instanceof Error ? error : new Error('Store initialization failed')

        stateLog.error('❌ Store initialization failed', { error: initializationError })
        setInitError(initializationError)

        // Continuer même si l'initialisation échoue partiellement
        setIsInitialized(true)
      }
    }

    initializeStores()

    // Cleanup à la fermeture avec protection contre les appels répétés
    return () => {
      // Protection contre les appels multiples de cleanup
      if (cleanupExecutedRef.current) {
        return
      }
      cleanupExecutedRef.current = true

      stateLog.debug('🧹 Cleaning up stores...')

      try {
        // Cleanup avec protection pour stores optionnels
        if (authStore?.cleanup) {
          authStore.cleanup()
        }
        if (deviceStore?.cleanup) {
          deviceStore.cleanup()
        }
        if (transferStore?.cleanup) {
          transferStore.cleanup()
        }
        if (uiStore?.cleanup) {
          uiStore.cleanup()
        }

        stateLog.debug('✅ Store cleanup completed')
      } catch (error) {
        // En cas d'erreur Immer MapSet, on ignore silencieusement pour éviter les loops
        const errorMessage = error instanceof Error ? error.message : 'Unknown cleanup error'
        if (errorMessage.includes('MapSet') || errorMessage.includes('Immer')) {
          stateLog.debug('🔇 Ignoring Immer MapSet cleanup error (non-critical)')
        } else {
          stateLog.warn('⚠️ Non-critical error during store cleanup', {
            error: errorMessage
          })
        }
      }
    }
  }, []) // Pas de dépendances - l'effet ne s'exécute qu'au mount

  return { isInitialized, initError }
}

// ==================== STORE SYNC ====================

/**
 * Hook pour synchroniser les stores entre eux
 * Gère les interactions et événements cross-store
 */
const useStoreSynchronization = () => {
  const authStore = useAuthStore()
  const deviceStore = useDeviceStore()
  const transferStore = useTransferStore()
  const uiStore = useUIStore()

  React.useEffect(() => {
    // Synchronisation Auth -> Device/Transfer
    const unsubscribeAuth = useAuthStore.subscribe(
      (state) => state.isAuthenticated,
      (isAuthenticated) => {
        if (!isAuthenticated) {
          stateLog.debug('🔐 User logged out, cleaning device and transfer stores')

          // Nettoyer les stores dépendants de l'auth
          deviceStore.cleanup()
          transferStore.cleanup()

          // Afficher notification de déconnexion
          uiStore.showToast({
            type: 'info',
            title: 'Déconnecté',
            message: 'Votre session a expiré'
          })
        }
      }
    )

    // Synchronisation Transfer -> UI (notifications de progression)
    const unsubscribeTransfer = useTransferStore.subscribe(
      (state) => state.activeTasks,
      (activeTasks) => {
        const activeCount = activeTasks.size

        if (activeCount > 0) {
          // Afficher indicateur de transfert global
          uiStore.setGlobalLoading(true)
        } else {
          // Masquer indicateur quand plus de transferts
          uiStore.setGlobalLoading(false)
        }

        if (appConfig.debug) {
          stateLog.debug('Active transfers changed', { count: activeCount })
        }
      }
    )

    // Synchronisation Device -> Transfer (nouvelles connexions)
    const unsubscribeDevice = useDeviceStore.subscribe(
      (state) => state.connections,
      (connections) => {
        // Quand un device se connecte, on pourrait auto-démarrer un scan de fichiers
        // Logique à implémenter selon les besoins business
        if (appConfig.debug) {
          const connectedCount = Array.from(connections.values())
            .filter(conn => conn.status === 'connected').length

          stateLog.debug('Device connections changed', { connectedCount })
        }
      }
    )

    // Synchronisation UI -> Performance (mode performance)
    const unsubscribeUI = useUIStore.subscribe(
      (state) => state.performanceMode,
      (performanceMode) => {
        stateLog.debug('Performance mode changed', { performanceMode })

        // Ajuster les comportements selon le mode
        switch (performanceMode) {
          case 'battery-saver':
            // Réduire la fréquence des updates
            break
          case 'high-performance':
            // Activer tous les features
            break
          default:
            // Mode normal
            break
        }
      }
    )

    return () => {
      unsubscribeAuth()
      unsubscribeTransfer()
      unsubscribeDevice()
      unsubscribeUI()
    }
  }, []) // Pas de dépendances - l'effet de sync ne s'exécute qu'au mount
}

// ==================== ERROR BOUNDARY ====================

interface StoreErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class StoreErrorBoundary extends React.Component<
  { children: ReactNode },
  StoreErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): StoreErrorBoundaryState {
    stateLog.error('Store Error Boundary caught error', { error })
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    stateLog.error('Store Error Boundary - componentDidCatch', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '20px',
            textAlign: 'center',
            background: '#fee',
            border: '1px solid #f66',
            borderRadius: '8px',
            margin: '20px'
          }}
        >
          <h2 style={{ color: '#c33' }}>Erreur de l'état de l'application</h2>
          <p>Une erreur s'est produite dans la gestion d'état.</p>
          <details style={{ marginTop: '10px', textAlign: 'left' }}>
            <summary>Détails de l'erreur</summary>
            <pre style={{ background: '#f9f9f9', padding: '10px', overflow: 'auto' }}>
              {this.state.error?.message}
              {'\n\n'}
              {this.state.error?.stack}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Recharger l'application
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// ==================== LOADING COMPONENT ====================

const StoreLoadingScreen: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#f5f5f5'
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e0e0e0',
          borderTop: '4px solid #1976d2',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
      />
      <p style={{ marginTop: '20px', color: '#666' }}>
        Initialisation de l'application...
      </p>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// ==================== MAIN PROVIDER ====================

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const { isInitialized, initError } = useStoreInitialization()

  // Hook de synchronisation
  useStoreSynchronization()

  React.useEffect(() => {
    stateLog.debug('🔧 StoreProvider mounted')

    return () => {
      stateLog.debug('🧹 StoreProvider unmounted')
    }
  }, [])

  // Afficher écran de chargement pendant l'initialisation
  if (!isInitialized) {
    return <StoreLoadingScreen />
  }

  // Afficher erreur d'initialisation si nécessaire
  if (initError) {
    stateLog.error('Store initialization error in provider', { error: initError })
    // Continuer même avec erreur, mais logger l'erreur
  }

  return (
    <StoreErrorBoundary>
      {children}
    </StoreErrorBoundary>
  )
}

// ==================== HOOKS UTILITAIRES ====================

/**
 * Hook pour accéder à tous les stores
 * Utile pour les composants qui ont besoin de plusieurs stores
 */
export const useStores = () => {
  const auth = useAuthStore()
  const device = useDeviceStore()
  const transfer = useTransferStore()
  const ui = useUIStore()

  return { auth, device, transfer, ui }
}

/**
 * Hook pour vérifier si les stores sont prêts
 */
export const useStoresReady = () => {
  const auth = useAuthStore(state => state.isInitialized)
  const [storesReady, setStoresReady] = React.useState(false)

  React.useEffect(() => {
    // Les stores sont prêts quand l'auth est initialisé
    // (les autres stores s'initialisent sans état async)
    setStoresReady(auth)
  }, [auth])

  return storesReady
}

// Types exportés
export type { StoreProviderProps }