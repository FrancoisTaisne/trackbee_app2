/**
 * Types d'erreurs pour l'application TrackBee
 * Gestion centralisée des erreurs avec codes et messages
 */

// Codes d'erreurs business
export type ErrorCode =
  | 'AUTH_FAILED'
  | 'AUTH_EXPIRED'
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'BLE_CONNECTION_FAILED'
  | 'BLE_DEVICE_NOT_FOUND'
  | 'BLE_SERVICE_UNAVAILABLE'
  | 'FILE_TRANSFER_FAILED'
  | 'UPLOAD_FAILED'
  | 'STORAGE_ERROR'
  | 'PERMISSION_DENIED'
  | 'DEVICE_NOT_SUPPORTED'
  | 'CAMPAIGN_CREATE_FAILED'
  | 'CALCULATION_FAILED'
  | 'UNKNOWN_ERROR'

// Catégories d'erreurs
export type ErrorCategory =
  | 'auth'
  | 'network'
  | 'ble'
  | 'storage'
  | 'validation'
  | 'business'
  | 'system'

// Interface d'erreur application
export interface AppError {
  code: ErrorCode
  message: string
  category: ErrorCategory
  details?: Record<string, unknown>
  timestamp: Date
  stack?: string
  context?: {
    userId?: string
    machineId?: string
    campaignId?: string
    action?: string
    route?: string
  }
}

// Résultat avec erreur
export interface ErrorResult {
  success: false
  error: AppError
}

// Résultat avec succès
export interface SuccessResult<T = unknown> {
  success: true
  data: T
}

// Union type résultat
export type Result<T = unknown> = SuccessResult<T> | ErrorResult

// Erreur de validation
export interface ValidationError {
  field: string
  code: string
  message: string
  value?: unknown
}

// Erreur réseau
export interface NetworkError extends AppError {
  status?: number
  statusText?: string
  url?: string
  method?: string
  responseData?: unknown
}

// Erreur BLE
export interface BleError extends AppError {
  deviceId?: string
  deviceName?: string
  serviceId?: string
  characteristicId?: string
  operation?: 'scan' | 'connect' | 'read' | 'write' | 'notify'
}

// Factory pour créer des erreurs
export const createError = (
  code: ErrorCode,
  message: string,
  category: ErrorCategory,
  details?: Record<string, unknown>,
  context?: AppError['context']
): AppError => ({
  code,
  message,
  category,
  details,
  context,
  timestamp: new Date(),
  stack: new Error().stack
})

// Helpers pour les erreurs communes
export const createNetworkError = (
  message: string,
  status?: number,
  details?: Record<string, unknown>
): NetworkError => ({
  ...createError('NETWORK_ERROR', message, 'network', details),
  status
} as NetworkError)

export const createBleError = (
  message: string,
  operation?: BleError['operation'],
  deviceId?: string,
  details?: Record<string, unknown>
): BleError => ({
  ...createError('BLE_CONNECTION_FAILED', message, 'ble', details),
  operation,
  deviceId
} as BleError)

export const createValidationError = (
  field: string,
  message: string,
  value?: unknown
): ValidationError => ({
  field,
  code: 'VALIDATION_ERROR',
  message,
  value
})

// Type guards
export const isAppError = (error: unknown): error is AppError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'category' in error
  )
}

export const isNetworkError = (error: unknown): error is NetworkError => {
  return isAppError(error) && error.category === 'network'
}

export const isBleError = (error: unknown): error is BleError => {
  return isAppError(error) && error.category === 'ble'
}

export const isValidationError = (error: unknown): error is ValidationError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'field' in error &&
    'code' in error &&
    'message' in error
  )
}

// Utilitaire pour convertir Error native en AppError
export const toAppError = (error: unknown, fallbackCode: ErrorCode = 'UNKNOWN_ERROR'): AppError => {
  if (isAppError(error)) {
    return error
  }

  if (error instanceof Error) {
    return createError(
      fallbackCode,
      error.message,
      'system',
      {
        originalError: error.name,
        stack: error.stack
      }
    )
  }

  return createError(
    fallbackCode,
    String(error),
    'system'
  )
}

// Messages d'erreur par défaut
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  AUTH_FAILED: 'Échec de l\'authentification',
  AUTH_EXPIRED: 'Session expirée, veuillez vous reconnecter',
  VALIDATION_ERROR: 'Données invalides',
  NETWORK_ERROR: 'Erreur de connexion réseau',
  BLE_CONNECTION_FAILED: 'Impossible de se connecter au device BLE',
  BLE_DEVICE_NOT_FOUND: 'Device BLE introuvable',
  BLE_SERVICE_UNAVAILABLE: 'Service BLE indisponible',
  FILE_TRANSFER_FAILED: 'Échec du transfert de fichier',
  UPLOAD_FAILED: 'Échec de l\'upload',
  STORAGE_ERROR: 'Erreur de stockage',
  PERMISSION_DENIED: 'Permission refusée',
  DEVICE_NOT_SUPPORTED: 'Device non supporté',
  CAMPAIGN_CREATE_FAILED: 'Impossible de créer la campagne',
  CALCULATION_FAILED: 'Échec du calcul',
  UNKNOWN_ERROR: 'Erreur inconnue'
}