/**
 * WiFi Manager - Gestion des connexions WiFi et SoftAP
 * Compatible ESP32 TrackBee SoftAP pour transferts de fichiers
 */

import { CapacitorWifiConnect } from '@falconeta/capacitor-wifi-connect'
import { CapacitorHttp } from '@capacitor/core'
import { Network } from '@capacitor/network'
import type { SystemEvent, AppError, SoftApFileList } from '@/core/types/transport'
import type { FileMeta } from '@/core/types/domain'
import { wifiLog, logger } from '@/core/utils/logger'
import { withTimeout, withRetry, sleep, formatTransferSpeed } from '@/core/utils/time'
import { appConfig, detectPlatform } from '@/core/utils/env'
import { idUtils } from '@/core/utils/ids'
import { SoftApFileListSchema, safeParseWithLog } from '@/core/types/transport'

// ==================== TYPES ====================

interface WiFiNetwork {
  ssid: string
  bssid?: string
  security: string
  strength: number
  frequency?: number
}

interface WiFiConnectionInfo {
  ssid: string
  bssid?: string
  ipAddress?: string
  linkSpeed?: number
  frequency?: number
  connectedAt: Date
}

interface SoftApCredentials {
  ssid: string
  password?: string
  serverUrl: string
  timeout?: number
}

interface TransferProgress {
  current: number
  total: number
  percent: number
  speed?: number // bytes/s
  eta?: number // seconds
  currentFile?: string
}

interface SoftApTransferOptions {
  onProgress?: (progress: TransferProgress) => void
  signal?: AbortSignal
  chunkSize?: number
  retryAttempts?: number
}

interface CapacitorWifiSsidResult {
  ssid?: string
}

interface WiFiStats {
  totalTransfers: number
  successfulTransfers: number
  totalBytesTransferred: number
  averageSpeed: number
  lastTransferSpeed?: number
}

// ==================== WIFI MANAGER CLASS ====================

export class WiFiManager {
  private eventListeners = new Set<(event: SystemEvent) => void>()
  private currentConnection: WiFiConnectionInfo | null = null
  private isCapacitorAvailable = detectPlatform().isCapacitor
  private transferStats: WiFiStats = {
    totalTransfers: 0,
    successfulTransfers: 0,
    totalBytesTransferred: 0,
    averageSpeed: 0
  }

  constructor() {
    wifiLog.debug('WiFiManager initialized', {
      capacitorAvailable: this.isCapacitorAvailable,
      platform: detectPlatform()
    })

    if (this.isCapacitorAvailable) {
      this.setupNetworkMonitoring()
    }
  }

  // ==================== PUBLIC API ====================

  /**
   * Scan des réseaux WiFi disponibles
   */
  async scanNetworks(timeout = 10000): Promise<WiFiNetwork[]> {
    if (!this.isCapacitorAvailable) {
      wifiLog.warn('WiFi scan not available on web platform')
      return []
    }

    const timer = logger.time('wifi', 'WiFi scan')
    wifiLog.debug('🔍 Scanning WiFi networks', { timeout })

    try {
      const result = await withTimeout(
        CapacitorWifiConnect.getSSIDs(),
        timeout,
        'WiFi scan timeout'
      )

      const networks: WiFiNetwork[] = (result.value || []).map((ssid) => ({
        ssid,
        bssid: undefined,
        security: 'UNKNOWN',
        strength: 0
      }))

      wifiLog.info(`🔍 WiFi scan completed: ${networks.length} networks found`)
      timer.end({ networksFound: networks.length })

      return networks
    } catch (error) {
      timer.end({ error })
      const appError = this.createWiFiError('SCAN_FAILED', 'WiFi scan failed', error)
      wifiLog.error('❌ WiFi scan failed', appError)
      throw appError
    }
  }

  /**
   * Connexion à un réseau WiFi
   */
  async connect(credentials: SoftApCredentials): Promise<WiFiConnectionInfo> {
    const { ssid, password, timeout = appConfig.wifi.connectTimeout } = credentials

    wifiLog.debug('🔗 Connecting to WiFi', { ssid, timeout })

    if (!this.isCapacitorAvailable) {
      throw this.createWiFiError('NOT_SUPPORTED', 'WiFi connection not supported on web platform')
    }

    const timer = logger.time('wifi', `WiFi connect ${ssid}`)

    this.emitEvent('wifi:connecting', { ssid, timeout })

    try {
      // Déconnecter du réseau actuel si nécessaire
      if (this.currentConnection && this.currentConnection.ssid !== ssid) {
        await this.disconnect()
      }

      // Se connecter au nouveau réseau
      const connectOptions = {
        ssid,
        password,
        saveNetwork: false, // Ne pas sauvegarder le réseau SoftAP temporaire
        isHiddenSsid: false
      }

      await withTimeout(
        CapacitorWifiConnect.connect(connectOptions),
        timeout,
        `WiFi connection timeout after ${timeout}ms`
      )

      // Obtenir les informations de connexion
      const connectionInfo = await this.getConnectionInfo()

      if (!connectionInfo) {
        throw new Error('Failed to get connection info after connect')
      }

      this.currentConnection = connectionInfo

      wifiLog.info('✅ WiFi connected successfully', {
        ssid: connectionInfo.ssid,
        ipAddress: connectionInfo.ipAddress
      })

      timer.end()
      this.emitEvent('wifi:connected', {
        ssid: connectionInfo.ssid,
        ip: connectionInfo.ipAddress
      })

      return connectionInfo

    } catch (error) {
      timer.end({ error })
      const appError = this.createWiFiError('CONNECTION_FAILED', `Failed to connect to ${ssid}`, error)
      wifiLog.error('❌ WiFi connection failed', appError)
      throw appError
    }
  }

  /**
   * Déconnexion du réseau WiFi actuel
   */
  async disconnect(reason = 'user_request'): Promise<void> {
    if (!this.currentConnection) {
      wifiLog.debug('No WiFi connection to disconnect')
      return
    }

    const ssid = this.currentConnection.ssid
    wifiLog.debug('🔌 Disconnecting from WiFi', { ssid, reason })

    const timer = logger.time('wifi', `WiFi disconnect ${ssid}`)

    try {
      if (this.isCapacitorAvailable) {
        await CapacitorWifiConnect.disconnect()
      }

      wifiLog.info('✅ WiFi disconnected', { ssid, reason })
      timer.end()

      this.emitEvent('wifi:disconnected', { ssid, reason })

    } catch (error) {
      timer.end({ error })
      wifiLog.warn('WiFi disconnect error (non-critical)', { ssid, error })
    } finally {
      this.currentConnection = null
    }
  }

  /**
   * Transfert de fichiers via SoftAP
   */
  async transferFiles(
    credentials: SoftApCredentials,
    campaignId: number,
    options: SoftApTransferOptions = {}
  ): Promise<FileMeta[]> {
    const {
      onProgress,
      signal,
      retryAttempts = 2
    } = options

    const transferId = idUtils.generateTransfer(0, campaignId)
    wifiLog.info('🚀 Starting SoftAP file transfer', {
      transferId,
      ssid: credentials.ssid,
      campaignId,
      serverUrl: credentials.serverUrl
    })

    const timer = logger.time('wifi', `SoftAP transfer ${transferId}`)
    const startTime = Date.now()

    try {
      // 1. Connexion au SoftAP
      await this.connect(credentials)

      // 2. Attendre la stabilisation de la connexion
      await sleep(1000)

      // 3. Vérifier la connectivité au serveur
      await this.pingServer(credentials.serverUrl)

      // 4. Lister les fichiers disponibles
      const fileList = await this.getFileList(credentials.serverUrl, campaignId)
      wifiLog.debug('📁 Files available for transfer', {
        count: fileList.files.length,
        campaignId
      })

      if (fileList.files.length === 0) {
        wifiLog.warn('No files available for transfer')
        return []
      }

      // 5. Télécharger tous les fichiers
      const downloadedFiles: FileMeta[] = []
      let totalBytes = 0
      let transferredBytes = 0

      // Calculer la taille totale
      totalBytes = fileList.files.reduce((sum, file) => sum + (file.size || 0), 0)

      for (let i = 0; i < fileList.files.length; i++) {
        if (signal?.aborted) {
          throw new Error('Transfer aborted by user')
        }

        const file = fileList.files[i]!
        wifiLog.debug(`📥 Downloading file ${i + 1}/${fileList.files.length}`, {
          name: file.name,
          size: file.size
        })

        await this.downloadFile(
          credentials.serverUrl,
          file.name,
          {
            onProgress: (fileProgress) => {
              const currentFileBytes = (file.size || 0) * (fileProgress / 100)
              const totalProgress = transferredBytes + currentFileBytes
              const percent = totalBytes > 0 ? (totalProgress / totalBytes) * 100 : 0

              const elapsed = Date.now() - startTime
              const speed = elapsed > 0 ? totalProgress / (elapsed / 1000) : 0

              onProgress?.({
                current: i + (fileProgress / 100),
                total: fileList.files.length,
                percent: Math.round(percent),
                speed,
                eta: speed > 0 ? Math.round((totalBytes - totalProgress) / speed) : undefined,
                currentFile: file.name
              })
            },
            signal,
            retryAttempts
          }
        )

        downloadedFiles.push({
          name: file.name,
          size: file.size,
          hash: file.hash,
          campaignId
        })

        transferredBytes += file.size || 0

        wifiLog.debug(`✅ File downloaded successfully: ${file.name}`)
      }

      // 6. Statistiques finales
      const duration = Date.now() - startTime
      const speed = duration > 0 ? (transferredBytes * 1000) / duration : 0

      this.updateStats(transferredBytes, speed, true)

      wifiLog.info('✅ SoftAP transfer completed successfully', {
        transferId,
        filesCount: downloadedFiles.length,
        totalBytes: transferredBytes,
        duration,
        speed: formatTransferSpeed(speed)
      })

      timer.end({
        filesCount: downloadedFiles.length,
        totalBytes: transferredBytes,
        speed
      })

      return downloadedFiles

    } catch (error) {
      timer.end({ error })
      this.updateStats(0, 0, false)

      const appError = this.createWiFiError('TRANSFER_FAILED', 'SoftAP file transfer failed', error)
      wifiLog.error('❌ SoftAP transfer failed', appError)
      throw appError
    }
  }

  /**
   * Obtient les informations de connexion actuelle
   */
  async getConnectionInfo(): Promise<WiFiConnectionInfo | null> {
    if (!this.isCapacitorAvailable) {
      return null
    }

    try {
      const ssidResult = await CapacitorWifiConnect.getDeviceSSID()
      const ssid = typeof ssidResult === 'string' ? ssidResult : (ssidResult as CapacitorWifiSsidResult)?.ssid || null

      if (!ssid) {
        return null
      }

      // Nettoyer le SSID (supprimer les guillemets)
      const cleanSsid = ssid.replace(/^"+|"+$/g, '').trim()

      // Obtenir l'adresse IP si possible
      let ipAddress: string | undefined
      try {
        const networkStatus = await Network.getStatus()
        if (networkStatus.connected && networkStatus.connectionType === 'wifi') {
          // L'API Capacitor ne fournit pas directement l'IP, on peut essayer d'autres méthodes
          ipAddress = undefined
        }
      } catch {
        // Ignorer si pas disponible
      }

      const connectionInfo: WiFiConnectionInfo = {
        ssid: cleanSsid,
        ipAddress,
        connectedAt: new Date()
      }

      return connectionInfo

    } catch (error) {
      wifiLog.trace('Failed to get connection info', { error })
      return null
    }
  }

  /**
   * Vérifie si le WiFi est disponible et activé
   */
  async isAvailable(): Promise<boolean> {
    if (!this.isCapacitorAvailable) {
      return false
    }

    try {
      const status = await Network.getStatus()
      return status.connected && status.connectionType === 'wifi'
    } catch {
      return false
    }
  }

  /**
   * Obtient les statistiques de transfert
   */
  getStats(): WiFiStats {
    return { ...this.transferStats }
  }

  /**
   * Subscribe aux événements
   */
  onEvent(listener: (event: SystemEvent) => void): () => void {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  /**
   * Nettoie les ressources
   */
  async cleanup(): Promise<void> {
    wifiLog.debug('🧹 Cleaning up WiFi manager')

    if (this.currentConnection) {
      await this.disconnect('cleanup')
    }

    this.eventListeners.clear()
    wifiLog.info('✅ WiFi manager cleaned up')
  }

  // ==================== PRIVATE METHODS ====================

  private async setupNetworkMonitoring(): Promise<void> {
    try {
      Network.addListener('networkStatusChange', (status) => {
        wifiLog.trace('Network status changed', {
          connected: status.connected,
          connectionType: status.connectionType
        })

        if (!status.connected && this.currentConnection) {
          wifiLog.info('Network disconnected, clearing connection info')
          this.currentConnection = null
        }
      })
    } catch (error) {
      wifiLog.warn('Failed to setup network monitoring', { error })
    }
  }

  private async pingServer(serverUrl: string, timeout = 5000): Promise<void> {
    wifiLog.trace('🏓 Pinging server', { serverUrl, timeout })

    try {
      const response = await withTimeout(
        CapacitorHttp.request({
          url: `${serverUrl}/api/ping`,
          method: 'GET',
          connectTimeout: timeout,
          readTimeout: timeout
        }),
        timeout,
        'Server ping timeout'
      )

      if (response.status < 200 || response.status >= 400) {
        throw new Error(`Server ping failed with status: ${response.status}`)
      }

      wifiLog.trace('✅ Server ping successful')
    } catch (error) {
      const appError = this.createWiFiError('SERVER_UNREACHABLE', 'SoftAP server unreachable', error)
      wifiLog.error('❌ Server ping failed', appError)
      throw appError
    }
  }

  private async getFileList(serverUrl: string, campaignId: number): Promise<SoftApFileList> {
    wifiLog.trace('📋 Getting file list', { serverUrl, campaignId })

    try {
      const response = await CapacitorHttp.request({
        url: `${serverUrl}/api/files`,
        method: 'GET',
        params: { campaignId: String(campaignId) },
        connectTimeout: 10000,
        readTimeout: 10000
      })

      if (response.status !== 200) {
        throw new Error(`Failed to get file list: HTTP ${response.status}`)
      }

      const fileList = safeParseWithLog(SoftApFileListSchema, response.data, 'SoftAP file list')
      if (!fileList) {
        throw new Error('Invalid file list format from SoftAP server')
      }

      wifiLog.debug('✅ File list retrieved', {
        campaignId: fileList.campaignId,
        filesCount: fileList.files.length
      })

      return fileList

    } catch (error) {
      const appError = this.createWiFiError('FILE_LIST_FAILED', 'Failed to get file list', error)
      wifiLog.error('❌ File list retrieval failed', appError)
      throw appError
    }
  }

  private async downloadFile(
    serverUrl: string,
    filename: string,
    options: {
      onProgress?: (percent: number) => void
      signal?: AbortSignal
      retryAttempts?: number
    } = {}
  ): Promise<void> {
    const { onProgress, signal, retryAttempts = 2 } = options

    return withRetry(
      async () => {
        if (signal?.aborted) {
          throw new Error('Download aborted')
        }

        const response = await CapacitorHttp.request({
          url: `${serverUrl}/api/file`,
          method: 'GET',
          params: { name: filename },
          connectTimeout: 30000,
          readTimeout: 60000
        })

        if (response.status !== 200) {
          throw new Error(`Failed to download file: HTTP ${response.status}`)
        }

        // Pour Capacitor, les données sont généralement en base64 ou directement utilisables
        // Ici on simule le progress car CapacitorHttp ne fournit pas de progress callback
        onProgress?.(100)

        wifiLog.trace(`✅ File downloaded: ${filename}`)
      },
      {
        maxRetries: retryAttempts,
        delayMs: 1000,
        onError: (error: unknown, attempt: number) => {
          wifiLog.warn(`Download attempt ${attempt} failed, retrying...`, { filename, error })
        }
      }
    )
  }

  private updateStats(bytes: number, speed: number, success: boolean): void {
    this.transferStats.totalTransfers++

    if (success) {
      this.transferStats.successfulTransfers++
      this.transferStats.totalBytesTransferred += bytes
      this.transferStats.lastTransferSpeed = speed

      // Calculer la vitesse moyenne
      if (this.transferStats.successfulTransfers > 0) {
        this.transferStats.averageSpeed =
          this.transferStats.totalBytesTransferred / this.transferStats.successfulTransfers
      }
    }
  }

  private emitEvent(type: SystemEvent['type'], data: unknown): void {
    const event = { type, data } as SystemEvent
    this.eventListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        wifiLog.warn('Event listener error', { error, type })
      }
    })
  }

  private createWiFiError(code: string, message: string, originalError?: unknown): AppError {
    return {
      code,
      message,
      category: 'wifi',
      retryable: ['SCAN_FAILED', 'CONNECTION_FAILED', 'TRANSFER_FAILED'].includes(code),
      context: {
        originalError: originalError instanceof Error ? {
          name: originalError.name,
          message: originalError.message,
          stack: originalError.stack
        } : originalError
      },
      timestamp: new Date()
    }
  }
}

// ==================== SINGLETON EXPORT ====================

export const wifiManager = new WiFiManager()

// Types exportés
export type {
  WiFiNetwork,
  WiFiConnectionInfo,
  SoftApCredentials,
  TransferProgress,
  SoftApTransferOptions,
  WiFiStats
}
