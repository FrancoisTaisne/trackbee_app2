/**
 * App Router - Routage principal de l'application
 * Configuration des routes avec protection et navigation
 */

import React, { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/core/state/stores/auth.store'
import { LoadingScreen } from '@/shared/ui/components/Loading/LoadingScreen'

// ==================== LAZY LOADING ====================

// Pages publiques
const LandingPage = React.lazy(() => import('@/features/landing/pages/LandingPage'))
const LoginPage = React.lazy(() => import('@/features/auth/pages/LoginPage'))
const RegisterPage = React.lazy(() => import('@/features/auth/pages/RegisterPage'))

// Pages protégées - Dashboard
const DashboardPage = React.lazy(() => import('@/features/dashboard/pages/DashboardPage'))

// Pages protégées - Devices
const DevicesListPage = React.lazy(() => import('@/features/device/pages/DevicesListPage'))
const DeviceDetailPage = React.lazy(() => import('@/features/device/pages/DeviceDetailPage'))

// Pages protégées - Sites
const SitesListPage = React.lazy(() => import('@/features/site/pages/SitesListPage'))
const SiteDetailPage = React.lazy(() => import('@/features/site/pages/SiteDetailPage'))

// Pages protégées - Campaigns
const CampaignsListPage = React.lazy(() => import('@/features/campaign/pages/CampaignsListPage'))
const CampaignDetailPage = React.lazy(() => import('@/features/campaign/pages/CampaignDetailPage'))

// Pages protégées - Processing
const ProcessingListPage = React.lazy(() => import('@/features/processing/pages/ProcessingListPage'))
const ProcessingDetailPage = React.lazy(() => import('@/features/processing/pages/ProcessingDetailPage'))

// Pages protégées - Transfer
const TransferQueuePage = React.lazy(() => import('@/features/transfer/pages/TransferQueuePage'))

// Pages protégées - Settings
const SettingsPage = React.lazy(() => import('@/features/settings/pages/SettingsPage'))
const ProfilePage = React.lazy(() => import('@/features/profile/pages/ProfilePage'))

// Pages d'erreur
const NotFoundPage = React.lazy(() => import('@/shared/ui/pages/NotFoundPage'))
const ErrorPage = React.lazy(() => import('@/shared/ui/pages/ErrorPage'))

// Layout
const AppLayout = React.lazy(() => import('@/shared/ui/layout'))

// ==================== ROUTE GUARDS ====================

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
  requireAuth?: boolean
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectTo = '/login',
  requireAuth = true
}) => {
  const { isAuthenticated, isLoading } = useAuth()

  // Attendre l'initialisation de l'auth
  if (isLoading) {
    return (
      <LoadingScreen
        message="Vérification de l'authentification..."
        subtitle="Veuillez patienter"
      />
    )
  }

  // Rediriger si auth requise mais pas connecté
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  // Rediriger si connecté mais sur page publique
  if (!requireAuth && isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

// ==================== ROUTE CONFIGURATION ====================

const publicRoutes = [
  {
    path: '/',
    element: <LandingPage />
  },
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/register',
    element: <RegisterPage />
  }
]

const protectedRoutes = [
  {
    path: '/dashboard',
    element: <DashboardPage />
  },

  // Routes Devices
  {
    path: '/devices',
    element: <DevicesListPage />
  },
  {
    path: '/devices/:deviceId',
    element: <DeviceDetailPage />
  },

  // Routes Sites
  {
    path: '/sites',
    element: <SitesListPage />
  },
  {
    path: '/sites/:siteId',
    element: <SiteDetailPage />
  },

  // Routes Campaigns
  {
    path: '/campaigns',
    element: <CampaignsListPage />
  },
  {
    path: '/campaigns/:campaignId',
    element: <CampaignDetailPage />
  },

  // Routes Processing
  {
    path: '/processing',
    element: <ProcessingListPage />
  },
  {
    path: '/processing/:calculationId',
    element: <ProcessingDetailPage />
  },

  // Routes Transfer
  {
    path: '/transfers',
    element: <TransferQueuePage />
  },

  // Routes Settings
  {
    path: '/settings',
    element: <SettingsPage />
  },
  {
    path: '/profile',
    element: <ProfilePage />
  }
]

// ==================== SUSPENSE WRAPPER ====================

const SuspenseWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense
    fallback={
      <LoadingScreen
        message="Chargement de la page..."
        subtitle="Veuillez patienter"
      />
    }
  >
    {children}
  </Suspense>
)

// ==================== MAIN ROUTER ====================

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Routes publiques */}
      {publicRoutes.map(({ path, element }) => (
        <Route
          key={path}
          path={path}
          element={
            <ProtectedRoute requireAuth={false}>
              <SuspenseWrapper>{element}</SuspenseWrapper>
            </ProtectedRoute>
          }
        />
      ))}

      {/* Routes protégées avec layout */}
      <Route
        path="/*"
        element={
          <ProtectedRoute requireAuth={true}>
            <SuspenseWrapper>
              <AppLayout>
                <Routes>
                  {protectedRoutes.map(({ path, element }) => (
                    <Route
                      key={path}
                      path={path}
                      element={<SuspenseWrapper>{element}</SuspenseWrapper>}
                    />
                  ))}

                  {/* Redirections */}
                  <Route path="/app" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/app/*" element={<Navigate to="/dashboard" replace />} />

                  {/* 404 pour les routes protégées */}
                  <Route
                    path="*"
                    element={
                      <SuspenseWrapper>
                        <NotFoundPage />
                      </SuspenseWrapper>
                    }
                  />
                </Routes>
              </AppLayout>
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      {/* Route d'erreur globale */}
      <Route
        path="/error"
        element={
          <SuspenseWrapper>
            <ErrorPage />
          </SuspenseWrapper>
        }
      />
    </Routes>
  )
}

// ==================== NAVIGATION UTILITIES ====================

/**
 * Hook pour la navigation avec état
 */
export const useAppNavigation = () => {
  const { isAuthenticated } = useAuth()

  const getDefaultRoute = React.useCallback(() => {
    return isAuthenticated ? '/dashboard' : '/'
  }, [isAuthenticated])

  const getAuthRoute = React.useCallback(() => {
    return isAuthenticated ? '/dashboard' : '/login'
  }, [isAuthenticated])

  return {
    getDefaultRoute,
    getAuthRoute,
    isAuthenticated
  }
}

/**
 * Routes de navigation pour les menus
 */
export const navigationRoutes = {
  main: [
    {
      name: 'Tableau de bord',
      path: '/dashboard',
      icon: 'dashboard',
      description: 'Vue d\'ensemble des activités'
    },
    {
      name: 'Appareils',
      path: '/devices',
      icon: 'devices',
      description: 'Gestion des devices IoT'
    },
    {
      name: 'Sites',
      path: '/sites',
      icon: 'sites',
      description: 'Gestion des sites de mesure'
    },
    {
      name: 'Campagnes',
      path: '/campaigns',
      icon: 'campaigns',
      description: 'Campagnes de mesures GNSS'
    }
  ],
  secondary: [
    {
      name: 'Traitement',
      path: '/processing',
      icon: 'processing',
      description: 'Post-traitement des données'
    },
    {
      name: 'Transferts',
      path: '/transfers',
      icon: 'transfers',
      description: 'Queue de transferts'
    }
  ],
  user: [
    {
      name: 'Paramètres',
      path: '/settings',
      icon: 'settings',
      description: 'Configuration application'
    },
    {
      name: 'Profil',
      path: '/profile',
      icon: 'profile',
      description: 'Profil utilisateur'
    }
  ]
} as const

/**
 * Breadcrumbs configuration
 */
export const breadcrumbsConfig = {
  '/dashboard': ['Tableau de bord'],
  '/devices': ['Appareils'],
  '/devices/:deviceId': ['Appareils', 'Détail'],
  '/sites': ['Sites'],
  '/sites/:siteId': ['Sites', 'Détail'],
  '/campaigns': ['Campagnes'],
  '/campaigns/:campaignId': ['Campagnes', 'Détail'],
  '/processing': ['Traitement'],
  '/processing/:calculationId': ['Traitement', 'Détail'],
  '/transfers': ['Transferts'],
  '/settings': ['Paramètres'],
  '/profile': ['Profil']
} as const

// Types exportés
export type NavigationRoute = (typeof navigationRoutes.main)[0]
export type BreadcrumbPath = keyof typeof breadcrumbsConfig