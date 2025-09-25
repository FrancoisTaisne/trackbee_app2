/**
 * Types de transport et communication
 * DTOs BLE, API REST, événements système
 */

import { z } from 'zod'
import type { CampaignId, MachineId, FileMeta } from './domain'

// BLE Device info
export interface BleDeviceInfo {
  deviceId: string
  macd: string
  name: string
  rssi?: number
}

// PUSH FINAL: BLE File info manquant
export interface BleFileInfo {
  name: string
  size: number
  campaignId?: number
  recordedAt?: Date
  hash?: string
}

// File metadata
export interface FileMetadata {
  id: string              // Unique identifier
  name: string           // Original filename
  filename: string       // Display filename (alias for name)
  size: number
  hash?: string
  path?: string
  campaignId?: number
  recordedAt?: Date
  uploaded?: boolean
  uploadProgress?: number
  uploadId?: string
  error?: string
}

// BLE Connection state
export interface BleConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  deviceId?: string
  deviceName?: string
  rssi?: number
  connectedAt?: Date
  lastError?: string
  retryCount?: number
  error?: string
}

// ===================== BLE PROTOCOL SCHEMAS =====================

// Schema pour commandes BLE A100
export const BleCommandSchema = z.discriminatedUnion('cmd', [
  z.object({
    cmd: z.literal('get_files'),
    campaignId: z.number(),
    id: z.number().optional(),
    meta: z.boolean().optional(),
    wifi: z.boolean().optional(),
  }),
  z.object({
    cmd: z.literal('instant'),
    campaignId: z.number(),
    id: z.number(),
    duration_s: z.number().min(1).max(86400), // 1s à 24h
    cleanup: z.boolean().optional(),
    nofix: z.boolean().optional(),
  }),
  z.object({
    cmd: z.literal('add_campaign'),
    campaignId: z.number(),
    id: z.number(),
    duration_s: z.number().optional(),
    period_s: z.number().optional(),
    rrule: z.string().optional(),
  }),
  z.object({
    cmd: z.literal('delete_files'),
    campaignId: z.number(),
    id: z.number(),
  }),
])

export type BleCommand = z.infer<typeof BleCommandSchema>

// Schema pour notifications BLE reçues
export const BleNotificationSchema = z.discriminatedUnion('type', [
  // Réponse get_files avec métadonnées
  z.object({
    type: z.literal('files'),
    ok: z.boolean(),
    count: z.number(),
    campaignId: z.number(),
    files: z.array(z.object({
      name: z.string(),
      size: z.number().optional(),
    })),
    // SoftAP credentials pour handover WiFi
    ssid: z.string().optional(),
    password: z.string().optional(),
    serverUrl: z.string().optional(),
    proto: z.string().optional(),
    fw: z.string().optional(),
  }),
  // Status général device
  z.object({
    type: z.literal('status'),
    battery: z.number().min(0).max(100).optional(),
    temperature: z.number().optional(),
    freeSpace: z.number().optional(),
    gnssStatus: z.enum(['no_fix', 'fix_2d', 'fix_3d', 'dgps']).optional(),
    activeJob: z.number().optional(),
  }),
  // Progression operation
  z.object({
    type: z.literal('progress'),
    operation: z.string(),
    percent: z.number().min(0).max(100),
    eta_s: z.number().optional(),
  }),
  // Erreur
  z.object({
    type: z.literal('error'),
    code: z.string(),
    message: z.string(),
    operation: z.string().optional(),
  }),
])

export type BleNotification = z.infer<typeof BleNotificationSchema>

// ===================== API REST SCHEMAS =====================

// Schema pour réponses API génériques
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }).optional(),
  timestamp: z.string().datetime(),
})

export type ApiResponse<T = unknown> = {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  timestamp: string
}

// Schema pour authentification
export const AuthResponseSchema = z.object({
  token: z.string(),
  refreshToken: z.string().optional(),
  user: z.object({
    id: z.number(),
    email: z.string().email(),
    roles: z.array(z.enum(['ADMIN', 'MODERATOR', 'USER', 'VIEWER'])),
  }),
  expiresAt: z.string().datetime(),
})

export type AuthResponse = z.infer<typeof AuthResponseSchema>

// Schema pour données hydratées utilisateur
export const HydratedUserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  roles: z.array(z.string()),
  machines: z.array(z.object({
    id: z.number(),
    macD: z.string(),
    name: z.string().optional(),
    installation: z.object({
      id: z.number(),
      siteId: z.number(),
      site: z.object({
        id: z.number(),
        name: z.string(),
        lat: z.number().optional(),
        lon: z.number().optional(),
      }).optional(),
    }).optional(),
  })),
  sites: z.object({
    owned: z.array(z.object({
      id: z.number(),
      name: z.string(),
      description: z.string().optional(),
      lat: z.number().optional(),
      lon: z.number().optional(),
    })),
    shared: z.object({
      viewer: z.array(z.unknown()),
      editor: z.array(z.unknown()),
    }).optional(),
  }),
  etag: z.string().optional(),
})

export type HydratedUser = z.infer<typeof HydratedUserSchema>

// ===================== WIFI SOFTAP SCHEMAS =====================

export const SoftApFileListSchema = z.object({
  campaignId: z.number(),
  files: z.array(z.object({
    name: z.string(),
    size: z.number(),
    hash: z.string().optional(),
  })),
  serverInfo: z.object({
    version: z.string().optional(),
    freeSpace: z.number().optional(),
    timestamp: z.string().optional(),
  }).optional(),
})

export type SoftApFileList = z.infer<typeof SoftApFileListSchema>

// ===================== EVENT SYSTEM SCHEMAS =====================

// Events émis par l'orchestrator
export const SystemEventSchema = z.discriminatedUnion('type', [
  // BLE Events
  z.object({
    type: z.literal('ble:scanning'),
    data: z.object({
      active: z.boolean(),
      timeout_ms: z.number().optional(),
    }),
  }),
  z.object({
    type: z.literal('ble:device_found'),
    data: z.object({
      deviceId: z.string(),
      macd: z.string(),
      name: z.string(),
      rssi: z.number().optional(),
    }),
  }),
  z.object({
    type: z.literal('ble:connected'),
    data: z.object({
      machineId: z.number(),
      deviceId: z.string(),
      macd: z.string(),
    }),
  }),
  z.object({
    type: z.literal('ble:disconnected'),
    data: z.object({
      machineId: z.number(),
      deviceId: z.string(),
      reason: z.string().optional(),
    }),
  }),

  // Transfer Events
  z.object({
    type: z.literal('transfer:started'),
    data: z.object({
      machineId: z.number(),
      campaignId: z.number(),
      method: z.enum(['ble', 'wifi', 'auto']),
      transferId: z.string(),
    }),
  }),
  z.object({
    type: z.literal('transfer:phase'),
    data: z.object({
      transferId: z.string(),
      phase: z.enum(['initializing', 'probe', 'ble_probe', 'ble_disconnect', 'wifi_connect', 'wifi_transfer', 'wifi_disconnect', 'downloading', 'storing', 'storage_save', 'upload_queue', 'uploading', 'cleanup', 'ble_reconnect', 'failed', 'completed']),
      progress: z.number().min(0).max(100).optional(),
    }),
  }),
  z.object({
    type: z.literal('transfer:progress'),
    data: z.object({
      transferId: z.string(),
      current: z.number(),
      total: z.number(),
      bytes: z.number().optional(),
      speed: z.number().optional(),
    }),
  }),
  z.object({
    type: z.literal('transfer:completed'),
    data: z.object({
      transferId: z.string(),
      machineId: z.number(),
      campaignId: z.number(),
      files: z.number(),
      bytes: z.number(),
      duration_ms: z.number(),
    }),
  }),
  z.object({
    type: z.literal('transfer:error'),
    data: z.object({
      transferId: z.string(),
      error: z.string(),
      phase: z.string().optional(),
      retryable: z.boolean(),
    }),
  }),

  // WiFi Events
  z.object({
    type: z.literal('wifi:connecting'),
    data: z.object({
      ssid: z.string(),
      timeout_ms: z.number(),
    }),
  }),
  z.object({
    type: z.literal('wifi:connected'),
    data: z.object({
      ssid: z.string(),
      ip: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal('wifi:disconnected'),
    data: z.object({
      ssid: z.string(),
      reason: z.string().optional(),
    }),
  }),

  // Campaign Events
  z.object({
    type: z.literal('campaign:created'),
    data: z.object({
      campaignId: z.number(),
      machineId: z.number(),
      type: z.string(),
    }),
  }),
  z.object({
    type: z.literal('campaign:started'),
    data: z.object({
      campaignId: z.number(),
      machineId: z.number(),
      scheduledDuration_s: z.number(),
    }),
  }),

  // Upload Events
  z.object({
    type: z.literal('upload:queued'),
    data: z.object({
      fileId: z.string(),
      name: z.string(),
      size: z.number(),
      context: z.record(z.unknown()),
    }),
  }),
  z.object({
    type: z.literal('upload:success'),
    data: z.object({
      fileId: z.string(),
      uploadId: z.string(),
      duration_ms: z.number(),
    }),
  }),
  z.object({
    type: z.literal('upload:failed'),
    data: z.object({
      fileId: z.string(),
      error: z.string(),
      retryCount: z.number(),
    }),
  }),

  // System Events
  z.object({
    type: z.literal('system:initialized'),
    data: z.object({
      version: z.string(),
      platform: z.string(),
      debug: z.boolean(),
    }),
  }),

  // Orchestrator Events
  z.object({
    type: z.literal('orchestrator:initialized'),
    data: z.object({
      services: z.record(z.boolean()).optional(),
      version: z.string().optional(),
      timestamp: z.date().optional(),
    }),
  }),
  z.object({
    type: z.literal('orchestrator:shutdown'),
    data: z.object({
      timestamp: z.date().optional(),
      reason: z.string().optional(),
    }),
  }),
])

export type SystemEvent = z.infer<typeof SystemEventSchema>

// ===================== ERROR SCHEMAS =====================

export const AppErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  category: z.enum(['ble', 'wifi', 'api', 'storage', 'validation', 'permission', 'network', 'orchestrator', 'unknown']),
  retryable: z.boolean(),
  context: z.record(z.unknown()).optional(),
  timestamp: z.date(),
  stack: z.string().optional(),
})

export type AppError = z.infer<typeof AppErrorSchema>

// ===================== PERFORMANCE SCHEMAS =====================

export const PerformanceMetricSchema = z.object({
  operation: z.string(),
  category: z.enum(['ble', 'wifi', 'api', 'storage', 'ui', 'background']),
  duration_ms: z.number(),
  success: z.boolean(),
  timestamp: z.date(),
  context: z.record(z.unknown()).optional(),
  memoryUsage: z.object({
    used: z.number(),
    total: z.number(),
    percentage: z.number(),
  }).optional(),
})

export type PerformanceMetric = z.infer<typeof PerformanceMetricSchema>

// ===================== HELPERS & UTILITIES =====================

// Helper pour validation safe avec logs
export function safeParseWithLog<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string
): T | null {
  const result = schema.safeParse(data)

  if (!result.success) {
    console.warn(`[VALIDATION] ${context} failed:`, {
      data,
      errors: result.error.issues,
    })
    return null
  }

  return result.data
}

// Helper pour créer un event système
export function createSystemEvent<T extends SystemEvent['type']>(
  type: T,
  data: Extract<SystemEvent, { type: T }>['data']
): SystemEvent {
  return { type, data } as SystemEvent
}

// Helper pour créer une erreur typée
export function createAppError(
  code: string,
  message: string,
  category: AppError['category'],
  options?: {
    retryable?: boolean
    context?: Record<string, unknown>
    stack?: string
  }
): AppError {
  return {
    code,
    message,
    category,
    retryable: options?.retryable ?? false,
    context: options?.context,
    timestamp: new Date(),
    stack: options?.stack,
  }
}

// ===================== BLE CONNECTION STATE =====================

// État complet de connexion BLE
export interface BleConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  deviceId?: string
  deviceName?: string
  rssi?: number
  connectedAt?: Date
  lastError?: string
  retryCount?: number
}

// ===================== TRANSFER PROGRESS =====================

// Progrès de transfert de fichiers
export interface TransferProgress {
  transferred: number       // Bytes transférés
  total: number            // Total bytes à transférer
  percentage: number       // Pourcentage (0-100)
  speed: number           // Vitesse en bytes/s
  estimatedTimeRemaining: number // Temps restant estimé en ms
  currentFile?: string    // Nom du fichier en cours
  filesCompleted?: number // Nombre de fichiers terminés
  filesTotal?: number     // Nombre total de fichiers
}

// ===================== TRANSFER TASK =====================

// Tâche de transfert de fichiers
export interface TransferTask {
  id: string              // ID unique de la tâche
  type: 'ble_download' | 'wifi_download' | 'upload' | 'sync'
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'

  // Informations source/destination
  machineId: string       // ID de la machine source
  campaignId?: string     // ID de la campagne associée

  // Fichiers impliqués
  files?: Array<{
    name: string
    size: number
    transferred: boolean
    path?: string
  }>

  // Progression
  progress?: TransferProgress

  // Métadonnées temporelles
  createdAt: Date
  startTime?: Date
  endTime?: Date
  updatedAt: Date

  // Configuration
  priority: 'low' | 'normal' | 'high' | 'urgent'
  maxRetries?: number
  timeout?: number        // Timeout en ms

  // Contexte métier
  context?: {
    siteId?: string
    installationId?: string
    userId?: string
  }
}