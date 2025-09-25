/**
 * Header Component - En-tête de l'application
 * Header responsive avec navigation, titre et actions
 */

import React from 'react'
import { cn } from '@/shared/utils/cn'
import { Button } from '@/shared/ui/components/Button/Button'
import { Badge } from '@/shared/ui/components/Badge/Badge'

// ==================== TYPES ====================

export interface HeaderProps {
  /**
   * Titre affiché dans le header
   */
  title?: string

  /**
   * Logo/icône de l'application
   */
  logo?: React.ReactNode

  /**
   * Actions à droite du header
   */
  actions?: React.ReactNode

  /**
   * Callback pour le bouton menu mobile
   */
  onMenuClick?: () => void

  /**
   * Afficher le bouton menu
   */
  showMenuButton?: boolean

  /**
   * Notifications badge
   */
  notificationCount?: number

  /**
   * Mode compact (hauteur réduite)
   */
  compact?: boolean

  /**
   * Classes personnalisées
   */
  className?: string
}

// ==================== HEADER COMPONENT ====================

export const Header: React.FC<HeaderProps> = ({
  title,
  logo,
  actions,
  onMenuClick,
  showMenuButton = false,
  notificationCount = 0,
  compact = false,
  className
}) => {
  const defaultLogo = (
    <div className="flex items-center space-x-2">
      <div className="w-8 h-8 bg-trackbee-500 rounded-lg flex items-center justify-center">
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
        TrackBee
      </span>
    </div>
  )

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-700',
        'bg-white/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60',
        'dark:supports-[backdrop-filter]:bg-gray-900/60',
        compact ? 'h-14' : 'h-16',
        className
      )}
    >
      <div className="mx-auto flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Menu Button Mobile */}
          {showMenuButton && (
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={onMenuClick}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          )}

          {/* Logo */}
          <div className="flex items-center">
            {logo || defaultLogo}
          </div>

          {/* Title */}
          {title && (
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h1>
            </div>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2">
          {/* Notifications */}
          {notificationCount > 0 && (
            <div className="relative">
              <Button variant="ghost" size="sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-3.5-3.5-1.5 1.5zM9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Button>
              <Badge
                variant="solid-danger"
                size="xs"
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center"
              >
                {notificationCount > 99 ? '99+' : notificationCount}
              </Badge>
            </div>
          )}

          {/* Custom Actions */}
          {actions}
        </div>
      </div>
    </header>
  )
}

Header.displayName = 'Header'

// ==================== BREADCRUMB COMPONENT ====================

export interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  separator?: React.ReactNode
  className?: string
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator,
  className
}) => {
  const defaultSeparator = (
    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )

  return (
    <nav className={cn('flex', className)} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <span className="mx-2 flex-shrink-0">
                {separator || defaultSeparator}
              </span>
            )}

            {item.current ? (
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {item.label}
              </span>
            ) : (
              <a
                href={item.href}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
              >
                {item.label}
              </a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

// ==================== STATUS BAR COMPONENT ====================

export interface StatusBarProps {
  /**
   * Status de connexion
   */
  connectionStatus?: 'online' | 'offline' | 'syncing'

  /**
   * Nombre d'appareils connectés
   */
  devicesConnected?: number

  /**
   * Dernière synchronisation
   */
  lastSync?: Date

  /**
   * Mode debug actif
   */
  debugMode?: boolean

  /**
   * Classes personnalisées
   */
  className?: string
}

export const StatusBar: React.FC<StatusBarProps> = ({
  connectionStatus = 'offline',
  devicesConnected = 0,
  lastSync,
  debugMode = false,
  className
}) => {
  const statusConfig = {
    online: {
      color: 'text-success-600',
      icon: '●',
      label: 'En ligne'
    },
    offline: {
      color: 'text-gray-500',
      icon: '●',
      label: 'Hors ligne'
    },
    syncing: {
      color: 'text-warning-600',
      icon: '●',
      label: 'Synchronisation...'
    }
  }

  const status = statusConfig[connectionStatus]

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-2 text-xs',
        'bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700',
        className
      )}
    >
      <div className="flex items-center space-x-4">
        {/* Connection Status */}
        <div className="flex items-center space-x-1">
          <span className={cn(status.color, 'animate-pulse')}>{status.icon}</span>
          <span className="text-gray-600 dark:text-gray-400">{status.label}</span>
        </div>

        {/* Devices Count */}
        <div className="flex items-center space-x-1">
          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span className="text-gray-600 dark:text-gray-400">
            {devicesConnected} device{devicesConnected !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Debug Mode */}
        {debugMode && (
          <Badge variant="warning" size="xs">
            DEBUG
          </Badge>
        )}

        {/* Last Sync */}
        {lastSync && (
          <span className="text-gray-500 dark:text-gray-400">
            Sync: {lastSync.toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  )
}

// ==================== EXAMPLES ====================

/**
 * Exemples d'utilisation:
 *
 * // Header basique
 * <Header
 *   title="Dashboard"
 *   notificationCount={3}
 *   actions={
 *     <Button variant="primary" size="sm">
 *       Nouveau
 *     </Button>
 *   }
 * />
 *
 * // Header avec breadcrumb
 * <div>
 *   <Header title="Device Detail" />
 *   <div className="px-4 py-2 border-b">
 *     <Breadcrumb
 *       items={[
 *         { label: 'Devices', href: '/devices' },
 *         { label: 'TRB-001', current: true }
 *       ]}
 *     />
 *   </div>
 * </div>
 *
 * // Header avec status bar
 * <div>
 *   <Header title="TrackBee Control" />
 *   <StatusBar
 *     connectionStatus="online"
 *     devicesConnected={2}
 *     lastSync={new Date()}
 *     debugMode={true}
 *   />
 * </div>
 */