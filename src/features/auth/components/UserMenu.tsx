/**
 * UserMenu Component - Menu utilisateur avec profil et déconnexion
 * Composant réutilisable pour afficher les informations et actions utilisateur
 */

import React, { useState } from 'react'
import { LogOut, Settings, User, ChevronDown, Shield } from 'lucide-react'
import { Button, Badge, Card } from '@/shared/ui/components'
import { useAuth } from '../hooks/useAuth'
import { useSessionMonitor } from '../hooks/useSession'
import { logger } from '@/core/utils/logger'
import type { UserMenuProps, User as UserType } from '../types'

// ==================== LOGGER SETUP ====================

const userMenuLog = {
  debug: (msg: string, data?: unknown) => logger.debug('user-menu', msg, data),
  info: (msg: string, data?: unknown) => logger.info('user-menu', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('user-menu', msg, data)
}

// ==================== UTILITY FUNCTIONS ====================

const getAvatarFallback = (user: UserType): string => {
  if (user.name) {
    return user.name.charAt(0).toUpperCase()
  }
  if (user.firstName) {
    return user.firstName.charAt(0).toUpperCase()
  }
  return user.email.charAt(0).toUpperCase()
}

const getUserDisplayName = (user: UserType): string => {
  return user.name || user.firstName || user.email?.split('@')[0] || 'Utilisateur'
}

const getRoleBadgeVariant = (role: UserType['role']) => {
  switch (role) {
    case 'admin':
      return 'solid-danger' as const
    case 'user':
      return 'primary' as const
    case 'viewer':
      return 'secondary' as const
    default:
      return 'secondary' as const
  }
}

const getRoleLabel = (role: UserType['role']): string => {
  switch (role) {
    case 'admin':
      return 'Administrateur'
    case 'user':
      return 'Utilisateur'
    case 'viewer':
      return 'Lecture seule'
    default:
      return 'Utilisateur'
  }
}

// ==================== AVATAR COMPONENT ====================

interface UserAvatarProps {
  user: UserType
  size?: 'sm' | 'md' | 'lg'
  showOnlineStatus?: boolean
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  showOnlineStatus = false
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  }

  const statusSize = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-3 h-3'
  }

  return (
    <div className="relative">
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={getUserDisplayName(user)}
          className={`${sizeClasses[size]} rounded-full object-cover border-2 border-gray-200`}
        />
      ) : (
        <div
          className={`
            ${sizeClasses[size]} rounded-full
            bg-trackbee-500 text-white font-semibold
            flex items-center justify-center
            border-2 border-gray-200
          `}
        >
          {getAvatarFallback(user)}
        </div>
      )}

      {showOnlineStatus && (
        <div
          className={`
            absolute -bottom-0 -right-0
            ${statusSize[size]} rounded-full
            bg-success-500 border-2 border-white
          `}
          title="En ligne"
        />
      )}
    </div>
  )
}

// ==================== SESSION STATUS COMPONENT ====================

const SessionStatus: React.FC = () => {
  const { timeRemaining, isNearExpiry } = useSessionMonitor({
    warningThreshold: 5 * 60 // 5 minutes
  })

  if (!isNearExpiry) return null

  return (
    <div className="px-3 py-2 bg-warning-50 border-t border-warning-200">
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-warning-500 rounded-full animate-pulse" />
        <span className="text-xs text-warning-700">
          Session expire dans {timeRemaining}
        </span>
      </div>
    </div>
  )
}

// ==================== DROPDOWN MENU COMPONENT ====================

interface UserMenuDropdownProps {
  user: UserType
  onProfile: () => void
  onSettings: () => void
  onLogout: () => void
  onClose: () => void
}

const UserMenuDropdown: React.FC<UserMenuDropdownProps> = ({
  user,
  onProfile,
  onSettings,
  onLogout,
  onClose
}) => {
  const handleAction = (action: () => void) => {
    action()
    onClose()
  }

  return (
    <div className="absolute top-full right-0 mt-2 w-64 z-50">
      <Card className="p-0 shadow-lg border border-gray-200">
        {/* User Info Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <UserAvatar user={user} size="md" showOnlineStatus />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {getUserDisplayName(user)}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user.email}
              </p>
              {user.role && (
                <Badge
                  variant={getRoleBadgeVariant(user.role)}
                  size="xs"
                  className="mt-1"
                >
                  {getRoleLabel(user.role)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Menu Actions */}
        <div className="py-2">
          <button
            onClick={() => handleAction(onProfile)}
            className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <User className="w-4 h-4" />
            <span>Mon profil</span>
          </button>

          <button
            onClick={() => handleAction(onSettings)}
            className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Paramètres</span>
          </button>

          {user.role === 'admin' && (
            <button
              onClick={() => handleAction(() => userMenuLog.info('Admin panel shortcut clicked'))}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span>Administration</span>
            </button>
          )}
        </div>

        {/* Session Status */}
        <SessionStatus />

        {/* Logout */}
        <div className="border-t border-gray-100">
          <button
            onClick={() => handleAction(onLogout)}
            className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Se déconnecter</span>
          </button>
        </div>
      </Card>
    </div>
  )
}

// ==================== MAIN COMPONENT ====================

export const UserMenu: React.FC<UserMenuProps> = ({
  user,
  onLogout,
  onProfile,
  compact = false,
  showAvatar = true,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const { logout } = useAuth()

  const handleLogout = async () => {
    try {
      userMenuLog.info('User logout requested via menu')
      await logout()
      onLogout()
    } catch (error) {
      userMenuLog.warn('Logout failed', error)
      // Still call onLogout callback even if API fails
      onLogout()
    }
  }

  const handleProfile = () => {
    userMenuLog.debug('Profile requested via menu')
    onProfile()
  }

  const handleSettings = () => {
    userMenuLog.debug('Settings requested via menu')
    // For now, redirect to profile (can be extended later)
    onProfile()
  }

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('[data-user-menu]')) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }

    return undefined
  }, [isOpen])

  if (compact) {
    return (
      <div className={`relative ${className || ''}`} data-user-menu>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title={getUserDisplayName(user)}
        >
          <UserAvatar user={user} size="sm" />
        </button>

        {isOpen && (
          <UserMenuDropdown
            user={user}
            onProfile={handleProfile}
            onSettings={handleSettings}
            onLogout={handleLogout}
            onClose={() => setIsOpen(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className={`relative ${className || ''}`} data-user-menu>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
      >
        {showAvatar && <UserAvatar user={user} size="md" />}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {getUserDisplayName(user)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {user.email}
          </p>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <UserMenuDropdown
          user={user}
          onProfile={handleProfile}
          onSettings={handleSettings}
          onLogout={handleLogout}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

UserMenu.displayName = 'UserMenu'

// ==================== QUICK ACTIONS COMPONENT ====================

interface UserQuickActionsProps {
  user: UserType
  onLogout: () => void
  className?: string
}

export const UserQuickActions: React.FC<UserQuickActionsProps> = ({
  user,
  onLogout,
  className
}) => {
  const { logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
      onLogout()
    } catch (error) {
      userMenuLog.warn('Quick logout failed', error)
      onLogout()
    }
  }

  return (
    <div className={`flex items-center space-x-2 ${className || ''}`}>
      <div className="flex items-center space-x-2">
        <UserAvatar user={user} size="sm" />
        <span className="text-sm text-gray-700 hidden sm:inline">
          {getUserDisplayName(user)}
        </span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        leftIcon={<LogOut className="w-4 h-4" />}
        title="Se déconnecter"
      >
        <span className="hidden sm:inline">Déconnexion</span>
      </Button>
    </div>
  )
}

// ==================== EXAMPLES ====================

/**
 * Exemples d'utilisation:
 *
 * // Menu utilisateur complet
 * <UserMenu
 *   user={currentUser}
 *   onLogout={() => navigate('/')}
 *   onProfile={() => navigate('/profile')}
 * />
 *
 * // Version compacte
 * <UserMenu
 *   user={currentUser}
 *   onLogout={handleLogout}
 *   onProfile={handleProfile}
 *   compact={true}
 * />
 *
 * // Actions rapides
 * <UserQuickActions
 *   user={currentUser}
 *   onLogout={handleLogout}
 * />
 *
 * // Avatar seul
 * <UserAvatar
 *   user={currentUser}
 *   size="lg"
 *   showOnlineStatus={true}
 * />
 */
