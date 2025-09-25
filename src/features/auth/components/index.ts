/**
 * Auth Components Export Index
 * Point d'entrée centralisé pour tous les composants d'authentification
 */

export { LoginModal } from './LoginModal'
export { AuthGuard, RouteGuard, useAuthGuard } from './AuthGuard'
export { UserMenu, UserQuickActions } from './UserMenu'

// Re-export types for convenience
export type {
  LoginModalProps,
  AuthGuardProps,
  UserMenuProps
} from '../types'