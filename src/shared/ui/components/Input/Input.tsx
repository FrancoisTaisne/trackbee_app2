/**
 * Input Component - Composant champ de saisie réutilisable
 * Input avec variantes, validation, états et accessibilité
 */

import React, { forwardRef, useState } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/utils/cn'

// ==================== VARIANTS ====================

const inputVariants = cva(
  // Classes de base - Style professionnel compact
  [
    'flex w-full rounded border transition-colors duration-150',
    'file:border-0 file:bg-transparent file:text-xs file:font-medium',
    'placeholder:text-gray-400 dark:placeholder:text-gray-500',
    'focus:outline-none focus:ring-1 focus:ring-offset-0',
    'disabled:cursor-not-allowed disabled:opacity-40'
  ],
  {
    variants: {
      variant: {
        // Input par défaut - bordure fine
        default: [
          'border-gray-300 bg-white text-gray-900',
          'hover:border-gray-400',
          'focus:border-trackbee-500 focus:ring-trackbee-500',
          'dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
          'dark:hover:border-gray-600',
          'dark:focus:border-trackbee-400 dark:focus:ring-trackbee-400'
        ],

        // Input avec erreur - discret
        error: [
          'border-danger-400 bg-white text-gray-900',
          'focus:border-danger-500 focus:ring-danger-500',
          'dark:border-danger-600 dark:bg-gray-900 dark:text-gray-100',
          'dark:focus:border-danger-400 dark:focus:ring-danger-400'
        ],

        // Input avec succès - discret
        success: [
          'border-success-400 bg-white text-gray-900',
          'focus:border-success-500 focus:ring-success-500',
          'dark:border-success-600 dark:bg-gray-900 dark:text-gray-100',
          'dark:focus:border-success-400 dark:focus:ring-success-400'
        ],

        // Input ghost - ultra léger
        ghost: [
          'border-transparent bg-gray-50 text-gray-900',
          'hover:bg-gray-100',
          'focus:border-gray-300 focus:ring-gray-300 focus:bg-white',
          'dark:bg-gray-800 dark:text-gray-100',
          'dark:hover:bg-gray-700',
          'dark:focus:border-gray-600 dark:focus:ring-gray-600 dark:focus:bg-gray-900'
        ]
      },

      size: {
        sm: 'h-7 px-2.5 text-xs',
        md: 'h-8 px-3 text-sm',
        lg: 'h-9 px-3.5 text-sm'
      }
    },

    defaultVariants: {
      variant: 'default',
      size: 'md'
    }
  }
)

// ==================== TYPES ====================

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /**
   * Label du champ
   */
  label?: string

  /**
   * Message d'aide
   */
  helpText?: string

  /**
   * Message d'erreur
   */
  error?: string

  /**
   * Icône à gauche
   */
  leftIcon?: React.ReactNode

  /**
   * Icône à droite
   */
  rightIcon?: React.ReactNode

  /**
   * Action à droite (bouton, etc.)
   */
  rightAction?: React.ReactNode

  /**
   * Préfixe textuel
   */
  prefix?: string

  /**
   * Suffixe textuel
   */
  suffix?: string

  /**
   * État de chargement
   */
  loading?: boolean

  /**
   * Validation en temps réel
   */
  validate?: (value: string) => string | null

  /**
   * Debounce pour la validation (ms)
   */
  validationDelay?: number
}

// ==================== HELPER COMPONENTS ====================

const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-trackbee-500" />
)

const InputIcon = ({ icon, position }: { icon: React.ReactNode; position: 'left' | 'right' }) => (
  <div
    className={cn(
      'absolute inset-y-0 flex items-center pointer-events-none',
      position === 'left' ? 'left-3' : 'right-3'
    )}
  >
    <div className="text-gray-400 dark:text-gray-500">
      {icon}
    </div>
  </div>
)

// ==================== INPUT COMPONENT ====================

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant,
      size,
      label,
      helpText,
      error,
      leftIcon,
      rightIcon,
      rightAction,
      prefix,
      suffix,
      loading = false,
      validate,
      validationDelay = 300,
      onChange,
      onBlur,
      id,
      ...props
    },
    ref
  ) => {
    const [validationError, setValidationError] = useState<string | null>(null)
    const [isValidating, setIsValidating] = useState(false)
    const validationTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null)

    // Générer un ID unique si non fourni
    const generatedId = React.useId()
    const inputId = id ?? `input-${generatedId}`

    // Déterminer l'état de l'input
    const currentError = error || validationError
    const inputVariant = currentError ? 'error' : variant

    // Gérer la validation en temps réel
    const handleValidation = React.useCallback(
      (value: string) => {
        if (!validate) return

        if (validationTimeout.current) {
          clearTimeout(validationTimeout.current)
          validationTimeout.current = null
        }

        setIsValidating(true)

        validationTimeout.current = setTimeout(() => {
          const validationResult = validate(value)
          setValidationError(validationResult)
          setIsValidating(false)
        }, validationDelay)
      },
      [validate, validationDelay]
    )

    // Gérer les changements
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(event)
      handleValidation(event.target.value)
    }

    // Gérer la perte de focus
    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      onBlur?.(event)
      if (validate && !isValidating) {
        const validationResult = validate(event.target.value)
        setValidationError(validationResult)
      }
    }

    // Nettoyer les timeouts
    React.useEffect(() => {
      return () => {
        if (validationTimeout.current) {
          clearTimeout(validationTimeout.current)
          validationTimeout.current = null
        }
      }
    }, [])

    // Calculer les classes avec les icônes
    const hasLeftElement = leftIcon || prefix
    const hasRightElement = rightIcon || rightAction || suffix || loading || isValidating

    const inputClasses = cn(
      inputVariants({ variant: inputVariant, size }),
      {
        'pl-10': hasLeftElement && size === 'md',
        'pl-9': hasLeftElement && size === 'sm',
        'pl-12': hasLeftElement && size === 'lg',
        'pr-10': hasRightElement && size === 'md',
        'pr-9': hasRightElement && size === 'sm',
        'pr-12': hasRightElement && size === 'lg'
      },
      className
    )

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {label}
          </label>
        )}

        {/* Input container */}
        <div className="relative">
          {/* Préfixe */}
          {prefix && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                {prefix}
              </span>
            </div>
          )}

          {/* Icône gauche */}
          {leftIcon && <InputIcon icon={leftIcon} position="left" />}

          {/* Champ input */}
          <input
            ref={ref}
            id={inputId}
            className={inputClasses}
            onChange={handleChange}
            onBlur={handleBlur}
            {...props}
          />

          {/* Éléments à droite */}
          <div className="absolute inset-y-0 right-0 flex items-center">
            {/* Loading/Validation spinner */}
            {(loading || isValidating) && (
              <div className="mr-3">
                <LoadingSpinner />
              </div>
            )}

            {/* Icône droite */}
            {rightIcon && !loading && !isValidating && (
              <InputIcon icon={rightIcon} position="right" />
            )}

            {/* Suffixe */}
            {suffix && !loading && !isValidating && !rightIcon && (
              <div className="mr-3 pointer-events-none">
                <span className="text-gray-500 dark:text-gray-400 text-sm">
                  {suffix}
                </span>
              </div>
            )}

            {/* Action à droite */}
            {rightAction && !loading && !isValidating && (
              <div className="mr-2">
                {rightAction}
              </div>
            )}
          </div>
        </div>

        {/* Message d'aide ou d'erreur */}
        {(helpText || currentError) && (
          <div className="mt-1">
            {currentError ? (
              <p className="text-xs text-danger-600 dark:text-danger-400 flex items-center">
                <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {currentError}
              </p>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {helpText}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

// ==================== SPECIALIZED INPUTS ====================

// ==================== SEARCH INPUT ====================

interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'type'> {
  onSearch?: (value: string) => void
  onClear?: () => void
  showClearButton?: boolean
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearch, onClear, showClearButton = true, value, onChange, ...props }, ref) => {
    const [searchValue, setSearchValue] = useState(value || '')

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value
      setSearchValue(newValue)
      onChange?.(event)
      onSearch?.(newValue)
    }

    const handleClear = () => {
      setSearchValue('')
      onClear?.()
      if (onChange) {
        onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)
      }
    }

    const searchIcon = (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    )

    const clearButton = showClearButton && searchValue && (
      <button
        type="button"
        onClick={handleClear}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    )

    return (
      <Input
        ref={ref}
        type="search"
        value={searchValue}
        onChange={handleChange}
        leftIcon={searchIcon}
        rightAction={clearButton}
        {...props}
      />
    )
  }
)

SearchInput.displayName = 'SearchInput'

// ==================== PASSWORD INPUT ====================

interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightIcon'> {
  showToggle?: boolean
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showToggle = true, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)

    const togglePassword = () => setShowPassword(!showPassword)

    const toggleButton = showToggle && (
      <button
        type="button"
        onClick={togglePassword}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        {showPassword ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    )

    return (
      <Input
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        rightAction={toggleButton}
        {...props}
      />
    )
  }
)

PasswordInput.displayName = 'PasswordInput'

// ==================== EXPORTS ====================

export { inputVariants }

// ==================== EXAMPLES ====================

/**
 * Exemples d'utilisation:
 *
 * // Input basique
 * <Input
 *   label="Email"
 *   placeholder="votre@email.com"
 *   type="email"
 * />
 *
 * // Input avec validation
 * <Input
 *   label="Username"
 *   validate={(value) => value.length < 3 ? 'Au moins 3 caractères' : null}
 *   helpText="3 caractères minimum"
 * />
 *
 * // Search input
 * <SearchInput
 *   placeholder="Rechercher..."
 *   onSearch={(value) => console.log('Search:', value)}
 * />
 *
 * // Password input
 * <PasswordInput
 *   label="Mot de passe"
 *   placeholder="••••••••"
 * />
 *
 * // Input avec icônes
 * <Input
 *   label="Localisation"
 *   leftIcon={<LocationIcon />}
 *   rightAction={<GPSButton />}
 * />
 */
