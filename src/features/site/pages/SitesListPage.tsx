/**
 * Sites List Page - Liste des sites de surveillance
 * Affichage et gestion des sites géographiques
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { Plus, MapPin, Loader2 } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { useSiteList } from '@/features/site/hooks/useSiteList'

const SitesListPage: React.FC = () => {
  const { sites, isLoading, error } = useSiteList()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Sites de surveillance
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Gérez vos sites géographiques
                </p>
              </div>
              <Link
                to="/sites/create"
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
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading State */}
        {isLoading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <Loader2 className="w-8 h-8 text-trackbee-500 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Chargement des sites...
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Récupération de vos sites de surveillance
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-6">
            <div className="flex items-center">
              <div className="text-red-400">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Erreur de chargement
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  Impossible de charger les sites. Vérifiez votre connexion.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sites List */}
        {!isLoading && !error && (
          <>
            {sites.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Aucun site configuré
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Créez votre premier site de surveillance géographique
                </p>
                <Link
                  to="/sites/create"
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sites.map((bundle) => {
                  const site = bundle.site
                  if (!site) {
                    return null
                  }

                  const key = site.id ?? site.name
                  const coordinates = site.lat && site.lng ? { latitude: site.lat, longitude: site.lng } : undefined
                  const stats = bundle.statistics ?? {
                    totalInstallations: 0,
                    activeInstallations: 0,
                    totalMachines: 0,
                    connectedMachines: 0,
                    totalCampaigns: 0,
                    activeCampaigns: 0,
                    completedCalculations: 0,
                    failedCalculations: 0
                  }
                  const detailPath = site.id != null ? `/sites/${site.id}` : null

                  return (
                    <div
                      key={key}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow duration-200"
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {site.name}
                          </h3>
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <MapPin className="w-4 h-4 mr-1" />
                            {stats.totalInstallations || 0}
                          </div>
                        </div>

                        {site.description && (
                          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                            {site.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-sm">
                          <div className="text-gray-500 dark:text-gray-400">
                            {coordinates?.latitude != null && coordinates?.longitude != null ? (
                              <>
                                {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
                              </>
                            ) : (
                              'Coordonnées non définies'
                            )}
                          </div>
                          {detailPath ? (
                            <Link
                              to={detailPath}
                              className="text-trackbee-600 hover:text-trackbee-700 font-medium"
                            >
                              Voir détails
                            </Link>
                          ) : (
                            <span className="text-gray-400">Détails indisponibles</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default SitesListPage
