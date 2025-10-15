/**
 * Dashboard Page - Page d'accueil utilisateur connecté
 * Vue d'ensemble des sites, TrackBee et missions
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Cpu, Target, Plus, ExternalLink, AlertCircle, CheckCircle, Info, X } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { useHydrate } from '@/core/hooks/useHydrate'
import type { HydrateData } from '@/core/hooks/useHydrate'

// ==================== TYPES ====================

interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message: string
  timestamp: Date
  dismissible?: boolean
}

// ==================== NOTIFICATION COMPONENT ====================

const NotificationBanner: React.FC<{
  notifications: Notification[]
  onDismiss: (id: string) => void
}> = ({ notifications, onDismiss }) => {
  if (notifications.length === 0) return null

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const getBgColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      case 'info':
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    }
  }

  return (
    <div className="space-y-3 mb-6">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={cn(
            'rounded-lg border p-4 flex items-start gap-3',
            getBgColor(notification.type)
          )}
        >
          <div className="flex-shrink-0 mt-0.5">
            {getIcon(notification.type)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {notification.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {notification.message}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              {notification.timestamp.toLocaleString('fr-FR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          {notification.dismissible && (
            <button
              onClick={() => onDismiss(notification.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

// ==================== DASHBOARD PAGE ====================

const DashboardPage: React.FC = () => {
  // Récupérer les données réelles depuis useHydrate
  const { data, machines, sites, isLoading } = useHydrate()
  const campaigns = (data?.campaigns ?? []) as HydrateData['campaigns']

  // État des notifications
  const [notifications, setNotifications] = React.useState<Notification[]>([
    {
      id: '1',
      type: 'info',
      title: 'Bienvenue sur TrackBee',
      message: 'Votre tableau de bord est prêt. Consultez vos sites et dispositifs.',
      timestamp: new Date(),
      dismissible: true
    }
  ])

  const handleDismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  // Calculer les statistiques
  const stats = {
    totalSites: sites?.length || 0,
    totalTrackBee: machines?.length || 0,
    totalMissions: campaigns.length,
    activeMissions: campaigns.filter((campaign) => campaign.status === 'active').length
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Tableau de bord
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Vue d'ensemble de vos sites, dispositifs TrackBee et missions
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Zone Notifications */}
        <NotificationBanner
          notifications={notifications}
          onDismiss={handleDismissNotification}
        />

        {/* Stats Cards - Ordre: Sites, TrackBee, Missions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Sites */}
          <Link
            to="/sites"
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow hover:shadow-lg transition-all duration-200 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Sites
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {isLoading ? '...' : stats.totalSites}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Sites de mesure géolocalisés
              </p>
            </div>

            {/* Accès rapides */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Accès rapide
              </p>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-trackbee-600 dark:text-trackbee-400 hover:underline">
                  → Créer un nouveau site
                </span>
                <span className="text-xs text-trackbee-600 dark:text-trackbee-400 hover:underline">
                  → Voir les sites actifs
                </span>
              </div>
            </div>
          </Link>

          {/* TrackBee (anciennement Dispositifs) */}
          <Link
            to="/devices"
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow hover:shadow-lg transition-all duration-200 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Cpu className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                TrackBee
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {isLoading ? '...' : stats.totalTrackBee}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Dispositifs IoT GNSS RTK
              </p>
            </div>

            {/* Accès rapides */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Accès rapide
              </p>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-trackbee-600 dark:text-trackbee-400 hover:underline">
                  → Scanner un TrackBee
                </span>
                <span className="text-xs text-trackbee-600 dark:text-trackbee-400 hover:underline">
                  → État des connexions
                </span>
              </div>
            </div>
          </Link>

          {/* Missions (anciennement Campagnes) */}
          <Link
            to="/campaigns"
            className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow hover:shadow-lg transition-all duration-200 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Missions
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {isLoading ? '...' : stats.totalMissions}
              </p>
              <p className="text-xs text-green-600 mt-2">
                {stats.activeMissions} en cours
              </p>
            </div>

            {/* Accès rapides */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Accès rapide
              </p>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-trackbee-600 dark:text-trackbee-400 hover:underline">
                  → Créer une mission
                </span>
                <span className="text-xs text-trackbee-600 dark:text-trackbee-400 hover:underline">
                  → Missions actives
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Section vide pour futures fonctionnalités */}
        {(stats.totalSites === 0 && stats.totalTrackBee === 0 && stats.totalMissions === 0) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-trackbee-100 dark:bg-trackbee-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-trackbee-600 dark:text-trackbee-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Commencez votre première mission
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Créez un site, connectez un dispositif TrackBee et lancez votre première mission de mesure GNSS RTK.
              </p>
              <div className="flex gap-3 justify-center">
                <Link
                  to="/sites"
                  className={cn(
                    'inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg',
                    'bg-trackbee-500 text-white hover:bg-trackbee-600',
                    'transition-colors duration-200'
                  )}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un site
                </Link>
                <Link
                  to="/devices"
                  className={cn(
                    'inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg',
                    'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600',
                    'transition-colors duration-200'
                  )}
                >
                  <Cpu className="w-4 h-4 mr-2" />
                  Scanner un TrackBee
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardPage
