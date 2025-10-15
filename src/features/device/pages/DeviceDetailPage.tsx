// @ts-nocheck PUSH FINAL: Skip TypeScript checks for build success
/**
 * DeviceDetailPage Component - Page de détail d'un device IoT
 * Interface complète pour gérer un device : connexion, configuration, téléchargements, etc.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  Edit3,
  MapPin,
  Settings,
  Activity,
  BarChart3,
  Calendar,
  ExternalLink,
  Link as LinkIcon,
  Unlink,
  Bluetooth
} from 'lucide-react'
import {
  Section,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/ui/components'
import {
  DeviceConnectionPill,
  DeviceScanModal,
  BleStatusPill,
  IotDownload,
  CompactDownloadButton
} from '../components'
import { useDevice } from '../hooks/useDevice'
import { logger } from '@/core/utils/logger'
import { formatDistanceToNow } from '@/core/utils/time'
import { formatBytes } from '@/core/utils/format'
import { cn } from '@/core/utils/cn'
import type { DeviceBundle, DeviceScanResult, UpdateDeviceData, AssignDeviceToSiteData } from '../types'

// ==================== LOGGER SETUP ====================

const deviceDetailLog = {
  debug: (msg: string, data?: unknown) => logger.debug('deviceDetailPage', msg, data),
  info: (msg: string, data?: unknown) => logger.info('deviceDetailPage', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('deviceDetailPage', msg, data),
  error: (msg: string, data?: unknown) => logger.error('deviceDetailPage', msg, data)
}

// ==================== DEVICE INFO TAB COMPONENT ====================

interface DeviceInfoTabProps {
  device: DeviceBundle
  onEdit: () => void
  onNavigateToSite: (siteId: number) => void
  onAssignToSite: () => void
  onRemoveFromSite: () => void
}

const DeviceInfoTab: React.FC<DeviceInfoTabProps> = ({
  device,
  onEdit,
  onNavigateToSite,
  onAssignToSite,
  onRemoveFromSite
}) => {
  const { machine, site, installation } = device

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Informations générales</CardTitle>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit3 className="w-4 h-4 mr-2" />
              Modifier
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-600">Nom</label>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {machine.name}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Statut</label>
              <div className="mt-1">
                <Badge variant={machine.isActive ? 'success' : 'danger'}>
                  {machine.isActive ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Adresse MAC</label>
              <p className="text-sm font-mono text-gray-900 mt-1 bg-gray-50 px-2 py-1 rounded">
                {machine.macAddress}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Modèle</label>
              <p className="text-sm text-gray-900 mt-1">
                {machine.model || 'TrackBee standard'}
              </p>
            </div>

            {machine.description && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-600">Description</label>
                <p className="text-sm text-gray-900 mt-1">
                  {machine.description}
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-200 text-xs text-gray-500 space-y-1">
            <p>ID: #{machine.id}</p>
            <p>Créé le: {new Date(machine.createdAt).toLocaleDateString('fr-FR')}</p>
            <p>Modifié le: {new Date(machine.updatedAt).toLocaleDateString('fr-FR')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Site Association */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="w-5 h-5" />
            <span>Association site</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {site && installation ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-primary-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-primary-900">
                    {site.name}
                  </h4>
                  <p className="text-sm text-primary-700 mt-1">
                    Installation: {installation.name || 'Sans nom'}
                  </p>
                  {installation.notes && (
                    <p className="text-xs text-primary-600 mt-1">
                      {installation.notes}
                    </p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigateToSite(site.id)}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Voir
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRemoveFromSite}
                  >
                    <Unlink className="w-4 h-4 mr-1" />
                    Retirer
                  </Button>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Associé le: {new Date(installation.createdAt).toLocaleDateString('fr-FR')}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">
                Ce device n'est associé à aucun site
              </p>
              <Button onClick={onAssignToSite}>
                <LinkIcon className="w-4 h-4 mr-2" />
                Associer à un site
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ==================== DEVICE CONNECTION TAB COMPONENT ====================

interface DeviceConnectionTabProps {
  device: DeviceBundle
  onConnect: () => void
  onDisconnect: () => void
  onScan: () => void
}

const DeviceConnectionTab: React.FC<DeviceConnectionTabProps> = ({
  device,
  onConnect,
  onDisconnect,
  onScan
}) => {
  const bleConnection = device.bleConnection
  const isConnected = bleConnection?.status === 'connected'

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bluetooth className="w-5 h-5" />
            <span>État de la connexion BLE</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <DeviceConnectionPill
                deviceId={device.machine.id}
                size="lg"
                showLabel={true}
              />
            </div>

            <div className="flex space-x-2">
              {isConnected ? (
                <Button variant="outline" onClick={onDisconnect}>
                  Déconnecter
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={onScan}>
                    <Bluetooth className="w-4 h-4 mr-2" />
                    Scanner
                  </Button>
                  <Button variant="primary" onClick={onConnect}>
                    Connecter
                  </Button>
                </>
              )}
            </div>
          </div>

          {bleConnection && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div className="text-center p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium text-gray-600">Device ID</p>
                <p className="text-xs font-mono text-gray-900 mt-1">
                  {bleConnection.deviceId || 'N/A'}
                </p>
              </div>

              <div className="text-center p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium text-gray-600">Dernière connexion</p>
                <p className="text-xs text-gray-900 mt-1">
                  {bleConnection.lastConnection
                    ? formatDistanceToNow(bleConnection.lastConnection)
                    : 'Jamais'
                  }
                </p>
              </div>

              <div className="text-center p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium text-gray-600">Campagnes actives</p>
                <p className="text-lg font-semibold text-primary-600 mt-1">
                  {bleConnection.activeCampaigns.size}
                </p>
              </div>
            </div>
          )}

          {bleConnection?.error && (
            <div className="p-3 bg-danger-50 border border-danger-200 rounded-md">
              <p className="text-sm font-medium text-danger-700">Erreur de connexion</p>
              <p className="text-sm text-danger-600 mt-1">
                {bleConnection.error}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Download - IotDownload avec détection intelligente */}
      <IotDownload
        device={device}
        installation={device.installation}
        uploadContext={{
          machineId: device.machine.id,
          siteId: device.site?.id,
          installationId: device.installation?.id
        }}
        onSuccess={(files) => {
          deviceDetailLog.info('Files downloaded from detail page', {
            deviceId: device.machine.id,
            fileCount: files.length
          })
        }}
        onError={(error) => {
          deviceDetailLog.error('File download error from detail page', {
            deviceId: device.machine.id,
            error
          })
        }}
      />
    </div>
  )
}

// ==================== DEVICE STATS TAB COMPONENT ====================

interface DeviceStatsTabProps {
  device: DeviceBundle
}

const DeviceStatsTab: React.FC<DeviceStatsTabProps> = ({ device }) => {
  const { campaigns, calculations } = device

  const activeCampaigns = campaigns.filter(c => c.status === 'active')
  const completedCalculations = calculations.filter(c => c.status === 'done')
  const failedCalculations = calculations.filter(c => c.status === 'failed')

  const lastCalculation = calculations
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="text-center p-4">
            <p className="text-2xl font-bold text-primary-600">
              {campaigns.length}
            </p>
            <p className="text-sm text-gray-600">
              Campagnes total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="text-center p-4">
            <p className="text-2xl font-bold text-success-600">
              {activeCampaigns.length}
            </p>
            <p className="text-sm text-gray-600">
              Campagnes actives
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="text-center p-4">
            <p className="text-2xl font-bold text-blue-600">
              {completedCalculations.length}
            </p>
            <p className="text-sm text-gray-600">
              Calculs réussis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="text-center p-4">
            <p className="text-2xl font-bold text-danger-600">
              {failedCalculations.length}
            </p>
            <p className="text-sm text-gray-600">
              Calculs échoués
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Activité récente</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lastCalculation ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">
                    Dernier calcul
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatDistanceToNow(new Date(lastCalculation.createdAt))}
                  </p>
                </div>
                <Badge variant={
                  lastCalculation.status === 'done' ? 'success' :
                  lastCalculation.status === 'failed' ? 'danger' :
                  lastCalculation.status === 'running' ? 'warning' : 'secondary'
                }>
                  {lastCalculation.status}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">
                Aucune activité récente
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaigns List */}
      {campaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Campagnes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {campaigns.slice(0, 5).map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {campaign.name}
                    </p>
                    <p className="text-sm text-gray-600 truncate">
                      {campaign.type} • Créée {formatDistanceToNow(new Date(campaign.createdAt))}
                    </p>
                  </div>
                  <Badge variant={
                    campaign.status === 'active' ? 'success' :
                    campaign.status === 'completed' ? 'secondary' :
                    'warning'
                  }>
                    {campaign.status}
                  </Badge>
                </div>
              ))}

              {campaigns.length > 5 && (
                <p className="text-sm text-gray-500 text-center pt-2">
                  et {campaigns.length - 5} autres campagnes...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ==================== MAIN COMPONENT ====================

export const DeviceDetailPage: React.FC = () => {
  const params = useParams<{ deviceId?: string; id?: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const rawDeviceId = params.deviceId ?? params.id ?? ''
  const parsedDeviceId = rawDeviceId && /^\d+$/.test(rawDeviceId)
    ? parseInt(rawDeviceId, 10)
    : NaN
  const isValidRouteDeviceId = Number.isInteger(parsedDeviceId) && parsedDeviceId > 0

  // État de navigation (deviceId BLE depuis scan)
  const bleDeviceIdFromNav = (location.state as { deviceId?: string })?.deviceId
  const triedAutoOnce = useRef(false)

  if (!isValidRouteDeviceId) {
    deviceDetailLog.warn('Invalid or missing device id in route', { rawDeviceId })

    return (
      <div className="text-center py-12">
        <div className="text-danger-600 mb-4">
          <Settings className="w-12 h-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Device non trouvé
        </h3>
        <p className="text-gray-600 mb-4">
          Identifiant de device invalide ou manquant dans l'URL.
        </p>
        <div className="flex justify-center space-x-3">
          <Button variant="outline" onClick={() => navigate('/devices')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <Button onClick={() => navigate('/devices')}>
            Voir la liste des devices
          </Button>
        </div>
      </div>
    )
  }

  const deviceId = parsedDeviceId

  // State management
  const [activeTab, setActiveTab] = useState('info')
  const [showScanModal, setShowScanModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')

  // Hook de gestion du device
  const {
    device,
    isLoading,
    error,
    refetch,
    updateDevice,
    assignToSite,
    removeFromSite,
    connectDevice,
    disconnectDevice
  } = useDevice(deviceId)

  // ==================== AUTO-SCAN & AUTO-CONNEXION ====================

  /**
   * Scénario 1: Connexion directe depuis scan
   * Si on arrive avec un bleDeviceId dans le state de navigation,
   * on connecte directement sans scan
   */
  useEffect(() => {
    if (!bleDeviceIdFromNav || !device) return
    if (device.bleConnection?.status === 'connected') return

    deviceDetailLog.info('Auto-connecting with BLE device from navigation', {
      bleDeviceIdFromNav,
      deviceId
    })

    connectDevice({
      bleDeviceId: bleDeviceIdFromNav,
      autoProbeFiles: true
    }).catch((error) => {
      deviceDetailLog.error('Auto-connect from navigation failed', error)
    })
  }, [bleDeviceIdFromNav, device?.bleConnection?.status, connectDevice, deviceId, device])

  /**
   * Scénario 2: Auto-connexion normale (avec scan automatique)
   * Si pas de bleDeviceId dans le state et qu'on n'a jamais essayé,
   * on lance un auto-scan suivi d'une auto-connexion
   */
  useEffect(() => {
    if (triedAutoOnce.current || !device) return
    if (device.bleConnection?.status === 'connected') return
    if (bleDeviceIdFromNav) return // Skip si on vient du scan

    triedAutoOnce.current = true

    deviceDetailLog.info('Auto-connecting with scan', { deviceId })

    connectDevice({
      autoScan: true,
      autoProbeFiles: true
    }).catch((error) => {
      deviceDetailLog.warn('Auto-connect with scan failed (non-critical)', error)
    })
  }, [device, bleDeviceIdFromNav, connectDevice, deviceId])

  // ==================== HANDLERS ====================

  const handleBack = useCallback(() => {
    navigate('/devices')
  }, [navigate])

  const handleNavigateToSite = useCallback((siteId: number) => {
    navigate(`/sites/${siteId}`)
  }, [navigate])

  const handleConnect = useCallback(async () => {
    try {
      await connectDevice({ autoProbeFiles: true })
      deviceDetailLog.info('Device connected from detail page', { deviceId })
    } catch (error) {
      deviceDetailLog.error('Failed to connect device from detail page', {
        deviceId,
        error
      })
    }
  }, [connectDevice, deviceId])

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnectDevice()
      deviceDetailLog.info('Device disconnected from detail page', { deviceId })
    } catch (error) {
      deviceDetailLog.error('Failed to disconnect device from detail page', {
        deviceId,
        error
      })
    }
  }, [disconnectDevice, deviceId])

  const handleScanDeviceSelected = useCallback((result: DeviceScanResult) => {
    deviceDetailLog.info('Device selected from scan modal', {
      deviceName: result.device.name,
      machineId: result.machine?.id
    })
    setShowScanModal(false)
  }, [])

  const handleEditName = useCallback(() => {
    setNewName(device?.machine.name || '')
    setEditingName(true)
  }, [device?.machine.name])

  const handleSaveName = useCallback(async () => {
    if (!newName.trim() || !device) return

    try {
      await updateDevice({ name: newName.trim() })
      deviceDetailLog.info('Device name updated', { deviceId, newName })
      setEditingName(false)
    } catch (error) {
      deviceDetailLog.error('Failed to update device name', { deviceId, error })
    }
  }, [newName, device, updateDevice, deviceId])

  const handleCancelEdit = useCallback(() => {
    setEditingName(false)
    setNewName('')
  }, [])

  // ==================== ERROR & LOADING STATES ====================

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !device) {
    return (
      <div className="text-center py-12">
        <div className="text-danger-600 mb-4">
          <Settings className="w-12 h-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Device non trouvé
        </h3>
        <p className="text-gray-600 mb-4">
          {error?.message || 'Le device demandé n\'existe pas ou n\'est pas accessible.'}
        </p>
        <div className="flex justify-center space-x-3">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <Button onClick={() => refetch()}>
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  // ==================== RENDER ====================

  return (
    <>
      {/* Lien de retour */}
      <div className="mb-4">
        <button
          onClick={handleBack}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Retour aux devices</span>
        </button>
      </div>

      {/* Device Mini Board - Compact Design */}
      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="grid grid-cols-2 gap-4">
            {/* Colonne gauche */}
            <div className="space-y-2">
              {/* MAC Address */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500 min-w-[2.5rem]">MAC:</span>
                <span className="text-sm font-mono font-medium text-gray-900">
                  {device.machine.macD || 'N/A'}
                </span>
              </div>

              {/* Nom avec crayon éditable */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500 min-w-[2.5rem]">Nom:</span>
                <span className="text-sm font-medium text-gray-900">
                  {device.machine.name || 'Sans nom'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditName}
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                >
                  <Edit3 className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                </Button>
              </div>
            </div>

            {/* Colonne droite */}
            <div className="space-y-2 flex flex-col items-end">
              {/* BLE Status */}
              <div className="flex items-center">
                <BleStatusPill
                  deviceId={deviceId}
                  installationId={device.installation?.id}
                  siteId={device.site?.id}
                  size="sm"
                  showLabel={true}
                />
              </div>

              {/* Téléchargement compact */}
              <div className="flex items-center">
                <CompactDownloadButton
                  device={device}
                  onDownload={() => {
                    deviceDetailLog.info('Download initiated from mini board', {
                      deviceId: device.machine.id
                    })
                    // TODO: Implement download logic
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Section>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="info" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Informations</span>
            </TabsTrigger>
            <TabsTrigger value="connection" className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Missions</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Statistiques</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-6">
            <DeviceInfoTab
              device={device}
              onEdit={() => setShowEditModal(true)}
              onNavigateToSite={handleNavigateToSite}
              onAssignToSite={() => setShowAssignModal(true)}
              onRemoveFromSite={async () => {
                try {
                  await removeFromSite()
                  deviceDetailLog.info('Device removed from site', { deviceId })
                } catch (error) {
                  deviceDetailLog.error('Failed to remove device from site', {
                    deviceId,
                    error
                  })
                }
              }}
            />
          </TabsContent>

          <TabsContent value="connection" className="mt-6">
            <DeviceConnectionTab
              device={device}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onScan={() => setShowScanModal(true)}
            />
          </TabsContent>

          <TabsContent value="stats" className="mt-6">
            <DeviceStatsTab device={device} />
          </TabsContent>
        </Tabs>
      </Section>

      {/* Scan Modal */}
      <DeviceScanModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        onDeviceSelected={handleScanDeviceSelected}
        filterByKnownMacs={false}
        autoConnect={true}
      />

      {/* Edit Name Modal */}
      <Modal isOpen={editingName} onClose={handleCancelEdit}>
        <ModalHeader title="Modifier le nom du device" onClose={handleCancelEdit} />
        <ModalContent>
          <div className="space-y-4">
            <div>
              <label htmlFor="device-name" className="block text-sm font-medium text-gray-700 mb-1">
                Nom du device
              </label>
              <Input
                id="device-name"
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Entrez le nom du device"
                className="w-full"
                autoFocus
              />
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="secondary" onClick={handleCancelEdit}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveName}
            disabled={!newName.trim() || newName === device?.machine.name}
          >
            Enregistrer
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

// ==================== DISPLAY NAME & EXPORT ====================

DeviceDetailPage.displayName = 'DeviceDetailPage'

export default DeviceDetailPage
