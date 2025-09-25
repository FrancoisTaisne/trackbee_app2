/**
 * Dashboard Page - Page d'accueil utilisateur connecté
 * Vue d'ensemble des devices, sites et activité récente
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Wifi, Activity, TrendingUp, Plus } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { useDevices, useSites } from '@/core/state'

const DashboardPage: React.FC = () => {
  // TODO: Récupérer les données réelles
  const devices = [] // useDevices()
  const sites = [] // useSites()

  const stats = {
    totalDevices: devices?.length || 0,
    connectedDevices: 0,
    totalSites: sites?.length || 0,
    activeCampaigns: 0
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
              Vue d'ensemble de vos dispositifs IoT et sites de surveillance
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Devices Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <Wifi className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Dispositifs
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.totalDevices}
                </p>
                <p className="text-xs text-green-600">
                  {stats.connectedDevices} connectés
                </p>
              </div>
            </div>
          </div>

          {/* Sites Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Sites
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.totalSites}
                </p>
                <p className="text-xs text-gray-500">
                  Sites surveillés
                </p>
              </div>
            </div>
          </div>

          {/* Active Campaigns */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Campagnes
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.activeCampaigns}
                </p>
                <p className="text-xs text-gray-500">
                  En cours
                </p>
              </div>
            </div>
          </div>

          {/* Data Quality */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Précision
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  ~cm
                </p>
                <p className="text-xs text-green-600">
                  Post-traitement GNSS
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Devices Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Dispositifs IoT
                </h2>
                <Link
                  to="/devices"
                  className="text-sm text-trackbee-600 hover:text-trackbee-700"
                >
                  Voir tout
                </Link>
              </div>
            </div>
            <div className="p-6">
              {stats.totalDevices === 0 ? (
                <div className="text-center py-8">
                  <Wifi className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Aucun dispositif configuré
                  </p>
                  <Link
                    to="/devices"
                    className={cn(
                      'inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg',
                      'bg-trackbee-500 text-white hover:bg-trackbee-600',
                      'transition-colors duration-200'
                    )}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un dispositif
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Liste des dispositifs récents */}
                  <p className="text-sm text-gray-500">
                    Dispositifs récents apparaîtront ici
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sites Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Sites de surveillance
                </h2>
                <Link
                  to="/sites"
                  className="text-sm text-trackbee-600 hover:text-trackbee-700"
                >
                  Voir tout
                </Link>
              </div>
            </div>
            <div className="p-6">
              {stats.totalSites === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Aucun site configuré
                  </p>
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
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Liste des sites récents */}
                  <p className="text-sm text-gray-500">
                    Sites récents apparaîtront ici
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Activité récente
            </h2>
          </div>
          <div className="p-6">
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Aucune activité récente
              </p>
              <p className="text-sm text-gray-400 mt-2">
                L'activité de vos dispositifs et campagnes apparaîtra ici
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage