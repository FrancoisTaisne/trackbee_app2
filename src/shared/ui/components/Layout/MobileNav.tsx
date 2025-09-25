/**
 * MobileNav Component - Navigation mobile inférieure
 * Navigation en bas d'écran optimisée pour mobile
 */

import React from 'react'
import { cn } from '@/shared/utils/cn'
import { Badge } from '@/shared/ui/components/Badge/Badge'

// ==================== TYPES ====================

export interface MobileNavItem {
  id: string
  label: string
  icon: React.ReactNode
  activeIcon?: React.ReactNode
  href?: string
  onClick?: () => void
  badge?: {
    content: string | number
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  }
  active?: boolean
  disabled?: boolean
}

export interface MobileNavProps {
  /**
   * Items de navigation
   */
  items?: MobileNavItem[]

  /**
   * Item actuellement actif
   */
  activeItemId?: string

  /**
   * Callback lors du changement d'item
   */
  onItemChange?: (itemId: string) => void

  /**
   * Mode compact (icônes plus petites)
   */
  compact?: boolean

  /**
   * Masquer les labels
   */
  hideLabels?: boolean

  /**
   * Classes personnalisées
   */
  className?: string
}

// ==================== DEFAULT NAVIGATION ITEMS ====================

const defaultItems: MobileNavItem[] = [
  {
    id: 'home',
    label: 'Accueil',
    href: '/user',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    activeIcon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M11.47 3.84a.75.75 0 01.06 1.06L9.81 6.42h8.44a.75.75 0 010 1.5H9.81l1.72 1.52a.75.75 0 11-1 1.12L7.47 8.31a.75.75 0 010-1.12l3.06-2.75a.75.75 0 011.06.06zM3.75 12a.75.75 0 01.75-.75h16a.75.75 0 010 1.5h-16A.75.75 0 013.75 12z" />
      </svg>
    )
  },
  {
    id: 'devices',
    label: 'Devices',
    href: '/user/devices',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
      </svg>
    ),
    badge: { content: 3, variant: 'primary' }
  },
  {
    id: 'scan',
    label: 'Scanner',
    onClick: () => console.log('Scan BLE'),
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    )
  },
  {
    id: 'sites',
    label: 'Sites',
    href: '/user/sites',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  },
  {
    id: 'profile',
    label: 'Profil',
    href: '/user/profile',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )
  }
]

// ==================== MOBILE NAV ITEM COMPONENT ====================

const MobileNavItemComponent: React.FC<{
  item: MobileNavItem
  active?: boolean
  compact?: boolean
  hideLabels?: boolean
  onItemClick?: (item: MobileNavItem) => void
}> = ({
  item,
  active = false,
  compact = false,
  hideLabels = false,
  onItemClick
}) => {
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

  const iconToRender = active && item.activeIcon ? item.activeIcon : item.icon

  const content = (
    <div className="flex flex-col items-center justify-center space-y-1 relative">
      {/* Badge */}
      {item.badge && (
        <Badge
          variant={item.badge.variant || 'danger'}
          size="xs"
          className="absolute -top-1 -right-2 min-w-[16px] h-[16px] flex items-center justify-center text-[10px]"
        >
          {typeof item.badge.content === 'number' && item.badge.content > 99
            ? '99+'
            : item.badge.content
          }
        </Badge>
      )}

      {/* Icon */}
      <div
        className={cn(
          'transition-transform duration-200',
          active && 'scale-110',
          compact ? 'w-5 h-5' : 'w-6 h-6'
        )}
      >
        {iconToRender}
      </div>

      {/* Label */}
      {!hideLabels && (
        <span
          className={cn(
            'text-xs font-medium transition-colors duration-200 truncate max-w-[60px]',
            compact && 'text-[10px]'
          )}
        >
          {item.label}
        </span>
      )}
    </div>
  )

  const baseClasses = cn(
    'flex-1 flex items-center justify-center relative transition-colors duration-200',
    compact ? 'py-2' : 'py-3',
    {
      'text-trackbee-600 dark:text-trackbee-400': active,
      'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300': !active && !item.disabled,
      'text-gray-300 dark:text-gray-600 cursor-not-allowed': item.disabled
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
      className={baseClasses}
      onClick={handleClick}
      disabled={item.disabled}
    >
      {content}
    </button>
  )
}

// ==================== MOBILE NAV COMPONENT ====================

export const MobileNav: React.FC<MobileNavProps> = ({
  items = defaultItems,
  activeItemId,
  onItemChange,
  compact = false,
  hideLabels = false,
  className
}) => {
  const handleItemClick = (item: MobileNavItem) => {
    if (onItemChange) {
      onItemChange(item.id)
    }
  }

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'bg-white/95 dark:bg-gray-900/95 backdrop-blur',
        'border-t border-gray-200 dark:border-gray-700',
        'supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-gray-900/60',
        'safe-area-inset-bottom', // Pour les appareils avec encoche
        className
      )}
    >
      <div className="flex items-center justify-around">
        {items.map((item) => (
          <MobileNavItemComponent
            key={item.id}
            item={item}
            active={activeItemId === item.id}
            compact={compact}
            hideLabels={hideLabels}
            onItemClick={handleItemClick}
          />
        ))}
      </div>
    </nav>
  )
}

MobileNav.displayName = 'MobileNav'

// ==================== FLOATING ACTION BUTTON ====================

export interface FloatingActionButtonProps {
  /**
   * Action principale
   */
  onAction: () => void

  /**
   * Icône du bouton
   */
  icon?: React.ReactNode

  /**
   * Label accessible
   */
  label?: string

  /**
   * Position du bouton
   */
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left'

  /**
   * Badge de notification
   */
  badge?: number

  /**
   * État de chargement
   */
  loading?: boolean

  /**
   * Classes personnalisées
   */
  className?: string
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onAction,
  icon,
  label = 'Action',
  position = 'bottom-right',
  badge,
  loading = false,
  className
}) => {
  const defaultIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )

  const positionClasses = {
    'bottom-right': 'bottom-20 right-4',
    'bottom-center': 'bottom-20 left-1/2 transform -translate-x-1/2',
    'bottom-left': 'bottom-20 left-4'
  }

  return (
    <button
      type="button"
      onClick={onAction}
      disabled={loading}
      className={cn(
        'fixed z-50 w-14 h-14 rounded-full shadow-lg',
        'bg-trackbee-500 hover:bg-trackbee-600 active:bg-trackbee-700',
        'text-white transition-all duration-200',
        'focus:outline-none focus:ring-4 focus:ring-trackbee-500/30',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        positionClasses[position],
        className
      )}
      aria-label={label}
    >
      {/* Badge */}
      {badge && badge > 0 && (
        <Badge
          variant="solid-danger"
          size="xs"
          className="absolute -top-2 -right-2 min-w-[20px] h-[20px] flex items-center justify-center"
        >
          {badge > 99 ? '99+' : badge}
        </Badge>
      )}

      {/* Icon */}
      <div className="flex items-center justify-center w-full h-full">
        {loading ? (
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
        ) : (
          icon || defaultIcon
        )}
      </div>
    </button>
  )
}

// ==================== TAB BAR COMPONENT ====================

export interface TabBarItem {
  id: string
  label: string
  icon?: React.ReactNode
  badge?: number
  disabled?: boolean
}

export interface TabBarProps {
  items: TabBarItem[]
  activeItemId: string
  onItemChange: (itemId: string) => void
  className?: string
}

export const TabBar: React.FC<TabBarProps> = ({
  items,
  activeItemId,
  onItemChange,
  className
}) => (
  <div
    className={cn(
      'flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1',
      className
    )}
  >
    {items.map((item) => (
      <button
        key={item.id}
        type="button"
        onClick={() => !item.disabled && onItemChange(item.id)}
        disabled={item.disabled}
        className={cn(
          'flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
          {
            'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm': activeItemId === item.id,
            'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100': activeItemId !== item.id && !item.disabled,
            'text-gray-400 dark:text-gray-600 cursor-not-allowed': item.disabled
          }
        )}
      >
        {item.icon && (
          <div className="w-4 h-4">
            {item.icon}
          </div>
        )}
        <span>{item.label}</span>
        {item.badge && item.badge > 0 && (
          <Badge variant="danger" size="xs">
            {item.badge}
          </Badge>
        )}
      </button>
    ))}
  </div>
)

// ==================== EXAMPLES ====================

/**
 * Exemples d'utilisation:
 *
 * // Navigation mobile basique
 * <MobileNav
 *   activeItemId="devices"
 *   onItemChange={(id) => navigate(`/user/${id}`)}
 * />
 *
 * // Navigation compacte
 * <MobileNav
 *   compact={true}
 *   hideLabels={false}
 *   items={customNavItems}
 * />
 *
 * // Bouton d'action flottant
 * <FloatingActionButton
 *   onAction={() => startBleScan()}
 *   icon={<ScanIcon />}
 *   label="Scanner les devices"
 *   badge={3}
 * />
 *
 * // Tab bar pour navigation locale
 * <TabBar
 *   items={[
 *     { id: 'info', label: 'Infos', icon: <InfoIcon /> },
 *     { id: 'data', label: 'Données', badge: 5 },
 *     { id: 'settings', label: 'Config' }
 *   ]}
 *   activeItemId={activeTab}
 *   onItemChange={setActiveTab}
 * />
 */