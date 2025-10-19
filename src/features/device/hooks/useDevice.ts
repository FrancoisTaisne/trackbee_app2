/**
 * useDevice Hook - Gestion principale des devices IoT
 * Interface unifiée pour CRUD devices, BLE, et synchronisation
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDeviceStore } from '@/core/state/stores/device.store'
import { useBleStore, type BleExtendedConnectionState } from '@/core/state/stores/ble.store'
import { useEventBus } from '@/core/orchestrator/EventBus'
import { bleManager } from '@/core/services/ble/BleManager'
import { httpClient } from '@/core/services/api/HttpClient'
import { logger } from '@/core/utils/logger'
import { AppError } from '@/core/types/common'
import type { Machine, Site, Installation, Campaign, Calculation } from '@/core/types/domain'

// ==================== TYPES ====================

interface BleFileInfo {
  name: string
  path: string
  size: number
  modifiedAt: Date
  type: 'ubx' | 'obs' | 'log' | 'other'
}

type NormalizedBleConnection = {
  status: BleExtendedConnectionState['status']
  deviceId?: string
  lastSeen?: Date
  isConnected: boolean
  isConnecting: boolean
  isScanning: boolean
  isProbing: boolean
  isDownloading: boolean
  error?: string
  rssi?: number
  activeCampaigns: BleExtendedConnectionState['activeCampaigns']
  filesByCampaign: BleExtendedConnectionState['filesByCampaign']
}

interface ConnectDeviceOptions {
  timeout?: number
  autoProbeFiles?: boolean
  autoScan?: boolean
  onConnected?: (deviceId: string) => void
  onError?: (error: Error) => void
}

interface DeviceBundle {
  machine: Machine
  installation?: Installation
  site?: Site
  campaigns: Campaign[]
  calculations: Calculation[]
  bleConnection?: NormalizedBleConnection
  syncState: DeviceSyncState
}

interface CreateDeviceData {
  name: string
  macAddress: string
  model?: string
  type?: string
  description?: string
}

interface UpdateDeviceData {
  name?: string
  model?: string
  description?: string
  isActive?: boolean
}

interface AssignDeviceToSiteData {
  deviceId: number
  siteId: number
  latitude: number
  longitude: number
  altitude?: number
  installationRef?: string
  installationName?: string
  notes?: string
}

interface DeviceFileProbeData {
  machineId: number
  deviceId?: number
  campaignId?: number
  path?: string
  recursive?: boolean
}

interface DeviceFileProbeResult {
  success: boolean
  campaignId?: number
  fileCount: number
  files: Array<{
    name: string
    path: string
    size: number
    modifiedAt: Date
    type: 'ubx' | 'obs' | 'log' | 'other'
  }>
  totalSize: number
  totalCount: number
  error?: string
}

interface DeviceDownloadOptions {
  fileIds: string[]
  saveToLocal?: boolean
  onProgress?: (progress: { current: number; total: number; percent: number }) => void
}

interface DeviceDownloadResult {
  success: boolean
  downloadedFiles: number
  failedFiles: number
  errors?: string[]
}

interface TransferCampaignFilesOptions {
  machineId: number
  campaignId: number
  onProgress?: (event: TransferProgressEvent) => void
  uploadContext?: {
    machineId: number
    siteId?: number
    installationId?: number
  }
}

interface TransferProgressEvent {
  type: 'wifi_connecting' | 'ble_connecting' | 'wifi_download' | 'ble_download' | 'storing' | 'uploading' | 'cleanup' | 'done'
  current?: number
  total?: number
  bytes?: number
  method?: 'wifi' | 'ble'
}

interface TransferCampaignFilesResult {
  success: boolean
  method: 'wifi' | 'ble'
  fileCount: number
  totalBytes: number
  duration: number
  uploadedToServer: boolean
}

interface DeviceSyncState {
  lastSync?: Date
  pendingUploads: number
  pendingDownloads: number
  isSyncing: boolean
}

interface UseDeviceDetailReturn {
  device: DeviceBundle | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
  updateDevice: (data: UpdateDeviceData) => Promise<Machine>
  deleteDevice: () => Promise<void>
  assignToSite: (data: AssignDeviceToSiteData) => Promise<Installation>
  unassignFromSite: () => Promise<void>
  connectBle: (options?: ConnectDeviceOptions) => Promise<void>
  disconnectBle: () => Promise<void>
  connectDevice: (options?: ConnectDeviceOptions) => Promise<void>
  disconnectDevice: () => Promise<void>
  probeFiles: (data?: DeviceFileProbeData) => Promise<DeviceFileProbeResult>
  downloadFiles: (options: DeviceDownloadOptions) => Promise<DeviceDownloadResult>
  transferCampaignFiles: (options: TransferCampaignFilesOptions) => Promise<TransferCampaignFilesResult>
}

type DeviceError =
  | 'DEVICE_NOT_FOUND'
  | 'DEVICE_NOT_CONNECTED'
  | 'DEVICE_ALREADY_ASSIGNED'
  | 'SITE_ASSIGNMENT_FAILED'
  | 'INVALID_MAC_ADDRESS'
  | 'BLE_CONNECTION_FAILED'
  | 'BLE_SCAN_FAILED'
  | 'FILE_PROBE_FAILED'
  | 'FILE_DOWNLOAD_FAILED'
  | 'DOWNLOAD_FAILED'
  | 'PERMISSION_DENIED'

const DeviceErrorMessages: Record<DeviceError, string> = {
  DEVICE_NOT_FOUND: 'Device not found',
  DEVICE_NOT_CONNECTED: 'Device is not connected',
  DEVICE_ALREADY_ASSIGNED: 'Device is already assigned to a site',
  SITE_ASSIGNMENT_FAILED: 'Failed to assign device to site',
  INVALID_MAC_ADDRESS: 'Invalid MAC address format',
  BLE_CONNECTION_FAILED: 'Bluetooth connection failed',
  BLE_SCAN_FAILED: 'Bluetooth scan failed',
  FILE_PROBE_FAILED: 'Failed to probe device files',
  FILE_DOWNLOAD_FAILED: 'File download failed',
  DOWNLOAD_FAILED: 'File download failed',
  PERMISSION_DENIED: 'Permission denied'
}

// ==================== LOGGER SETUP ====================

const deviceLog = {
  trace: (msg: string, data?: unknown) => logger.trace('device', msg, data),
  debug: (msg: string, data?: unknown) => logger.debug('device', msg, data),
  info: (msg: string, data?: unknown) => logger.info('device', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('device', msg, data),
  error: (msg: string, data?: unknown) => logger.error('device', msg, data)
}

// ==================== QUERY KEYS ====================

export const deviceQueryKeys = {
  all: ['devices'] as const,
  lists: () => [...deviceQueryKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...deviceQueryKeys.lists(), filters] as const,
  details: () => [...deviceQueryKeys.all, 'detail'] as const,
  detail: (id: number) => [...deviceQueryKeys.details(), id] as const,
  bundles: () => [...deviceQueryKeys.all, 'bundle'] as const,
  bundle: (id: number) => [...deviceQueryKeys.bundles(), id] as const,
  sites: (deviceId: number) => [...deviceQueryKeys.detail(deviceId), 'sites'] as const,
  campaigns: (deviceId: number) => [...deviceQueryKeys.detail(deviceId), 'campaigns'] as const,
  calculations: (deviceId: number) => [...deviceQueryKeys.detail(deviceId), 'calculations'] as const
}

// ==================== API FUNCTIONS ====================

/**
 * Récupère la liste des devices
 */
const _fetchDevices = async (): Promise<Machine[]> => {
  deviceLog.debug('Fetching devices list')
  const response = await httpClient.get<Machine[]>('/api/machine/allByMod')
  deviceLog.debug('Devices fetched', { count: response.data?.length })
  return response.data || []
}

/**
 * Récupère un device par ID
 */
const fetchDevice = async (id: number): Promise<Machine> => {
  deviceLog.debug('Fetching device', { id })
  const response = await httpClient.get<Machine>(`/api/machine/${id}`)
  deviceLog.debug('Device fetched', { device: response.data })
  return response.data!
}

/**
 * Récupère un bundle complet (device + relations)
 */
const fetchDeviceBundle = async (id: number): Promise<DeviceBundle> => {
  deviceLog.debug('Fetching device bundle', { id })
  deviceLog.info('Sending device detail requests', {
    machineEndpoint: '/api/machine/' + id,
    installationsEndpoint: '/machine/' + id,
    note: 'campaigns and calculations endpoints will use siteId from installation'
  })

  // Récupérer la machine d'abord (si ça échoue, on s'arrête)
  const machine = await fetchDevice(id)

  // Récupérer les installations d'abord pour obtenir le siteId
  const installationsRes = await httpClient.get<Installation[]>(`/machine/${id}`).catch(() => ({ data: [] as Installation[] }))
  const installations = installationsRes.data || []
  const installation = installations[0]
  const siteId = installation?.siteId || 0

  deviceLog.debug('Installation fetched for siteId', { installation, siteId })

  // Récupérer les données liées avec le siteId correct
  let campaigns: Campaign[] = []
  let calculations: Calculation[] = []

  const toArray = <T,>(payload: unknown): T[] => {
    if (Array.isArray(payload)) return payload
    if (payload && typeof payload === 'object') {
      const obj = payload as { data?: unknown; items?: unknown }
      if (Array.isArray(obj.data)) return obj.data as T[]
      if (Array.isArray(obj.items)) return obj.items as T[]
    }
    return []
  }

  if (siteId > 0) {
    const [campaignsRes, calculationsRes] = await Promise.allSettled([
      httpClient.get<Campaign[]>(`/api/campaign/by-site/${siteId}/machine/${id}`).catch(() => ({ data: [] as Campaign[] })),
      httpClient.get<Calculation[]>(`/pp/by-site/${siteId}/machine/${id}`).catch(() => ({ data: [] as Calculation[] }))
    ])

    campaigns = campaignsRes.status === 'fulfilled' ? toArray<Campaign>(campaignsRes.value.data) : []
    calculations = calculationsRes.status === 'fulfilled' ? toArray<Calculation>(calculationsRes.value.data) : []
  }

  deviceLog.info('Device detail responses received', {
    siteId,
    installationsCount: installations.length,
    campaignsCount: campaigns.length,
    calculationsCount: calculations.length
  })

  // Récupérer le site si installation existe
  let site: Site | undefined
  if (installation?.siteId) {
    try {
      const siteRes = await httpClient.get<Site>(`/api/site/${installation.siteId}`)
      site = siteRes.data
    } catch (error) {
      deviceLog.warn('Failed to fetch site for installation', { installationId: installation.id, siteId: installation.siteId, error })
    }
  }

  const bundle: DeviceBundle = {
    machine,
    installation,
    site,
    campaigns,
    calculations,
    syncState: {
      lastSync: undefined,
      pendingUploads: 0,
      pendingDownloads: 0,
      isSyncing: false
    }
  }

  deviceLog.debug('Device bundle fetched', { bundle })
  return bundle
}

/**
 * Crée un nouveau device
 */
const _createDevice = async (data: CreateDeviceData): Promise<Machine> => {
  deviceLog.debug('Creating device', { data })
  const response = await httpClient.post<Machine>('/api/machines', data)
  const device = response.data!
  deviceLog.info('Device created', { device })
  return device
}

/**
 * Met à jour un device
 */
const updateDevice = async (id: number, data: UpdateDeviceData): Promise<Machine> => {
  deviceLog.debug('Updating device', { id, data })
  const response = await httpClient.put<Machine>(`/api/machine/${id}`, data)
  const device = response.data!
  deviceLog.info('Device updated', { device })
  return device
}

/**
 * Supprime un device
 */
const _deleteDevice = async (id: number): Promise<void> => {
  deviceLog.debug('Deleting device', { id })
  await httpClient.delete(`/api/machine/${id}`)
  deviceLog.info('Device deleted', { id })
}

/**
 * Associe un device à un site
 */
const assignDeviceToSite = async (data: AssignDeviceToSiteData): Promise<Installation> => {
  deviceLog.debug('Assigning device to site', { data })
  const response = await httpClient.post<Installation>('/api/installations', {
    machineId: data.deviceId,
    siteId: data.siteId,
    latitude: data.latitude,
    longitude: data.longitude,
    altitude: data.altitude,
    installationRef: data.installationRef,
    name: data.installationName,
    notes: data.notes
  })
  const installation = response.data!
  deviceLog.info('Device assigned to site', { installation })
  return installation
}

/**
 * Retire un device d'un site
 */
const removeDeviceFromSite = async (deviceId: number, installationId: number): Promise<void> => {
  deviceLog.debug('Removing device from site', { deviceId, installationId })
  await httpClient.delete(`/api/insta/${installationId}/uninstall`)
  deviceLog.info('Device removed from site', { deviceId, installationId })
}

// ==================== DEVICE ERROR HELPER ====================

const createDeviceError = (type: DeviceError, originalError?: Error): AppError => {
  return new AppError(
    DeviceErrorMessages[type],
    type,
    'DEVICE',
    originalError
  )
}

// ==================== MAIN HOOK ====================

/**
 * Hook principal pour la gestion d'un device spécifique
 */
export const useDevice = (deviceId: number): UseDeviceDetailReturn => {
  const queryClient = useQueryClient()
  const eventBus = useEventBus()
  const deviceStore = useDeviceStore()
  const currentBleConnection = useBleStore((state) => state.connections[deviceId])
  const setBleConnection = useBleStore((state) => state.setConnection)
  const setBleConnectionState = useBleStore((state) => state.setConnectionState)
  const removeBleConnection = useBleStore((state) => state.removeConnection)

  const isValidDeviceId = Number.isInteger(deviceId) && deviceId > 0
  if (!isValidDeviceId) {
    deviceLog.warn('useDevice invoked with invalid device id', { deviceId })
  }
  const queryDeviceId = isValidDeviceId ? deviceId : 0

  const [syncState, _setSyncState] = useState<DeviceSyncState>({
    lastSync: undefined,
    pendingUploads: 0,
    pendingDownloads: 0,
    isSyncing: false
  })

  // ==================== QUERIES ====================

  const {
    data: device,
    isLoading,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: deviceQueryKeys.bundle(queryDeviceId),
    queryFn: () => fetchDeviceBundle(deviceId),
    enabled: isValidDeviceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      deviceLog.warn('Device fetch failed, retrying', { failureCount, error })
      return failureCount < 3
    }
  })

  // ==================== MUTATIONS ====================

  const updateDeviceMutation = useMutation({
    mutationFn: (data: UpdateDeviceData) => updateDevice(deviceId, data),
    onSuccess: (updatedDevice) => {
      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: deviceQueryKeys.detail(deviceId) })
      queryClient.invalidateQueries({ queryKey: deviceQueryKeys.bundle(deviceId) })
      queryClient.invalidateQueries({ queryKey: deviceQueryKeys.lists() })

      // Mettre à jour le store
      // TODO: Implement deviceStore.addDevice or equivalent
      // deviceStore.addDevice(updatedDevice)

      // Événement global
      eventBus.emit({ type: 'device:updated', data: { deviceId: String(deviceId) } } as any)

      deviceLog.info('Device updated successfully', { device: updatedDevice })
    },
    onError: (error) => {
      deviceLog.error('Device update failed', error)
      throw createDeviceError('DEVICE_NOT_FOUND', error as Error)
    }
  })

  const assignToSiteMutation = useMutation({
    mutationFn: (data: AssignDeviceToSiteData) => assignDeviceToSite(data),
    onSuccess: (installation) => {
      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: deviceQueryKeys.bundle(deviceId) })
      queryClient.invalidateQueries({ queryKey: deviceQueryKeys.sites(deviceId) })

      // Événement global
      eventBus.emit({ type: 'device:assigned', data: { deviceId: String(deviceId) } } as any)

      deviceLog.info('Device assigned to site successfully', { installation })
    },
    onError: (error) => {
      deviceLog.error('Device site assignment failed', error)
      throw createDeviceError('SITE_ASSIGNMENT_FAILED', error as Error)
    }
  })

  const removeFromSiteMutation = useMutation({
    mutationFn: () => {
      if (!device?.installation) {
        throw createDeviceError('DEVICE_NOT_FOUND')
      }
      return removeDeviceFromSite(deviceId, device.installation.id)
    },
    onSuccess: () => {
      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: deviceQueryKeys.bundle(deviceId) })
      queryClient.invalidateQueries({ queryKey: deviceQueryKeys.sites(deviceId) })

      // Événement global
      eventBus.emit({ type: 'device:unassigned', data: { deviceId: String(deviceId) } } as any)

      deviceLog.info('Device removed from site successfully', { deviceId })
    },
    onError: (error) => {
      deviceLog.error('Device site removal failed', error)
      throw createDeviceError('SITE_ASSIGNMENT_FAILED', error as Error)
    }
  })

  // ==================== BLE CONNECTION ====================

  /**
   * État de connexion BLE du device
   */
  const bleConnection = useMemo(() => {
    if (!currentBleConnection) return undefined

    const conn = currentBleConnection as any
    return {
      ...conn,
      activeCampaigns: conn.activeCampaigns || new Set(),
      filesByCampaign: conn.filesByCampaign || new Map()
    }
  }, [currentBleConnection])

  /**
   * Connecte le device via BLE
   */
  const connectDevice = useCallback(async (options: ConnectDeviceOptions = {}) => {
    deviceLog.debug('Connecting to device', { deviceId, options })

    if (!device?.machine.macAddress) {
      throw createDeviceError('INVALID_MAC_ADDRESS')
    }

    try {
      // Marquer comme en cours de connexion
      setBleConnectionState(deviceId, { isConnecting: true })

      // Notifier le backend - connexion en cours
      try {
        await httpClient.patch(`/api/machine/${deviceId}/ble-status`, {
          bleStatus: 'connecting'
        })
      } catch (backendError) {
        deviceLog.warn('Failed to update backend connection status (non-critical)', backendError)
      }

      // Scanner pour trouver le device
      const scanResults = await bleManager.scanForDevices({
        timeout: 15000,
        targetMac: device.machine.macAddress
      })

      const targetDevice = scanResults.find(result =>
        result.name?.includes('TRB') ||
        result.deviceId === device.machine.macAddress ||
        result.macd === device.machine.macAddress
      )

      if (!targetDevice) {
        // Notifier le backend - échec scan
        try {
          await httpClient.patch(`/api/machine/${deviceId}/ble-status`, {
            bleStatus: 'error',
            bleError: 'Device not found during BLE scan'
          })
        } catch (backendError) {
          deviceLog.warn('Failed to update backend error status (non-critical)', backendError)
        }
        throw createDeviceError('BLE_SCAN_FAILED')
      }

      // Connecter au device
      const connection = await bleManager.connect(targetDevice.deviceId)
      const deviceId_ble = connection.deviceId

      // Mettre à jour l'état local
      setBleConnection(deviceId, {
        status: 'connected',
        deviceId: deviceId_ble,
        lastConnection: new Date(),
        isConnecting: false,
        rssi: targetDevice.rssi
      })

      // Notifier le backend - connexion réussie
      try {
        await httpClient.patch(`/api/machine/${deviceId}/ble-status`, {
          bleStatus: 'connected',
          bleDeviceId: deviceId_ble,
          bleRssi: targetDevice.rssi || undefined
        })
        deviceLog.debug('Backend notified of successful BLE connection', { deviceId })
      } catch (backendError) {
        deviceLog.warn('Failed to update backend connected status (non-critical)', backendError)
      }

      // Auto-probe des fichiers si demandé
      if (options.autoProbeFiles !== false) {
        await probeFiles({ machineId: deviceId })
      }

      // Callbacks
      options.onConnected?.(deviceId_ble)

      // Événement global
      eventBus.emit({ type: 'ble:connected', data: { deviceId: String(deviceId) } } as any)

      deviceLog.info('Device connected successfully', { deviceId, deviceId_ble })

    } catch (error) {
      // Nettoyer l'état en cas d'erreur
      const errorMessage = (error as Error).message
      setBleConnectionState(deviceId, {
        status: 'error',
        isConnecting: false,
        error: errorMessage
      })

      // Notifier le backend - erreur de connexion
      try {
        await httpClient.patch(`/api/machine/${deviceId}/ble-status`, {
          bleStatus: 'error',
          bleError: errorMessage
        })
      } catch (backendError) {
        deviceLog.warn('Failed to update backend error status (non-critical)', backendError)
      }

      options.onError?.(error as Error)
      deviceLog.error('Device connection failed', error)
      throw createDeviceError('BLE_CONNECTION_FAILED', error as Error)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device, deviceId, eventBus, setBleConnection, setBleConnectionState])

  /**
   * Déconnecte le device
   */
  const disconnectDevice = useCallback(async () => {
    deviceLog.debug('Disconnecting device', { deviceId })

    const connection = bleConnection
    if (!connection?.deviceId) {
      deviceLog.warn('Device not connected', { deviceId })
      return
    }

    try {
      await bleManager.disconnect(connection.deviceId)

      // Mettre à jour l'état local
      removeBleConnection(deviceId)

      // Notifier le backend - déconnexion
      try {
        await httpClient.patch(`/api/machine/${deviceId}/ble-status`, {
          bleStatus: 'disconnected'
        })
        deviceLog.debug('Backend notified of BLE disconnection', { deviceId })
      } catch (backendError) {
        deviceLog.warn('Failed to update backend disconnection status (non-critical)', backendError)
      }

      // Événement global
      eventBus.emit({ type: 'ble:disconnected', data: { deviceId: String(deviceId) } } as any)

      deviceLog.info('Device disconnected successfully', { deviceId })

    } catch (error) {
      deviceLog.error('Device disconnection failed', error)

      // Notifier le backend de l'erreur même en cas d'échec de déconnexion
      try {
        await httpClient.patch(`/api/machine/${deviceId}/ble-status`, {
          bleStatus: 'error',
          bleError: `Disconnection failed: ${(error as Error).message}`
        })
      } catch (backendError) {
        deviceLog.warn('Failed to update backend error status (non-critical)', backendError)
      }

      throw createDeviceError('BLE_CONNECTION_FAILED', error as Error)
    }
  }, [deviceId, bleConnection, eventBus, removeBleConnection])

  // ==================== FILE OPERATIONS ====================

  /**
   * Sonde les fichiers disponibles sur le device
   */
  const probeFiles = useCallback(async (
    data: DeviceFileProbeData = { machineId: deviceId }
  ): Promise<DeviceFileProbeResult> => {
    deviceLog.debug('Probing files on device', { data })

    const connection = bleConnection
    if (!connection?.deviceId || connection.status !== 'connected') {
      throw createDeviceError('DEVICE_NOT_CONNECTED')
    }

    try {
      // Marquer comme en cours de sondage
      setBleConnectionState(deviceId, { isProbing: true })

      // Déterminer le campaign ID à utiliser
      const campaignId = data.campaignId ||
        (device?.installation?.id) ||
        Math.max(...(connection.activeCampaigns || [0]))

      if (!campaignId) {
        throw new Error('Aucun campaign ID disponible pour le sondage')
      }

      // Sonder les fichiers via BLE
      const probeResult = await bleManager.probeFiles(connection.deviceId, campaignId)
      const files: BleFileInfo[] = probeResult.files.map(f => ({
        name: f.name,
        path: f.name,
        size: f.size || 0,
        modifiedAt: new Date(),
        type: (f.name.endsWith('.ubx') ? 'ubx' : f.name.endsWith('.obs') ? 'obs' : 'other') as 'ubx' | 'obs' | 'log' | 'other'
      }))

      // Mettre à jour l'état avec les fichiers trouvés
      const filesByCampaign = new Map(connection.filesByCampaign) as Map<number, BleFileInfo[]>
      filesByCampaign.set(campaignId, files)

      setBleConnectionState(deviceId, {
        isProbing: false,
        filesByCampaign: filesByCampaign as any,
        activeCampaigns: new Set([...connection.activeCampaigns, campaignId]) as any
      })

      const result: DeviceFileProbeResult = {
        success: true,
        campaignId,
        fileCount: files.length,
        files,
        totalSize: files.reduce((sum: number, file: { size?: number }) => sum + (file.size || 0), 0),
        totalCount: files.length
      }

      // Événement global
      eventBus.emit({ type: 'device:files:probed', data: { deviceId: String(deviceId) } } as any)

      deviceLog.info('Files probed successfully', { result })
      return result

    } catch (error) {
      setBleConnectionState(deviceId, { isProbing: false })

      const _result: DeviceFileProbeResult = {
        success: false,
        campaignId: data.campaignId || 0,
        fileCount: 0,
        files: [],
        totalSize: 0,
        totalCount: 0,
        error: (error as Error).message
      }

      deviceLog.error('File probing failed', error)
      throw createDeviceError('FILE_PROBE_FAILED', error as Error)
    }
  }, [deviceId, device, bleConnection, eventBus, setBleConnectionState])

  /**
   * Télécharge les fichiers du device
   */
  const downloadFiles = useCallback(async (
    options: DeviceDownloadOptions
  ): Promise<DeviceDownloadResult> => {
    deviceLog.debug('Downloading files from device', { deviceId, options })

    const connection = bleConnection
    if (!connection?.deviceId || connection.status !== 'connected') {
      throw createDeviceError('DEVICE_NOT_CONNECTED')
    }

    try {
      // Marquer comme en cours de téléchargement
      setBleConnectionState(deviceId, { isDownloading: true })

      const startTime = Date.now()
      let totalSize = 0

      // Use fileIds from options
      const filesToDownload = options.fileIds

      // TODO: Implement actual file download via BLE
      // BleManager doesn't have readFile method yet
      deviceLog.warn('File download not yet implemented via BLE')

      for (const fileId of filesToDownload) {
        deviceLog.debug('File download queued', { fileId })
        // Report progress if callback exists
        if (options.onProgress) {
          options.onProgress({
            current: filesToDownload.indexOf(fileId) + 1,
            total: filesToDownload.length,
            percent: ((filesToDownload.indexOf(fileId) + 1) / filesToDownload.length) * 100
          })
        }
      }

      const duration = Date.now() - startTime
      const result: DeviceDownloadResult = {
        success: true,
        downloadedFiles: filesToDownload.length,
        failedFiles: 0
      }

      // Nettoyer l'état
      setBleConnectionState(deviceId, { isDownloading: false })

      // Événement global
      eventBus.emit({ type: 'device:files:downloaded', data: { deviceId: String(deviceId) } } as any)

      deviceLog.info('File download completed', { result })
      return result

    } catch (error) {
      setBleConnectionState(deviceId, { isDownloading: false })

      deviceLog.error('File download failed', error)
      throw createDeviceError('FILE_DOWNLOAD_FAILED', error as Error)
    }
  }, [deviceId, bleConnection, eventBus, setBleConnectionState])

  /**
   * Transfère les fichiers d'une campagne (téléchargement + upload serveur)
   * Logique complète : WiFi → BLE → Stockage local → Upload serveur → Cleanup
   */
  const transferCampaignFiles = useCallback(async (
    options: TransferCampaignFilesOptions
  ): Promise<TransferCampaignFilesResult> => {
    deviceLog.debug('Starting campaign files transfer', { options })

    const startTime = Date.now()
    let method: 'wifi' | 'ble' = 'wifi'
    let downloadedFiles: BleFileInfo[] = []
    let totalBytes = 0

    try {
      // Étape 1: S'assurer que le device est connecté
      const connection = bleConnection
      if (!connection?.deviceId || connection.status !== 'connected') {
        options.onProgress?.({ type: 'ble_connecting' })
        await connectDevice({ autoProbeFiles: false })
      }

      // Étape 2: Probe des fichiers disponibles
      options.onProgress?.({ type: 'wifi_connecting' })
      const probeResult = await probeFiles({
        machineId: options.machineId,
        campaignId: options.campaignId
      })

      if (probeResult.fileCount === 0) {
        throw new Error('Aucun fichier disponible pour cette campagne')
      }

      downloadedFiles = probeResult.files
      totalBytes = probeResult.totalSize || 0

      // Étape 3: Téléchargement WiFi (tentative primaire)
      try {
        options.onProgress?.({
          type: 'wifi_download',
          current: 0,
          total: probeResult.fileCount,
          method: 'wifi'
        })

        // TODO: Implémenter le téléchargement WiFi
        // Pour l'instant, on simule ou on passe directement au BLE
        method = 'wifi'

        options.onProgress?.({
          type: 'wifi_download',
          current: probeResult.fileCount,
          total: probeResult.fileCount,
          bytes: totalBytes,
          method: 'wifi'
        })

      } catch (wifiError) {
        // Fallback sur BLE
        deviceLog.warn('WiFi download failed, falling back to BLE', wifiError)
        method = 'ble'

        options.onProgress?.({
          type: 'ble_download',
          current: 0,
          total: probeResult.fileCount,
          method: 'ble'
        })

        // Télécharger via BLE
        const downloadResult = await downloadFiles({
          fileIds: probeResult.files.map((f: { name: string }) => f.name),
          onProgress: (progress: { current: number; total: number; percent: number }) => {
            options.onProgress?.({
              type: 'ble_download',
              current: progress.current,
              total: progress.total,
              bytes: totalBytes,
              method: 'ble'
            })
          }
        })

        if (!downloadResult.success) {
          throw new Error('Échec du téléchargement BLE')
        }
      }

      // Étape 4: Stockage local (IndexedDB)
      options.onProgress?.({ type: 'storing' })
      // Les fichiers sont déjà stockés par downloadFiles

      // Étape 5: Upload vers serveur
      options.onProgress?.({
        type: 'uploading',
        current: 0,
        total: downloadedFiles.length
      })

      // TODO: Implémenter l'upload réel vers le backend
      // Pour l'instant, simuler l'upload
      for (let i = 0; i < downloadedFiles.length; i++) {
        options.onProgress?.({
          type: 'uploading',
          current: i + 1,
          total: downloadedFiles.length
        })
      }

      // Étape 6: Cleanup ESP32
      options.onProgress?.({ type: 'cleanup' })
      // TODO: Envoyer la commande de nettoyage à l'ESP32

      // Étape 7: Terminé
      options.onProgress?.({ type: 'done' })

      const duration = Date.now() - startTime
      const result: TransferCampaignFilesResult = {
        success: true,
        method,
        fileCount: downloadedFiles.length,
        totalBytes,
        duration,
        uploadedToServer: true
      }

      // Événement global
      eventBus.emit({ type: 'transfer:completed', data: { machineId: String(options.machineId) } } as any)

      deviceLog.info('Campaign files transfer completed', { result })
      return result

    } catch (error) {
      const duration = Date.now() - startTime
      const result: TransferCampaignFilesResult = {
        success: false,
        method,
        fileCount: downloadedFiles.length,
        totalBytes,
        duration,
        uploadedToServer: false
      }

      deviceLog.error('Campaign files transfer failed', error)
      throw createDeviceError('DOWNLOAD_FAILED', error as Error)
    }
  }, [deviceId, bleConnection, connectDevice, probeFiles, downloadFiles, eventBus])

  // ==================== SYNC STATE MONITORING ====================

  useEffect(() => {
    // Surveiller l'état de synchronisation
    const updateSyncState = () => {
      // TODO: Implémenter la surveillance de la queue d'upload
      // const pending = uploadQueue.getPendingUploads(deviceId)
      // setSyncState({
      //   lastSync: deviceStore.getLastSync(deviceId),
      //   pendingSync: pending.length > 0,
      //   pendingUploads: pending.length,
      //   queuedFiles: pending.reduce((sum, upload) => sum + upload.files.length, 0)
      // })
    }

    updateSyncState()

    // Écouter les événements de synchronisation
    const unsubscribe = eventBus.on('*', updateSyncState, {
      filter: (event) => event.type.startsWith('upload:')
    })
    return unsubscribe
  }, [deviceId, deviceStore, eventBus])

  // ==================== CLEANUP ====================

  useEffect(() => {
    // Cleanup automatique à la destruction du hook
    return () => {
      if (bleConnection?.status === 'connected') {
        deviceLog.debug('Cleaning up device connection on unmount', { deviceId })
        disconnectDevice().catch(error =>
          deviceLog.error('Failed to cleanup device connection', error)
        )
      }
    }
  }, [deviceId, bleConnection?.status, disconnectDevice])

  // ==================== RETURN ====================

  const error = queryError as Error | null

  // Enrichir le device avec les infos BLE et sync si disponible
  const enrichedDevice = useMemo(() => {
    if (!device) return null

    const normalizedBleConnection: NormalizedBleConnection | undefined = bleConnection
      ? {
          status: bleConnection.status,
          deviceId: bleConnection.deviceId,
          lastSeen: bleConnection.lastConnection,
          isConnected: bleConnection.status === 'connected',
          isConnecting: bleConnection.isConnecting ?? false,
          isScanning: bleConnection.isScanning ?? false,
          isProbing: bleConnection.isProbing ?? false,
          isDownloading: bleConnection.isDownloading ?? false,
          error: bleConnection.error,
          rssi: bleConnection.rssi,
          activeCampaigns: bleConnection.activeCampaigns,
          filesByCampaign: bleConnection.filesByCampaign
        }
      : undefined

    return {
      ...device,
      bleConnection: normalizedBleConnection,
      syncState
    }
  }, [device, bleConnection, syncState])

  return {
    device: enrichedDevice,
    isLoading,
    error,
    refetch,
    updateDevice: updateDeviceMutation.mutateAsync,
    deleteDevice: async () => {
      throw new AppError('Device deletion not implemented', 'NOT_IMPLEMENTED')
    },
    assignToSite: assignToSiteMutation.mutateAsync,
    unassignFromSite: removeFromSiteMutation.mutateAsync,
    connectBle: connectDevice,
    disconnectBle: disconnectDevice,
    connectDevice,
    disconnectDevice,
    probeFiles,
    downloadFiles,
    transferCampaignFiles
  }
}

// ==================== EXPORT ====================

export default useDevice
