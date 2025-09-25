/**
 * Campaigns List Page - Liste des campagnes GNSS
 * Affichage et gestion des campagnes de mesure
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { Plus, Activity } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

const CampaignsListPage: React.FC = () => {
  // TODO: Utiliser le hook réel
  const campaigns = []

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
            {/* Campaigns list will be rendered here */}
          </div>
        )}
      </div>
    </div>
  )
}

export default CampaignsListPage