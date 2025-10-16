/**
 * Utilitaires pour gestion de l'environnement et configuration
 * Variables VITE_* avec defaults et validation
 */

import { logger } from './logger'

// Types pour configuration
interface AppConfig {
  // Application info
  name: string
  version: string

  // Environment
  isDev: boolean
  isProduction: boolean
  mode: string

  // Debug flags
  debug: {
    enabled: boolean
    ble: boolean
    wifi: boolean
    performance: boolean
    state: boolean
    orchestrator: boolean
  }

  // API endpoints
  api: {
    enabled: boolean
    baseUrl: string
    localUrl: string
    webUrl: string
    currentUrl: string
  }

  // BLE configuration
  ble: {
    scanTimeout: number
    connectTimeout: number
    mtuSize: number
  }

  // WiFi configuration
  wifi: {
    connectTimeout: number
    transferTimeout: number
  }

  // Performance settings
  performance: {
    queryStaleTime: number
    queryCacheTime: number
    fileChunkSize: number
  }

  // Features flags
  features: {
    offlineQueue: boolean
    metrics: boolean
    debugPanel: boolean
  }

  // Security
  security: {
    tokenRefreshThreshold: number
  }
}

/**
 * Parse une variable d'environnement boolean
 */
function parseBoolean(value: string | undefined, defaultValue = false): boolean {
  if (!value) return defaultValue
  const normalized = value.toLowerCase().trim()
  return ['true', '1', 'yes', 'on'].includes(normalized)
}

/**
 * Parse une variable d'environnement number
 */
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : defaultValue
}

/**
 * Parse une variable d'environnement string avec default
 */
function parseString(value: string | undefined, defaultValue: string): string {
  return value?.trim() || defaultValue
}

/**
 * Crée la configuration de l'application
 */
function createAppConfig(): AppConfig {
  const isDev = import.meta.env.DEV
  const mode = import.meta.env.MODE || 'development'
  const isProduction = mode === 'production'

  // URLs API
  const localUrl = parseString(import.meta.env.VITE_SERVER_ADDRESS_LOCAL, 'http://localhost:3317')
  const webUrl = parseString(import.meta.env.VITE_SERVER_ADDRESS_WEB, 'https://api.trackbee.com')
  const useLocal = parseBoolean(import.meta.env.VITE_LOCAL, isDev)
  const currentUrl = useLocal ? localUrl : webUrl

  const config: AppConfig = {
    // Application info
    name: 'TrackBee App v2',
    version: '2.0.0',

    // Environment
    isDev,
    isProduction,
    mode,

    // Debug configuration
    debug: {
      enabled: parseBoolean(import.meta.env.VITE_DEBUG),
      ble: parseBoolean(import.meta.env.VITE_DEBUG_BLE),
      wifi: parseBoolean(import.meta.env.VITE_DEBUG_WIFI),
      performance: parseBoolean(import.meta.env.VITE_DEBUG_PERFORMANCE),
      state: parseBoolean(import.meta.env.VITE_DEBUG_STATE),
      orchestrator: parseBoolean(import.meta.env.VITE_DEBUG_ORCHESTRATOR),
    },

    // API configuration
    api: {
      enabled: parseBoolean(import.meta.env.VITE_API_ENABLED, true),
      baseUrl: currentUrl,
      localUrl,
      webUrl,
      currentUrl,
    },

    // BLE configuration
    ble: {
      scanTimeout: parseNumber(import.meta.env.VITE_BLE_SCAN_TIMEOUT, 8000),
      connectTimeout: parseNumber(import.meta.env.VITE_BLE_CONNECT_TIMEOUT, 5000),
      mtuSize: parseNumber(import.meta.env.VITE_BLE_MTU_SIZE, 247),
    },

    // WiFi configuration
    wifi: {
      connectTimeout: parseNumber(import.meta.env.VITE_WIFI_CONNECT_TIMEOUT, 15000),
      transferTimeout: parseNumber(import.meta.env.VITE_WIFI_TRANSFER_TIMEOUT, 30000),
    },

    // Performance settings
    performance: {
      queryStaleTime: parseNumber(import.meta.env.VITE_QUERY_STALE_TIME, 300000), // 5 min
      queryCacheTime: parseNumber(import.meta.env.VITE_QUERY_CACHE_TIME, 900000), // 15 min
      fileChunkSize: parseNumber(import.meta.env.VITE_FILE_CHUNK_SIZE, 8192), // 8KB
    },

    // Features flags
    features: {
      offlineQueue: parseBoolean(import.meta.env.VITE_FEATURE_OFFLINE_QUEUE, true),
      metrics: parseBoolean(import.meta.env.VITE_FEATURE_METRICS, true),
      debugPanel: parseBoolean(import.meta.env.VITE_FEATURE_DEBUG_PANEL, isDev),
    },

    // Security
    security: {
      tokenRefreshThreshold: parseNumber(import.meta.env.VITE_TOKEN_REFRESH_THRESHOLD, 300000), // 5 min
    },
  }

  // Log de la configuration en développement
  if (isDev && config.debug.enabled) {
    logger.info('general', '⚙️ App configuration loaded:', {
      mode: config.mode,
      api: config.api.currentUrl,
      debug: config.debug,
      features: config.features,
    })
  }

  return config
}

// Configuration globale de l'application
export const appConfig = createAppConfig()

/**
 * Helpers pour accès rapide aux configurations
 */
export const env = {
  // Environment
  isDev: appConfig.isDev,
  isProduction: appConfig.isProduction,
  mode: appConfig.mode,

  // API
  apiUrl: appConfig.api.currentUrl,

  // Debug shortcuts
  debug: appConfig.debug.enabled,
  debugBle: appConfig.debug.ble,
  debugWifi: appConfig.debug.wifi,
  debugPerformance: appConfig.debug.performance,

  // Timeouts shortcuts
  bleTimeout: appConfig.ble.scanTimeout,
  wifiTimeout: appConfig.wifi.connectTimeout,
} as const

/**
 * Validation de l'environnement au démarrage
 */
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Vérification des URLs API
  try {
    new URL(appConfig.api.localUrl)
  } catch {
    errors.push(`Invalid VITE_SERVER_ADDRESS_LOCAL: ${appConfig.api.localUrl}`)
  }

  try {
    new URL(appConfig.api.webUrl)
  } catch {
    errors.push(`Invalid VITE_SERVER_ADDRESS_WEB: ${appConfig.api.webUrl}`)
  }

  // Vérification des timeouts
  if (appConfig.ble.scanTimeout < 1000) {
    errors.push('BLE scan timeout too low (minimum 1000ms)')
  }

  if (appConfig.wifi.connectTimeout < 5000) {
    errors.push('WiFi connect timeout too low (minimum 5000ms)')
  }

  // Vérification du chunk size
  if (appConfig.performance.fileChunkSize < 1024 || appConfig.performance.fileChunkSize > 65536) {
    errors.push('File chunk size should be between 1KB and 64KB')
  }

  const valid = errors.length === 0

  if (!valid) {
    logger.error('general', '❌ Environment validation failed:', errors)
  } else if (appConfig.debug.enabled) {
    logger.info('general', '✅ Environment validation passed')
  }

  return { valid, errors }
}

/**
 * Détection de la plateforme
 */
export function detectPlatform(): {
  name: string
  isMobile: boolean
  isAndroid: boolean
  isIOS: boolean
  isCapacitor: boolean
  isWeb: boolean
} {
  const userAgent = navigator.userAgent.toLowerCase()
  const isAndroid = /android/.test(userAgent)
  const isIOS = /iphone|ipad|ipod/.test(userAgent)
  const isMobile = isAndroid || isIOS

  // Capacitor injecte des variables globales ET on doit être sur une plateforme native
  // En dev web, window.Capacitor existe mais on n'est pas vraiment dans Capacitor
  const capacitorWindow = window as typeof window & {
    Capacitor?: {
      isNativePlatform?: () => boolean
    }
  }

  const hasCapacitor = Boolean(capacitorWindow.Capacitor)
  const isNativePlatform = capacitorWindow.Capacitor?.isNativePlatform?.() ?? false
  const isCapacitor = hasCapacitor && (isNativePlatform || isMobile)
  const isWeb = !isCapacitor

  const name = isAndroid ? 'android' :
               isIOS ? 'ios' :
               isCapacitor ? 'capacitor' : 'web'

  const platform = {
    name,
    isMobile,
    isAndroid,
    isIOS,
    isCapacitor,
    isWeb,
  }

  logger.debug('general', '📱 Platform detected:', platform)
  return platform
}

/**
 * Informations sur la performance du device
 */
export function getDeviceInfo(): {
  hardwareConcurrency: number
  memory?: number
  connection?: string
  isOnline: boolean
} {
  const enhancedNavigator = navigator as Navigator & {
    deviceMemory?: number
    connection?: {
      effectiveType?: string
    }
  }

  const info = {
    hardwareConcurrency: enhancedNavigator.hardwareConcurrency || 1,
    memory: enhancedNavigator.deviceMemory,
    connection: enhancedNavigator.connection?.effectiveType,
    isOnline: enhancedNavigator.onLine,
  }

  logger.debug('general', '🔧 Device info:', info)
  return info
}

/**
 * Helper pour feature flags
 */
export function isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
  const enabled = appConfig.features[feature]
  logger.trace('general', `Feature ${feature}: ${enabled ? 'enabled' : 'disabled'}`)
  return enabled
}

/**
 * Helper pour timeouts dynamiques basés sur la connexion
 */
export function getAdaptiveTimeout(baseTimeout: number): number {
  const deviceInfo = getDeviceInfo()

  // Ajuster selon la connexion
  let multiplier = 1
  if (!deviceInfo.isOnline) {
    multiplier = 0.5 // Plus court si offline
  } else if (deviceInfo.connection === 'slow-2g' || deviceInfo.connection === '2g') {
    multiplier = 2 // Plus long pour connexions lentes
  } else if (deviceInfo.connection === '3g') {
    multiplier = 1.5
  }

  const adaptedTimeout = Math.round(baseTimeout * multiplier)

  if (appConfig.debug.enabled) {
    logger.trace('general', `Adaptive timeout: ${baseTimeout}ms → ${adaptedTimeout}ms (${deviceInfo.connection})`)
  }

  return adaptedTimeout
}

/**
 * Export de la configuration pour usage externe
 */
export { type AppConfig, appConfig as config }

/**
 * Constantes applicatives
 */
export const CONSTANTS = {
  // BLE
  BLE_SERVICE_A100: '0000a100-0000-1000-8000-00805f9b34fb',
  BLE_CHAR_WRITE: '0000a101-0000-1000-8000-00805f9b34fb',
  BLE_CHAR_NOTIFY: '0000a102-0000-1000-8000-00805f9b34fb',
  BLE_DEVICE_PREFIX: 'TR', // Changed from 'TRB' to 'TR' to match actual device naming (TRXXXXXXXXXXXX)

  // WiFi SoftAP
  SOFTAP_PREFIX: 'TRB-AP-',
  SOFTAP_DEFAULT_IP: '192.168.4.1',

  // Files
  UBX_FILE_EXTENSION: '.ubx',
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB

  // Timing
  DEFAULT_CAMPAIGN_DURATION: 3600, // 1 hour in seconds
  MIN_CAMPAIGN_DURATION: 60, // 1 minute
  MAX_CAMPAIGN_DURATION: 86400, // 24 hours

  // Storage
  MAX_LOG_BUFFER_SIZE: 1000,
  MAX_OFFLINE_QUEUE_SIZE: 100,

  // Network
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_BASE_DELAY: 1000,
} as const
