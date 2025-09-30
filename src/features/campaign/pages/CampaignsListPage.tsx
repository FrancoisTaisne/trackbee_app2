/**
 * Campaigns List Page - Liste des campagnes GNSS
 * Affichage et gestion des campagnes de mesure
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { Plus, Activity, Loader2 } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { useCampaignList } from '@/features/campaign/hooks/useCampaignList'

const CampaignsListPage: React.FC = () => {
  const { campaigns, isLoading, error } = useCampaignList()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Campagnes GNSS
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Gérez vos campagnes de mesure géodésique
                </p>
              </div>
              <Link
                to="/campaigns/create"
                className={cn(
                  'inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg',
                  'bg-trackbee-500 text-white hover:bg-trackbee-600',
                  'transition-colors duration-200'
                )}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle campagne
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
              Chargement des campagnes...
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Récupération de vos campagnes GNSS
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
                  Impossible de charger les campagnes. Vérifiez votre connexion.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Campaigns List */}
        {!isLoading && !error && (
          <>
            {campaigns.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Aucune campagne
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Créez votre première campagne de mesure GNSS
            </p>
            <Link
              to="/campaigns/create"
              className={cn(
                'inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg',
                'bg-trackbee-500 text-white hover:bg-trackbee-600',
                'transition-colors duration-200'
              )}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle campagne
            </Link>
          </div>
            ) : (
              <div className="space-y-6">
                {campaigns.map((campaign: any) => (
                  <div
                    key={campaign.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow duration-200"
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {campaign.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className={cn(
                            'px-2 py-1 text-xs font-medium rounded-full',
                            campaign.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            campaign.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                            campaign.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                          )}>
                            {campaign.status}
                          </span>
                          <Activity className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>

                      {campaign.description && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                          {campaign.description}
                        </p>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Type:</span>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {campaign.type || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Site:</span>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {campaign.siteName || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Durée:</span>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {campaign.duration ? `${campaign.duration}min` : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Sessions:</span>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {campaign.totalSessions || 0}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {campaign.startDate && (
                            <>Début: {new Date(campaign.startDate).toLocaleDateString()}</>
                          )}
                        </div>
                        <Link
                          to={`/campaigns/${campaign.id}`}
                          className="text-trackbee-600 hover:text-trackbee-700 font-medium text-sm"
                        >
                          Voir détails
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default CampaignsListPage