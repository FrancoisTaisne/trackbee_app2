/**
 * Card Component - Composant carte réutilisable
 * Carte avec variants, padding, états et interactions
 */

import React, { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/utils/cn'

// ==================== VARIANTS ====================

const cardVariants = cva(
  // Classes de base - Style professionnel compact
  [
    'rounded border transition-colors duration-150',
    'focus-within:ring-1 focus-within:ring-offset-0 focus-within:ring-trackbee-500'
  ],
  {
    variants: {
      variant: {
        // Carte par défaut - minimaliste
        default: [
          'bg-white border-gray-200',
          'hover:border-gray-300',
          'dark:bg-gray-900 dark:border-gray-800',
          'dark:hover:border-gray-700'
        ],

        // Carte élevée - ombre légère
        elevated: [
          'bg-white border-gray-200 shadow-sm',
          'hover:border-gray-300',
          'dark:bg-gray-900 dark:border-gray-800',
          'dark:hover:border-gray-700'
        ],

        // Carte outline - bordure simple
        outline: [
          'bg-transparent border-gray-300',
          'hover:bg-gray-50/50 hover:border-gray-400',
          'dark:border-gray-700 dark:hover:bg-gray-900/50',
          'dark:hover:border-gray-600'
        ],

        // Carte ghost - ultra discrète
        ghost: [
          'bg-transparent border-transparent',
          'hover:bg-gray-50/50',
          'dark:hover:bg-gray-900/50'
        ],

        // Carte interactive - subtile
        interactive: [
          'bg-white border-gray-200 cursor-pointer',
          'hover:border-gray-400 hover:bg-gray-50/30',
          'active:bg-gray-100/50',
          'dark:bg-gray-900 dark:border-gray-800',
          'dark:hover:border-gray-600 dark:hover:bg-gray-800/50'
        ],

        // Carte de statut - bordures colorées discrètes
        success: [
          'bg-white border-l-2 border-success-500 border-y border-r border-gray-200',
          'dark:bg-gray-900 dark:border-y-gray-800 dark:border-r-gray-800'
        ],

        warning: [
          'bg-white border-l-2 border-warning-500 border-y border-r border-gray-200',
          'dark:bg-gray-900 dark:border-y-gray-800 dark:border-r-gray-800'
        ],

        danger: [
          'bg-white border-l-2 border-danger-500 border-y border-r border-gray-200',
          'dark:bg-gray-900 dark:border-y-gray-800 dark:border-r-gray-800'
        ],

        info: [
          'bg-white border-l-2 border-blue-500 border-y border-r border-gray-200',
          'dark:bg-gray-900 dark:border-y-gray-800 dark:border-r-gray-800'
        ]
      },

      size: {
        sm: 'p-2',
        md: 'p-3',
        lg: 'p-4',
        xl: 'p-6'
      },

      radius: {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded',
        lg: 'rounded-md',
        xl: 'rounded-lg',
        full: 'rounded-full'
      }
    },

    defaultVariants: {
      variant: 'default',
      size: 'md',
      radius: 'md'
    }
  }
)

// ==================== TYPES ====================

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /**
   * Contenu de la carte
   */
  children: React.ReactNode

  /**
   * Click handler pour les cartes interactives
   */
  onCardClick?: () => void

  /**
   * État de chargement
   */
  loading?: boolean

  /**
   * État disabled
   */
  disabled?: boolean
}

// ==================== CARD COMPONENT ====================

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant,
      size,
      radius,
      children,
      onCardClick,
      loading = false,
      disabled = false,
      onClick,
      ...props
    },
    ref
  ) => {
    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || loading) return

      if (onCardClick) {
        onCardClick()
      }

      if (onClick) {
        onClick(event)
      }
    }

    const cardClasses = cn(
      cardVariants({ variant, size, radius }),
      {
        'opacity-50 cursor-not-allowed': disabled,
        'cursor-wait': loading,
        'cursor-pointer': onCardClick && !disabled && !loading
      },
      className
    )

    return (
      <div
        ref={ref}
        className={cardClasses}
        onClick={handleClick}
        {...props}
      >
        {loading ? (
          <div className="flex items-center justify-center min-h-[100px]">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-trackbee-500" />
          </div>
        ) : (
          children
        )}
      </div>
    )
  }
)

Card.displayName = 'Card'

// ==================== CARD HEADER ====================

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1 pb-2', className)}
      {...props}
    >
      {children}
    </div>
  )
)

CardHeader.displayName = 'CardHeader'

// ==================== CARD TITLE ====================

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
  className?: string
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, children, as: Comp = 'h3', ...props }, ref) => (
    <Comp
      ref={ref}
      className={cn(
        'text-sm font-semibold leading-tight',
        'text-gray-900 dark:text-gray-100',
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  )
)

CardTitle.displayName = 'CardTitle'

// ==================== CARD DESCRIPTION ====================

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode
  className?: string
}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(
        'text-xs text-gray-600 dark:text-gray-400',
        className
      )}
      {...props}
    >
      {children}
    </p>
  )
)

CardDescription.displayName = 'CardDescription'

// ==================== CARD CONTENT ====================

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex-1', className)}
      {...props}
    >
      {children}
    </div>
  )
)

CardContent.displayName = 'CardContent'

// ==================== CARD FOOTER ====================

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-2', className)}
      {...props}
    >
      {children}
    </div>
  )
)

CardFooter.displayName = 'CardFooter'

// ==================== SPECIALIZED CARDS ====================

// ==================== STATUS CARD ====================

interface StatusCardProps extends Omit<CardProps, 'variant'> {
  status: 'success' | 'warning' | 'danger' | 'info'
  title: string
  description?: string
  icon?: React.ReactNode
  actions?: React.ReactNode
}

export const StatusCard = forwardRef<HTMLDivElement, StatusCardProps>(
  ({ status, title, description, icon, actions, children, className, ...props }, ref) => {
    const statusIcons = {
      success: (
        <svg className="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      warning: (
        <svg className="w-5 h-5 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      danger: (
        <svg className="w-5 h-5 text-danger-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      info: (
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }

    return (
      <Card
        ref={ref}
        variant={status}
        className={className}
        {...props}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {icon || statusIcons[status]}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base">{title}</CardTitle>
              {description && (
                <CardDescription className="mt-1">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>

        {children && (
          <CardContent>
            {children}
          </CardContent>
        )}

        {actions && (
          <CardFooter className="pt-3">
            {actions}
          </CardFooter>
        )}
      </Card>
    )
  }
)

StatusCard.displayName = 'StatusCard'

// ==================== METRIC CARD ====================

interface MetricCardProps extends Omit<CardProps, 'children'> {
  title: string
  value: string | number
  change?: {
    value: number
    type: 'increase' | 'decrease'
    period?: string
  }
  icon?: React.ReactNode
  description?: string
  trend?: number[] // Pour afficher un mini graphique
}

export const MetricCard = forwardRef<HTMLDivElement, MetricCardProps>(
  ({ title, value, change, icon, description, trend, className, ...props }, ref) => {
    const changeColor = change?.type === 'increase' ? 'text-success-600' : 'text-danger-600'
    const changeIcon = change?.type === 'increase' ? '↗' : '↘'

    return (
      <Card
        ref={ref}
        className={cn('relative overflow-hidden', className)}
        {...props}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {title}
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {value}
              </p>

              {change && (
                <div className={cn('flex items-center mt-2 text-sm', changeColor)}>
                  <span className="mr-1">{changeIcon}</span>
                  <span className="font-medium">{Math.abs(change.value)}%</span>
                  {change.period && (
                    <span className="text-gray-500 ml-1">vs {change.period}</span>
                  )}
                </div>
              )}

              {description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {description}
                </p>
              )}
            </div>

            {icon && (
              <div className="flex-shrink-0 ml-4">
                <div className="w-12 h-12 bg-trackbee-100 dark:bg-trackbee-900/20 rounded-lg flex items-center justify-center">
                  {icon}
                </div>
              </div>
            )}
          </div>

          {/* Mini trend line */}
          {trend && trend.length > 1 && (
            <div className="mt-4 h-8">
              <svg className="w-full h-full" viewBox={`0 0 ${trend.length * 10} 32`}>
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-trackbee-500"
                  points={trend.map((value, index) => `${index * 10},${32 - value}`).join(' ')}
                />
              </svg>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
)

MetricCard.displayName = 'MetricCard'

// ==================== EXPORTS ====================

export { cardVariants }

// ==================== EXAMPLES ====================

/**
 * Exemples d'utilisation:
 *
 * // Carte basique
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Titre</CardTitle>
 *     <CardDescription>Description</CardDescription>
 *   </CardHeader>
 *   <CardContent>
 *     Contenu de la carte
 *   </CardContent>
 * </Card>
 *
 * // Carte interactive
 * <Card variant="interactive" onCardClick={() => console.log('clicked')}>
 *   <CardContent>Cliquez-moi</CardContent>
 * </Card>
 *
 * // Carte de statut
 * <StatusCard
 *   status="success"
 *   title="Connexion établie"
 *   description="Le device est connecté"
 * />
 *
 * // Carte métrique
 * <MetricCard
 *   title="Devices connectés"
 *   value="12"
 *   change={{ value: 8.2, type: 'increase', period: 'hier' }}
 *   icon={<DeviceIcon />}
 * />
 */
