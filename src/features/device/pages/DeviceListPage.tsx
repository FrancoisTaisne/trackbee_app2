/**
 * DeviceListPage Component - Page de liste des devices IoT
 * Interface principale pour visualiser, gérer et scanner des devices TrackBee
 */

import React, { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Bluetooth,
  MapPin,
  Settings,
  MoreVertical,
  Edit3,
  Trash2,
  ExternalLink
} from 'lucide-react'

// UI Components imports
import { AppLayout, PageHeader, Section } from '@/shared/ui/components/Layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/components/Card/Card'
import { Button } from '@/shared/ui/components/Button/Button'
import { Input } from '@/shared/ui/components/Input/Input'
import { Badge } from '@/shared/ui/components/Badge/Badge'
import { ConfirmationModal } from '@/shared/ui/components/Modal/Modal'

// Device feature imports
import { useDeviceList } from '../hooks/useDeviceList'
import { DeviceConnectionPill } from '../components/DeviceConnectionPill'
import { DeviceScanModal } from '../components/DeviceScanModal'
import { DeviceFileDownload } from '../components/DeviceFileDownload'
import type { DeviceBundle, DeviceScanResult } from '../types'

// Core utilities
import { logger } from '@/core/utils/logger'
import { formatDistanceToNow } from '@/core/utils/time'

// ==================== LOGGER SETUP ====================

const deviceListLog = {
  debug: (msg: string, data?: unknown) => logger.debug('deviceListPage', msg, data),
  info: (msg: string, data?: unknown) => logger.info('deviceListPage', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('deviceListPage', msg, data),
  error: (msg: string, data?: unknown) => logger.error('deviceListPage', msg, data)
}

// ==================== FILTERS TYPE ====================

interface DeviceFilters {
  search: string
  connected?: boolean
  active?: boolean
  siteId?: number
}

// ==================== DEVICE CARD COMPONENT ====================

interface DeviceCardProps {
  device: DeviceBundle
  onSelect: (device: DeviceBundle) => void
  onEdit: (device: DeviceBundle) => void
  onDelete: (device: DeviceBundle) => void
  onNavigateToSite: (siteId: number) => void
}

const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  onSelect,
  onEdit,
  onDelete,
  onNavigateToSite
}) => {
  const { machine, site, installation, campaigns, calculations } = device
  const [menuOpen, setMenuOpen] = useState(false)

  // Statistiques rapides
  const connectedCampaigns = campaigns.filter(c => c.status === 'active').length
  const lastCalculation = calculations
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

  return (
    <Card
      className="transition-all duration-200 hover:shadow-md cursor-pointer group"
      onClick={() => onSelect(device)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex items-center space-x-3">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {machine.name}
              </h3>

              <DeviceConnectionPill
                deviceId={machine.id}
                showLabel={false}
                size="sm"
              />
            </CardTitle>

            {machine.description && (
              <p className="text-sm text-gray-600 mt-1 truncate">
                {machine.description}
              </p>
            )}

            <div className="flex items-center space-x-4 mt-2">
              <Badge variant="outline" size="sm" className="font-mono text-xs">
                {machine.macAddress}
              </Badge>

              {machine.model && (
                <Badge variant="secondary" size="sm">
                  {machine.model}
                </Badge>
              )}

              {!machine.isActive && (
                <Badge variant="danger" size="sm">
                  Inactif
                </Badge>
              )}
            </div>
          </div>
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(event) => {
                event.stopPropagation()
                setMenuOpen((prev) => !prev)
              }}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-40 rounded-md border border-gray-200 bg-white py-1 shadow-lg z-10"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onEdit(device)
                  }}
                  className="flex w-full items-center px-3 py-2 text-sm hover:bg-gray-100"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Modifier
                </button>
                {site && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      onNavigateToSite(site.id)
                    }}
                    className="flex w-full items-center px-3 py-2 text-sm hover:bg-gray-100"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Voir le site
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onDelete(device)
                  }}
                  className="flex w-full items-center px-3 py-2 text-sm text-danger-600 hover:bg-danger-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Site Association */}
        {site && installation ? (
          <div className="flex items-center space-x-2 p-3 bg-primary-50 rounded-md">
            <MapPin className="w-4 h-4 text-primary-600" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary-700 truncate">
                {site.name}
              </p>
              <p className="text-xs text-primary-600 truncate">
                Installation: {installation.name || 'Sans nom'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
            <MapPin className="w-4 h-4 text-gray-400" />
            <p className="text-sm text-gray-600">
              Non associé à un site
            </p>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-2 bg-gray-50 rounded">
            <p className="text-lg font-semibold text-gray-900">
              {connectedCampaigns}
            </p>
            <p className="text-xs text-gray-600">
              Campagnes actives
            </p>
          </div>

          <div className="p-2 bg-gray-50 rounded">
            <p className="text-lg font-semibold text-gray-900">
              {calculations.length}
            </p>
            <p className="text-xs text-gray-600">
              Calculs total
            </p>
          </div>
        </div>

        {/* Last Activity */}
        {lastCalculation && (
          <div className="text-xs text-gray-500 text-center">
            Dernier calcul: {formatDistanceToNow(new Date(lastCalculation.createdAt))}
          </div>
        )}

        {/* File Download Interface */}
        <DeviceFileDownload
          deviceId={machine.id}
          onDownloadComplete={(files) => {
            deviceListLog.info('Files downloaded from device card', {
              deviceId: machine.id,
              fileCount: files.length
            })
          }}
          onError={(error) => {
            deviceListLog.error('File download error from card', {
              deviceId: machine.id,
              error
            })
          }}
        />
      </CardContent>
    </Card>
  )
}

// ==================== MAIN COMPONENT ====================

export const DeviceListPage: React.FC = () => {
  const navigate = useNavigate()

  // State management
  const [filters, setFilters] = useState<DeviceFilters>({
    search: '',
    connected: undefined,
    active: true
  })
  const [showScanModal, setShowScanModal] = useState(false)
  const [deviceToDelete, setDeviceToDelete] = useState<DeviceBundle | null>(null)

  // Hook de gestion des devices
  const {
    devices,
    isLoading,
    error,
    refetch,
    deleteDevice
  } = useDeviceList(filters)

  // ==================== HANDLERS ====================

  const handleSearchChange = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, search: value }))
  }, [])

  const handleConnectionFilter = useCallback((connected?: boolean) => {
    setFilters(prev => ({ ...prev, connected }))
  }, [])

  const handleDeviceSelect = useCallback((device: DeviceBundle) => {
    deviceListLog.debug('Device selected from list', {
      deviceId: device.machine.id,
      deviceName: device.machine.name
    })
    navigate(`/devices/${device.machine.id}`)
  }, [navigate])

  const handleDeviceEdit = useCallback((device: DeviceBundle) => {
    deviceListLog.debug('Edit device requested', {
      deviceId: device.machine.id
    })
    navigate(`/devices/${device.machine.id}/edit`)
  }, [navigate])

  const handleDeviceDelete = useCallback((device: DeviceBundle) => {
    deviceListLog.debug('Delete device requested', {
      deviceId: device.machine.id
    })
    setDeviceToDelete(device)
  }, [])

  const confirmDeviceDelete = useCallback(async () => {
    if (!deviceToDelete) return

    deviceListLog.info('Confirming device deletion', {
      deviceId: deviceToDelete.machine.id
    })

    try {
      await deleteDevice(deviceToDelete.machine.id)
      setDeviceToDelete(null)

      deviceListLog.info('Device deleted successfully', {
        deviceId: deviceToDelete.machine.id
      })
    } catch (error) {
      deviceListLog.error('Failed to delete device', {
        deviceId: deviceToDelete.machine.id,
        error
      })
    }
  }, [deviceToDelete, deleteDevice])

  const handleNavigateToSite = useCallback((siteId: number) => {
    deviceListLog.debug('Navigate to site requested', { siteId })
    navigate(`/sites/${siteId}`)
  }, [navigate])

  const handleScanDeviceSelected = useCallback((result: DeviceScanResult) => {
    deviceListLog.info('Device selected from scan', {
      deviceName: result.device.name,
      isKnown: result.isKnown,
      machineId: result.machine?.id
    })

    setShowScanModal(false)

    if (result.machine) {
      navigate(`/devices/${result.machine.id}`)
    } else {
      // Nouveau device détecté - rediriger vers la création
      navigate('/devices/new', {
        state: { scannedDevice: result.device }
      })
    }
  }, [navigate])

  // ==================== COMPUTED VALUES ====================

  const filteredDevices = useMemo(() => {
    return devices.sort((a, b) => {
      // Trier par devices connectés d'abord, puis par nom
      const aConnected = a.bleConnection?.status === 'connected'
      const bConnected = b.bleConnection?.status === 'connected'

      if (aConnected && !bConnected) return -1
      if (!aConnected && bConnected) return 1

      return a.machine.name.localeCompare(b.machine.name)
    })
  }, [devices])

  const stats = useMemo(() => {
    const connected = devices.filter(d => d.bleConnection?.status === 'connected').length
    const withSites = devices.filter(d => d.site).length
    const active = devices.filter(d => d.machine.isActive).length

    return {
      total: devices.length,
      connected,
      withSites,
      active,
      inactive: devices.length - active
    }
  }, [devices])

  // ==================== RENDER ====================

  return (
    <AppLayout title="Devices TrackBee">
      <PageHeader
        title="Devices TrackBee"
        description="Gérez vos devices IoT, surveillez les connexions et téléchargez les données"
        action={
          <div className="flex space-x-3">
            <Button
              variant="outline"
              leftIcon={<Bluetooth className="w-4 h-4" />}
              onClick={() => setShowScanModal(true)}
            >
              Scanner
            </Button>

            <Button
              variant="primary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => navigate('/devices/new')}
            >
              Nouveau device
            </Button>
          </div>
        }
      />

      {/* Filters & Stats */}
      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Search & Filters */}
          <div className="lg:col-span-2 space-y-4">
            <Input
              placeholder="Rechercher par nom, MAC, site..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                variant={filters.connected === undefined ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleConnectionFilter(undefined)}
              >
                Tous
              </Button>
              <Button
                variant={filters.connected === true ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleConnectionFilter(true)}
              >
                Connectés
              </Button>
              <Button
                variant={filters.connected === false ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleConnectionFilter(false)}
              >
                Déconnectés
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-primary-50 rounded-lg">
                <p className="text-2xl font-bold text-primary-700">
                  {stats.total}
                </p>
                <p className="text-sm text-primary-600">
                  Total devices
                </p>
              </div>

              <div className="text-center p-3 bg-success-50 rounded-lg">
                <p className="text-2xl font-bold text-success-700">
                  {stats.connected}
                </p>
                <p className="text-sm text-success-600">
                  Connectés
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Device Grid */}
      <Section>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-12 bg-gray-200 rounded"></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-12 bg-gray-200 rounded"></div>
                      <div className="h-12 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-danger-600 mb-4">
              <Settings className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Erreur de chargement
            </h3>
            <p className="text-gray-600 mb-4">
              {error.message}
            </p>
            <Button onClick={() => refetch()}>
              Réessayer
            </Button>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Bluetooth className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun device trouvé
            </h3>
            <p className="text-gray-600 mb-4">
              {filters.search
                ? 'Aucun device ne correspond à votre recherche.'
                : 'Commencez par scanner ou créer votre premier device TrackBee.'
              }
            </p>
            <div className="flex justify-center space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowScanModal(true)}
                leftIcon={<Bluetooth className="w-4 h-4" />}
              >
                Scanner
              </Button>
              <Button
                variant="primary"
                onClick={() => navigate('/devices/new')}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Créer un device
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDevices.map((device) => (
              <DeviceCard
                key={device.machine.id}
                device={device}
                onSelect={handleDeviceSelect}
                onEdit={handleDeviceEdit}
                onDelete={handleDeviceDelete}
                onNavigateToSite={handleNavigateToSite}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Scan Modal */}
      <DeviceScanModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        onDeviceSelected={handleScanDeviceSelected}
        filterByKnownMacs={true}
        autoConnect={true}
      />

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={!!deviceToDelete}
        onClose={() => setDeviceToDelete(null)}
        onConfirm={confirmDeviceDelete}
        title="Supprimer le device"
        message={
          deviceToDelete
            ? `Êtes-vous sûr de vouloir supprimer le device "${deviceToDelete.machine.name}" ? Cette action est irréversible.`
            : ''
        }
        confirmText="Supprimer"
        variant="danger"
      />
    </AppLayout>
  )
}

// ==================== DISPLAY NAME ====================

DeviceListPage.displayName = 'DeviceListPage'

// ==================== EXAMPLES ====================

/**
 * Exemples d'utilisation:
 *
 * // Route de base pour la liste des devices
 * <Route path="/devices" element={<DeviceListPage />} />
 *
 * // Dans le routeur principal avec protection
 * <Route path="/devices" element={
 *   <AuthGuard>
 *     <DeviceListPage />
 *   </AuthGuard>
 * } />
 *
 * // Navigation programmatique
 * const navigateToDevices = () => {
 *   navigate('/devices')
 * }
 */
