/**
 * ProfileButton Component - Bouton profil pour header
 * Bouton avec dropdown pour connexion, profil et déconnexion
 */

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/shared/utils/cn'
import { Button } from '@/shared/ui/components/Button/Button'
import { useAuth } from '@/core/state/stores/auth.store'
import { logger } from '@/core/utils/logger'

// ==================== TYPES ====================

export interface ProfileButtonProps {
  /**
   * Callback pour ouvrir le modal de connexion
   */
  onOpenLogin?: () => void

  /**
   * Callback pour naviguer vers le profil
   */
  onOpenProfile?: () => void

  /**
   * Classes personnalisées
   */
  className?: string
}

// ==================== PROFILE BUTTON COMPONENT ====================

export const ProfileButton: React.FC<ProfileButtonProps> = ({
  onOpenLogin,
  onOpenProfile,
  className
}) => {
  const authState = useAuth()
  const { user, isAuthenticated, logout, isLoading, isInitialized } = authState

  // Debug minimal uniquement en cas de problème
  if (import.meta.env.DEV && isInitialized && isAuthenticated && !user) {
    logger.warn('profile-button', 'Auth state inconsistent', { isAuthenticated, hasUser: Boolean(user) })
  }

  // Vérification plus robuste de l'état d'authentification
  // On attend que l'initialisation soit terminée ET que l'utilisateur soit vraiment connecté
  const isReallyAuthenticated = isInitialized && isAuthenticated && user && user.email
  const isStillInitializing = !isInitialized || isLoading


  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Auto-repair si état incohérent
  useEffect(() => {
    if (isInitialized && isAuthenticated && !user && authState.initialize) {
      authState.initialize()
    }
  }, [isInitialized, isAuthenticated, user, authState])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleLogin = () => {
    setIsOpen(false)
    onOpenLogin?.()
  }

  const handleProfile = () => {
    setIsOpen(false)
    onOpenProfile?.()
  }

  const handleLogout = async () => {
    setIsOpen(false)
    try {
      await logout()
    } catch (error) {
      logger.error('profile-button', 'Logout failed', { error })
    }
  }

  // User avatar or login icon
  const renderAvatar = () => {
    if (isReallyAuthenticated && user) {
      const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase()
      return (
        <div className="w-8 h-8 rounded-full bg-trackbee-500 flex items-center justify-center text-white text-sm font-semibold">
          {initials || (user.email ? user.email?.charAt(0).toUpperCase() : '?')}
        </div>
      )
    }

    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )
  }

  // Show loading state during initialization
  if (isStillInitializing) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled={true}
        className={cn("flex items-center space-x-2", className)}
      >
        <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-300 border-t-trackbee-500"></div>
        <span className="hidden sm:inline text-sm">Chargement...</span>
      </Button>
    )
  }

  // If user is not authenticated OR still initializing, show appropriate button
  if (!isReallyAuthenticated) {
    // Si on est en cours d'initialisation et qu'on a des données auth, montrer un état de chargement
    if (isStillInitializing && (authState.token || isAuthenticated)) {
      return (
        <Button
          variant="ghost"
          size="sm"
          disabled={true}
          className={cn("flex items-center space-x-2", className)}
        >
          <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-300 border-t-trackbee-500"></div>
          <span className="hidden sm:inline text-sm">Vérification...</span>
        </Button>
      )
    }

    // Sinon afficher le bouton de connexion normal
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogin}
        disabled={isLoading}
        className={cn("flex items-center space-x-2", className)}
      >
        {renderAvatar()}
        <span className="hidden sm:inline text-sm">Connexion</span>
      </Button>
    )
  }

  // Authenticated user dropdown
  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2"
      >
        {renderAvatar()}
        <span className="hidden sm:inline text-sm max-w-24 truncate">
          {user?.firstName || user?.email?.split('@')[0]}
        </span>
        <svg
          className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
          {/* User Info */}
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.email
              }
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {user?.email}
            </p>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              type="button"
              onClick={handleProfile}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Mon Profil</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoading}
              className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>{isLoading ? 'Déconnexion...' : 'Se déconnecter'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

ProfileButton.displayName = 'ProfileButton'
