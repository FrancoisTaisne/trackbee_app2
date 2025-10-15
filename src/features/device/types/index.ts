/**
 * Device Feature Types
 * Types et schémas de validation pour la gestion des IoT devices TrackBee
 */

import { z } from 'zod'
import type {
  Machine,
  Site,
  Installation,
  Campaign,
  Calculation,
  BleConnectionStatus,
  BleDevice,
  BleFileInfo
} from '@/core/types'

// ==================== DEVICE TYPES ====================

/**
 * Device complet avec toutes ses relations
 */
export interface DeviceBundle {
  machine: Machine
  installation?: Installation
  site?: Site
  campaigns: Campaign[]
  calculations: Calculation[]
  bleConnection?: DeviceConnectionState
}

/**
 * État de connexion BLE d'un device
 */
export interface DeviceConnectionState {
  status: BleConnectionStatus
  deviceId?: string
  lastConnection?: Date
  activeCampaigns: Set<number>
  filesByCampaign: Map<number, BleFileInfo[]>
  error?: string
  isScanning?: boolean
  isConnecting?: boolean
  isProbing?: boolean
  isDownloading?: boolean
}

/**
 * Données pour créer un nouveau device
 */
export interface CreateDeviceData {
  name: string
  description?: string
  macAddress: string
  siteId?: number
  type?: Machine['type']
  model?: string
}

/**
 * Données pour mettre à jour un device
 */
export interface UpdateDeviceData {
  name?: string
  description?: string
  macAddress?: string
  isActive?: boolean
  model?: string
}

/**
 * Données pour associer un device à un site
 */
export interface AssignDeviceToSiteData {
  deviceId: number
  siteId: number
  installationName?: string
  notes?: string
}

/**
 * Résultat d'un scan BLE
 */
export interface DeviceScanResult {
  device: BleDevice
  machine?: Machine
  isKnown: boolean
  rssi: number
  timestamp: Date
}

/**
 * Options de scan BLE
 */
export interface DeviceScanOptions {
  timeout?: number
  filterByKnownMacs?: boolean
  allowDuplicates?: boolean
  onDeviceFound?: (result: DeviceScanResult) => void
  onScanComplete?: (results: DeviceScanResult[]) => void
}

/**
 * Options de connexion à un device
 */
export interface DeviceConnectionOptions {
  autoProbeFiles?: boolean
  campaignId?: number
  timeout?: number
  onConnected?: (deviceId: string) => void
  onDisconnected?: (reason?: string) => void
  onError?: (error: Error) => void
}

/**
 * Données de sondage des fichiers
 */
export interface DeviceFileProbeData {
  machineId: number
  campaignId?: number
  includeMetadata?: boolean
}

/**
 * Résultat du sondage des fichiers
 */
export interface DeviceFileProbeResult {
  success: boolean
  campaignId: number
  fileCount: number
  files: BleFileInfo[]
  totalSize?: number
  error?: string
}

/**
 * Options de téléchargement de fichiers
 */
export interface DeviceDownloadOptions {
  campaignId?: number
  files?: string[]
  onProgress?: (progress: number, file: string) => void
  onFileComplete?: (file: string, data: Uint8Array) => void
  onComplete?: (files: string[]) => void
  onError?: (error: Error, file?: string) => void
}

/**
 * Résultat de téléchargement
 */
export interface DeviceDownloadResult {
  success: boolean
  files: string[]
  failedFiles: string[]
  totalSize: number
  duration: number
  error?: string
}

/**
 * État de synchronisation des données
 */
export interface DeviceSyncState {
  lastSync?: Date
  pendingSync: boolean
  syncError?: string
  pendingUploads: number
  queuedFiles: number
}

// ==================== VALIDATION SCHEMAS ====================

/**
 * Schéma pour créer un device
 */
export const CreateDeviceSchema = z.object({
  name: z.string()
    .min(1, 'Le nom est obligatoire')
    .max(100, 'Le nom est trop long'),
  description: z.string()
    .max(500, 'La description est trop longue')
    .optional(),
  macAddress: z.string()
    .regex(
      /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
      'Format MAC invalide (ex: AA:BB:CC:DD:EE:FF)'
    ),
  siteId: z.number().int().positive().optional(),
  type: z.enum(['trackbee', 'trackbee_pro', 'custom']).default('trackbee'),
  model: z.string().max(50, 'Le modèle est trop long').optional()
})

/**
 * Schéma pour mettre à jour un device
 */
export const UpdateDeviceSchema = z.object({
  name: z.string()
    .min(1, 'Le nom est obligatoire')
    .max(100, 'Le nom est trop long')
    .optional(),
  description: z.string()
    .max(500, 'La description est trop longue')
    .optional(),
  macAddress: z.string()
    .regex(
      /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
      'Format MAC invalide'
    )
    .optional(),
  isActive: z.boolean().optional(),
  model: z.string().max(50, 'Le modèle est trop long').optional()
})

/**
 * Schéma pour associer un device à un site
 */
export const AssignDeviceToSiteSchema = z.object({
  deviceId: z.number().int().positive(),
  siteId: z.number().int().positive(),
  installationName: z.string()
    .max(100, 'Le nom d\'installation est trop long')
    .optional(),
  notes: z.string()
    .max(1000, 'Les notes sont trop longues')
    .optional()
})

/**
 * Schéma pour les options de scan
 */
export const DeviceScanOptionsSchema = z.object({
  timeout: z.number().int().min(5000).max(60000).default(30000),
  filterByKnownMacs: z.boolean().default(true),
  allowDuplicates: z.boolean().default(false)
})

/**
 * Schéma pour les options de connexion
 */
export const DeviceConnectionOptionsSchema = z.object({
  autoProbeFiles: z.boolean().default(true),
  campaignId: z.number().int().positive().optional(),
  timeout: z.number().int().min(5000).max(30000).default(15000)
})

/**
 * Schéma pour sonder les fichiers
 */
export const DeviceFileProbeSchema = z.object({
  machineId: z.number().int().positive(),
  campaignId: z.number().int().positive().optional(),
  includeMetadata: z.boolean().default(true)
})

// ==================== TYPE GUARDS ====================

/**
 * Vérifie si un objet est un DeviceBundle valide
 */
export const isDeviceBundle = (obj: unknown): obj is DeviceBundle => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'machine' in obj &&
    typeof (obj as Record<string, unknown>).machine === 'object' &&
    'campaigns' in obj &&
    Array.isArray((obj as Record<string, unknown>).campaigns) &&
    'calculations' in obj &&
    Array.isArray((obj as Record<string, unknown>).calculations)
  )
}

/**
 * Vérifie si un device est connecté
 */
export const isDeviceConnected = (state?: DeviceConnectionState): boolean => {
  return state?.status === 'connected'
}

/**
 * Vérifie si un device a des fichiers disponibles
 */
export const hasAvailableFiles = (state?: DeviceConnectionState): boolean => {
  if (!state?.filesByCampaign) return false
  for (const files of state.filesByCampaign.values()) {
    if (files.length > 0) return true
  }
  return false
}

/**
 * Vérifie si un device est en cours d'opération
 */
export const isDeviceBusy = (state?: DeviceConnectionState): boolean => {
  return !!(
    state?.isScanning ||
    state?.isConnecting ||
    state?.isProbing ||
    state?.isDownloading
  )
}

// ==================== UTILITY TYPES ====================

/**
 * Hooks return types
 */
export interface UseDeviceListReturn {
  devices: DeviceBundle[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  createDevice: (data: CreateDeviceData) => Promise<Machine>
  updateDevice: (id: number, data: UpdateDeviceData) => Promise<Machine>
  deleteDevice: (id: number) => Promise<void>
  scanForDevices: (options?: DeviceScanOptions) => Promise<DeviceScanResult[]>
}

export interface UseDeviceDetailReturn {
  device: DeviceBundle | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  updateDevice: (data: UpdateDeviceData) => Promise<Machine>
  assignToSite: (data: AssignDeviceToSiteData) => Promise<Installation>
  removeFromSite: () => Promise<void>
  connectDevice: (options?: DeviceConnectionOptions) => Promise<string>
  disconnectDevice: () => Promise<void>
  probeFiles: (data?: DeviceFileProbeData) => Promise<DeviceFileProbeResult>
  downloadFiles: (options?: DeviceDownloadOptions) => Promise<DeviceDownloadResult>
  syncState: DeviceSyncState
}

export interface UseDeviceScanReturn {
  isScanning: boolean
  devices: DeviceScanResult[]
  error: Error | null
  startScan: (options?: DeviceScanOptions) => Promise<void>
  stopScan: () => void
  connectToDevice: (result: DeviceScanResult) => Promise<void>
  clearResults: () => void
}

/**
 * Component Props Types
 */
export interface DeviceListProps {
  onDeviceSelect?: (device: DeviceBundle) => void
  filterConnected?: boolean
  showScanButton?: boolean
  maxItems?: number
}

export interface DeviceDetailProps {
  deviceId: number
  onDeviceUpdate?: (device: Machine) => void
  onNavigateToSite?: (siteId: number) => void
}

export interface DeviceScanModalProps {
  isOpen: boolean
  onClose: () => void
  onDeviceSelected: (result: DeviceScanResult) => void
  filterByKnownMacs?: boolean
  autoConnect?: boolean
}

export interface DeviceConnectionPillProps {
  deviceId: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
}

export interface DeviceFileDownloadProps {
  deviceId: number
  campaignId?: number
  onDownloadComplete?: (files: string[]) => void
  onError?: (error: Error) => void
  className?: string
}

// ==================== ERROR TYPES ====================

/**
 * Erreurs spécifiques à la Device Feature
 */
export type DeviceError =
  | 'DEVICE_NOT_FOUND'
  | 'DEVICE_ALREADY_EXISTS'
  | 'INVALID_MAC_ADDRESS'
  | 'BLE_NOT_AVAILABLE'
  | 'BLE_CONNECTION_FAILED'
  | 'BLE_SCAN_FAILED'
  | 'DEVICE_NOT_CONNECTED'
  | 'FILE_PROBE_FAILED'
  | 'FILE_DOWNLOAD_FAILED'
  | 'SITE_ASSIGNMENT_FAILED'
  | 'DEVICE_BUSY'
  | 'PERMISSION_DENIED'

/**
 * Messages d'erreur localisés
 */
export const DeviceErrorMessages: Record<DeviceError, string> = {
  DEVICE_NOT_FOUND: 'Device non trouvé',
  DEVICE_ALREADY_EXISTS: 'Un device avec cette adresse MAC existe déjà',
  INVALID_MAC_ADDRESS: 'Adresse MAC invalide',
  BLE_NOT_AVAILABLE: 'Bluetooth non disponible sur cet appareil',
  BLE_CONNECTION_FAILED: 'Échec de la connexion Bluetooth',
  BLE_SCAN_FAILED: 'Échec du scan Bluetooth',
  DEVICE_NOT_CONNECTED: 'Device non connecté',
  FILE_PROBE_FAILED: 'Échec du sondage des fichiers',
  FILE_DOWNLOAD_FAILED: 'Échec du téléchargement des fichiers',
  SITE_ASSIGNMENT_FAILED: 'Échec de l\'association au site',
  DEVICE_BUSY: 'Device occupé par une autre opération',
  PERMISSION_DENIED: 'Permissions insuffisantes'
}

// ==================== EXPORT TYPE ====================

export type {
  Machine,
  Site,
  Installation,
  Campaign,
  Calculation,
  BleConnectionStatus,
  BleDevice,
  BleFileInfo
} from '@/core/types'
