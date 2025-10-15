// @ts-nocheck

/**
 * Button Component - Composant bouton réutilisable
 * Bouton avec variantes, tailles, états et accessibilité
 */

import React, { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/utils/cn'

// ==================== VARIANTS ====================

const buttonVariants = cva(
  // Classes de base - Style professionnel compact
  [
    'inline-flex items-center justify-center',
    'font-medium',
    'border',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-0',
    'disabled:pointer-events-none disabled:opacity-40',
    'relative',
  ],
  {
    variants: {
      variant: {
        // Bouton principal - compact et sobre
        primary: [
          'bg-trackbee-600 text-white border-trackbee-600',
          'hover:bg-trackbee-700 hover:border-trackbee-700',
          'focus-visible:ring-trackbee-500',
          'active:bg-trackbee-800',
        ],

        // Bouton secondaire - minimaliste
        secondary: [
          'bg-gray-50 text-gray-700 border-gray-200',
          'hover:bg-gray-100 hover:border-gray-300',
          'focus-visible:ring-gray-400',
          'active:bg-gray-200',
          'dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700',
          'dark:hover:bg-gray-700 dark:hover:border-gray-600',
        ],

        // Bouton de succès
        success: [
          'bg-success-600 text-white border-success-600',
          'hover:bg-success-700 hover:border-success-700',
          'focus-visible:ring-success-500',
          'active:bg-success-800',
        ],

        // Bouton de danger
        danger: [
          'bg-danger-600 text-white border-danger-600',
          'hover:bg-danger-700 hover:border-danger-700',
          'focus-visible:ring-danger-500',
          'active:bg-danger-800',
        ],

        // Bouton d'alerte
        warning: [
          'bg-warning-600 text-white border-warning-600',
          'hover:bg-warning-700 hover:border-warning-700',
          'focus-visible:ring-warning-500',
          'active:bg-warning-800',
        ],

        // Bouton outline - bordure fine
        outline: [
          'border-gray-300 bg-white text-gray-700',
          'hover:bg-gray-50 hover:border-gray-400',
          'focus-visible:ring-gray-400',
          'dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300',
          'dark:hover:bg-gray-800 dark:hover:border-gray-500',
        ],

        // Bouton ghost - ultra léger
        ghost: [
          'bg-transparent text-gray-600 border-transparent',
          'hover:bg-gray-100 hover:text-gray-900',
          'focus-visible:ring-gray-400',
          'dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200',
        ],

        // Bouton lien - discret
        link: [
          'bg-transparent text-trackbee-600 border-transparent underline-offset-4',
          'hover:text-trackbee-700 hover:underline',
          'focus-visible:ring-trackbee-500',
          'dark:text-trackbee-400 dark:hover:text-trackbee-300',
        ],
      },

      size: {
        xs: 'h-6 px-2 text-xs rounded',
        sm: 'h-7 px-2.5 text-xs rounded',
        md: 'h-8 px-3 text-sm rounded',
        lg: 'h-9 px-4 text-sm rounded',
        xl: 'h-10 px-5 text-base rounded',
        icon: 'h-8 w-8 rounded',
        'icon-sm': 'h-7 w-7 rounded',
        'icon-lg': 'h-9 w-9 rounded',
      },

      loading: {
        true: 'cursor-wait',
        false: '',
      },

      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },

    defaultVariants: {
      variant: 'primary',
      size: 'md',
      loading: false,
      fullWidth: false,
    },
  }
)

// ==================== TYPES ====================

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Contenu du bouton
   */
  children?: React.ReactNode

  /**
   * Icône à gauche du texte
   */
  leftIcon?: React.ReactNode

  /**
   * Icône à droite du texte
   */
  rightIcon?: React.ReactNode

  /**
   * État de chargement
   */
  loading?: boolean

  /**
   * Texte affiché pendant le chargement
   */
  loadingText?: string

  /**
   * Icône de chargement personnalisée
   */
  loadingIcon?: React.ReactNode

  /**
   * Rendu asChild pour composition
   */
  asChild?: boolean
}

// ==================== LOADING SPINNER ====================

const LoadingSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={cn('animate-spin', className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
)

// ==================== BUTTON COMPONENT ====================

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading = false,
      fullWidth,
      children,
      leftIcon,
      rightIcon,
      loadingText,
      loadingIcon,
      disabled,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading
    const showLoadingIcon = loading && !loadingIcon
    const showCustomLoadingIcon = loading && loadingIcon

    // Si asChild, on retourne juste les props pour composition
    if (asChild) {
      return (
        <div
          ref={ref as unknown}
          className={cn(buttonVariants({ variant, size, loading, fullWidth, className }))}
          {...(props as unknown)}
        >
          {children}
        </div>
      )
    }

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, loading, fullWidth, className }))}
        disabled={isDisabled}
        {...props}
      >
        {/* Icône gauche ou loading */}
        {showLoadingIcon ? (
          <LoadingSpinner className="mr-2 h-4 w-4" />
        ) : showCustomLoadingIcon ? (
          <span className="mr-2">{loadingIcon}</span>
        ) : leftIcon ? (
          <span className="mr-2">{leftIcon}</span>
        ) : null}

        {/* Contenu principal */}
        <span className="flex-1">
          {loading && loadingText ? loadingText : children}
        </span>

        {/* Icône droite (pas affichée en loading) */}
        {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'

// ==================== BUTTON GROUP ====================

export interface ButtonGroupProps {
  children: React.ReactNode
  className?: string
  orientation?: 'horizontal' | 'vertical'
  spacing?: 'none' | 'sm' | 'md' | 'lg'
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  className,
  orientation = 'horizontal',
  spacing = 'sm',
}) => {
  const groupClasses = cn(
    'flex',
    {
      'flex-row': orientation === 'horizontal',
      'flex-col': orientation === 'vertical',
      'space-x-0': spacing === 'none' && orientation === 'horizontal',
      'space-y-0': spacing === 'none' && orientation === 'vertical',
      'space-x-2': spacing === 'sm' && orientation === 'horizontal',
      'space-y-2': spacing === 'sm' && orientation === 'vertical',
      'space-x-3': spacing === 'md' && orientation === 'horizontal',
      'space-y-3': spacing === 'md' && orientation === 'vertical',
      'space-x-4': spacing === 'lg' && orientation === 'horizontal',
      'space-y-4': spacing === 'lg' && orientation === 'vertical',
    },
    className
  )

  return <div className={groupClasses}>{children}</div>
}

// ==================== BUTTON VARIANTS EXPORT ====================

export { buttonVariants }

// ==================== EXAMPLES ====================

/**
 * Exemples d'utilisation:
 *
 * // Bouton basique
 * <Button>Cliquer ici</Button>
 *
 * // Bouton avec icône
 * <Button leftIcon={<IconPlus />}>Ajouter</Button>
 *
 * // Bouton de chargement
 * <Button loading loadingText="Chargement...">Envoyer</Button>
 *
 * // Bouton pleine largeur
 * <Button fullWidth variant="success">Confirmer</Button>
 *
 * // Groupe de boutons
 * <ButtonGroup>
 *   <Button variant="outline">Annuler</Button>
 *   <Button>Confirmer</Button>
 * </ButtonGroup>
 */
// @ts-nocheck
