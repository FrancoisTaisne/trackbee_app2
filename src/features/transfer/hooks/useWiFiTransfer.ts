// @ts-nocheck

/**
 * WiFi Transfer Hook
 * Hook sp?cialis? pour les transferts WiFi
 */

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '@/core/services/api/HttpClient'
import { logger } from '@/core/utils/logger'
import type {
  WiFiDeviceInfo,
  WiFiTransferOptions,
  Transfer,
  UseWiFiTransferReturn,
  WiFiConnectionTestResult
} from '../types'
import { transferQueryKeys, WiFiTransferOptionsSchema, WIFI_DEFAULT_SETTINGS } from '../types'

const log = logger.extend('useWiFiTransfer')

// ==================== WIFI API FUNCTIONS ====================

async function scanForWiFiDevices(): Promise<WiFiDeviceInfo[]> {

  log.debug('scanForWiFiDevices')

  const devices = await httpClient.get<WiFiDeviceInfo[]>('/api/transfers/wifi/scan')

  log.info('WiFi devices found', { count: devices.length })

  return devices

}

async function connectToWiFiDevice(

  ipAddress: string,

  options: Partial<WiFiTransferOptions> = {}

): Promise<WiFiDeviceInfo> {

  log.debug('connectToWiFiDevice', { ipAddress, options })

  const validatedOptions = WiFiTransferOptionsSchema.parse({

    ...WIFI_DEFAULT_SETTINGS,

    ipAddress,

    ...options

  })

  const device = await httpClient.post<WiFiDeviceInfo>('/api/transfers/wifi/connect', validatedOptions)

  log.info('Connected to WiFi device', { ipAddress, deviceName: device.name })

  return device

}

async function disconnectWiFiDevice(): Promise<void> {

  log.debug('disconnectWiFiDevice')

  await httpClient.post('/api/transfers/wifi/disconnect')

  log.info('Disconnected from WiFi device')

}

async function getWiFiConnectionStatus(): Promise<{

  isConnected: boolean

  device?: WiFiDeviceInfo

  error?: string

}> {

  log.debug('getWiFiConnectionStatus')

  const status = await httpClient.get<{

    isConnected: boolean

    device?: WiFiDeviceInfo

    error?: string

  }>('/api/transfers/wifi/status')

  log.debug('WiFi connection status', { status })

  return status

}

async function listWiFiFiles(path?: string): Promise<string[]> {

  log.debug('listWiFiFiles', { path })

  const searchParams = new URLSearchParams()

  if (path) searchParams.append('path', path)

  const files = await httpClient.get<string[]>(`/api/transfers/wifi/files?${searchParams}`)

  log.info('WiFi files listed', { count: files.length, path })

  return files

}

async function downloadWiFiFile(

  fileName: string,

  options: Partial<WiFiTransferOptions> = {}

): Promise<Transfer> {

  log.debug('downloadWiFiFile', { fileName, options })

  const validatedOptions = WiFiTransferOptionsSchema.parse({

    ...WIFI_DEFAULT_SETTINGS,

    ...options

  })

  const transfer = await httpClient.post<Transfer>('/api/transfers/wifi/download', {

    fileName,

    options: validatedOptions

  })

  log.info('WiFi file download started', { fileName, transferId: transfer.id })

  return transfer

}

async function uploadWiFiFile(

  file: File,

  options: Partial<WiFiTransferOptions> = {}

): Promise<Transfer> {

  log.debug('uploadWiFiFile', { fileName: file.name, size: file.size, options })

  const validatedOptions = WiFiTransferOptionsSchema.parse({

    ...WIFI_DEFAULT_SETTINGS,

    ...options

  })

  const formData = new FormData()

  formData.append('file', file)

  formData.append('options', JSON.stringify(validatedOptions))

  const transfer = await httpClient.post<Transfer>('/api/transfers/wifi/upload', formData, {

    headers: {

      'Content-Type': 'multipart/form-data'

    }

  })

  log.info('WiFi file upload started', { fileName: file.name, transferId: transfer.id })

  return transfer

}

async function testWiFiConnection(ipAddress: string, port: number = 80): Promise<WiFiConnectionTestResult> {

  log.debug('testWiFiConnection', { ipAddress, port })

  const result = await httpClient.post<WiFiConnectionTestResult>('/api/transfers/wifi/test', {

    ipAddress,

    port

  })

  log.debug('WiFi connection test result', { ipAddress, result })

  return result

}

// ==================== NETWORK DETECTION ====================



async function scanLocalNetwork(): Promise<WiFiDeviceInfo[]> {

  log.debug('scanLocalNetwork')

  try {

    const devices = await httpClient.get<WiFiDeviceInfo[]>('/api/transfers/wifi/network-scan')

    log.info('Local network scan completed', { devicesFound: devices.length })

    return devices

  } catch (error) {

    log.error('Local network scan failed', { error })

    return []

  }

}

// ==================== HOOK ====================

export function useWiFiTransfer(): UseWiFiTransferReturn {

  const queryClient = useQueryClient()

  // État local

  const [isScanning, setIsScanning] = useState(false)

  const [isConnecting, setIsConnecting] = useState(false)

  const [lastError, setLastError] = useState<Error | undefined>()

  // Query pour les devices disponibles

  const {

    data: availableDevices = [],

    refetch: refetchDevices

  } = useQuery({

    queryKey: transferQueryKeys.devices('wifi'),

    queryFn: scanForWiFiDevices,

    enabled: false, // Déclenché manuellement

    staleTime: 60 * 1000, // 1 minute

    gcTime: 5 * 60 * 1000  // 5 minutes

  })

  // Query pour le statut de connexion

  const {

    data: connectionStatus,

    refetch: refetchStatus

  } = useQuery({

    queryKey: ['wifi', 'connection', 'status'],

    queryFn: getWiFiConnectionStatus,

    refetchInterval: 10000, // Vérifier toutes les 10 secondes

    staleTime: 5000

  })

  // État dérivé

  const connectedDevice = connectionStatus?.device || null

  const connectionStatusState = connectionStatus?.isConnected

    ? 'connected'

    : isConnecting

    ? 'connecting'

    : connectionStatus?.error

    ? 'error'

    : 'disconnected'

  // Mutations

  const scanMutation = useMutation<WiFiDeviceInfo[], Error, void>({
    mutationFn: async () => {
      setIsScanning(true)
      setLastError(undefined)

      try {
        const [networkDevices, knownDevices] = await Promise.all([
          scanLocalNetwork(),
          scanForWiFiDevices()
        ])

        const allDevices = [...networkDevices, ...knownDevices]
        const uniqueDevices = allDevices.filter((device, index, array) =>
          array.findIndex(d => d.ipAddress === device.ipAddress) === index
        )

        return uniqueDevices
      } finally {
        setIsScanning(false)
      }
    },
    onSuccess: (devices) => {
      queryClient.setQueryData(transferQueryKeys.devices('wifi'), devices)
      log.info('WiFi scan completed', { devicesFound: devices.length })
    },
    onError: (error: Error) => {
      setLastError(error)
      log.error('WiFi scan failed', { error })
    }
  })

  const connectMutation = useMutation<
    WiFiDeviceInfo,
    Error,
    { ipAddress: string; options?: Partial<WiFiTransferOptions> }
  >({
    mutationFn: async ({ ipAddress, options }) => {
      setIsConnecting(true)
      setLastError(undefined)

      try {
        return await connectToWiFiDevice(ipAddress, options)
      } finally {
        setIsConnecting(false)
      }
    },
    onSuccess: (device) => {
      refetchStatus()
      log.info('WiFi device connected', { ipAddress: device.ipAddress, deviceName: device.name })
    },
    onError: (error: Error) => {
      setLastError(error)
      setIsConnecting(false)
      log.error('WiFi connection failed', { error })
    }
  })

  const disconnectMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      await disconnectWiFiDevice()
    },
    onSuccess: () => {
      refetchStatus()
      log.info('WiFi device disconnected')
    },
    onError: (error: Error) => {
      setLastError(error)
      log.error('WiFi disconnect failed', { error })
    }
  })

  const testConnectionMutation = useMutation<
    WiFiConnectionTestResult,
    Error,
    { ipAddress: string; port?: number }
  >({
    mutationFn: ({ ipAddress, port }) => testWiFiConnection(ipAddress, port),
    onError: (error: Error) => {
      setLastError(error)
      log.error('WiFi connection test failed', { error })
    }
  })

  const listFilesMutation = useMutation<string[], Error, string | undefined>({
    mutationFn: async (path) => listWiFiFiles(path),
    onError: (error: Error) => {
      setLastError(error)
      log.error('WiFi list files failed', { error })
    }
  })

  const downloadMutation = useMutation<
    Transfer,
    Error,
    { fileName: string; options?: Partial<WiFiTransferOptions> }
  >({
    mutationFn: ({ fileName, options }) => downloadWiFiFile(fileName, options),
    onSuccess: (transfer) => {
      queryClient.invalidateQueries({ queryKey: transferQueryKeys.lists() })
      log.info('WiFi download initiated', { transferId: transfer.id })
    },
    onError: (error: Error) => {
      setLastError(error)
      log.error('WiFi download failed', { error })
    }
  })

  const uploadMutation = useMutation<
    Transfer,
    Error,
    { file: File; options?: Partial<WiFiTransferOptions> }
  >({
    mutationFn: ({ file, options }) => uploadWiFiFile(file, options),
    onSuccess: (transfer) => {
      queryClient.invalidateQueries({ queryKey: transferQueryKeys.lists() })
      log.info('WiFi upload initiated', { transferId: transfer.id })
    },
    onError: (error: Error) => {
      setLastError(error)
      log.error('WiFi upload failed', { error })
    }
  })

  // Actions publiques

  const scanForDevices = useCallback(async () => {

    await scanMutation.mutateAsync()

  }, [scanMutation])

  const connectToDevice = useCallback(async (ipAddress: string, options?: Partial<WiFiTransferOptions>) => {

    await connectMutation.mutateAsync({ ipAddress, options })

  }, [connectMutation])

  const disconnectDevice = useCallback(async () => {

    await disconnectMutation.mutateAsync()

  }, [disconnectMutation])

  const testConnection = useCallback(async (ipAddress: string, port?: number) => {

    return await testConnectionMutation.mutateAsync({ ipAddress, port })

  }, [testConnectionMutation])

  const listFiles = useCallback(async (path?: string) => {

    return await listFilesMutation.mutateAsync(path)

  }, [listFilesMutation])

  const downloadFile = useCallback(async (fileName: string, options?: Partial<WiFiTransferOptions>) => {

    return await downloadMutation.mutateAsync({ fileName, options })

  }, [downloadMutation])

  const uploadFile = useCallback(async (file: File, options?: Partial<WiFiTransferOptions>) => {

    return await uploadMutation.mutateAsync({ file, options })

  }, [uploadMutation])

  const refetch = useCallback(async () => {

    await Promise.all([

      refetchDevices(),

      refetchStatus()

    ])

  }, [refetchDevices, refetchStatus])

  return {

    // Device scanning

    availableDevices,

    isScanning: isScanning || scanMutation.isPending,

    scanForDevices,

    // Connection

    connectedDevice,

    isConnecting: isConnecting || connectMutation.isPending,

    connectToDevice,

    disconnectDevice,

    testConnection,

    // File operations

    listFiles,

    downloadFile,

    uploadFile,

    // Status

    connectionStatus: connectionStatusState,

    lastError,

    refetch

  }

}

// ==================== HELPERS ====================

export function isWiFiAvailable(): boolean {

  // WiFi est généralement disponible dans tous les environnements

  return true

}

export function validateIPAddress(ip: string): boolean {

  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/

  return ipRegex.test(ip)

}

export function isLocalIPAddress(ip: string): boolean {

  if (!validateIPAddress(ip)) return false

  const parts = ip.split('.').map(Number)

  // Adresses privées RFC 1918

  if (parts[0] === 10) return true // 10.0.0.0/8

  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true // 172.16.0.0/12

  if (parts[0] === 192 && parts[1] === 168) return true // 192.168.0.0/16

  // Loopback

  if (parts[0] === 127) return true // 127.0.0.0/8

  // Link-local

  if (parts[0] === 169 && parts[1] === 254) return true // 169.254.0.0/16

  return false

}

export function formatWiFiDeviceInfo(device: WiFiDeviceInfo): string {

  const parts = []

  if (device.name) parts.push(device.name)

  parts.push(device.ipAddress)

  if (device.port && device.port !== 80) parts.push(`:${device.port}`)

  if (device.ssid) parts.push(`(${device.ssid})`)

  return parts.join(' ')

}

export function getWiFiSignalQuality(latency?: number): 'excellent' | 'good' | 'fair' | 'poor' | 'unknown' {

  if (latency === undefined) return 'unknown'

  if (latency <= 10) return 'excellent'

  if (latency <= 50) return 'good'

  if (latency <= 100) return 'fair'

  return 'poor'

}

export function estimateWiFiTransferTime(fileSize: number, options: Partial<WiFiTransferOptions> = {}): number {

  // Estimation basée sur le type de protocole

  const protocol = options.protocol || 'http'

  let estimatedSpeed: number // bytes/sec

  switch (protocol) {

    case 'http':

      estimatedSpeed = 1024 * 1024 // 1 MB/s

      break

    case 'ftp':

      estimatedSpeed = 2 * 1024 * 1024 // 2 MB/s

      break

    case 'scp':

      estimatedSpeed = 1.5 * 1024 * 1024 // 1.5 MB/s

      break

    default:

      estimatedSpeed = 1024 * 1024

  }

  // Ajouter overhead pour SSL

  if (options.ssl) {

    estimatedSpeed *= 0.8 // 20% de réduction pour encryption

  }

  return Math.ceil(fileSize / estimatedSpeed)

}

export function validateWiFiTransferOptions(options: Partial<WiFiTransferOptions>): string[] {

  const errors: string[] = []

  if (options.ipAddress && !validateIPAddress(options.ipAddress)) {

    errors.push('Adresse IP invalide')

  }

  if (options.port && (options.port < 1 || options.port > 65535)) {

    errors.push('Port doit être entre 1 et 65535')

  }

  if (options.timeout && options.timeout < 1000) {

    errors.push('Timeout doit être au moins 1 seconde')

  }

  if (options.authentication?.username && !options.authentication.password && !options.authentication.keyFile) {

    errors.push('Mot de passe ou clé privée requis pour authentification')

  }

  return errors

}

export function buildWiFiConnectionString(options: WiFiTransferOptions): string {

  const { protocol, ipAddress, port, ssl } = options

  const scheme = ssl ? `${protocol}s` : protocol

  const portPart = port && port !== 80 ? `:${port}` : ''

  return `${scheme}://${ipAddress}${portPart}`

}

export function parseWiFiConnectionString(connectionString: string): Partial<WiFiTransferOptions> {

  try {

    const url = new URL(connectionString)

    return {

      protocol: url.protocol.replace(':', '').replace('s', '') as 'http' | 'ftp' | 'scp',

      ipAddress: url.hostname,

      port: url.port ? parseInt(url.port) : undefined,

      ssl: url.protocol.endsWith('s:')

    }

  } catch {

    return {}

  }

}

export function getDefaultWiFiPort(protocol: string, ssl: boolean = false): number {

  switch (protocol) {

    case 'http':

      return ssl ? 443 : 80

    case 'ftp':

      return ssl ? 990 : 21

    case 'scp':

      return 22

    default:

      return 80

  }

}

// @ts-nocheck
