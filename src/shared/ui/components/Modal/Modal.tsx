/**
 * Modal Component - Composant modal réutilisable
 * Modal avec overlay, animations et gestion accessible
 */

import React, { forwardRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Dialog, Transition } from '@headlessui/react'
import { cn } from '@/shared/utils/cn'
import { Button } from '@/shared/ui/components/Button/Button'

// ==================== TYPES ====================

export interface ModalProps {
  /**
   * État d'ouverture du modal
   */
  isOpen: boolean

  /**
   * Fonction de fermeture
   */
  onClose: () => void

  /**
   * Titre du modal
   */
  title?: string

  /**
   * Description/sous-titre
   */
  description?: string

  /**
   * Contenu du modal
   */
  children: React.ReactNode

  /**
   * Taille du modal
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'

  /**
   * Permettre la fermeture en cliquant sur l'overlay
   */
  closeOnOverlayClick?: boolean

  /**
   * Permettre la fermeture avec Escape
   */
  closeOnEscape?: boolean

  /**
   * Afficher le bouton de fermeture
   */
  showCloseButton?: boolean

  /**
   * Actions du footer
   */
  actions?: React.ReactNode

  /**
   * Classe personnalisée
   */
  className?: string

  /**
   * Classe pour le contenu
   */
  contentClassName?: string

  /**
   * État de chargement
   */
  loading?: boolean

  /**
   * Persister le modal (ne pas unmount)
   */
  persist?: boolean

  /**
   * Z-index personnalisé
   */
  zIndex?: number
}

// ==================== SIZE VARIANTS ====================

const sizeClasses = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-[95vw] max-h-[95vh]'
}

// ==================== MODAL COMPONENT ====================

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      description,
      children,
      size = 'md',
      closeOnOverlayClick = true,
      closeOnEscape = true,
      showCloseButton = true,
      actions,
      className,
      contentClassName,
      loading = false,
      persist = false,
      zIndex = 50
    },
    ref
  ) => {
    // Gestion des événements clavier
    useEffect(() => {
      if (!isOpen || !closeOnEscape) return

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose()
        }
      }

      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }, [isOpen, closeOnEscape, onClose])

    // Bloquer le scroll du body quand le modal est ouvert
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = 'unset'
      }

      return () => {
        document.body.style.overflow = 'unset'
      }
    }, [isOpen])

    // Ne pas rendre si fermé et non persistant
    if (!isOpen && !persist) {
      return null
    }

    const modalContent = (
      <Transition
        show={isOpen}
        as={React.Fragment}
        enter="ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <Dialog
          as="div"
          className="relative"
          style={{ zIndex }}
          onClose={closeOnOverlayClick ? onClose : () => {}}
        >
          {/* Overlay */}
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          </Transition.Child>

          {/* Container */}
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6 lg:p-8">
              {/* Panel */}
              <Transition.Child
                as={React.Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel
                  ref={ref}
                  className={cn(
                    'w-full transform overflow-hidden rounded-lg',
                    'bg-white dark:bg-gray-800',
                    'text-left align-middle shadow-xl transition-all',
                    sizeClasses[size],
                    className
                  )}
                >
                  {/* Header */}
                  {(title || showCloseButton) && (
                    <div className="flex items-center justify-between p-6 pb-4">
                      <div className="flex-1 min-w-0">
                        {title && (
                          <Dialog.Title
                            as="h3"
                            className="text-lg font-semibold leading-6 text-gray-900 dark:text-gray-100"
                          >
                            {title}
                          </Dialog.Title>
                        )}
                        {description && (
                          <Dialog.Description className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {description}
                          </Dialog.Description>
                        )}
                      </div>

                      {showCloseButton && (
                        <button
                          type="button"
                          className={cn(
                            'ml-4 rounded-md p-2 text-gray-400 hover:text-gray-600',
                            'hover:bg-gray-100 dark:hover:bg-gray-700',
                            'focus:outline-none focus:ring-2 focus:ring-trackbee-500',
                            'transition-colors duration-200'
                          )}
                          onClick={onClose}
                        >
                          <span className="sr-only">Fermer</span>
                          <svg
                            className="h-5 w-5"
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
                        </button>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div
                    className={cn(
                      'px-6',
                      !title && !showCloseButton && 'pt-6',
                      !actions && 'pb-6',
                      contentClassName
                    )}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-trackbee-500" />
                      </div>
                    ) : (
                      children
                    )}
                  </div>

                  {/* Footer/Actions */}
                  {actions && (
                    <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4">
                      <div className="flex justify-end space-x-3">
                        {actions}
                      </div>
                    </div>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    )

    // Utiliser un portal pour rendre en dehors de l'arbre DOM
    return createPortal(modalContent, document.body)
  }
)

Modal.displayName = 'Modal'

// ==================== CONFIRMATION MODAL ====================

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'danger',
  loading = false
}) => {
  const variantConfig = {
    danger: {
      icon: (
        <svg className="w-6 h-6 text-danger-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      buttonVariant: 'danger' as const
    },
    warning: {
      icon: (
        <svg className="w-6 h-6 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      buttonVariant: 'warning' as const
    },
    info: {
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      buttonVariant: 'primary' as const
    }
  }

  const config = variantConfig[variant]

  const actions = (
    <>
      <Button
        variant="secondary"
        onClick={onClose}
        disabled={loading}
      >
        {cancelText}
      </Button>
      <Button
        variant={config.buttonVariant}
        onClick={onConfirm}
        loading={loading}
      >
        {confirmText}
      </Button>
    </>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      actions={actions}
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
    >
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          {config.icon}
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {message}
          </p>
        </div>
      </div>
    </Modal>
  )
}

// ==================== FORM MODAL ====================

interface FormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (event: React.FormEvent) => void
  title: string
  description?: string
  children: React.ReactNode
  submitText?: string
  cancelText?: string
  submitDisabled?: boolean
  loading?: boolean
  size?: ModalProps['size']
}

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  children,
  submitText = 'Enregistrer',
  cancelText = 'Annuler',
  submitDisabled = false,
  loading = false,
  size = 'lg'
}) => {
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    onSubmit(event)
  }

  const actions = (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        disabled={loading}
      >
        {cancelText}
      </Button>
      <Button
        type="submit"
        form="modal-form"
        variant="primary"
        disabled={submitDisabled}
        loading={loading}
      >
        {submitText}
      </Button>
    </>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
      actions={actions}
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
    >
      <form id="modal-form" onSubmit={handleSubmit}>
        {children}
      </form>
    </Modal>
  )
}

// ==================== LOADING MODAL ====================

interface LoadingModalProps {
  isOpen: boolean
  title?: string
  message?: string
  progress?: number
  cancellable?: boolean
  onCancel?: () => void
}

export const LoadingModal: React.FC<LoadingModalProps> = ({
  isOpen,
  title = 'Chargement...',
  message,
  progress,
  cancellable = false,
  onCancel
}) => {
  const actions = cancellable && onCancel && (
    <Button variant="secondary" onClick={onCancel}>
      Annuler
    </Button>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title={title}
      size="sm"
      actions={actions}
      closeOnOverlayClick={false}
      closeOnEscape={false}
      showCloseButton={false}
    >
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-trackbee-500 mx-auto mb-4" />

        {message && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {message}
          </p>
        )}

        {typeof progress === 'number' && (
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-trackbee-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </div>
    </Modal>
  )
}

// ==================== COMPOSANTS ATOMIQUES ====================

export interface ModalHeaderProps {
  children: React.ReactNode
  className?: string
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({ children, className }) => {
  return (
    <div className={cn('flex items-center justify-between p-6 pb-4', className)}>
      {children}
    </div>
  )
}

export interface ModalContentProps {
  children: React.ReactNode
  className?: string
}

export const ModalContent: React.FC<ModalContentProps> = ({ children, className }) => {
  return (
    <div className={cn('px-6 py-4', className)}>
      {children}
    </div>
  )
}

export interface ModalFooterProps {
  children: React.ReactNode
  className?: string
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ children, className }) => {
  return (
    <div className={cn('border-t border-gray-200 dark:border-gray-700 px-6 py-4', className)}>
      <div className="flex justify-end space-x-3">
        {children}
      </div>
    </div>
  )
}

// ==================== EXPORTS ====================

// Les composants sont déjà exportés avec export const ci-dessus

// ==================== EXAMPLES ====================

/**
 * Exemples d'utilisation:
 *
 * // Modal basique
 * <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Mon Modal">
 *   <p>Contenu du modal</p>
 * </Modal>
 *
 * // Modal avec actions
 * <Modal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Confirmer l'action"
 *   actions={
 *     <>
 *       <Button variant="secondary" onClick={() => setIsOpen(false)}>
 *         Annuler
 *       </Button>
 *       <Button onClick={handleConfirm}>
 *         Confirmer
 *       </Button>
 *     </>
 *   }
 * >
 *   <p>Êtes-vous sûr de vouloir continuer ?</p>
 * </Modal>
 *
 * // Modal de confirmation
 * <ConfirmationModal
 *   isOpen={showConfirm}
 *   onClose={() => setShowConfirm(false)}
 *   onConfirm={handleDelete}
 *   title="Supprimer l'élément"
 *   message="Cette action est irréversible."
 *   variant="danger"
 * />
 *
 * // Modal de formulaire
 * <FormModal
 *   isOpen={showForm}
 *   onClose={() => setShowForm(false)}
 *   onSubmit={handleSubmit}
 *   title="Nouveau device"
 *   submitText="Créer"
 * >
 *   <Input label="Nom" />
 *   <Input label="MAC Address" />
 * </FormModal>
 */