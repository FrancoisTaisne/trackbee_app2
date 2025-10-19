/**
 * Dashboard Page - Page d'accueil utilisateur connecté
 * Vue d'ensemble des sites, TrackBee et missions (DESIGN COMPACT)
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Cpu, Target, TrendingUp, Activity, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { useHydrate } from '@/core/hooks/useHydrate'
import { PageHeader, Section } from '@/shared/ui/components/Layout'
import type { HydrateData } from '@/core/hooks/useHydrate'

// ==================== DASHBOARD PAGE ====================

const DashboardPage: React.FC = () => {
  const { data, machines, sites, isLoading } = useHydrate()
  const campaigns = (data?.campaigns ?? []) as HydrateData['campaigns']

  // Calculer les statistiques
  const stats = {
    totalSites: sites?.length || 0,
    totalTrackBee: machines?.length || 0,
    connectedDevices: 0, // TODO: Implement connection state tracking
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter(c => c.status === 'active' || c.status === 'running').length,
    pendingCampaigns: campaigns.filter(c => c.status === 'scheduled').length
  }

  // Sites récents
  const recentSites = React.useMemo(() => {
    if (!sites) return []
    return [...sites]
      .sort((a, b) => {
        const aDate = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
        const bDate = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
        return bDate - aDate
      })
      .slice(0, 5)
  }, [sites])

  // Devices récents
  const recentDevices = React.useMemo(() => {
    if (!machines) return []
    return [...machines]
      .sort((a, b) => {
        const aDate = a.lastSeen ? new Date(a.lastSeen).getTime() : 0
        const bDate = b.lastSeen ? new Date(b.lastSeen).getTime() : 0
        return bDate - aDate
      })
      .slice(0, 5)
  }, [machines])

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de votre activité"
      />

      <Section className="space-y-4">
        {/* Stats Grid - Compact */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Sites */}
          <Link
            to="/sites"
            className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded flex items-center justify-center">
                <MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Sites</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isLoading ? '...' : stats.totalSites}
            </p>
          </Link>

          {/* Devices Total */}
          <Link
            to="/devices"
            className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center">
                <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">TrackBee</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isLoading ? '...' : stats.totalTrackBee}
            </p>
          </Link>

          {/* Devices Connected */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded flex items-center justify-center">
                <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Connectés</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {isLoading ? '...' : stats.connectedDevices}
            </p>
          </div>

          {/* Campaigns Total */}
          <Link
            to="/campaigns"
            className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded flex items-center justify-center">
                <Target className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Campagnes</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isLoading ? '...' : stats.totalCampaigns}
            </p>
          </Link>

          {/* Active Campaigns */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Actives</p>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {isLoading ? '...' : stats.activeCampaigns}
            </p>
          </div>

          {/* Pending Campaigns */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded flex items-center justify-center">
                <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Planifiées</p>
            </div>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {isLoading ? '...' : stats.pendingCampaigns}
            </p>
          </div>
        </div>

        {/* Content Grid - 2 colonnes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sites récents */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sites récents</h3>
                <Link to="/sites" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  Voir tout
                </Link>
              </div>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <div className="px-4 py-3 text-sm text-gray-500">Chargement...</div>
              ) : recentSites.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Aucun site</p>
                  <Link to="/sites" className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
                    Créer un site
                  </Link>
                </div>
              ) : (
                recentSites.map((site) => (
                  <Link
                    key={site.id}
                    to={`/sites/${site.id}`}
                    className="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {site.name}
                        </p>
                        {site.address && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {site.address}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      →
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Devices récents */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">TrackBee récents</h3>
                <Link to="/devices" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                  Voir tout
                </Link>
              </div>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <div className="px-4 py-3 text-sm text-gray-500">Chargement...</div>
              ) : recentDevices.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Aucun device</p>
                  <Link to="/devices" className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
                    Scanner un device
                  </Link>
                </div>
              ) : (
                recentDevices.map((device) => (
                  <Link
                    key={device.id}
                    to={`/devices/${device.id}`}
                    className="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center flex-shrink-0">
                        <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {device.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {device.macAddress}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      →
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}

DashboardPage.displayName = 'DashboardPage'

export default DashboardPage
