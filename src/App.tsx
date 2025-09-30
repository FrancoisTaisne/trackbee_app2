/**
 * App Principal - Point d'entrée de l'application TrackBee v2
 * Configuration des providers et routing principal
 */

import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'

// Providers
import { StateProvider } from '@/core/state'
import { ThemeProvider } from '@/shared/ui/theme/ThemeProvider'

// Components
import { AppRouter } from './AppRouter'
import { ErrorFallback } from '@/shared/ui/components/ErrorBoundary/ErrorBoundary'
import { LoadingScreen } from '@/shared/ui/components/Loading/LoadingScreen'

// Services initialization
import { AppInitializer } from './AppInitializer'

// Utils
import { appConfig } from '@/core/utils/env'
import { stateLog } from '@/core/utils/logger'

// ==================== APP COMPONENT ====================

const App: React.FC = () => {
  const [isInitialized, setIsInitialized] = React.useState(false)
  const [initError, setInitError] = React.useState<Error | null>(null)

  // ==================== INITIALIZATION ====================

  React.useEffect(() => {
    let mounted = true

    const initializeApp = async () => {
      const timer = stateLog.time('Application initialization')

      try {
        stateLog.info('🚀 Starting TrackBee App v2...')

        // Initialiser les services core
        await AppInitializer.initialize()

        if (mounted) {
          setIsInitialized(true)
          timer.end({ success: true })
          stateLog.info('✅ TrackBee App v2 initialized successfully')
        }

      } catch (error) {
        timer.end({ error })
        const initializationError = error instanceof Error ? error : new Error('App initialization failed')

        stateLog.error('❌ TrackBee App v2 initialization failed', { error: initializationError })

        if (mounted) {
          setInitError(initializationError)
          setIsInitialized(true) // Continuer même avec erreur
        }
      }
    }

    initializeApp()

    return () => {
      mounted = false
    }
  }, [])

  // ==================== ERROR HANDLING ====================

  const handleError = React.useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    stateLog.error('Unhandled React error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack || 'Unknown'
    })

    // En production, on pourrait envoyer l'erreur à un service de monitoring
    if (!appConfig.isDev) {
      // Sentry, Bugsnag, etc.
      console.error('Production error:', error)
    }
  }, [])

  const handleErrorReset = React.useCallback(() => {
    setInitError(null)
    window.location.reload()
  }, [])

  // ==================== LOADING STATE ====================

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <LoadingScreen
          message="Initialisation de TrackBee..."
          subtitle="Chargement des services et configuration"
        />
      </div>
    )
  }

  // ==================== ERROR STATE ====================

  if (initError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <ErrorFallback
          error={initError}
          resetErrorBoundary={handleErrorReset}
          showDetails={appConfig.isDev}
        />
      </div>
    )
  }

  // ==================== MAIN APP ====================

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={handleErrorReset}
    >
      <StateProvider showQueryDevtools={false}>
        <ThemeProvider
          defaultTheme="auto"
          enableSystem={true}
          disableTransitionOnChange={false}
        >
          <BrowserRouter>
            <div className="min-h-screen bg-background text-foreground">
              <AppRouter />
            </div>
          </BrowserRouter>
        </ThemeProvider>
      </StateProvider>
    </ErrorBoundary>
  )
}

export default App