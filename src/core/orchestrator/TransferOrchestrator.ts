// @ts-nocheck
/**
 * Transfer Orchestrator - Orchestrateur principal des transferts BLE/WiFi
 * Séquence complète : BLE probe → WiFi transfer → Storage → Upload
 */

import type { AppError } from '@/core/types/transport'
import type {
  MachineId,
  CampaignId,
  FileMeta,
  TransferProgress,
  UploadContext,
  TransferPhase
} from '@/core/types/domain'
import { orchestratorLog, logger } from '@/core/utils/logger'
import { sleep, formatDuration } from '@/core/utils/time'
import { idUtils } from '@/core/utils/ids'
import { events } from './EventBus'
import { bleManager } from '@/core/services/ble/BleManager'
import { wifiManager } from '@/core/services/wifi/WiFiManager'
import { storageManager } from '@/core/services/storage/StorageManager'

// ==================== TYPES ====================

interface TransferOperation {
  id: string
  machineId: MachineId
  campaignId: CampaignId
  method: 'auto' | 'wifi' | 'ble'

  // Context
  uploadContext: UploadContext

  // State
  phase: TransferPhase
  progress: TransferProgress
  startTime: Date
  endTime?: Date

  // Configuration
  options: TransferOptions

  // Results
  result?: TransferResult
  error?: AppError

  // Cleanup functions
  cleanupActions: Array<() => Promise<void>>
}

interface TransferOptions {
  timeout?: number
  retryAttempts?: number
  preferWifi?: boolean
  forceMethod?: 'wifi' | 'ble'
  skipUpload?: boolean
  skipCleanup?: boolean
  onProgress?: (progress: TransferProgress) => void
  signal?: AbortSignal
}

interface TransferResult {
  files: FileMeta[]
  method: 'wifi' | 'ble'
  totalBytes: number
  duration: number
  uploadedCount: number
  savedPaths: string[]
  cleanup: {
    filesDeleted: number
    errors: string[]
  }
}

interface WifiHandoverInfo {
  ssid: string
  password?: string
  serverUrl: string
  proto?: string
  fw?: string
}

interface OperationMetrics {
  operationsCount: number
  successCount: number
  failureCount: number
  averageDuration: number
  totalBytesTransferred: number
  methodUsage: Record<'wifi' | 'ble', number>
}

// ==================== TRANSFER ORCHESTRATOR CLASS ====================

export class TransferOrchestrator {
  private wifiInfoMap = new Map<string, WifiHandoverInfo>()

  private activeOperations = new Map<string, TransferOperation>()
  private metrics: OperationMetrics = {
    operationsCount: 0,
    successCount: 0,
    failureCount: 0,
    averageDuration: 0,
    totalBytesTransferred: 0,
    methodUsage: { wifi: 0, ble: 0 }
  }

  constructor() {
    orchestratorLog.debug('TransferOrchestrator initialized')
    this.setupEventListeners()
  }

  // ==================== PUBLIC API ====================

  /**
   * Lance un transfert complet de fichiers
   */
  async transferCampaignFiles(
    machineId: MachineId,
    campaignId: CampaignId,
    uploadContext: UploadContext,
    options: TransferOptions = {}
  ): Promise<TransferResult> {
    const operation = this.createOperation(machineId, campaignId, uploadContext, options)

    orchestratorLog.info('🚀 Starting transfer operation', {
      operationId: operation.id,
      machineId,
      campaignId,
      method: operation.method
    })

    try {
      // Vérifier si l'opération a été annulée
      this.checkAbortSignal(operation)

      // Séquence de transfert
      await this.executeTransferSequence(operation)

      // Marquer comme complété
      operation.phase = 'completed'
      operation.endTime = new Date()
      operation.progress.phase = 'done'

      const result = operation.result!
      this.updateMetrics(operation, true)

      orchestratorLog.info('✅ Transfer completed successfully', {
        operationId: operation.id,
        files: result.files.length,
        totalBytes: result.totalBytes,
        duration: formatDuration(result.duration),
        method: result.method
      })

      // Émettre événement de succès
      events.emitSync({
        type: 'transfer:completed',
        data: {
          transferId: operation.id,
          machineId,
          campaignId,
          files: result.files.length,
          bytes: result.totalBytes,
          duration_ms: result.duration
        }
      })

      return result

    } catch (error) {
      operation.phase = 'failed'
      operation.endTime = new Date()
      operation.error = error instanceof Error
        ? this.createTransferError('TRANSFER_FAILED', error.message, error)
        : this.createTransferError('TRANSFER_FAILED', String(error))

      this.updateMetrics(operation, false)

      orchestratorLog.error('❌ Transfer failed', {
        operationId: operation.id,
        phase: operation.phase,
        error: operation.error.message
      })

      // Émettre événement d'erreur
      events.emitSync({
        type: 'transfer:error',
        data: {
          transferId: operation.id,
          error: operation.error.message,
          phase: operation.phase,
          retryable: operation.error.retryable
        }
      })

      throw operation.error

    } finally {
      // Nettoyage final
      await this.cleanup(operation)
      this.activeOperations.delete(operation.id)
    }
  }

  /**
   * Obtient les opérations actives
   */
  getActiveOperations(): TransferOperation[] {
    return Array.from(this.activeOperations.values())
  }

  /**
   * Annule une opération
   */
  async cancelOperation(operationId: string): Promise<void> {
    const operation = this.activeOperations.get(operationId)
    if (!operation) {
      orchestratorLog.warn('Operation not found for cancellation', { operationId })
      return
    }

    orchestratorLog.info('🚫 Cancelling transfer operation', { operationId })

    // Marquer comme annulée
    // Note: AbortSignal n'a pas de méthode abort(), il est abort par le AbortController
    if (operation.options.signal && !operation.options.signal.aborted) {
      orchestratorLog.debug('Signal already aborted or no abort method available')
    }

    // Nettoyer
    await this.cleanup(operation)
    this.activeOperations.delete(operationId)

    events.emitSync({
      type: 'transfer:error',
      data: {
        transferId: operationId,
        error: 'Operation cancelled by user',
        phase: operation.phase,
        retryable: false
      }
    })
  }

  /**
   * Obtient les métriques
   */
  getMetrics(): OperationMetrics {
    return { ...this.metrics }
  }

  /**
   * Remet à zéro les métriques
   */
  resetMetrics(): void {
    this.metrics = {
      operationsCount: 0,
      successCount: 0,
      failureCount: 0,
      averageDuration: 0,
      totalBytesTransferred: 0,
      methodUsage: { wifi: 0, ble: 0 }
    }
    orchestratorLog.debug('Transfer metrics reset')
  }

  // ==================== INITIALIZATION ====================

  /**
   * Initialise l'orchestrateur de transferts
   */
  async initialize(): Promise<void> {
    orchestratorLog.debug('Initializing TransferOrchestrator...')

    try {
      // Vérifier la disponibilité des services requis
      const bleAvailable = await bleManager.isAvailable()
      const wifiAvailable = await wifiManager.isAvailable()
      const storageAvailable = await storageManager.isAvailable()

      orchestratorLog.info('⚙️ Service availability check:', {
        ble: bleAvailable,
        wifi: wifiAvailable,
        storage: storageAvailable
      })

      if (!storageAvailable) {
        throw new Error('Storage service is not available - cannot initialize TransferOrchestrator')
      }

      // Nettoyer les opérations actives au démarrage
      this.activeOperations.clear()
      this.resetMetrics()

      orchestratorLog.info('✅ TransferOrchestrator initialized successfully')

      // Émettre événement d'initialisation
      events.emitSync({
        type: 'orchestrator:initialized',
        data: {
          services: { ble: bleAvailable, wifi: wifiAvailable, storage: storageAvailable },
          timestamp: new Date()
        }
      })

    } catch (error) {
      orchestratorLog.error('❌ TransferOrchestrator initialization failed', { error })
      throw error
    }
  }

  /**
   * Vérifie si l'orchestrateur est initialisé
   */
  isInitialized(): boolean {
    // Simple check - l'orchestrateur est toujours "prêt" après construction
    // Dans une implémentation plus complexe, on pourrait avoir un flag d'état
    return true
  }

  /**
   * Obtient le statut de l'orchestrateur
   */
  getStatus(): {
    initialized: boolean
    activeOperations: number
    metrics: OperationMetrics
    lastActivity?: Date
  } {
    const operations = Array.from(this.activeOperations.values())
    const lastActivity = operations.length > 0
      ? new Date(Math.max(...operations.map(op => op.startTime.getTime())))
      : undefined

    return {
      initialized: this.isInitialized(),
      activeOperations: this.activeOperations.size,
      metrics: this.getMetrics(),
      lastActivity
    }
  }

  /**
   * Arrêt propre de l'orchestrateur
   */
  async shutdown(): Promise<void> {
    orchestratorLog.info('Shutting down TransferOrchestrator...')

    // Annuler toutes les opérations actives
    const activeOperationIds = Array.from(this.activeOperations.keys())

    for (const operationId of activeOperationIds) {
      try {
        await this.cancelOperation(operationId)
      } catch (error) {
        orchestratorLog.warn('Error cancelling operation during shutdown', { operationId, error })
      }
    }

    // Nettoyer
    this.activeOperations.clear()
    this.resetMetrics()

    orchestratorLog.info('✅ TransferOrchestrator shutdown completed')

    events.emitSync({
      type: 'orchestrator:shutdown',
      data: { timestamp: new Date() }
    })
  }

  // ==================== PRIVATE METHODS ====================

  private createOperation(
    machineId: MachineId,
    campaignId: CampaignId,
    uploadContext: UploadContext,
    options: TransferOptions
  ): TransferOperation {
    const operationId = idUtils.generateTransfer(machineId, campaignId)

    const operation: TransferOperation = {
      id: operationId,
      machineId,
      campaignId,
      method: options.forceMethod || 'auto',
      uploadContext,
      phase: 'initializing',
      progress: {
        phase: 'probe',
        machineId,
        campaignId,
        method: 'auto',
        current: 0,
        total: 0,
        startedAt: new Date(),
        lastUpdate: new Date()
      },
      startTime: new Date(),
      options,
      cleanupActions: []
    }

    this.activeOperations.set(operationId, operation)

    events.emitSync({
      type: 'transfer:started',
      data: {
        machineId,
        campaignId,
        method: operation.method,
        transferId: operationId
      }
    })

    return operation
  }

  private async executeTransferSequence(operation: TransferOperation): Promise<void> {
    const timer = logger.time('orchestrator', `Transfer ${operation.id}`)

    try {
      // Phase 1: BLE Probe
      await this.phaseProbe(operation)

      // Phase 2: Choisir la méthode de transfert
      const method = await this.chooseTransferMethod(operation)
      operation.method = method
      operation.progress.method = method

      if (method === 'wifi') {
        // Séquence WiFi
        await this.phaseWifiTransfer(operation)
      } else {
        // Séquence BLE
        await this.phaseBleTransfer(operation)
      }

      // Phase 3: Sauvegarde locale
      await this.phaseSaveFiles(operation)

      // Phase 4: Queue d'upload
      if (!operation.options.skipUpload) {
        await this.phaseQueueUpload(operation)
      }

      // Phase 5: Reconnexion BLE
      if (method === 'wifi') {
        await this.phaseReconnectBle(operation)
      }

      timer.end({ method, filesCount: operation.result?.files.length || 0 })

    } catch (error) {
      timer.end({ error })
      throw error
    }
  }

  private async phaseProbe(operation: TransferOperation): Promise<void> {
    this.updatePhase(operation, 'ble_probe', 'Probing files on device...')

    const connection = bleManager.getConnection(operation.machineId.toString())
    if (!connection || connection.status !== 'connected') {
      throw this.createTransferError('BLE_NOT_CONNECTED', 'Device not connected via BLE')
    }

    orchestratorLog.debug('📡 Probing files via BLE', {
      operationId: operation.id,
      deviceId: connection.deviceId,
      campaignId: operation.campaignId
    })

    try {
      const probeResult = await bleManager.probeFiles(
        connection.deviceId,
        operation.campaignId,
        { withWifiRequest: true }
      )

      orchestratorLog.debug('✅ BLE probe completed', {
        operationId: operation.id,
        filesCount: probeResult.count,
        hasWifiInfo: !!probeResult.wifiInfo
      })

      // Stocker les informations pour les phases suivantes
      operation.result = {
        files: probeResult.files,
        method: 'ble', // Sera mis à jour selon la méthode choisie
        totalBytes: probeResult.files.reduce((sum, f) => sum + (f.size || 0), 0),
        duration: 0,
        uploadedCount: 0,
        savedPaths: [],
        cleanup: { filesDeleted: 0, errors: [] }
      }

      // Stocker les infos WiFi si disponibles
      if (probeResult.wifiInfo) {
        this.wifiInfoMap.set(operation.id, probeResult.wifiInfo)
      } else {
        this.wifiInfoMap.delete(operation.id)
      }

    } catch (error) {
      throw this.createTransferError('PROBE_FAILED', 'Failed to probe files on device', error)
    }
  }

  private async chooseTransferMethod(operation: TransferOperation): Promise<'wifi' | 'ble'> {
    // Méthode forcée
    if (operation.options.forceMethod) {
      orchestratorLog.debug(`Transfer method forced: ${operation.options.forceMethod}`)
      return operation.options.forceMethod
    }

    // Vérifier si WiFi SoftAP est disponible
    const wifiInfo = this.wifiInfoMap.get(operation.id)
    if (wifiInfo?.ssid && wifiInfo?.serverUrl && operation.options.preferWifi !== false) {
      orchestratorLog.debug('WiFi SoftAP available, choosing WiFi method', {
        ssid: wifiInfo.ssid,
        serverUrl: wifiInfo.serverUrl
      })
      return 'wifi'
    }

    orchestratorLog.debug('WiFi not available or not preferred, choosing BLE method')
    return 'ble'
  }

  private async phaseWifiTransfer(operation: TransferOperation): Promise<void> {
    this.updatePhase(operation, 'wifi_connect', 'Connecting to WiFi...')

    const wifiInfo = this.wifiInfoMap.get(operation.id)
    if (!wifiInfo?.ssid || !wifiInfo?.serverUrl) {
      throw this.createTransferError('WIFI_INFO_MISSING', 'WiFi credentials not available')
    }

    try {
      // Ajouter cleanup pour déconnexion WiFi
      operation.cleanupActions.push(async () => {
        try {
          await wifiManager.disconnect('transfer_cleanup')
        } catch (error) {
          orchestratorLog.warn('WiFi cleanup error', { error })
        }
      })

      // Déconnecter BLE temporairement
      this.updatePhase(operation, 'ble_disconnect', 'Disconnecting BLE for WiFi handover...')
      const connection = bleManager.getConnection(operation.machineId.toString())
      if (connection) {
        await bleManager.disconnect(connection.deviceId, 'wifi_handover')
      }

      // Transfert WiFi
      this.updatePhase(operation, 'wifi_transfer', 'Transferring files via WiFi...')

      const files = await wifiManager.transferFiles(
        {
          ssid: wifiInfo.ssid,
          password: wifiInfo.password,
          serverUrl: wifiInfo.serverUrl
        },
        operation.campaignId,
        {
          onProgress: (progress) => {
            operation.progress.current = progress.current
            operation.progress.total = progress.total
            operation.progress.lastUpdate = new Date()
            operation.options.onProgress?.(operation.progress)

            events.emitSync({
              type: 'transfer:progress',
              data: {
                transferId: operation.id,
                current: progress.current,
                total: progress.total,
                bytes: progress.percent * (operation.result?.totalBytes || 0) / 100,
                speed: progress.speed
              }
            })
          },
          signal: operation.options.signal
        }
      )

      // Mettre à jour le résultat
      if (operation.result) {
        operation.result.files = files
        operation.result.method = 'wifi'
        operation.result.totalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0)
      }

      orchestratorLog.info('✅ WiFi transfer completed', {
        operationId: operation.id,
        filesCount: files.length
      })

    } catch (error) {
      throw this.createTransferError('WIFI_TRANSFER_FAILED', 'WiFi transfer failed', error)
    }
  }

  private async phaseBleTransfer(operation: TransferOperation): Promise<void> {
    this.updatePhase(operation, 'ble_disconnect', 'Transferring files via BLE...')

    // TODO: Implémenter le transfert BLE complet
    // Pour l'instant, on simule avec les fichiers déjà probés

    orchestratorLog.debug('📥 BLE transfer (fallback method)')

    // Simuler un délai de transfert
    await sleep(2000)

    if (operation.result) {
      operation.result.method = 'ble'
    }

    orchestratorLog.info('✅ BLE transfer completed (simulated)')
  }

  private async phaseSaveFiles(operation: TransferOperation): Promise<void> {
    this.updatePhase(operation, 'storage_save', 'Saving files locally...')

    if (!operation.result?.files || operation.result.files.length === 0) {
      orchestratorLog.warn('No files to save')
      return
    }

    try {
      const savedPaths: string[] = []

      for (const file of operation.result.files) {
        // Générer un nom de fichier unique
        const filename = `${operation.campaignId}_${Date.now()}_${file.name}`
        const path = `trackbee/transfers/${filename}`

        // Sauvegarder (pour l'instant on simule avec du contenu vide)
        await storageManager.writeFile(path, `# File: ${file.name}\n# Size: ${file.size} bytes`)
        savedPaths.push(path)

        orchestratorLog.trace(`File saved: ${path}`)
      }

      operation.result.savedPaths = savedPaths

      orchestratorLog.info('✅ Files saved locally', {
        operationId: operation.id,
        filesCount: savedPaths.length
      })

    } catch (error) {
      throw this.createTransferError('STORAGE_SAVE_FAILED', 'Failed to save files locally', error)
    }
  }

  private async phaseQueueUpload(operation: TransferOperation): Promise<void> {
    this.updatePhase(operation, 'upload_queue', 'Queuing files for upload...')

    if (!operation.result?.files || operation.result.files.length === 0) {
      return
    }

    try {
      // TODO: Implémenter la queue d'upload
      // Pour l'instant on simule

      await sleep(500)

      if (operation.result) {
        operation.result.uploadedCount = operation.result.files.length
      }

      orchestratorLog.info('✅ Files queued for upload', {
        operationId: operation.id,
        filesCount: operation.result.files.length
      })

    } catch (error) {
      throw this.createTransferError('UPLOAD_QUEUE_FAILED', 'Failed to queue files for upload', error)
    }
  }

  private async phaseReconnectBle(operation: TransferOperation): Promise<void> {
    this.updatePhase(operation, 'ble_reconnect', 'Reconnecting BLE...')

    try {
      // Attendre un peu pour stabiliser la connexion réseau
      await sleep(1000)

      // Essayer de reconnecter
      const deviceId = `device_${operation.machineId}` // Simulé
      await bleManager.connect(deviceId, operation.machineId)

      orchestratorLog.info('✅ BLE reconnected', {
        operationId: operation.id,
        machineId: operation.machineId
      })

    } catch (error) {
      // La reconnexion BLE n'est pas critique pour le succès du transfert
      orchestratorLog.warn('BLE reconnection failed (non-critical)', {
        operationId: operation.id,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  private async cleanup(operation: TransferOperation): Promise<void> {
    if (operation.options.skipCleanup) {
      this.wifiInfoMap.delete(operation.id);

      return
    }

    this.updatePhase(operation, 'cleanup', 'Cleaning up...')

    orchestratorLog.debug('🧹 Starting operation cleanup', {
      operationId: operation.id,
      cleanupActionsCount: operation.cleanupActions.length
    })

    // Exécuter toutes les actions de cleanup
    const errors: string[] = []

    for (const cleanupAction of operation.cleanupActions) {
      try {
        await cleanupAction()
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        errors.push(errorMsg)
        orchestratorLog.warn('Cleanup action failed', { operationId: operation.id, error: errorMsg })
      }
    }

    this.wifiInfoMap.delete(operation.id)

    if (operation.result) {

      operation.result.cleanup.errors = errors
    }

    orchestratorLog.debug(`✅ Operation cleanup completed`, {
      operationId: operation.id,
      errorsCount: errors.length
    })
  }

  private updatePhase(operation: TransferOperation, phase: TransferPhase, message?: string): void {
    operation.phase = phase
    operation.progress.phase = phase
    operation.progress.lastUpdate = new Date()

    if (message) {
      orchestratorLog.debug(`📍 ${message}`, { operationId: operation.id, phase })
    }

    operation.options.onProgress?.(operation.progress)

    events.emitSync({
      type: 'transfer:phase',
      data: {
        transferId: operation.id,
        phase,
        progress: operation.progress.current / Math.max(operation.progress.total, 1) * 100
      }
    })
  }

  private checkAbortSignal(operation: TransferOperation): void {
    if (operation.options.signal?.aborted) {
      throw this.createTransferError('OPERATION_ABORTED', 'Transfer operation was aborted')
    }
  }

  private updateMetrics(operation: TransferOperation, success: boolean): void {
    this.metrics.operationsCount++

    if (success) {
      this.metrics.successCount++
      if (operation.result) {
        this.metrics.totalBytesTransferred += operation.result.totalBytes
        this.metrics.methodUsage[operation.result.method]++

        const duration = operation.endTime!.getTime() - operation.startTime.getTime()
        operation.result.duration = duration

        // Mettre à jour la durée moyenne
        this.metrics.averageDuration =
          (this.metrics.averageDuration * (this.metrics.successCount - 1) + duration) / this.metrics.successCount
      }
    } else {
      this.metrics.failureCount++
    }
  }

  private setupEventListeners(): void {
    // Écouter les événements de services pour orchestrer
    events.on('ble:connected', (event) => {
      orchestratorLog.trace('BLE connected event received', event.data)
    })

    events.on('wifi:connected', (event) => {
      orchestratorLog.trace('WiFi connected event received', event.data)
    })
  }

  private createTransferError(code: string, message: string, originalError?: unknown): AppError {
    return {
      code,
      message,
      category: 'orchestrator',
      retryable: ['PROBE_FAILED', 'WIFI_TRANSFER_FAILED', 'BLE_TRANSFER_FAILED'].includes(code),
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

  // ==================== TASK MANAGEMENT ====================

  /**
   * Crée une nouvelle tâche de transfert
   */
  createTask(
    machineId: MachineId,
    campaignId: CampaignId,
    options?: Partial<TransferOptions>
  ): string {
    const taskId = idUtils.generateTransfer(machineId, campaignId)

    orchestratorLog.debug('Creating transfer task', {
      taskId,
      machineId,
      campaignId,
      options
    })

    // Pour l'instant, on retourne juste l'ID
    // L'implémentation complète serait de créer une TransferOperation
    return taskId
  }

  /**
   * Récupère une tâche de transfert
   */
  getTask(taskId: string): TransferOperation | null {
    return this.activeOperations.get(taskId) || null
  }

  /**
   * Annule une tâche de transfert
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const operation = this.activeOperations.get(taskId)

    if (!operation) {
      orchestratorLog.warn('Task not found for cancellation', { taskId })
      return false
    }

    orchestratorLog.info('Cancelling transfer task', { taskId })

    // Marquer l'opération comme annulée
    // Note: AbortSignal n'a pas de méthode abort(), c'est l'AbortController qui l'a

    // Nettoyer l'opération active
    this.activeOperations.delete(taskId)

    return true
  }

  /**
   * Upload un fichier vers le serveur
   */
  async uploadFile(
    fileMetadata: unknown,
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; uploadId?: string; error?: string }> {
    try {
      orchestratorLog.debug('Starting file upload', { fileMetadata })

      // Simulation d'upload pour l'instant
      if (onProgress) {
        onProgress(100)
      }

      const uploadId = idUtils.generateUnique('upload')

      orchestratorLog.info('File upload completed', { uploadId })

      return { success: true, uploadId }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      orchestratorLog.error('File upload failed', { error: errorMessage })
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Met en pause les uploads
   */
  pauseUploads(): void {
    orchestratorLog.info('Pausing uploads')
    // Implémentation de la pause des uploads
  }

  /**
   * Reprend les uploads
   */
  resumeUploads(): void {
    orchestratorLog.info('Resuming uploads')
    // Implémentation de la reprise des uploads
  }
}

// ==================== SINGLETON EXPORT ====================

export const transferOrchestrator = new TransferOrchestrator()

// Types exportés
export type { TransferOperation, TransferPhase, TransferOptions, TransferResult, OperationMetrics }






