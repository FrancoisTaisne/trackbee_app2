/**
 * AppLayout Component - Layout principal de l'application
 * Layout responsive avec header, navigation et contenu principal
 */

import React from 'react'
import { cn } from '@/shared/utils/cn'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'

// ==================== TYPES ====================

export interface AppLayoutProps {
  /**
   * Contenu principal
   */
  children: React.ReactNode

  /**
   * Titre de la page
   */
  title?: string

  /**
   * Actions dans le header
   */
  headerActions?: React.ReactNode

  /**
   * Afficher la sidebar (desktop)
   */
  showSidebar?: boolean

  /**
   * Afficher la navigation mobile
   */
  showMobileNav?: boolean

  /**
   * Mode fullscreen (cache header/nav)
   */
  fullscreen?: boolean

  /**
   * Background personnalisé
   */
  background?: 'default' | 'gray' | 'gradient'

  /**
   * Padding du contenu
   */
  contentPadding?: 'none' | 'sm' | 'md' | 'lg'

  /**
   * Classes personnalisées
   */
  className?: string

  /**
   * Classes pour le contenu
   */
  contentClassName?: string
}

// ==================== BACKGROUND VARIANTS ====================

const backgroundClasses = {
  default: 'bg-white dark:bg-gray-900',
  gray: 'bg-gray-50 dark:bg-gray-800',
  gradient: 'bg-gradient-to-br from-trackbee-50 to-blue-50 dark:from-gray-900 dark:to-gray-800'
}

const paddingClasses = {
  none: '',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6'
}

// ==================== APP LAYOUT COMPONENT ====================

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  title,
  headerActions,
  showSidebar = true,
  showMobileNav = true,
  fullscreen = false,
  background = 'default',
  contentPadding = 'md',
  className,
  contentClassName
}) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  if (fullscreen) {
    return (
      <div className={cn('min-h-screen', backgroundClasses[background], className)}>
        <main className={cn('h-screen', paddingClasses[contentPadding], contentClassName)}>
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className={cn('min-h-screen', backgroundClasses[background], className)}>
      {/* Header Desktop/Mobile */}
      <Header
        title={title}
        actions={headerActions}
        onMenuClick={() => setSidebarOpen(true)}
        showMenuButton={showSidebar}
      />

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar Desktop */}
        {showSidebar && (
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            className="hidden lg:flex"
          />
        )}

        {/* Contenu Principal */}
        <main
          className={cn(
            'flex-1 overflow-auto',
            paddingClasses[contentPadding],
            contentClassName
          )}
        >
          {children}
        </main>
      </div>

      {/* Navigation Mobile */}
      {showMobileNav && <MobileNav className="lg:hidden" />}

      {/* Overlay Sidebar Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            className="relative z-10"
          />
        </div>
      )}
    </div>
  )
}

AppLayout.displayName = 'AppLayout'

// ==================== CONTENT WRAPPER ====================

export interface ContentWrapperProps {
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  className?: string
}

export const ContentWrapper: React.FC<ContentWrapperProps> = ({
  children,
  maxWidth = 'full',
  className
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full'
  }

  return (
    <div className={cn('mx-auto w-full', maxWidthClasses[maxWidth], className)}>
      {children}
    </div>
  )
}

// ==================== PAGE HEADER ====================

export interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  breadcrumb?: React.ReactNode
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  breadcrumb,
  className
}) => (
  <div className={cn('mb-6', className)}>
    {breadcrumb && (
      <div className="mb-2">
        {breadcrumb}
      </div>
    )}

    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="ml-4 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  </div>
)

// ==================== SECTION ====================

export interface SectionProps {
  title?: string
  description?: string
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export const Section: React.FC<SectionProps> = ({
  title,
  description,
  children,
  actions,
  className
}) => (
  <section className={cn('mb-8', className)}>
    {(title || actions) && (
      <div className="flex items-center justify-between mb-4">
        <div>
          {title && (
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    )}

    {children}
  </section>
)

// ==================== EXAMPLES ====================

/**
 * Exemples d'utilisation:
 *
 * // Layout basique
 * <AppLayout title="Dashboard">
 *   <PageHeader
 *     title="Mes Devices"
 *     description="Gérez vos appareils TrackBee"
 *     actions={<Button>Nouveau Device</Button>}
 *   />
 *   <Section title="Devices Connectés">
 *     <DeviceGrid />
 *   </Section>
 * </AppLayout>
 *
 * // Layout fullscreen
 * <AppLayout fullscreen background="gray">
 *   <MapView />
 * </AppLayout>
 *
 * // Layout avec contenu centré
 * <AppLayout contentPadding="lg">
 *   <ContentWrapper maxWidth="xl">
 *     <Card>Contenu centré</Card>
 *   </ContentWrapper>
 * </AppLayout>
 */