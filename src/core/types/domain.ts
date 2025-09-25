/**
 * Types de domaine métier TrackBee v2
 * Types stricts pour toutes les entités business
 */

// IDs typés pour éviter les confusions
export type UserId = number
export type MachineId = number
export type SiteId = number
export type InstallationId = number
export type CampaignId = number
export type CalculationId = number

// Rôles utilisateur
export type UserRole = 'ADMIN' | 'MODERATOR' | 'USER' | 'VIEWER'

// États des campagnes
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'done' | 'canceled'

// Types de campagnes
export type CampaignType = 'static_simple' | 'static_multiple' | 'kinematic' | 'rover_base'

// États des calculs
export type CalculationStatus = 'queued' | 'running' | 'done' | 'failed'

// États de connexion BLE
export type BleConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// Métadonnées fichier
export interface FileMeta {
  name: string              // "123_20250904_114651.ubx"
  size?: number            // Taille en bytes
  hash?: string            // SHA-256 hash
  campaignId?: CampaignId  // Extrait du nom de fichier
  recordedAt?: Date        // Date d'enregistrement extraite
}

// Utilisateur
export interface User {
  id: UserId
  email: string
  roles: UserRole[]
  createdAt: Date
  updatedAt: Date
}

// Session utilisateur
export interface UserSession {
  token: string
  user: User
  expiresAt: Date
  refreshToken?: string
  permissions?: string[]
  roles?: UserRole[]
}

// Machine IoT
export interface Machine {
  id: MachineId
  name: string             // Nom du device
  description?: string     // Description personnalisée
  macAddress: string       // Adresse MAC device
  type?: 'trackbee' | 'trackbee_pro' | 'custom'
  model?: string          // Modèle du device
  firmwareVersion?: string
  batteryLevel?: number
  isActive: boolean       // Device actif/inactif
  installation?: Installation
  createdAt: string       // ISO string format
  updatedAt: string       // ISO string format
}

// Site géographique
export interface Site {
  id: SiteId
  name: string
  description?: string
  address?: string         // Adresse textuelle
  lat?: number            // Latitude WGS84
  lng?: number            // Longitude WGS84 (cohérence avec lon)
  altitude?: number       // Altitude en mètres
  coordinateSystem?: string // ex: "RGF93_Lambert_93"
  isPublic: boolean       // Site public/privé
  ownership: 'owner' | 'shared'
  sharedRole?: 'viewer' | 'editor'
  metadata?: Record<string, unknown> // Données métier additionnelles
  createdAt: string       // ISO string format
  updatedAt: string       // ISO string format
}

// Installation machine sur site
export interface Installation {
  id: InstallationId
  siteId: SiteId
  machineId: MachineId
  name?: string           // Nom de l'installation
  description?: string    // Notes sur l'installation
  positionIndex?: number  // Index de position sur le site
  installationType?: 'rover' | 'base' | 'static'
  coordinates?: {         // Position précise de l'installation
    x: number
    y: number
    z?: number
    system: string
  }
  site?: Site
  machine?: Machine
  createdAt: string       // ISO string format
  updatedAt: string       // ISO string format
}

// Campagne de mesure
export interface Campaign {
  id: CampaignId
  siteId: SiteId
  machineId: MachineId
  installationId?: InstallationId
  name?: string
  description?: string     // Description de la campagne
  type: CampaignType
  status: CampaignStatus
  duration_s?: number
  period_s?: number
  priority?: number        // Priorité d'exécution (1-10, défaut 5)
  tags?: string[]         // Tags pour organisation
  scheduledAt?: Date
  startedAt?: Date
  completedAt?: Date
  rrule?: string           // RFC5545 pour récurrence
  createdAt: Date
  updatedAt: Date
}

// Calcul post-traitement
export interface Calculation {
  id: CalculationId
  campaignId: CampaignId
  siteId: SiteId
  machineId: MachineId
  installationId?: InstallationId
  status: CalculationStatus
  type: CampaignType
  filesCount?: number
  resultCoordinates?: {
    x: number
    y: number
    z: number
    precision?: number
    coordinateSystem?: string
  }
  processingStartedAt?: Date
  processingCompletedAt?: Date
  errorMessage?: string
  createdAt: Date
  updatedAt: Date
}

// Position géographique
export interface GeoPosition {
  lat: number
  lng: number
  accuracy?: number
  altitude?: number
  heading?: number
  speed?: number
  timestamp?: Date
}

// Coordonnées projet
export interface ProjectCoordinates {
  x: number
  y: number
  z?: number
  system: string           // ex: "RGF93_Lambert_93"
  precision?: number
  timestamp?: Date
}

// État de connexion BLE device
export interface BleDeviceConnection {
  machineId: MachineId
  deviceId: string         // UUID BLE
  status: BleConnectionStatus
  macd?: string           // MAC address normalisée
  bleName?: string        // Nom BLE device
  rssi?: number           // Signal strength
  activeCampaigns: Set<CampaignId>
  filesByCampaign: Map<CampaignId, {
    count: number
    files: FileMeta[]
    lastCheck: Date
  }>
  hasFiles: boolean
  lastSeen: Date
  error?: string
}

// Progression de transfert
export interface TransferProgress {
  phase: 'probe' | 'ble_disconnect' | 'wifi_connect' | 'downloading' | 'storing' | 'uploading' | 'cleanup' | 'ble_reconnect' | 'done'
  machineId: MachineId
  campaignId: CampaignId
  method: 'ble' | 'wifi' | 'auto'
  current: number
  total: number
  bytes?: number
  speed?: number           // bytes/s
  eta?: number            // seconds remaining
  error?: string
  startedAt: Date
  lastUpdate: Date
}

// Contexte d'upload
export interface UploadContext {
  siteId?: SiteId
  machineId?: MachineId
  installationId?: InstallationId
  campaignId?: CampaignId
  source: 'ble' | 'wifi_softap' | 'manual'
  transferId?: string
}

// Configuration device
export interface DeviceConfig {
  antennType?: string
  firmwareVersion?: string
  batteryType?: string
  powerSettings?: {
    sleepMode: boolean
    wakeInterval_s: number
    lowBatteryThreshold: number
  }
  gnssSettings?: {
    constellation: string[]
    recordingRate_hz: number
    minSignalQuality: number
  }
}

// Métrique de performance
export interface PerformanceMetric {
  operation: string
  duration_ms: number
  success: boolean
  timestamp: Date
  context?: Record<string, unknown>
  memoryUsage?: {
    used: number
    total: number
    percentage: number
  }
}

// Événement système
export interface SystemEvent {
  type: string
  source: string
  data: Record<string, unknown>
  timestamp: Date
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error'
}

// Résultat d'opération générique
export interface OperationResult<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  timestamp: Date
  duration_ms: number
}

// Device BLE découvert lors du scan
export interface BleDevice {
  id: string              // UUID device BLE
  name: string            // Nom BLE device (ex: "TRB54320401e641")
  mac?: string           // Adresse MAC si disponible
  rssi?: number          // Signal strength
  txPowerLevel?: number  // Puissance de transmission
  isConnectable: boolean
  services?: string[]    // Services BLE disponibles
  uuids?: string[]       // Service UUIDs découverts
  advertisementData?: Record<string, unknown>
  localName?: string
  manufacturerData?: ArrayBuffer
  lastSeen: Date
}

// Info device BLE pour l'état
export interface BleDeviceInfo {
  deviceId: string        // UUID BLE device
  name: string           // Nom BLE
  mac?: string          // MAC address
  rssi?: number         // Signal strength
  lastSeen: Date        // Dernière détection
  isConnectable: boolean
}

// État de connexion BLE
export interface BleConnectionState {
  status: BleConnectionStatus
  deviceId?: string
  deviceName?: string
  rssi?: number
  connectedAt?: Date
  lastError?: string
  retryCount?: number
  error?: string
}