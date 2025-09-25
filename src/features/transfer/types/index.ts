/**
 * Transfer Feature Types & Validation
 * Types stricts pour la gestion des transferts de fichiers BLE/WiFi
 */

import { z } from 'zod'
import type {
  CampaignId, SiteId, MachineId, InstallationId, CalculationId
} from '@/core/types/domain'

// ==================== BASE TYPES ====================

export type TransferId = string // UUID
export type TransferProtocol = 'ble' | 'wifi' | 'usb' | 'manual'
export type TransferDirection = 'download' | 'upload'
export type TransferStatus = 'queued' | 'connecting' | 'transferring' | 'completed' | 'failed' | 'canceled'
export type TransferPriority = 1 | 2 | 3 | 4 | 5 // 1=low, 5=high

export interface Transfer {
  id: TransferId
  campaignId?: CampaignId
  siteId?: SiteId
  machineId: MachineId
  installationId?: InstallationId
  calculationId?: CalculationId

  // Configuration du transfert
  protocol: TransferProtocol
  direction: TransferDirection
  status: TransferStatus
  priority: TransferPriority

  // Détails du fichier
  fileName: string
  fileSize?: number
  fileHash?: string
  filePath?: string // Chemin local ou distant

  // Métadonnées
  deviceAddress?: string    // MAC BLE ou IP WiFi
  deviceName?: string      // Nom du device

  // Progression
  bytesTransferred: number
  totalBytes?: number
  progressPercent: number
  transferRate?: number    // bytes/sec
  estimatedTimeRemaining?: number // secondes

  // Résultats
  error?: string
  retryCount: number
  maxRetries: number

  // Timestamps
  queuedAt: string        // ISO string
  startedAt?: string      // ISO string
  completedAt?: string    // ISO string
  lastRetryAt?: string    // ISO string

  // Options
  autoRetry: boolean
  deleteAfterTransfer: boolean
  validateIntegrity: boolean

  createdAt: string
  updatedAt: string
}

export interface TransferBundle {
  transfer: Transfer
  relatedTransfers: Transfer[]    // Transferts du même batch
  deviceInfo?: DeviceInfo
  campaignInfo?: CampaignInfo
  statistics: TransferStatistics
}

export interface DeviceInfo {
  id: MachineId
  name: string
  macAddress: string
  ipAddress?: string
  lastSeen?: string
  batteryLevel?: number
  signalStrength?: number
  isConnected: boolean
  connectionType?: TransferProtocol
}

export interface CampaignInfo {
  id: CampaignId
  name?: string
  type: string
  siteId: SiteId
  siteName?: string
}

export interface TransferStatistics {
  totalTransfers: number
  completedTransfers: number
  failedTransfers: number
  canceledTransfers: number
  totalBytes: number
  transferredBytes: number
  averageSpeed: number      // bytes/sec
  totalTime: number        // secondes
  successRate: number      // 0-100%
  lastTransferAt?: string  // ISO string
}

// ==================== QUEUE TYPES ====================

export interface TransferQueue {
  id: string
  name: string
  protocol: TransferProtocol
  isActive: boolean
  isPaused: boolean
  maxConcurrent: number
  currentTransfers: number

  // Statistiques
  queuedCount: number
  completedCount: number
  failedCount: number

  // Configuration
  autoStart: boolean
  retryFailedTransfers: boolean
  maxRetryAttempts: number
  retryDelay: number        // millisecondes

  createdAt: string
  updatedAt: string
}

export interface QueuedTransfer extends Transfer {
  queueId: string
  position: number
  estimatedStartTime?: string // ISO string
}

// ==================== BLE SPECIFIC TYPES ====================

export interface BLETransferOptions {
  deviceId: string          // BLE device ID
  serviceUUID: string       // BLE service UUID
  characteristicUUID: string // BLE characteristic UUID
  mtu: number              // Maximum transmission unit
  connectionTimeout: number // millisecondes
  transferTimeout: number   // millisecondes
  chunkSize: number        // bytes par chunk
  useNotifications: boolean
}

export interface BLEDeviceInfo extends DeviceInfo {
  deviceId: string         // BLE specific ID
  services: string[]       // Available services
  characteristics: string[] // Available characteristics
  rssi?: number           // Signal strength
  isAdvertising: boolean
  lastAdvertisement?: string
}

// ==================== WIFI SPECIFIC TYPES ====================

export interface WiFiTransferOptions {
  ipAddress: string
  port: number
  protocol: 'http' | 'ftp' | 'scp'
  authentication?: {
    username?: string
    password?: string
    keyFile?: string
  }
  ssl: boolean
  timeout: number          // millisecondes
}

export interface WiFiDeviceInfo extends DeviceInfo {
  ipAddress: string
  port?: number
  ssid?: string           // WiFi network name
  security?: string       // WPA2, WEP, etc.
  isReachable: boolean
  latency?: number        // ping en ms
}

// ==================== OFFLINE QUEUE TYPES ====================

export interface OfflineQueue {
  id: string
  name: string
  isEnabled: boolean
  maxSize: number         // nombre max de transferts
  maxAge: number          // âge max en millisecondes

  // Persistance
  storageType: 'indexeddb' | 'localstorage' | 'memory'
  compressionEnabled: boolean
  encryptionEnabled: boolean

  // Synchronisation
  syncOnConnect: boolean
  syncInterval: number    // millisecondes
  batchSize: number      // transferts par batch

  statistics: {
    queuedItems: number
    processedItems: number
    failedItems: number
    lastSyncAt?: string
    nextSyncAt?: string
  }

  createdAt: string
  updatedAt: string
}

export interface OfflineTransfer extends Transfer {
  queueId: string
  syncAttempts: number
  lastSyncAttempt?: string
  syncError?: string
  persistedData?: any     // Données sérialisées
}

// ==================== FORM TYPES ====================

export interface CreateTransferData {
  campaignId?: CampaignId
  siteId?: SiteId
  machineId: MachineId
  installationId?: InstallationId

  protocol: TransferProtocol
  direction: TransferDirection
  priority: TransferPriority

  fileName: string
  filePath?: string

  // Options
  autoRetry: boolean
  deleteAfterTransfer: boolean
  validateIntegrity: boolean
  maxRetries: number

  // Protocol specific
  bleOptions?: Partial<BLETransferOptions>
  wifiOptions?: Partial<WiFiTransferOptions>
}

export interface UpdateTransferData {
  status?: TransferStatus
  priority?: TransferPriority
  autoRetry?: boolean
  maxRetries?: number
  error?: string
}

export interface TransferFilters {
  machineId?: MachineId
  campaignId?: CampaignId
  siteId?: SiteId
  protocol?: TransferProtocol
  direction?: TransferDirection
  status?: TransferStatus[]
  priority?: TransferPriority[]
  dateRange?: {
    from: string
    to: string
  }
  search?: string
}

export interface TransferSorting {
  field: 'queuedAt' | 'startedAt' | 'completedAt' | 'priority' | 'fileName' | 'fileSize' | 'status'
  direction: 'asc' | 'desc'
}

// ==================== HOOK RETURN TYPES ====================

export interface UseTransferReturn {
  transfer: Transfer | null
  isLoading: boolean
  error: Error | null

  // Actions
  startTransfer: () => Promise<void>
  pauseTransfer: () => Promise<void>
  resumeTransfer: () => Promise<void>
  cancelTransfer: () => Promise<void>
  retryTransfer: () => Promise<void>
  updateTransfer: (data: UpdateTransferData) => Promise<Transfer>
  deleteTransfer: () => Promise<void>

  refetch: () => Promise<void>
}

export interface UseTransferListReturn {
  transfers: Transfer[]
  statistics: TransferStatistics
  isLoading: boolean
  error: Error | null

  // Pagination
  hasMore: boolean
  loadMore: () => Promise<void>

  // Actions
  createTransfer: (data: CreateTransferData) => Promise<Transfer>
  startTransfers: (transferIds: TransferId[]) => Promise<void>
  cancelTransfers: (transferIds: TransferId[]) => Promise<void>
  retryTransfers: (transferIds: TransferId[]) => Promise<void>
  deleteTransfers: (transferIds: TransferId[]) => Promise<void>

  // Queue management
  pauseQueue: () => Promise<void>
  resumeQueue: () => Promise<void>
  clearQueue: () => Promise<void>

  // Filters
  filters: TransferFilters
  setFilters: (filters: Partial<TransferFilters>) => void
  sorting: TransferSorting
  setSorting: (sorting: TransferSorting) => void

  refetch: () => Promise<void>
}

export interface UseBLETransferReturn {
  // Device scanning
  availableDevices: BLEDeviceInfo[]
  isScanning: boolean
  scanForDevices: () => Promise<void>
  stopScanning: () => Promise<void>

  // Connection
  connectedDevice: BLEDeviceInfo | null
  isConnecting: boolean
  connectToDevice: (deviceId: string) => Promise<void>
  disconnectDevice: () => Promise<void>

  // File operations
  listFiles: (path?: string) => Promise<string[]>
  downloadFile: (fileName: string, options?: Partial<BLETransferOptions>) => Promise<Transfer>
  uploadFile: (file: File, options?: Partial<BLETransferOptions>) => Promise<Transfer>

  // Status
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  lastError?: Error

  refetch: () => Promise<void>
}

export interface UseWiFiTransferReturn {
  // Device discovery
  availableDevices: WiFiDeviceInfo[]
  isScanning: boolean
  scanForDevices: () => Promise<void>

  // Connection
  connectedDevice: WiFiDeviceInfo | null
  isConnecting: boolean
  connectToDevice: (ipAddress: string, options?: Partial<WiFiTransferOptions>) => Promise<void>
  disconnectDevice: () => Promise<void>

  // File operations
  listFiles: (path?: string) => Promise<string[]>
  downloadFile: (fileName: string, options?: Partial<WiFiTransferOptions>) => Promise<Transfer>
  uploadFile: (file: File, options?: Partial<WiFiTransferOptions>) => Promise<Transfer>

  // Status
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  lastError?: Error

  refetch: () => Promise<void>
}

export interface UseOfflineQueueReturn {
  queue: OfflineQueue | null
  queuedTransfers: OfflineTransfer[]
  isLoading: boolean
  error: Error | null

  // Queue management
  addToQueue: (transfer: CreateTransferData) => Promise<void>
  removeFromQueue: (transferId: TransferId) => Promise<void>
  clearQueue: () => Promise<void>

  // Synchronization
  syncQueue: () => Promise<void>
  isSyncing: boolean
  lastSync?: Date

  // Configuration
  updateQueueSettings: (settings: Partial<OfflineQueue>) => Promise<void>

  refetch: () => Promise<void>
}

// ==================== COMPONENT PROPS ====================

export interface TransferListProps {
  machineId?: MachineId
  campaignId?: CampaignId
  protocol?: TransferProtocol
  direction?: TransferDirection
  filters?: Partial<TransferFilters>
  onTransferSelect?: (transfer: Transfer) => void
  onTransferCreate?: (data: CreateTransferData) => void
  className?: string
}

export interface TransferDetailProps {
  transferId: TransferId
  onUpdate?: (transfer: Transfer) => void
  onDelete?: (transferId: TransferId) => void
  className?: string
}

export interface TransferFormProps {
  machineId: MachineId
  campaignId?: CampaignId
  initialData?: Partial<CreateTransferData>
  mode: 'create' | 'edit'
  onSubmit: (data: CreateTransferData) => Promise<void>
  onCancel?: () => void
  className?: string
}

export interface DeviceConnectionProps {
  protocol: TransferProtocol
  onDeviceConnect?: (device: DeviceInfo) => void
  onDeviceDisconnect?: () => void
  autoConnect?: boolean
  className?: string
}

export interface FileTransferProps {
  device: DeviceInfo
  direction: TransferDirection
  onTransferStart?: (transfer: Transfer) => void
  onTransferComplete?: (transfer: Transfer) => void
  onError?: (error: Error) => void
  className?: string
}

export interface QueueManagerProps {
  protocol?: TransferProtocol
  showStatistics?: boolean
  allowBulkOperations?: boolean
  onQueueChange?: (queue: TransferQueue) => void
  className?: string
}

// ==================== VALIDATION SCHEMAS ====================

export const TransferProtocolSchema = z.enum(['ble', 'wifi', 'usb', 'manual'])
export const TransferDirectionSchema = z.enum(['download', 'upload'])
export const TransferStatusSchema = z.enum(['queued', 'connecting', 'transferring', 'completed', 'failed', 'canceled'])
export const TransferPrioritySchema = z.number().int().min(1).max(5)

export const CreateTransferSchema = z.object({
  campaignId: z.number().int().positive().optional(),
  siteId: z.number().int().positive().optional(),
  machineId: z.number().int().positive('Machine ID requis'),
  installationId: z.number().int().positive().optional(),

  protocol: TransferProtocolSchema,
  direction: TransferDirectionSchema,
  priority: TransferPrioritySchema.default(3),

  fileName: z.string().min(1, 'Nom de fichier requis').max(255, 'Nom trop long'),
  filePath: z.string().max(1000, 'Chemin trop long').optional(),

  autoRetry: z.boolean().default(true),
  deleteAfterTransfer: z.boolean().default(false),
  validateIntegrity: z.boolean().default(true),
  maxRetries: z.number().int().min(0).max(10).default(3),

  bleOptions: z.object({
    deviceId: z.string().min(1),
    serviceUUID: z.string().uuid().optional(),
    characteristicUUID: z.string().uuid().optional(),
    mtu: z.number().int().min(20).max(512).default(247),
    connectionTimeout: z.number().int().min(1000).max(30000).default(10000),
    transferTimeout: z.number().int().min(5000).max(300000).default(60000),
    chunkSize: z.number().int().min(20).max(512).default(244),
    useNotifications: z.boolean().default(true)
  }).optional(),

  wifiOptions: z.object({
    ipAddress: z.string().ip(),
    port: z.number().int().min(1).max(65535).default(80),
    protocol: z.enum(['http', 'ftp', 'scp']).default('http'),
    ssl: z.boolean().default(false),
    timeout: z.number().int().min(1000).max(300000).default(30000)
  }).optional()
})

export const UpdateTransferSchema = z.object({
  status: TransferStatusSchema.optional(),
  priority: TransferPrioritySchema.optional(),
  autoRetry: z.boolean().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
  error: z.string().max(1000).optional()
})

export const TransferFiltersSchema = z.object({
  machineId: z.number().int().positive().optional(),
  campaignId: z.number().int().positive().optional(),
  siteId: z.number().int().positive().optional(),
  protocol: TransferProtocolSchema.optional(),
  direction: TransferDirectionSchema.optional(),
  status: z.array(TransferStatusSchema).optional(),
  priority: z.array(TransferPrioritySchema).optional(),
  dateRange: z.object({
    from: z.string().datetime(),
    to: z.string().datetime()
  }).optional(),
  search: z.string().max(100).optional()
})

export const BLETransferOptionsSchema = z.object({
  deviceId: z.string().min(1, 'Device ID requis'),
  serviceUUID: z.string().uuid().optional(),
  characteristicUUID: z.string().uuid().optional(),
  mtu: z.number().int().min(20).max(512).default(247),
  connectionTimeout: z.number().int().min(1000).max(30000).default(10000),
  transferTimeout: z.number().int().min(5000).max(300000).default(60000),
  chunkSize: z.number().int().min(20).max(512).default(244),
  useNotifications: z.boolean().default(true)
})

export const WiFiTransferOptionsSchema = z.object({
  ipAddress: z.string().ip('Adresse IP invalide'),
  port: z.number().int().min(1).max(65535).default(80),
  protocol: z.enum(['http', 'ftp', 'scp']).default('http'),
  ssl: z.boolean().default(false),
  timeout: z.number().int().min(1000).max(300000).default(30000)
})

// ==================== CONSTANTS ====================

export const TRANSFER_PROTOCOLS = {
  ble: {
    label: 'Bluetooth LE',
    description: 'Transfert via Bluetooth Low Energy',
    icon: 'bluetooth',
    color: 'blue',
    maxFileSize: 50 * 1024 * 1024, // 50MB
    averageSpeed: 5000 // bytes/sec
  },
  wifi: {
    label: 'WiFi',
    description: 'Transfert via réseau WiFi',
    icon: 'wifi',
    color: 'green',
    maxFileSize: 1024 * 1024 * 1024, // 1GB
    averageSpeed: 1024 * 1024 // 1MB/sec
  },
  usb: {
    label: 'USB',
    description: 'Transfert via câble USB',
    icon: 'usb',
    color: 'purple',
    maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB
    averageSpeed: 10 * 1024 * 1024 // 10MB/sec
  },
  manual: {
    label: 'Manuel',
    description: 'Transfert manuel (copie fichier)',
    icon: 'folder',
    color: 'gray',
    maxFileSize: Number.MAX_SAFE_INTEGER,
    averageSpeed: 0
  }
} as const

export const TRANSFER_STATUS_LABELS = {
  queued: 'En attente',
  connecting: 'Connexion',
  transferring: 'Transfert',
  completed: 'Terminé',
  failed: 'Échoué',
  canceled: 'Annulé'
} as const

export const TRANSFER_PRIORITIES = {
  1: { label: 'Très basse', color: 'gray' },
  2: { label: 'Basse', color: 'blue' },
  3: { label: 'Normale', color: 'green' },
  4: { label: 'Élevée', color: 'orange' },
  5: { label: 'Critique', color: 'red' }
} as const

export const DEFAULT_QUEUE_SETTINGS = {
  maxConcurrent: 3,
  maxRetryAttempts: 3,
  retryDelay: 5000,
  autoStart: true,
  retryFailedTransfers: true
} as const

export const BLE_DEFAULT_SETTINGS = {
  serviceUUID: 'A100',
  characteristicUUID: 'A101',
  mtu: 247,
  connectionTimeout: 10000,
  transferTimeout: 60000,
  chunkSize: 244,
  useNotifications: true
} as const

export const WIFI_DEFAULT_SETTINGS = {
  port: 80,
  protocol: 'http' as const,
  ssl: false,
  timeout: 30000
} as const

// ==================== ERROR TYPES ====================

export interface TransferError extends Error {
  code: 'TRANSFER_NOT_FOUND' | 'DEVICE_NOT_CONNECTED' | 'TRANSFER_FAILED' |
        'FILE_NOT_FOUND' | 'INSUFFICIENT_SPACE' | 'TIMEOUT' | 'VALIDATION_ERROR' |
        'BLE_ERROR' | 'WIFI_ERROR' | 'QUEUE_FULL' | 'PERMISSION_DENIED'
  transferId?: TransferId
  deviceId?: string
  details?: Record<string, any>
}

// ==================== QUERY KEYS ====================

export const transferQueryKeys = {
  all: ['transfers'] as const,
  lists: () => [...transferQueryKeys.all, 'list'] as const,
  list: (filters: TransferFilters) => [...transferQueryKeys.lists(), filters] as const,
  details: () => [...transferQueryKeys.all, 'detail'] as const,
  detail: (id: TransferId) => [...transferQueryKeys.details(), id] as const,
  bundle: (id: TransferId) => [...transferQueryKeys.detail(id), 'bundle'] as const,
  statistics: (filters?: Partial<TransferFilters>) => [...transferQueryKeys.all, 'statistics', filters] as const,
  queues: () => [...transferQueryKeys.all, 'queues'] as const,
  queue: (queueId: string) => [...transferQueryKeys.queues(), queueId] as const,
  devices: (protocol: TransferProtocol) => [...transferQueryKeys.all, 'devices', protocol] as const,
  offline: () => [...transferQueryKeys.all, 'offline'] as const
}

// ==================== TYPE GUARDS ====================

export function isTransfer(value: unknown): value is Transfer {
  return typeof value === 'object' && value !== null &&
         'id' in value && 'protocol' in value && 'direction' in value && 'status' in value
}

export function isBLETransfer(transfer: Transfer): transfer is Transfer & { bleOptions: BLETransferOptions } {
  return transfer.protocol === 'ble'
}

export function isWiFiTransfer(transfer: Transfer): transfer is Transfer & { wifiOptions: WiFiTransferOptions } {
  return transfer.protocol === 'wifi'
}

export function isActiveTransfer(transfer: Transfer): boolean {
  return ['connecting', 'transferring'].includes(transfer.status)
}

export function isCompletedTransfer(transfer: Transfer): boolean {
  return ['completed', 'failed', 'canceled'].includes(transfer.status)
}

export function canRetryTransfer(transfer: Transfer): boolean {
  return transfer.status === 'failed' && transfer.retryCount < transfer.maxRetries
}

export function canCancelTransfer(transfer: Transfer): boolean {
  return ['queued', 'connecting', 'transferring'].includes(transfer.status)
}