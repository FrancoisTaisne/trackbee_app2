/**
 * Loading Screen - Écran de chargement global
 * Composant d'écran de chargement avec animation et messages
 */

import React from 'react'
import { cn } from '@/shared/utils/cn'

// ==================== TYPES ====================

interface LoadingScreenProps {
  message?: string
  subtitle?: string
  progress?: number
  showProgress?: boolean
  className?: string
  variant?: 'default' | 'minimal' | 'branded'
  size?: 'sm' | 'md' | 'lg'
}

// ==================== LOADING SPINNER ====================

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-2 border-gray-300',
          'border-t-trackbee-500 border-r-trackbee-500',
          sizeClasses[size]
        )}
      />
    </div>
  )
}

// ==================== PROGRESS BAR ====================

interface ProgressBarProps {
  progress: number
  className?: string
  showLabel?: boolean
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  className,
  showLabel = true
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress))

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-2">
        {showLabel && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Progression
          </span>
        )}
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {Math.round(clampedProgress)}%
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-trackbee-500 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  )
}

// ==================== TRACKBEE LOGO ====================

const TrackBeeLogo: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('flex items-center space-x-2', className)}>
    <div className="w-8 h-8 bg-trackbee-500 rounded-lg flex items-center justify-center">
      <svg
        className="w-5 h-5 text-white"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    </div>
    <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
      TrackBee
    </span>
  </div>
)

// ==================== PULSE DOTS ====================

const PulseDots: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('flex space-x-1', className)}>
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className={cn(
          'w-2 h-2 bg-trackbee-500 rounded-full animate-pulse',
          'opacity-75'
        )}
        style={{
          animationDelay: `${i * 0.2}s`,
          animationDuration: '1.4s'
        }}
      />
    ))}
  </div>
)

// ==================== LOADING SCREEN VARIANTS ====================

const DefaultLoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Chargement...',
  subtitle,
  progress,
  showProgress = false,
  size = 'md'
}) => (
  <div className="flex flex-col items-center justify-center space-y-6">
    <TrackBeeLogo />

    <div className="flex flex-col items-center space-y-4">
      <Spinner size={size} />

      <div className="text-center space-y-2">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          {message}
        </h2>
        {subtitle && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {subtitle}
          </p>
        )}
      </div>

      {showProgress && typeof progress === 'number' && (
        <div className="w-64">
          <ProgressBar progress={progress} />
        </div>
      )}
    </div>
  </div>
)

const MinimalLoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Chargement...',
  size = 'md'
}) => (
  <div className="flex flex-col items-center justify-center space-y-4">
    <Spinner size={size} />
    <p className="text-sm text-gray-600 dark:text-gray-400">
      {message}
    </p>
  </div>
)

const BrandedLoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Chargement de TrackBee...',
  subtitle = 'Initialisation en cours',
  progress,
  showProgress = false,
  size = 'lg'
}) => (
  <div className="flex flex-col items-center justify-center space-y-8">
    <div className="text-center space-y-4">
      <TrackBeeLogo className="justify-center" />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {message}
        </h1>
        <p className="text-base text-gray-600 dark:text-gray-400">
          {subtitle}
        </p>
      </div>
    </div>

    <div className="flex flex-col items-center space-y-6">
      <Spinner size={size} />
      <PulseDots />
    </div>

    {showProgress && typeof progress === 'number' && (
      <div className="w-80">
        <ProgressBar progress={progress} showLabel={false} />
      </div>
    )}

    <div className="text-center">
      <p className="text-xs text-gray-500 dark:text-gray-500">
        Système de géolocalisation IoT professionnel
      </p>
    </div>
  </div>
)

// ==================== MAIN COMPONENT ====================

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  variant = 'default',
  className,
  ...props
}) => {
  const variants = {
    default: DefaultLoadingScreen,
    minimal: MinimalLoadingScreen,
    branded: BrandedLoadingScreen
  }

  const VariantComponent = variants[variant]

  return (
    <div
      className={cn(
        'min-h-screen flex items-center justify-center',
        'bg-gray-50 dark:bg-gray-900',
        'p-4',
        className
      )}
    >
      <div className="max-w-md w-full">
        <VariantComponent {...props} />
      </div>
    </div>
  )
}

// ==================== LOADING OVERLAY ====================

interface LoadingOverlayProps extends LoadingScreenProps {
  isVisible: boolean
  backdrop?: boolean
  blur?: boolean
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  backdrop = true,
  blur = false,
  className,
  variant = 'minimal',
  ...props
}) => {
  if (!isVisible) return null

  const variants = {
    default: DefaultLoadingScreen,
    minimal: MinimalLoadingScreen,
    branded: BrandedLoadingScreen
  }

  const VariantComponent = variants[variant]

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        backdrop && 'bg-black/50',
        blur && 'backdrop-blur-sm',
        className
      )}
    >
      <div
        className={cn(
          'bg-white dark:bg-gray-800 rounded-lg shadow-xl',
          'p-8 mx-4 max-w-md w-full'
        )}
      >
        <VariantComponent {...props} />
      </div>
    </div>
  )
}

// ==================== INLINE LOADING ====================

interface InlineLoadingProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  message = 'Chargement...',
  size = 'sm',
  className
}) => (
  <div className={cn('flex items-center space-x-3', className)}>
    <Spinner size={size} />
    <span className="text-sm text-gray-600 dark:text-gray-400">
      {message}
    </span>
  </div>
)

// ==================== EXPORTS ====================

export { Spinner, ProgressBar, PulseDots }

// ==================== EXAMPLES ====================

/**
 * Exemples d'utilisation:
 *
 * // Écran de chargement basique
 * <LoadingScreen message="Chargement..." />
 *
 * // Avec progression
 * <LoadingScreen
 *   message="Initialisation..."
 *   progress={75}
 *   showProgress={true}
 * />
 *
 * // Version branded
 * <LoadingScreen
 *   variant="branded"
 *   message="Démarrage de TrackBee"
 *   subtitle="Configuration des services IoT"
 * />
 *
 * // Overlay modal
 * <LoadingOverlay
 *   isVisible={loading}
 *   message="Envoi en cours..."
 *   backdrop={true}
 *   blur={true}
 * />
 *
 * // Loading inline
 * <InlineLoading message="Synchronisation..." size="sm" />
 */