/**
 * Devices List Page - Liste des dispositifs IoT
 * Affichage et gestion des dispositifs TrackBee
 */

import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, Wifi, WifiOff, Loader2, Radar } from 'lucide-react'
import { cn } from '@/core/utils/cn'
import { useDeviceList } from '@/features/device/hooks/useDeviceList'
import { DeviceScanModal } from '@/features/device/components/DeviceScanModal'
import type { DeviceScanResult } from '@/features/device/types'

const DevicesListPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = React.useState('')
  const [filter, setFilter] = React.useState<'all' | 'connected' | 'disconnected'>('all')
  const [showScanModal, setShowScanModal] = React.useState(false)

  const { devices, isLoading, error } = useDeviceList()

  const filteredDevices = React.useMemo(() => {
    return devices.filter(bundle => {
      const matchesSearch = bundle.machine.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           bundle.machine.macAddress?.toLowerCase().includes(searchTerm.toLowerCase())

      if (filter === 'all') return matchesSearch
      if (filter === 'connected') return matchesSearch && bundle.bleConnection?.status === 'connected'
      if (filter === 'disconnected') return matchesSearch && bundle.bleConnection?.status !== 'connected'

      return matchesSearch
    })
  }, [devices, searchTerm, filter])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Dispositifs IoT
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Gérez vos dispositifs TrackBee
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowScanModal(true)}
                  className={cn(
                    'inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg',
                    'bg-trackbee-500  hover:bg-trackbee-600',
                    'transition-colors duration-200 shadow-sm hover:shadow-md'
                  )}
                >
                  <Radar className="w-4 h-4 mr-2" />
                  Scanner
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        {/*<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">*/}
          {/*<div className="flex flex-col sm:flex-row gap-4">*/}
          {/*  /!* Search *!/*/}
          {/*  <div className="flex-1 relative">*/}
          {/*    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />*/}
          {/*    <input*/}
          {/*      type="text"*/}
          {/*      placeholder="Rechercher par nom ou adresse MAC..."*/}
          {/*      value={searchTerm}*/}
          {/*      onChange={(e) => setSearchTerm(e.target.value)}*/}
          {/*      className={cn(*/}
          {/*        'w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600',*/}
          {/*        'rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',*/}
          {/*        'focus:ring-2 focus:ring-trackbee-500 focus:border-transparent'*/}
          {/*      )}*/}
          {/*    />*/}
          {/*  </div>*/}

          {/*  /!* Filter *!/*/}
          {/*  <div className="flex items-center gap-2">*/}
          {/*    <Filter className="w-4 h-4 text-gray-400" />*/}
          {/*    <select*/}
          {/*      value={filter}*/}
          {/*      onChange={(e) => setFilter(e.target.value as 'disconnected' | 'connected' | 'all')}*/}
          {/*      className={cn(*/}
          {/*        'px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg',*/}
          {/*        'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',*/}
          {/*        'focus:ring-2 focus:ring-trackbee-500 focus:border-transparent'*/}
          {/*      )}*/}
          {/*    >*/}
          {/*      <option value="all">Tous</option>*/}
          {/*      <option value="connected">Connectés</option>*/}
          {/*      <option value="disconnected">Déconnectés</option>*/}
          {/*    </select>*/}
          {/*  </div>*/}
          {/*</div>*/}
        {/*</div>*/}

        {/* Devices List */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-trackbee-500 mx-auto mb-4 animate-spin" />
            <p className="text-gray-500 dark:text-gray-400 mt-4">
              Chargement des dispositifs...
            </p>
          </div>
        ) : error ? (
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
                  Impossible de charger les dispositifs. Vérifiez votre connexion.
                </div>
              </div>
            </div>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <Wifi className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {devices.length === 0 ? 'Aucun dispositif' : 'Aucun résultat'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {devices.length === 0
                ? 'Commencez par scanner et connecter votre premier dispositif TrackBee en cliquant sur le bouton "Scanner" ci-dessus'
                : 'Essayez de modifier vos critères de recherche'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDevices.map((bundle) => (
              <Link
                key={bundle.machine.id}
                to={`/devices/${bundle.machine.id}`}
                className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow duration-200"
              >
                <div className="p-6">
                  {/* Device Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      {bundle.machine.name || `Device ${bundle.machine.id}`}
                    </h3>
                    <div className="flex items-center">
                      {bundle.bleConnection?.status === 'connected' ? (
                        <Wifi className="w-5 h-5 text-green-500" />
                      ) : (
                        <WifiOff className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Device Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">MAC:</span>
                      <span className="text-gray-900 dark:text-gray-100 font-mono text-xs">
                        {bundle.machine.macAddress || 'Non défini'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Site:</span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {bundle.site?.name || 'Non assigné'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Statut:</span>
                      <span className={cn(
                        'px-2 py-1 text-xs rounded-full',
                        bundle.bleConnection?.status === 'connected'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      )}>
                        {bundle.bleConnection?.status === 'connected' ? 'Connecté' : 'Déconnecté'}
                      </span>
                    </div>
                  </div>

                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Stats Footer */}
        {devices.length > 0 && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
              <span>
                {filteredDevices.length} dispositif{filteredDevices.length > 1 ? 's' : ''} affiché{filteredDevices.length > 1 ? 's' : ''}
                {filteredDevices.length !== devices.length && ` sur ${devices.length} total`}
              </span>
              <span>
                {devices.filter(b => b.bleConnection?.status === 'connected').length} connecté{devices.filter(b => b.bleConnection?.status === 'connected').length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      <DeviceScanModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        filterByKnownMacs={false}
        autoConnect={false}
        onDeviceSelected={(result: DeviceScanResult) => {
          setShowScanModal(false)

          // Naviguer vers la page de détail du device
          if (result.machine?.id) {
            navigate(`/devices/${result.machine.id}`)
          } else {
            // Si device inconnu, afficher un message ou rediriger vers création
            console.warn('Device sélectionné non enregistré dans la base de données', result)
            // TODO: Optionnellement rediriger vers une page de création de device
          }
        }}
      />
    </div>
  )
}

export default DevicesListPage
