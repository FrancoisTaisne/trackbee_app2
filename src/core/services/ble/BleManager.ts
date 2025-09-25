/**
 * BLE Manager - Service de communication Bluetooth Low Energy
 * Compatible ESP32 TrackBee avec protocole A100
 */

import { BleClient } from '@capacitor-community/bluetooth-le'
import type {
  BleCommand,
  BleNotification,
  SystemEvent,
  AppError
} from '@/core/types/transport'
import type { MachineId, FileMeta } from '@/core/types/domain'
import { bleLog, logger } from '@/core/utils/logger'
import { macUtils, idUtils } from '@/core/utils/ids'
import { withTimeout, withRetry, sleep } from '@/core/utils/time'
import { CONSTANTS, appConfig } from '@/core/utils/env'
import { BleCommandSchema, BleNotificationSchema, safeParseWithLog } from '@/core/types/transport'
import { z } from 'zod'

// ==================== TYPES INTERNES ====================

interface BleDeviceInfo {
  deviceId: string
  macd: string
  name: string
  rssi?: number
  lastSeen: Date
}

interface BleConnection {
  deviceId: string
  machineId?: MachineId
  macd: string
  name: string
  status: 'connecting' | 'connected' | 'disconnecting' | 'error'
  connectedAt: Date
  lastActivity: Date
  mtuSize?: number
  error?: string

  // Notification management
  notificationListener?: () => Promise<void>
  notificationHandler?: (data: Uint8Array) => void
}

interface ScanOptions {
  timeout?: number
  targetMac?: string
  targetName?: string
  knownMacs?: string[]
}

interface ConnectOptions {
  timeout?: number
  retryCount?: number
  requestMtu?: boolean
}

interface CommandOptions {
  timeout?: number
  retryOnError?: boolean
  ensureNotifications?: boolean
}

// ==================== BLE MANAGER CLASS ====================

export class BleManager {
  private connections = new Map<string, BleConnection>()
  private scanAbortController?: AbortController
  private isScanning = false
  private eventListeners = new Set<(event: SystemEvent) => void>()
  private initialized = false

  constructor() {
    bleLog.debug('BleManager initialized')
  }

  // ==================== PUBLIC API ====================

  /**
   * Initialise le BLE client
   */
  async initialize(): Promise<void> {
    const timer = logger.time('ble', 'BLE initialization')

    try {
      bleLog.debug('Initializing BLE client...')
      await BleClient.initialize()

      // Demander l'activation si possible
      if (typeof BleClient.requestEnable === 'function') {
        try {
          await BleClient.requestEnable()
          bleLog.debug('BLE enable requested')
        } catch (error) {
          bleLog.warn('BLE enable request failed (non-critical)', { error })
        }
      }

      this.initialized = true
      bleLog.info('✅ BLE client initialized successfully')
      timer.end()
    } catch (error) {
      timer.end({ error })
      const appError = this.createBleError('BLE_INIT_FAILED', 'Failed to initialize BLE client', error)
      bleLog.error('❌ BLE initialization failed', appError)
      throw appError
    }
  }

  /**
   * Vérifie si le BLE est initialisé
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Scan pour des devices TrackBee
   */
  async scanForDevices(options: ScanOptions = {}): Promise<BleDeviceInfo[]> {
    const {
      timeout = appConfig.ble.scanTimeout,
      targetMac,
      targetName,
      knownMacs = []
    } = options

    if (this.isScanning) {
      bleLog.warn('Scan already in progress, stopping previous scan')
      await this.stopScan()
    }

    const timer = logger.time('ble', 'BLE scan')
    const devices: BleDeviceInfo[] = []
    const knownMacsNormalized = knownMacs.map(macUtils.normalize)

    bleLog.debug('🔍 Starting BLE scan', {
      timeout,
      targetMac: targetMac ? macUtils.normalize(targetMac) : undefined,
      targetName,
      knownMacsCount: knownMacsNormalized.length
    })

    this.scanAbortController = new AbortController()
    this.isScanning = true

    this.emitEvent('ble:scanning', { active: true, timeout })

    try {
      await BleClient.requestLEScan(
        { services: [] }, // Scan tous les services
        (result) => {
          const device = this.parseAdvertisement(result, knownMacsNormalized)
          if (!device) return

          bleLog.trace('📡 Device found', device)

          // Vérifier si c'est le device cible
          if (targetMac && !macUtils.compare(device.macd, targetMac)) return
          if (targetName && !device.name.toLowerCase().includes(targetName.toLowerCase())) return

          // Éviter les doublons
          const existing = devices.find(d => d.deviceId === device.deviceId)
          if (existing) {
            existing.rssi = device.rssi
            existing.lastSeen = device.lastSeen
          } else {
            devices.push(device)
            this.emitEvent('ble:device_found', {
              deviceId: device.deviceId,
              macd: device.macd,
              name: device.name,
              rssi: device.rssi
            })
          }
        }
      )

      // Attendre la durée du scan
      await sleep(timeout)

      bleLog.info(`🔍 Scan completed: ${devices.length} devices found`)
      timer.end({ devicesFound: devices.length })

      return devices.sort((a, b) => (b.rssi || -100) - (a.rssi || -100))

    } catch (error) {
      timer.end({ error })
      const appError = this.createBleError('SCAN_FAILED', 'BLE scan failed', error)
      bleLog.error('❌ BLE scan failed', appError)
      throw appError
    } finally {
      await this.stopScan()
    }
  }

  /**
   * Arrête le scan en cours
   */
  async stopScan(): Promise<void> {
    if (!this.isScanning) return

    try {
      this.scanAbortController?.abort()
      await BleClient.stopLEScan()
      bleLog.debug('🛑 BLE scan stopped')
    } catch (error) {
      bleLog.warn('Error stopping scan (non-critical)', { error })
    } finally {
      this.isScanning = false
      this.scanAbortController = undefined
      this.emitEvent('ble:scanning', { active: false })
    }
  }

  /**
   * Se connecte à un device
   */
  async connect(deviceId: string, machineId?: MachineId, options: ConnectOptions = {}): Promise<BleConnection> {
    const {
      timeout = appConfig.ble.connectTimeout,
      retryCount = 2,
      requestMtu = true
    } = options

    bleLog.debug('🔗 Connecting to device', { deviceId, machineId, timeout })

    // Vérifier si déjà connecté
    const existing = this.connections.get(deviceId)
    if (existing?.status === 'connected') {
      bleLog.debug('Device already connected', { deviceId })
      return existing
    }

    // Nettoyer connexion existante si nécessaire
    if (existing) {
      await this.disconnect(deviceId)
    }

    const timer = logger.time('ble', `BLE connect ${deviceId}`)

    // Créer l'objet connexion
    const connection: BleConnection = {
      deviceId,
      machineId,
      macd: '', // Sera rempli après connexion
      name: '',
      status: 'connecting',
      connectedAt: new Date(),
      lastActivity: new Date(),
    }

    this.connections.set(deviceId, connection)

    try {
      // Connexion avec retry
      await withRetry(
        async () => {
          bleLog.trace(`Attempting connection to ${deviceId}`)
          await withTimeout(
            BleClient.connect(deviceId),
            timeout,
            `Connection timeout after ${timeout}ms`
          )
        },
        {
          maxRetries: retryCount,
          delayMs: 1000,
          onError: (error: any, attempt: any) => {
            bleLog.warn(`Connection attempt ${attempt} failed, retrying...`, { error })
          }
        }
      )

      // Demander MTU si supporté (requestMtu n'existe pas dans cette version)
      if (requestMtu) {
        try {
          // await BleClient.requestMtu(deviceId, appConfig.ble.mtuSize)
          // connection.mtuSize = appConfig.ble.mtuSize
          bleLog.debug('MTU request skipped - not available in this BLE client version')
        } catch (error) {
          bleLog.warn('MTU request failed (non-critical)', { error })
        }
      }

      // Mise à jour du statut
      connection.status = 'connected'
      connection.connectedAt = new Date()
      connection.lastActivity = new Date()

      bleLog.info('✅ Device connected successfully', {
        deviceId,
        machineId,
        mtuSize: connection.mtuSize
      })

      timer.end()
      this.emitEvent('ble:connected', {
        machineId: machineId || 0,
        deviceId,
        macd: connection.macd
      })

      return connection

    } catch (error) {
      timer.end({ error })
      connection.status = 'error'
      connection.error = error instanceof Error ? error.message : String(error)

      const appError = this.createBleError('CONNECTION_FAILED', `Failed to connect to ${deviceId}`, error)
      bleLog.error('❌ Connection failed', appError)
      throw appError
    }
  }

  /**
   * Se déconnecte d'un device
   */
  async disconnect(deviceId: string, reason = 'user_request'): Promise<void> {
    const connection = this.connections.get(deviceId)
    if (!connection) {
      bleLog.debug('Device not connected, skipping disconnect', { deviceId })
      return
    }

    bleLog.debug('🔌 Disconnecting device', { deviceId, reason })

    const timer = logger.time('ble', `BLE disconnect ${deviceId}`)

    try {
      connection.status = 'disconnecting'

      // Nettoyer les notifications
      if (connection.notificationListener) {
        try {
          await connection.notificationListener()
        } catch (error) {
          bleLog.warn('Error cleaning notifications', { error })
        }
      }

      // Déconnexion BLE
      try {
        await BleClient.disconnect(deviceId)
      } catch (error) {
        bleLog.warn('BLE disconnect error (non-critical)', { error })
      }

      bleLog.info('✅ Device disconnected', { deviceId, reason })
      timer.end()

      this.emitEvent('ble:disconnected', {
        machineId: connection.machineId || 0,
        deviceId,
        reason
      })

    } catch (error) {
      timer.end({ error })
      bleLog.error('❌ Disconnect error', { deviceId, error })
    } finally {
      this.connections.delete(deviceId)
    }
  }

  /**
   * Envoie une commande BLE
   */
  async sendCommand(deviceId: string, command: BleCommand, options: CommandOptions = {}): Promise<BleNotification | null> {
    const {
      timeout = 8000,
      retryOnError = true,
      ensureNotifications = true
    } = options

    const connection = this.connections.get(deviceId)
    if (!connection || connection.status !== 'connected') {
      throw this.createBleError('NOT_CONNECTED', `Device ${deviceId} not connected`)
    }

    // Valider la commande
    const validCommand = safeParseWithLog(BleCommandSchema, command, 'BLE command')
    if (!validCommand) {
      throw this.createBleError('INVALID_COMMAND', 'Invalid BLE command format')
    }

    bleLog.debug('📤 Sending BLE command', { deviceId, command: validCommand })

    const timer = logger.time('ble', `BLE command ${validCommand.cmd}`)

    try {
      // S'assurer que les notifications sont actives
      if (ensureNotifications) {
        await this.ensureNotifications(connection)
      }

      // Préparer la réponse
      let response: BleNotification | null = null
      let responseReceived = false

      // Listener temporaire pour la réponse
      const originalHandler = connection.notificationHandler
      connection.notificationHandler = (data: Uint8Array) => {
        try {
          const notification = this.parseNotification(data)
          if (notification) {
            bleLog.trace('📨 Received notification', notification)
            response = notification
            responseReceived = true
          }
        } catch (error) {
          bleLog.warn('Failed to parse notification', { error })
        }
      }

      // Encoder et envoyer la commande
      const commandBytes = this.encodeCommand(validCommand)
      await BleClient.write(
        deviceId,
        CONSTANTS.BLE_SERVICE_A100,
        CONSTANTS.BLE_CHAR_WRITE,
        commandBytes
      )

      bleLog.trace('✅ Command sent, waiting for response...', { timeout })

      // Attendre la réponse
      const startTime = Date.now()
      while (!responseReceived && (Date.now() - startTime) < timeout) {
        await sleep(100)
      }

      // Restaurer le handler original
      connection.notificationHandler = originalHandler

      if (!responseReceived) {
        throw new Error(`Command timeout after ${timeout}ms`)
      }

      connection.lastActivity = new Date()
      timer.end({ responseType: (response as any)?.type })

      bleLog.debug('✅ Command completed successfully', {
        command: validCommand.cmd,
        responseType: (response as any)?.type
      })

      return response

    } catch (error) {
      timer.end({ error })
      const appError = this.createBleError('COMMAND_FAILED', `Command ${validCommand.cmd} failed`, error)
      bleLog.error('❌ Command failed', appError)

      if (retryOnError && error instanceof Error && error.message.includes('timeout')) {
        bleLog.debug('Retrying command after timeout...')
        return this.sendCommand(deviceId, command, { ...options, retryOnError: false })
      }

      throw appError
    }
  }

  /**
   * Probe files sur un device
   */
  async probeFiles(
    deviceId: string,
    campaignId: number,
    options: { withWifiRequest?: boolean } = {}
  ): Promise<{ count: number; files: FileMeta[]; wifiInfo?: any }> {
    bleLog.debug('🔍 Probing files', { deviceId, campaignId, options })

    const command: BleCommand = {
      cmd: 'get_files',
      campaignId,
      id: campaignId,
      meta: true,
      wifi: options.withWifiRequest
    }

    const response = await this.sendCommand(deviceId, command)

    if (!response || response.type !== 'files' || !response.ok) {
      throw this.createBleError('PROBE_FAILED', 'Failed to probe files')
    }

    const files: FileMeta[] = response.files.map(f => ({
      name: f.name,
      size: f.size,
      campaignId
    }))

    const result = {
      count: response.count,
      files,
      wifiInfo: options.withWifiRequest ? {
        ssid: response.ssid,
        password: response.password,
        serverUrl: response.serverUrl,
        proto: response.proto,
        fw: response.fw
      } : undefined
    }

    bleLog.info('✅ Files probed successfully', {
      deviceId,
      campaignId,
      count: result.count,
      hasWifiInfo: !!result.wifiInfo
    })

    return result
  }

  /**
   * Obtient les connexions actives
   */
  getConnections(): BleConnection[] {
    return Array.from(this.connections.values())
  }

  /**
   * Obtient une connexion spécifique
   */
  getConnection(deviceId: string): BleConnection | null {
    return this.connections.get(deviceId) || null
  }

  /**
   * Vérifie si le BLE est disponible
   */
  async isAvailable(): Promise<boolean> {
    try {
      await BleClient.isEnabled()
      return true
    } catch {
      return false
    }
  }

  /**
   * Subscribe aux événements
   */
  onEvent(listener: (event: SystemEvent) => void): () => void {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  /**
   * Nettoie toutes les connexions
   */
  async cleanup(): Promise<void> {
    bleLog.debug('🧹 Cleaning up BLE manager')

    await this.stopScan()

    const disconnectPromises = Array.from(this.connections.keys()).map(deviceId =>
      this.disconnect(deviceId, 'cleanup')
    )

    await Promise.allSettled(disconnectPromises)

    this.eventListeners.clear()
    bleLog.info('✅ BLE manager cleaned up')
  }

  // ==================== PRIVATE METHODS ====================

  private parseAdvertisement(result: any, knownMacs: string[]): BleDeviceInfo | null {
    try {
      const deviceId = result?.device?.deviceId || result?.deviceId
      const name = result?.localName || result?.name || result?.device?.name || ''
      const rssi = result?.rssi

      if (!deviceId) return null

      // Extraire MAC du deviceId ou du nom
      let macd = macUtils.normalize(deviceId)

      // Si c'est un device TrackBee, extraire la MAC du nom
      const macFromName = macUtils.extractFromBleName(name)
      if (macFromName) {
        macd = macFromName
      }

      // Vérifier si c'est un device connu ou TrackBee
      const isTrackBee = name.startsWith(CONSTANTS.BLE_DEVICE_PREFIX)
      const isKnown = knownMacs.includes(macd) || knownMacs.some(known => macUtils.compare(known, macd))

      if (!isTrackBee && !isKnown) {
        return null // Ignorer les devices non-TrackBee et inconnus
      }

      return {
        deviceId,
        macd,
        name,
        rssi,
        lastSeen: new Date()
      }
    } catch (error) {
      bleLog.trace('Failed to parse advertisement', { result, error })
      return null
    }
  }

  private async ensureNotifications(connection: BleConnection): Promise<void> {
    if (connection.notificationListener) {
      bleLog.trace('Notifications already active', { deviceId: connection.deviceId })
      return
    }

    bleLog.debug('🔔 Setting up notifications', { deviceId: connection.deviceId })

    try {
      const cleanup = async () => {
        try {
          await BleClient.stopNotifications(
            connection.deviceId,
            CONSTANTS.BLE_SERVICE_A100,
            CONSTANTS.BLE_CHAR_NOTIFY
          )
        } catch (error) {
          bleLog.trace('Notification cleanup error', { error })
        }
      }

      await BleClient.startNotifications(
        connection.deviceId,
        CONSTANTS.BLE_SERVICE_A100,
        CONSTANTS.BLE_CHAR_NOTIFY,
        (value) => {
          try {
            const data = this.valueToUint8Array(value)
            if (data && connection.notificationHandler) {
              connection.notificationHandler(data)
            }
          } catch (error) {
            bleLog.warn('Notification handler error', { error })
          }
        }
      )

      connection.notificationListener = cleanup
      bleLog.debug('✅ Notifications setup completed')

    } catch (error) {
      const appError = this.createBleError('NOTIFICATION_SETUP_FAILED', 'Failed to setup notifications', error)
      bleLog.error('❌ Notification setup failed', appError)
      throw appError
    }
  }

  private encodeCommand(command: BleCommand): DataView {
    const jsonString = JSON.stringify(command)
    const bytes = new TextEncoder().encode(jsonString)

    bleLog.trace('📤 Encoding command', {
      command: command.cmd,
      size: bytes.length,
      json: jsonString
    })

    return new DataView(bytes.buffer)
  }

  private parseNotification(data: Uint8Array): BleNotification | null {
    try {
      const text = new TextDecoder().decode(data)
      const parsed = JSON.parse(text.trim())

      const notification = safeParseWithLog(BleNotificationSchema, parsed, 'BLE notification')

      bleLog.trace('📨 Parsed notification', {
        type: notification?.type,
        size: data.length
      })

      return notification
    } catch (error) {
      bleLog.trace('Failed to parse notification', {
        error,
        dataLength: data.length,
        preview: Array.from(data.slice(0, 32))
      })
      return null
    }
  }

  private valueToUint8Array(value: any): Uint8Array | null {
    try {
      if (value?.buffer) {
        return new Uint8Array(value.buffer)
      }
      if (typeof value?.value === 'string') {
        const binary = atob(value.value)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i)
        }
        return bytes
      }
      if (typeof value === 'string') {
        const binary = atob(value)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i)
        }
        return bytes
      }
      return null
    } catch (error) {
      bleLog.trace('Failed to convert value to Uint8Array', { error, value })
      return null
    }
  }

  private emitEvent(type: SystemEvent['type'], data: any): void {
    const event = { type, data } as SystemEvent
    this.eventListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        bleLog.warn('Event listener error', { error, type })
      }
    })
  }

  private createBleError(code: string, message: string, originalError?: unknown): AppError {
    return {
      code,
      message,
      category: 'ble',
      retryable: code === 'SCAN_FAILED' || code === 'CONNECTION_FAILED',
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

export const bleManager = new BleManager()

// Types exportés
export type { BleConnection, BleDeviceInfo, ScanOptions, ConnectOptions, CommandOptions }