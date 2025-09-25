/**
 * Progress Component - Barre de progression réutilisable
 * Composant simple pour afficher une progression
 */

import React, { forwardRef } from 'react'
import { cn } from '@/shared/utils/cn'

// ==================== TYPES ====================

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Valeur de progression (0-100)
   */
  value: number

  /**
   * Valeur maximale
   */
  max?: number

  /**
   * Taille de la barre
   */
  size?: 'sm' | 'md' | 'lg'

  /**
   * Couleur de la barre
   */
  variant?: 'primary' | 'success' | 'warning' | 'danger'

  /**
   * Afficher le pourcentage
   */
  showValue?: boolean

  /**
   * Animation
   */
  animated?: boolean
}

// ==================== COMPONENT ====================

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      value,
      max = 100,
      size = 'md',
      variant = 'primary',
      showValue = false,
      animated = false,
      className,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    const sizeClasses = {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3'
    }

    const variantClasses = {
      primary: 'bg-trackbee-500',
      success: 'bg-success-500',
      warning: 'bg-warning-500',
      danger: 'bg-danger-500'
    }

    return (
      <div className={cn('relative w-full', className)} ref={ref} {...props}>
        {/* Background */}
        <div
          className={cn(
            'w-full bg-gray-200 rounded-full dark:bg-gray-700',
            sizeClasses[size]
          )}
        >
          {/* Progress bar */}
          <div
            className={cn(
              'rounded-full transition-all duration-300 ease-in-out',
              sizeClasses[size],
              variantClasses[variant],
              {
                'animate-pulse': animated && percentage > 0
              }
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Value display */}
        {showValue && (
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {Math.round(percentage)}%
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {value} / {max}
            </span>
          </div>
        )}
      </div>
    )
  }
)

Progress.displayName = 'Progress'

// ==================== EXAMPLES ====================

/**
 * Exemples d'utilisation:
 *
 * // Progress simple
 * <Progress value={75} />
 *
 * // Avec affichage de la valeur
 * <Progress value={45} showValue />
 *
 * // Progress colorée
 * <Progress value={85} variant="success" />
 *
 * // Progress animée
 * <Progress value={30} animated />
 */