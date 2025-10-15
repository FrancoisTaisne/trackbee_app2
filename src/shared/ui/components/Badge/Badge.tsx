/**
 * Badge Component - Composant badge/étiquette réutilisable
 * Badge avec variantes, tailles, couleurs et états
 */

import React, { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/utils/cn'

// ==================== VARIANTS ====================

const badgeVariants = cva(
  // Classes de base - Style professionnel compact
  [
    'inline-flex items-center font-medium transition-colors duration-150',
    'focus:outline-none focus:ring-1 focus:ring-offset-0'
  ],
  {
    variants: {
      variant: {
        // Badge par défaut - minimaliste
        default: [
          'bg-gray-100 text-gray-700 border border-gray-200',
          'hover:bg-gray-150',
          'dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
          'dark:hover:bg-gray-750'
        ],

        // Badge primary - sobre
        primary: [
          'bg-trackbee-50 text-trackbee-700 border border-trackbee-200',
          'hover:bg-trackbee-100',
          'dark:bg-trackbee-900/20 dark:text-trackbee-300 dark:border-trackbee-800',
          'dark:hover:bg-trackbee-900/30'
        ],

        // Badge secondary - discret
        secondary: [
          'bg-gray-50 text-gray-600 border border-gray-200',
          'hover:bg-gray-100',
          'dark:bg-gray-850 dark:text-gray-400 dark:border-gray-750',
          'dark:hover:bg-gray-800'
        ],

        // Badge success - subtil
        success: [
          'bg-success-50 text-success-700 border border-success-200',
          'hover:bg-success-100',
          'dark:bg-success-900/20 dark:text-success-300 dark:border-success-800',
          'dark:hover:bg-success-900/30'
        ],

        // Badge warning - discret
        warning: [
          'bg-warning-50 text-warning-700 border border-warning-200',
          'hover:bg-warning-100',
          'dark:bg-warning-900/20 dark:text-warning-300 dark:border-warning-800',
          'dark:hover:bg-warning-900/30'
        ],

        // Badge danger - subtil
        danger: [
          'bg-danger-50 text-danger-700 border border-danger-200',
          'hover:bg-danger-100',
          'dark:bg-danger-900/20 dark:text-danger-300 dark:border-danger-800',
          'dark:hover:bg-danger-900/30'
        ],

        // Badge info - discret
        info: [
          'bg-blue-50 text-blue-700 border border-blue-200',
          'hover:bg-blue-100',
          'dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
          'dark:hover:bg-blue-900/30'
        ],

        // Badge solid variants - compact
        'solid-primary': [
          'bg-trackbee-600 text-white border border-trackbee-600',
          'hover:bg-trackbee-700 hover:border-trackbee-700'
        ],

        'solid-success': [
          'bg-success-600 text-white border border-success-600',
          'hover:bg-success-700 hover:border-success-700'
        ],

        'solid-warning': [
          'bg-warning-600 text-white border border-warning-600',
          'hover:bg-warning-700 hover:border-warning-700'
        ],

        'solid-danger': [
          'bg-danger-600 text-white border border-danger-600',
          'hover:bg-danger-700 hover:border-danger-700'
        ],

        // Badge outline - fin
        outline: [
          'bg-transparent text-gray-600 border border-gray-300',
          'hover:bg-gray-50/50',
          'dark:text-gray-400 dark:border-gray-700',
          'dark:hover:bg-gray-850'
        ]
      },

      size: {
        xs: 'px-1.5 py-0.5 text-[10px] rounded-sm',
        sm: 'px-2 py-0.5 text-[11px] rounded',
        md: 'px-2.5 py-0.5 text-xs rounded',
        lg: 'px-3 py-1 text-xs rounded',
        xl: 'px-3.5 py-1 text-sm rounded'
      },

      dot: {
        true: 'pl-2',
        false: ''
      }
    },

    defaultVariants: {
      variant: 'default',
      size: 'sm',
      dot: false
    }
  }
)

// ==================== TYPES ====================

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /**
   * Contenu du badge
   */
  children: React.ReactNode

  /**
   * Icône à gauche
   */
  leftIcon?: React.ReactNode

  /**
   * Icône à droite
   */
  rightIcon?: React.ReactNode

  /**
   * Afficher un point coloré
   */
  dot?: boolean

  /**
   * Couleur du point (si dot=true)
   */
  dotColor?: string

  /**
   * Rendre le badge cliquable
   */
  clickable?: boolean

  /**
   * Action au clic
   */
  onRemove?: () => void

  /**
   * État pulsant (animation)
   */
  pulse?: boolean
}

// ==================== BADGE COMPONENT ====================

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant,
      size,
      dot,
      dotColor,
      children,
      leftIcon,
      rightIcon,
      clickable = false,
      onRemove,
      pulse = false,
      onClick,
      ...props
    },
    ref
  ) => {
    const handleClick = (event: React.MouseEvent<HTMLSpanElement>) => {
      if (!clickable && !onClick) return
      onClick?.(event)
    }

    const badgeClasses = cn(
      badgeVariants({ variant, size, dot }),
      {
        'cursor-pointer': clickable || onClick,
        'animate-pulse': pulse
      },
      className
    )

    return (
      <span
        ref={ref}
        className={badgeClasses}
        onClick={handleClick}
        {...props}
      >
        {/* Point coloré */}
        {dot && (
          <span
            className="w-1.5 h-1.5 bg-current rounded-full mr-1.5 flex-shrink-0"
            style={dotColor ? { backgroundColor: dotColor } : undefined}
          />
        )}

        {/* Icône gauche */}
        {leftIcon && (
          <span className="mr-1 flex-shrink-0">
            {leftIcon}
          </span>
        )}

        {/* Contenu */}
        <span className="truncate">
          {children}
        </span>

        {/* Icône droite */}
        {rightIcon && (
          <span className="ml-1 flex-shrink-0">
            {rightIcon}
          </span>
        )}

        {/* Bouton de suppression */}
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="ml-1 flex-shrink-0 rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5 transition-colors"
          >
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

// ==================== SPECIALIZED BADGES ====================

// ==================== STATUS BADGE ====================

interface StatusBadgeProps extends Omit<BadgeProps, 'variant' | 'dot'> {
  status: 'online' | 'offline' | 'idle' | 'busy' | 'away'
  showLabel?: boolean
  animated?: boolean
}

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, showLabel = true, animated = false, className, ...props }, ref) => {
    const statusConfig = {
      online: {
        variant: 'solid-success' as const,
        label: 'En ligne',
        dotColor: '#10b981'
      },
      offline: {
        variant: 'secondary' as const,
        label: 'Hors ligne',
        dotColor: '#6b7280'
      },
      idle: {
        variant: 'warning' as const,
        label: 'Inactif',
        dotColor: '#f59e0b'
      },
      busy: {
        variant: 'solid-danger' as const,
        label: 'Occupé',
        dotColor: '#ef4444'
      },
      away: {
        variant: 'info' as const,
        label: 'Absent',
        dotColor: '#3b82f6'
      }
    }

    const config = statusConfig[status]

    return (
      <Badge
        ref={ref}
        variant={config.variant}
        dot={true}
        dotColor={config.dotColor}
        pulse={animated && status === 'online'}
        className={className}
        {...props}
      >
        {showLabel ? config.label : null}
      </Badge>
    )
  }
)

StatusBadge.displayName = 'StatusBadge'

// ==================== BLE STATUS BADGE ====================

interface BleStatusBadgeProps extends Omit<BadgeProps, 'variant' | 'dot'> {
  status: 'connected' | 'connecting' | 'disconnected' | 'error'
  showIcon?: boolean
  showLabel?: boolean
}

export const BleStatusBadge = forwardRef<HTMLSpanElement, BleStatusBadgeProps>(
  ({ status, showIcon = true, showLabel = true, className, ...props }, ref) => {
    const statusConfig = {
      connected: {
        variant: 'solid-success' as const,
        label: 'Connecté',
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        ),
        dotColor: '#10b981',
        pulse: true
      },
      connecting: {
        variant: 'warning' as const,
        label: 'Connexion...',
        icon: (
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
        ),
        dotColor: '#f59e0b',
        pulse: true
      },
      disconnected: {
        variant: 'secondary' as const,
        label: 'Déconnecté',
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18 21l-2.2-2.2M6 6l12 12" />
          </svg>
        ),
        dotColor: '#6b7280',
        pulse: false
      },
      error: {
        variant: 'solid-danger' as const,
        label: 'Erreur',
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        dotColor: '#ef4444',
        pulse: false
      }
    }

    const config = statusConfig[status]

    return (
      <Badge
        ref={ref}
        variant={config.variant}
        dot={!showIcon}
        dotColor={!showIcon ? config.dotColor : undefined}
        leftIcon={showIcon ? config.icon : undefined}
        pulse={config.pulse}
        className={className}
        {...props}
      >
        {showLabel ? config.label : null}
      </Badge>
    )
  }
)

BleStatusBadge.displayName = 'BleStatusBadge'

// ==================== NUMERIC BADGE ====================

interface NumericBadgeProps extends Omit<BadgeProps, 'children'> {
  count: number
  max?: number
  showZero?: boolean
}

export const NumericBadge = forwardRef<HTMLSpanElement, NumericBadgeProps>(
  ({ count, max = 99, showZero = false, className, ...props }, ref) => {
    if (count === 0 && !showZero) return null

    const displayCount = count > max ? `${max}+` : count.toString()

    return (
      <Badge
        ref={ref}
        variant="solid-danger"
        size="xs"
        className={cn('min-w-[20px] justify-center', className)}
        {...props}
      >
        {displayCount}
      </Badge>
    )
  }
)

NumericBadge.displayName = 'NumericBadge'

// ==================== REMOVABLE BADGE ====================

interface RemovableBadgeProps extends BadgeProps {
  onRemove: () => void
  label: string
}

export const RemovableBadge = forwardRef<HTMLSpanElement, RemovableBadgeProps>(
  ({ label, onRemove, className, ...props }, ref) => (
    <Badge
      ref={ref}
      variant="secondary"
      onRemove={onRemove}
      className={cn('max-w-xs', className)}
      {...props}
    >
      {label}
    </Badge>
  )
)

RemovableBadge.displayName = 'RemovableBadge'

// ==================== EXPORTS ====================

export { badgeVariants }

// ==================== EXAMPLES ====================

/**
 * Exemples d'utilisation:
 *
 * // Badge basique
 * <Badge>Nouveau</Badge>
 *
 * // Badge de statut
 * <StatusBadge status="online" />
 *
 * // Badge BLE
 * <BleStatusBadge status="connected" />
 *
 * // Badge numérique
 * <NumericBadge count={5} />
 *
 * // Badge avec point coloré
 * <Badge variant="success" dot dotColor="#10b981">
 *   Actif
 * </Badge>
 *
 * // Badge supprimable
 * <RemovableBadge
 *   label="Tag supprimable"
 *   onRemove={() => console.log('removed')}
 * />
 *
 * // Badge avec icônes
 * <Badge
 *   variant="primary"
 *   leftIcon={<CheckIcon />}
 *   rightIcon={<ArrowIcon />}
 * >
 *   Validé
 * </Badge>
 */