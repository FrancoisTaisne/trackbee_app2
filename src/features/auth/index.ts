/**
 * Auth Feature Export Index
 * Point d'entrée centralisé pour toute la feature d'authentification
 */

// ==================== HOOKS ====================
export { useAuth, useAuthStore, useAuthTokenRefresh, useAuthInit } from './hooks/useAuth'
export { useSession, useSessionMonitor, useSessionStorage } from './hooks/useSession'

// ==================== COMPONENTS ====================
export { LoginModal } from './components/LoginModal'
export { AuthGuard, RouteGuard, useAuthGuard } from './components/AuthGuard'
export { UserMenu, UserQuickActions } from './components/UserMenu'

// ==================== PAGES ====================
export { ProfilePage } from './pages/ProfilePage'

// ==================== TYPES ====================
export type {
  User,
  AuthSession,
  AuthState,
  LoginCredentials,
  RegisterData,
  UseAuthReturn,
  UseSessionReturn,
  LoginModalProps,
  AuthGuardProps,
  UserMenuProps,
  AuthError,
  AuthMode
} from './types'

// ==================== FEATURE INFO ====================

/**
 * Auth Feature - Gestion complète de l'authentification
 *
 * @description
 * Feature d'authentification moderne avec gestion de session,
 * protection des routes, et interface utilisateur complète.
 *
 * @features
 * - Authentification JWT avec refresh tokens
 * - Gestion d'état avec Zustand + persistence
 * - Protection des routes et composants
 * - Interface de connexion/inscription
 * - Gestion du profil utilisateur
 * - Monitoring de session avec alertes d'expiration
 * - Support multi-rôles (admin, user, viewer)
 * - Stockage sécurisé cross-platform
 *
 * @usage
 * ```typescript
 * import { useAuth, AuthGuard, LoginModal } from '@/features/auth'
 *
 * // Hook d'authentification
 * const { user, login, logout, isAuthenticated } = useAuth()
 *
 * // Protection de route
 * <AuthGuard requireRole="user">
 *   <ProtectedContent />
 * </AuthGuard>
 *
 * // Modal de connexion
 * <LoginModal
 *   isOpen={showLogin}
 *   onClose={() => setShowLogin(false)}
 *   onLoginSuccess={(session) => navigate('/dashboard')}
 * />
 * ```
 *
 * @architecture
 * - Hooks: useAuth, useSession, useAuthGuard
 * - Components: LoginModal, AuthGuard, UserMenu
 * - Pages: ProfilePage
 * - Store: Zustand avec persistence StorageManager
 * - API: HttpClient avec auto-refresh de tokens
 *
 * @security
 * - Tokens JWT avec expiration
 * - Refresh automatique des tokens
 * - Stockage sécurisé des credentials
 * - Protection CSRF et XSS
 * - Validation côté client et serveur
 */

export const AuthFeatureInfo = {
  name: 'Auth Feature',
  version: '1.0.0',
  description: 'Gestion complète de l\'authentification TrackBee',
  dependencies: [
    '@/core/services/storage/StorageManager',
    '@/core/services/api/HttpClient',
    '@/shared/ui/components',
    'zustand',
    'react-router-dom'
  ],
  exports: {
    hooks: ['useAuth', 'useSession', 'useAuthGuard'],
    components: ['LoginModal', 'AuthGuard', 'UserMenu'],
    pages: ['ProfilePage'],
    types: ['User', 'AuthSession', 'LoginCredentials', 'RegisterData']
  }
} as const