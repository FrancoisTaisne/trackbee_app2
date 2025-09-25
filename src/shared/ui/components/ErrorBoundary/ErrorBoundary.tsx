/**
 * Error Boundary - Gestion globale des erreurs React
 * Composant pour capturer et afficher les erreurs de l'application
 */

import React from 'react'
import { cn } from '@/shared/utils/cn'
import { Button } from '@/shared/ui/components/Button/Button'

// ==================== TYPES ====================

export interface ErrorInfo {
  componentStack: string
  errorBoundary?: string
  errorBoundaryStack?: string
}

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: (...args: any[]) => void
  showDetails?: boolean
  className?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  FallbackComponent?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  onReset?: () => void
  fallback?: React.ReactNode
  isolate?: boolean
}

// ==================== ERROR FALLBACK COMPONENT ====================

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
  showDetails = false,
  className
}) => {
  const [showFullError, setShowFullError] = React.useState(false)

  const errorId = React.useMemo(() => {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  const handleCopyError = async () => {
    const errorData = {
      id: errorId,
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorData, null, 2))
      // TODO: Afficher un toast de succès
    } catch (err) {
      console.error('Failed to copy error to clipboard:', err)
    }
  }

  const handleReportError = () => {
    // TODO: Implémenter le reporting d'erreur
    console.log('Report error:', { error, errorId })
  }

  return (
    <div
      className={cn(
        'min-h-screen flex items-center justify-center p-4',
        'bg-gray-50 dark:bg-gray-900',
        className
      )}
    >
      <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Oups ! Une erreur est survenue
          </h1>

          <p className="text-gray-600 dark:text-gray-400">
            L'application a rencontré un problème inattendu.
            Veuillez réessayer ou contacter le support si le problème persiste.
          </p>
        </div>

        {/* Error Info */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Détails de l'erreur
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {errorId}
            </span>
          </div>

          <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-2">
            {error.message || 'Erreur inconnue'}
          </p>

          {showDetails && (
            <div className="space-y-2">
              <button
                onClick={() => setShowFullError(!showFullError)}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
              >
                {showFullError ? 'Masquer' : 'Afficher'} la stack trace
              </button>

              {showFullError && (
                <pre className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto max-h-32">
                  {error.stack}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={resetErrorBoundary}
            variant="primary"
            fullWidth
            className="h-11"
          >
            Réessayer
          </Button>

          <div className="flex space-x-3">
            <Button
              onClick={() => window.location.reload()}
              variant="secondary"
              fullWidth
            >
              Recharger la page
            </Button>

            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              fullWidth
            >
              Retour à l'accueil
            </Button>
          </div>

          {showDetails && (
            <div className="flex space-x-3">
              <Button
                onClick={handleCopyError}
                variant="ghost"
                size="sm"
                fullWidth
              >
                Copier l'erreur
              </Button>

              <Button
                onClick={handleReportError}
                variant="ghost"
                size="sm"
                fullWidth
              >
                Signaler le problème
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Si le problème persiste, contactez le support technique avec l'ID d'erreur ci-dessus.
          </p>
        </div>
      </div>
    </div>
  )
}

// ==================== MINIMAL ERROR FALLBACK ====================

export const MinimalErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
  className
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center p-6',
      'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg',
      className
    )}
  >
    <div className="text-center space-y-4">
      <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
        <svg
          className="w-5 h-5 text-red-600 dark:text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>

      <div>
        <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
          Erreur
        </h3>
        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
          {error.message || 'Une erreur est survenue'}
        </p>
      </div>

      <Button
        onClick={resetErrorBoundary}
        variant="outline"
        size="sm"
      >
        Réessayer
      </Button>
    </div>
  </div>
)

// ==================== ERROR BOUNDARY CLASS ====================

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Stocker les informations d'erreur
    this.setState({
      error,
      errorInfo
    })

    // Appeler le callback d'erreur si fourni
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Logger l'erreur
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    // Nettoyer le timeout existant
    if (this.resetTimeoutId) {
      window.clearTimeout(this.resetTimeoutId)
    }

    // Appeler le callback de reset si fourni
    if (this.props.onReset) {
      this.props.onReset()
    }

    // Reset de l'état après un délai pour éviter les boucles
    this.resetTimeoutId = window.setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null
      })
    }, 100)
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      window.clearTimeout(this.resetTimeoutId)
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Rendu du fallback personnalisé
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Rendu du composant fallback
      const FallbackComponent = this.props.FallbackComponent || ErrorFallback

      return (
        <FallbackComponent
          error={this.state.error}
          resetErrorBoundary={this.handleReset}
          showDetails={process.env.NODE_ENV === 'development'}
        />
      )
    }

    return this.props.children
  }
}

// ==================== ERROR BOUNDARY HOC ====================

export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

// ==================== ASYNC ERROR BOUNDARY ====================

interface AsyncErrorBoundaryProps extends ErrorBoundaryProps {
  onAsyncError?: (error: Error) => void
}

export const AsyncErrorBoundary: React.FC<AsyncErrorBoundaryProps> = ({
  children,
  onAsyncError,
  ...props
}) => {
  const [asyncError, setAsyncError] = React.useState<Error | null>(null)

  // Capturer les erreurs async avec un handler global
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason))

      if (onAsyncError) {
        onAsyncError(error)
      }

      setAsyncError(error)
      event.preventDefault()
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [onAsyncError])

  // Relancer l'erreur async pour qu'elle soit capturée par ErrorBoundary
  React.useEffect(() => {
    if (asyncError) {
      throw asyncError
    }
  }, [asyncError])

  return (
    <ErrorBoundary
      {...props}
      onReset={() => {
        setAsyncError(null)
        props.onReset?.()
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

// ==================== EXPORTS ====================

export default ErrorBoundary

// ==================== EXAMPLES ====================

/**
 * Exemples d'utilisation:
 *
 * // Error Boundary basique
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 *
 * // Avec callback d'erreur
 * <ErrorBoundary
 *   onError={(error, errorInfo) => {
 *     console.error('Error caught:', error, errorInfo)
 *   }}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // Avec fallback personnalisé
 * <ErrorBoundary
 *   FallbackComponent={MinimalErrorFallback}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // HOC
 * const SafeComponent = withErrorBoundary(MyComponent, {
 *   FallbackComponent: MinimalErrorFallback
 * })
 *
 * // Async error boundary
 * <AsyncErrorBoundary
 *   onAsyncError={(error) => console.error('Async error:', error)}
 * >
 *   <AsyncComponent />
 * </AsyncErrorBoundary>
 */