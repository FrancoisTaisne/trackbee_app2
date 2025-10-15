/**
 * Sidebar Component - Navigation latérale
 * Sidebar responsive avec navigation principale et liens rapides
 */

import React from 'react'
import { cn } from '@/shared/utils/cn'
import { Badge } from '@/shared/ui/components/Badge/Badge'
import { useHydrate } from '@/core/hooks/useHydrate'
import { useAuth } from '@/core/state/stores/auth.store'

// ==================== TYPES ====================

export interface SidebarItem {
  id: string
  label: string
  icon: React.ReactNode
  href?: string
  onClick?: () => void
  badge?: {
    content: string | number
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  }
  active?: boolean
  disabled?: boolean
  children?: SidebarItem[]
}

export interface SidebarProps {
  /**
   * État d'ouverture (mobile)
   */
  isOpen?: boolean

  /**
   * Callback de fermeture
   */
  onClose?: () => void

  /**
   * Items de navigation
   */
  items?: SidebarItem[]

  /**
   * Section footer
   */
  footer?: React.ReactNode

  /**
   * Mode compact (icônes seulement)
   */
  compact?: boolean

  /**
   * Classes personnalisées
   */
  className?: string
}

// ==================== DEFAULT NAVIGATION ITEMS ====================

/**
 * Construit les items de navigation par défaut avec le nombre de devices
 */
const buildDefaultItems = (deviceCount = 0, isAuthenticated = false): SidebarItem[] => {
  const items: SidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5v6m8-6v6" />
        </svg>
      )
    },
    {
      id: 'sites',
      label: 'Sites',
      href: '/sites',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    {
      id: 'devices',
      label: 'Mes TrackBee',
      href: '/devices',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      ),
      badge: deviceCount > 0 ? { content: deviceCount, variant: 'primary' } : undefined
    },
    {
      id: 'campaigns',
      label: 'Missions',
      href: '/campaigns',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    {
      id: 'processing',
      label: 'Résultats',
      href: '/processing',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 'settings',
      label: 'Paramètres',
      href: '/settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    {
      id: 'profile',
      label: 'Profil',
      href: '/profile',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ]

  // Ajouter "Se déconnecter" si l'utilisateur est connecté
  if (isAuthenticated) {
    items.push({
      id: 'logout',
      label: 'Se déconnecter',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      )
    })
  }

  return items
}

// ==================== SIDEBAR ITEM COMPONENT ====================

const SidebarItemComponent: React.FC<{
  item: SidebarItem
  compact?: boolean
  onItemClick?: (item: SidebarItem) => void
}> = ({ item, compact = false, onItemClick }) => {
  const handleClick = (e: React.MouseEvent) => {
    if (item.disabled) {
      e.preventDefault()
      return
    }

    if (item.onClick) {
      e.preventDefault()
      item.onClick()
    }

    onItemClick?.(item)
  }

  const content = (
    <>
      <div className="flex-shrink-0">
        {item.icon}
      </div>

      {!compact && (
        <>
          <span className="flex-1 truncate">
            {item.label}
          </span>

          {item.badge && (
            <Badge
              variant={item.badge.variant || 'default'}
              size="xs"
            >
              {item.badge.content}
            </Badge>
          )}
        </>
      )}
    </>
  )

  const baseClasses = cn(
    'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    'hover:bg-gray-100 dark:hover:bg-gray-700',
    'focus:outline-none focus:ring-2 focus:ring-trackbee-500 focus:ring-offset-2',
    {
      'bg-trackbee-100 text-trackbee-700 dark:bg-trackbee-900/50 dark:text-trackbee-300': item.active,
      'text-gray-700 dark:text-gray-300': !item.active && !item.disabled,
      'text-gray-400 dark:text-gray-600 cursor-not-allowed': item.disabled,
      'justify-center': compact
    }
  )

  if (item.href && !item.disabled) {
    return (
      <a
        href={item.href}
        className={baseClasses}
        onClick={handleClick}
      >
        {content}
      </a>
    )
  }

  return (
    <button
      type="button"
      className={cn(baseClasses, 'w-full text-left')}
      onClick={handleClick}
      disabled={item.disabled}
    >
      {content}
    </button>
  )
}

// ==================== SIDEBAR COMPONENT ====================

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen: _isOpen = true,
  onClose,
  items,
  footer,
  compact = false,
  className
}) => {
  const { machines } = useHydrate()
  const { isAuthenticated, logout } = useAuth()
  const deviceCount = machines.length

  const resolvedItems = React.useMemo(() => {
    if (items) {
      return items
    }
    return buildDefaultItems(deviceCount, isAuthenticated)
  }, [items, deviceCount, isAuthenticated])

  const handleItemClick = (item: SidebarItem) => {
    // Gérer la déconnexion
    if (item.id === 'logout') {
      logout()
    }

    if (onClose && window.innerWidth < 1024) {
      onClose()
    }
  }

  return (
    <aside
      className={cn(
        'flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700',
        compact ? 'w-16' : 'w-64',
        'h-full transition-all duration-200',
        className
      )}
    >
      {/* Close Button Mobile */}
      {onClose && (
        <div className="flex justify-end p-4 lg:hidden">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {resolvedItems.map((item) => (
          <SidebarItemComponent
            key={item.id}
            item={item}
            compact={compact}
            onItemClick={handleItemClick}
          />
        ))}
      </nav>

      {/* Footer */}
      {footer && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          {footer}
        </div>
      )}
    </aside>
  )
}

Sidebar.displayName = 'Sidebar'

// ==================== USER MENU COMPONENT ====================

export interface UserMenuProps {
  user?: {
    name: string
    email: string
    avatar?: string
  }
  onProfileClick?: () => void
  onSettingsClick?: () => void
  onLogoutClick?: () => void
  compact?: boolean
  className?: string
}

export const UserMenu: React.FC<UserMenuProps> = ({
  user,
  onProfileClick,
  onSettingsClick,
  onLogoutClick,
  compact = false,
  className
}) => {
  if (!user) return null

  const avatar = user.avatar ? (
    <img
      src={user.avatar}
      alt={user.name}
      className="w-8 h-8 rounded-full"
    />
  ) : (
    <div className="w-8 h-8 bg-trackbee-500 rounded-full flex items-center justify-center">
      <span className="text-sm font-medium text-white">
        {user.name.charAt(0).toUpperCase()}
      </span>
    </div>
  )

  if (compact) {
    return (
      <div className={cn('flex flex-col items-center space-y-2', className)}>
        <button
          type="button"
          onClick={onProfileClick}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {avatar}
        </button>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* User Info */}
      <div className="flex items-center space-x-3 px-3 py-2">
        {avatar}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {user.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {user.email}
          </p>
        </div>
      </div>

      {/* User Actions */}
      <div className="space-y-1">
        <button
          type="button"
          onClick={onProfileClick}
          className="w-full flex items-center space-x-3 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>Profil</span>
        </button>

        <button
          type="button"
          onClick={onSettingsClick}
          className="w-full flex items-center space-x-3 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
          <span>Paramètres</span>
        </button>

        <button
          type="button"
          onClick={onLogoutClick}
          className="w-full flex items-center space-x-3 rounded-lg px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  )
}

// ==================== EXAMPLES ====================

/**
 * Exemples d'utilisation:
 *
 * // Sidebar basique
 * <Sidebar
 *   items={navigationItems}
 *   footer={
 *     <UserMenu
 *       user={{ name: 'John Doe', email: 'john@example.com' }}
 *       onLogoutClick={handleLogout}
 *     />
 *   }
 * />
 *
 * // Sidebar compact
 * <Sidebar
 *   compact={true}
 *   items={navigationItems}
 *   footer={
 *     <UserMenu
 *       user={user}
 *       compact={true}
 *     />
 *   }
 * />
 *
 * // Sidebar mobile avec overlay
 * <Sidebar
 *   isOpen={mobileMenuOpen}
 *   onClose={() => setMobileMenuOpen(false)}
 *   className="fixed inset-y-0 left-0 z-50 lg:static lg:translate-x-0"
 * />
 */
