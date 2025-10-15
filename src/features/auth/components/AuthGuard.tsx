/**
 * AuthGuard Component - Protection des routes et composants
 * Composant HOC pour protéger l'accès aux fonctionnalités authentifiées
 */

import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { User, Shield, AlertTriangle } from 'lucide-react'
import { Card, Button, Badge } from '@/shared/ui/components'
import { useAuth } from '../hooks/useAuth'
import { logger } from '@/core/utils/logger'
import type { AuthGuardProps, User as UserType } from '../types'

// ==================== LOGGER SETUP ====================

const guardLog = {
  debug: (msg: string, data?: unknown) => logger.debug('auth-guard', msg, data),
  info: (msg: string, data?: unknown) => logger.info('auth-guard', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('auth-guard', msg, data),
  error: (msg: string, data?: unknown) => logger.error('auth-guard', msg, data)
}

// ==================== FALLBACK COMPONENTS ====================

interface UnauthenticatedFallbackProps {
  onLogin?: () => void
}

const UnauthenticatedFallback: React.FC<UnauthenticatedFallbackProps> = ({ onLogin }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
    <Card className="max-w-md w-full text-center">
      <div className="p-6">
        <div className="w-16 h-16 bg-trackbee-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-trackbee-600" />
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Bienvenue sur TrackBee
        </h2>

        <p className="text-gray-600 mb-6">
          Connectez-vous pour accéder à vos devices IoT et gérer vos campagnes GNSS.
        </p>

        <Button
          onClick={onLogin}
          size="lg"
          leftIcon={<User className="w-4 h-4" />}
        >
          Se connecter
        </Button>
      </div>
    </Card>
  </div>
)

interface UnauthorizedFallbackProps {
  requiredRole: UserType['role']
  userRole?: UserType['role']
}

const UnauthorizedFallback: React.FC<UnauthorizedFallbackProps> = ({
  requiredRole,
  userRole
}) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
    <Card variant="warning" className="max-w-md w-full text-center">
      <div className="p-6">
        <div className="w-16 h-16 bg-warning-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-warning-600" />
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Accès restreint
        </h2>

        <p className="text-gray-600 mb-4">
          Cette section nécessite le rôle <Badge variant="warning" size="sm">{requiredRole}</Badge>.
        </p>

        {userRole && (
          <p className="text-sm text-gray-500 mb-6">
            Votre rôle actuel : <Badge variant="secondary" size="sm">{userRole}</Badge>
          </p>
        )}

        <Button
          variant="outline"
          onClick={() => window.history.back()}
          leftIcon={<AlertTriangle className="w-4 h-4" />}
        >
          Retour
        </Button>
      </div>
    </Card>
  </div>
)

const LoadingFallback: React.FC<Record<string, never>> = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
    <Card className="max-w-md w-full text-center">
      <div className="p-6">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <User className="w-8 h-8 text-gray-400" />
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Vérification...
        </h2>

        <p className="text-gray-600">
          Vérification de votre authentification en cours.
        </p>

        <div className="mt-4 flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-trackbee-500" />
        </div>
      </div>
    </Card>
  </div>
)

// ==================== UTILITY FUNCTIONS ====================

const hasRequiredRole = (userRole: UserType['role'] | undefined, requiredRole: UserType['role']): boolean => {
  if (!userRole || !requiredRole) return true

  // Hiérarchie des rôles
  const roleHierarchy: Record<NonNullable<UserType['role']>, number> = {
    viewer: 1,
    user: 2,
    admin: 3
  }

  const userLevel = roleHierarchy[userRole as NonNullable<UserType['role']>] || 0
  const requiredLevel = roleHierarchy[requiredRole as NonNullable<UserType['role']>] || 0

  return userLevel >= requiredLevel
}

// ==================== MAIN COMPONENT ====================

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback,
  redirectTo,
  requireRole
}) => {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const [_showLoginModal, setShowLoginModal] = React.useState(false)

  // Log guard access attempt
  React.useEffect(() => {
    guardLog.debug('Auth guard accessed', {
      pathname: location.pathname,
      isAuthenticated,
      userRole: user?.role,
      requireRole,
      isLoading
    })
  }, [location.pathname, isAuthenticated, user?.role, requireRole, isLoading])

  // Handle loading state
  if (isLoading) {
    guardLog.debug('Auth guard showing loading state')
    return fallback || <LoadingFallback />
  }

  // Handle unauthenticated user
  if (!isAuthenticated || !user) {
    guardLog.info('Access denied - user not authenticated', {
      pathname: location.pathname
    })

    // Redirect if specified
    if (redirectTo) {
      return (
        <Navigate
          to={redirectTo}
          state={{ from: location }}
          replace
        />
      )
    }

    // Show custom fallback or default unauthenticated fallback
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <>
        <UnauthenticatedFallback onLogin={() => setShowLoginModal(true)} />
        {/* Note: LoginModal would need to be imported and used here */}
      </>
    )
  }

  // Handle role-based authorization
  if (requireRole && !hasRequiredRole(user.role, requireRole)) {
    guardLog.warn('Access denied - insufficient role', {
      pathname: location.pathname,
      userRole: user.role,
      requireRole
    })

    return (
      <UnauthorizedFallback
        requiredRole={requireRole}
        userRole={user.role}
      />
    )
  }

  // Access granted
  guardLog.debug('Access granted', {
    pathname: location.pathname,
    userId: user.id,
    userRole: user.role
  })

  return <>{children}</>
}

AuthGuard.displayName = 'AuthGuard'

// ==================== HOOK VERSION ====================

interface UseAuthGuardOptions {
  requireRole?: UserType['role']
  redirectTo?: string
}

interface UseAuthGuardReturn {
  isAllowed: boolean
  isLoading: boolean
  user: UserType | null
  reason?: 'unauthenticated' | 'insufficient_role' | 'loading'
}

export const useAuthGuard = (options: UseAuthGuardOptions = {}): UseAuthGuardReturn => {
  const { requireRole, redirectTo: _redirectTo } = options
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  return React.useMemo(() => {
    if (isLoading) {
      return {
        isAllowed: false,
        isLoading: true,
        user: null,
        reason: 'loading'
      }
    }

    if (!isAuthenticated || !user) {
      guardLog.info('useAuthGuard - user not authenticated', {
        pathname: location.pathname
      })

      return {
        isAllowed: false,
        isLoading: false,
        user: null,
        reason: 'unauthenticated'
      }
    }

    if (requireRole && !hasRequiredRole(user.role, requireRole)) {
      guardLog.warn('useAuthGuard - insufficient role', {
        pathname: location.pathname,
        userRole: user.role,
        requireRole
      })

      return {
        isAllowed: false,
        isLoading: false,
        user,
        reason: 'insufficient_role'
      }
    }

    return {
      isAllowed: true,
      isLoading: false,
      user
    }
  }, [isLoading, isAuthenticated, user, requireRole, location.pathname])
}

// ==================== ROUTE GUARD WRAPPER ====================

interface RouteGuardProps extends AuthGuardProps {
  path?: string
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  path,
  ...guardProps
}) => {
  const { isAllowed, reason } = useAuthGuard({
    requireRole: guardProps.requireRole
  })

  if (!isAllowed && reason === 'unauthenticated' && guardProps.redirectTo) {
    return (
      <Navigate
        to={guardProps.redirectTo}
        state={{ from: path || window.location.pathname }}
        replace
      />
    )
  }

  return (
    <AuthGuard {...guardProps}>
      {children}
    </AuthGuard>
  )
}

// ==================== EXAMPLES ====================

/**
 * Exemples d'utilisation:
 *
 * // Protection simple
 * <AuthGuard>
 *   <DashboardPage />
 * </AuthGuard>
 *
 * // Avec rôle requis
 * <AuthGuard requireRole="admin">
 *   <AdminPanel />
 * </AuthGuard>
 *
 * // Avec redirection
 * <AuthGuard redirectTo="/login">
 *   <ProtectedContent />
 * </AuthGuard>
 *
 * // Avec fallback personnalisé
 * <AuthGuard
 *   fallback={<CustomLoginPrompt />}
 * >
 *   <UserContent />
 * </AuthGuard>
 *
 * // Utilisation en hook
 * const MyComponent = () => {
 *   const { isAllowed, reason } = useAuthGuard({ requireRole: 'user' })
 *
 *   if (!isAllowed) {
 *     return <div>Accès refusé: {reason}</div>
 *   }
 *
 *   return <div>Contenu protégé</div>
 * }
 */