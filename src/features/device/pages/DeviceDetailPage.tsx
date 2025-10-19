/**
 * DeviceDetailPage Component - Page de détail d'un device IoT
 * Interface complète pour gérer un device : connexion, configuration, téléchargements, etc.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  Edit3,
  Settings,
  BarChart3,
  Calendar
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
  Input
} from '@/shared/ui/components'
import {
  DeviceScanModal,
  BleStatusPill,
  CompactDownloadButton
} from '../components'
import { DeviceInfoTab } from './deviceDetail/DeviceInfoTab'
import { DeviceMissionsTab } from './deviceDetail/DeviceMissionsTab'
import { DeviceStatsTab } from './deviceDetail/DeviceStatsTab'
import { useDevice } from '../hooks/useDevice'
import { logger } from '@/core/utils/logger'

import type { DeviceBundle, DeviceScanResult } from '../types'

// ==================== LOGGER SETUP ====================

const deviceDetailLog = {
  debug: (msg: string, data?: unknown) => logger.debug('deviceDetailPage', msg, data),
  info: (msg: string, data?: unknown) => logger.info('deviceDetailPage', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('deviceDetailPage', msg, data),
  error: (msg: string, data?: unknown) => logger.error('deviceDetailPage', msg, data)
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
  const deviceId = isValidRouteDeviceId ? parsedDeviceId : 0

  // État de navigation (deviceId BLE depuis scan)
  const bleDeviceIdFromNav = (location.state as { deviceId?: string })?.deviceId
  const triedAutoOnce = useRef(false)

  // State management - TOUS LES HOOKS DOIVENT ÊTRE AVANT LES RETURNS
  const [activeTab, setActiveTab] = useState('info')
  const [showScanModal, setShowScanModal] = useState(false)
  const [_showEditModal, setShowEditModal] = useState(false)
  const [_showAssignModal, setShowAssignModal] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')

  // Hook de gestion du device
  const {
    device,
    isLoading,
    error,
    refetch,
    updateDevice,
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
  // IMPORTANT: Tous les useCallback doivent être AVANT les returns conditionnels

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

  const handleSendCampaigns = useCallback(async () => {
    deviceDetailLog.info('Sending campaigns to device', { deviceId })
    // TODO: Implémenter l'envoi des campagnes au device
    // Cette fonction sera appelée depuis MissionsTab
  }, [deviceId])

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

  // ==================== EARLY RETURNS ====================
  // IMPORTANT: Les returns conditionnels doivent être APRÈS tous les hooks

  // Vérifier l'ID invalide
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
                  // TODO: Implement removeFromSite functionality
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
            <DeviceMissionsTab
              device={device}
              isConnected={device.bleConnection?.status === 'connected'}
              onSendCampaigns={handleSendCampaigns}
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
        <ModalHeader>
          <h2 className="text-lg font-semibold text-gray-900">Modifier le nom du device</h2>
        </ModalHeader>
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
