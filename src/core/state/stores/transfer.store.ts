/**
 * Transfer Store - Gestion état transferts de fichiers
 * Store Zustand pour l'état des transferts BLE/WiFi/Upload
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { TransferTask, TransferProgress, FileMetadata } from '@/core/types/transport'
import { stateLog, logger } from '@/core/utils/logger'
import { transferOrchestrator } from '@/core/orchestrator/TransferOrchestrator'
import { storageManager } from '@/core/services/storage/StorageManager'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const parseDate = (value: unknown): Date | undefined => {
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed
  }
  return undefined
}

const parseNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

type TransferFileInput = FileMetadata | {
  name?: string
  filename?: string
  size?: number
  transferred?: boolean
  path?: string
}

const normalizeFiles = (
  files: TransferFileInput[]
): { name: string; size: number; transferred: boolean; path?: string }[] =>
  files.map((file) => {
    if (isRecord(file)) {
      const name =
        typeof file.name === 'string'
          ? file.name
          : typeof file.filename === 'string'
            ? file.filename
            : 'unknown-file'

      return {
        name,
        size: parseNumber(file.size),
        transferred: Boolean(file.transferred ?? false),
        path: typeof file.path === 'string' ? file.path : undefined,
      }
    }

    return {
      name: String(file),
      size: 0,
      transferred: false,
    }
  })

// Helper: normalize any orchestrator task/operation to a TransferTask shape
function toTransferTask(
  taskId: string,
  src: unknown,
  fallback: {
    machineId: string | number
    campaignId: string | number
    files?: TransferFileInput[]
  } = { machineId: '', campaignId: '' }
): TransferTask {
  const now = new Date()
  const source = isRecord(src) ? src : {}
  const progressSource = isRecord(source.progress) ? source.progress : {}
  const filesSource: TransferFileInput[] = Array.isArray(source.files)
    ? source.files as TransferFileInput[]
    : Array.isArray(fallback.files)
      ? fallback.files
      : []

  const created = parseDate(source.createdAt) ?? now
  const start = parseDate(source.startTime) ?? created
  const end = parseDate(source.endTime)

  const progress: TransferProgress = {
    transferred: parseNumber(progressSource.transferred),
    total: parseNumber(progressSource.total),
    percentage: parseNumber(progressSource.percentage),
    speed: parseNumber(progressSource.speed),
    estimatedTimeRemaining: parseNumber(progressSource.estimatedTimeRemaining),
  }

  const campaignId =
    source.campaignId != null
      ? String(source.campaignId)
      : fallback.campaignId != null
        ? String(fallback.campaignId)
        : undefined

  return {
    id: typeof source.id === 'string' ? source.id : taskId,
    machineId: String(source.machineId ?? fallback.machineId ?? ''),
    campaignId,
    type: typeof source.type === 'string' ? source.type : 'download',
    status: typeof source.status === 'string' ? source.status : 'pending',
    priority: typeof source.priority === 'string' ? source.priority : 'normal',
    createdAt: created,
    updatedAt: now,
    startTime: start,
    endTime: end,
    progress,
    files: normalizeFiles(filesSource),
  } as TransferTask
}


// ==================== TYPES ====================

interface TransferState {
  // Tâches de transfert
  activeTasks: Map<string, TransferTask>
  completedTasks: Map<string, TransferTask>
  failedTasks: Map<string, TransferTask>

  // Queue d'upload
  uploadQueue: Map<string, FileMetadata>
  uploadInProgress: Map<string, TransferProgress>

  // État global
  isTransferring: boolean
  totalBytesTransferred: number
  totalBytesToTransfer: number

  // Statistiques
  stats: {
    totalTasks: number
    successfulTasks: number
    failedTasks: number
    averageSpeed: number // bytes/sec
    lastTransferTime: Date | null
  }

  // UI State
  showTransferModal: boolean
  selectedTaskId: string | null
  transferFilters: {
    status?: 'active' | 'completed' | 'failed'
    machine?: string
    dateRange?: { start: Date; end: Date }
  }
}

interface TransferActions {
  // Gestion des tâches
  createTask: (params: {
    machineId: string
    campaignId: string
    files: TransferFileInput[]
    context?: {
      siteId?: string
      installationId?: string
    }
  }) => Promise<string>
  cancelTask: (taskId: string) => Promise<void>
  retryTask: (taskId: string) => Promise<void>
  removeTask: (taskId: string) => void

  // Gestion de la queue d'upload
  addToUploadQueue: (file: FileMetadata) => void
  removeFromUploadQueue: (fileId: string) => void
  processUploadQueue: () => Promise<void>
  pauseUploads: () => void
  resumeUploads: () => void

  // Progress tracking
  updateTaskProgress: (taskId: string, progress: Partial<TransferProgress>) => void
  updateUploadProgress: (fileId: string, progress: Partial<TransferProgress>) => void

  // UI Actions
  setTransferModal: (show: boolean) => void
  setSelectedTask: (taskId: string | null) => void
  setTransferFilters: (filters: Partial<TransferState['transferFilters']>) => void

  // Statistiques
  updateStats: () => void
  getTasksByMachine: (machineId: string) => TransferTask[]
  getActiveTasksCount: () => number

  // Persistence
  loadPersistedQueue: () => Promise<void>
  saveQueue: () => Promise<void>
  cleanup: () => void
}

type TransferStore = TransferState & TransferActions

// ==================== INITIAL STATE ====================

const initialState: TransferState = {
  activeTasks: new Map(),
  completedTasks: new Map(),
  failedTasks: new Map(),

  uploadQueue: new Map(),
  uploadInProgress: new Map(),

  isTransferring: false,
  totalBytesTransferred: 0,
  totalBytesToTransfer: 0,

  stats: {
    totalTasks: 0,
    successfulTasks: 0,
    failedTasks: 0,
    averageSpeed: 0,
    lastTransferTime: null
  },

  showTransferModal: false,
  selectedTaskId: null,
  transferFilters: {}
}

// ==================== STORAGE KEYS ====================

const STORAGE_KEYS = {
  UPLOAD_QUEUE: 'transfer_upload_queue',
  TRANSFER_STATS: 'transfer_stats',
  FAILED_TASKS: 'transfer_failed_tasks'
} as const

// ==================== STORE ====================

export const useTransferStore = create<TransferStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialState,

      // ==================== TASK MANAGEMENT ====================

      createTask: async (params: {
        machineId: string
        campaignId: string
        files: TransferFileInput[]
        context?: {
          siteId?: string
          installationId?: string
        }
      }): Promise<string> => {
        const timer = logger.time('transfer', 'Create task')

        try {
          stateLog.debug('📋 Creating transfer task', {
            machineId: params.machineId,
            campaignId: params.campaignId,
            filesCount: params.files.length
          })

          // Créer la tâche via l'orchestrator
          const taskId = transferOrchestrator.createTask(
            Number(params.machineId),
            Number(params.campaignId),
            {
              timeout: 60000,
              retryAttempts: 3
            }
          )

          // Ajouter à l'état local
          const raw = transferOrchestrator.getTask(taskId)
          const task = toTransferTask(taskId, raw, { machineId: params.machineId, campaignId: params.campaignId, files: params.files })
          set((state) => {
            state.activeTasks.set(taskId, task)
            state.isTransferring = true
          })

          // Mettre à jour les stats
          get().updateStats()

          timer.end({ success: true, taskId })
          stateLog.info('✅ Transfer task created', { taskId })

          return taskId

        } catch (error) {
          timer.end({ error })
          stateLog.error('❌ Failed to create transfer task', { error })
          throw error
        }
      },

      cancelTask: async (taskId) => {
        const timer = logger.time('transfer', `Cancel task ${taskId}`)

        try {
          stateLog.debug('🛑 Cancelling transfer task', { taskId })

          await transferOrchestrator.cancelTask(taskId)

          set((state) => {
            const task = state.activeTasks.get(taskId)
            if (task) {
              task.status = 'cancelled'
              task.endTime = new Date()
              state.activeTasks.delete(taskId)
              state.failedTasks.set(taskId, task)

              // Vérifier si c'était la dernière tâche active
              if (state.activeTasks.size === 0) {
                state.isTransferring = false
              }
            }
          })

          get().updateStats()

          timer.end({ success: true })
          stateLog.info('✅ Transfer task cancelled', { taskId })

        } catch (error) {
          timer.end({ error })
          stateLog.error('❌ Failed to cancel transfer task', { taskId, error })
        }
      },

      retryTask: async (taskId) => {
        const timer = logger.time('transfer', `Retry task ${taskId}`)

        try {
          const failedTask = get().failedTasks.get(taskId)
          if (!failedTask) {
            throw new Error(`Failed task ${taskId} not found`)
          }

          stateLog.debug('🔄 Retrying transfer task', { taskId })

          // Créer une nouvelle tâche avec les mêmes paramètres
          const newTaskId = await get().createTask({
            machineId: failedTask.machineId,
            campaignId: failedTask.campaignId || '',
            files: failedTask.files || [],
            context: failedTask.context
          })

          // Supprimer l'ancienne tâche échouée
          set((state) => {
            state.failedTasks.delete(taskId)
          })

          timer.end({ success: true, newTaskId })
          stateLog.info('✅ Transfer task retried', { oldTaskId: taskId, newTaskId })

        } catch (error) {
          timer.end({ error })
          stateLog.error('❌ Failed to retry transfer task', { taskId, error })
        }
      },

      removeTask: (taskId) => {
        set((state) => {
          state.activeTasks.delete(taskId)
          state.completedTasks.delete(taskId)
          state.failedTasks.delete(taskId)
        })

        stateLog.debug('🗑️ Transfer task removed', { taskId })
      },

      // ==================== UPLOAD QUEUE ====================

      addToUploadQueue: (file) => {
        set((state) => {
          state.uploadQueue.set(file.id, file)
        })

        stateLog.debug('📤 File added to upload queue', {
          fileId: file.id,
          filename: file.filename,
          size: file.size
        })

        // Sauvegarder la queue
        get().saveQueue()
      },

      removeFromUploadQueue: (fileId) => {
        set((state) => {
          state.uploadQueue.delete(fileId)
          state.uploadInProgress.delete(fileId)
        })

        stateLog.debug('🗑️ File removed from upload queue', { fileId })

        // Sauvegarder la queue
        get().saveQueue()
      },

      processUploadQueue: async () => {
        const timer = logger.time('transfer', 'Process upload queue')
        const queueSize = get().uploadQueue.size

        if (queueSize === 0) {
          stateLog.debug('Upload queue is empty')
          return
        }

        stateLog.info('📤 Processing upload queue', { queueSize })

        try {
          const files = Array.from(get().uploadQueue.values())

          for (const file of files) {
            try {
              // Marquer comme en cours
              set((state) => {
                state.uploadInProgress.set(file.id, {
                  transferred: 0,
                  total: file.size,
                  percentage: 0,
                  speed: 0,
                  estimatedTimeRemaining: 0
                })
              })

              // Démarrer l'upload via l'orchestrator
              await transferOrchestrator.uploadFile({
                file: file,
                onProgress: (progress: number) => {
                  get().updateUploadProgress(file.id, { percentage: progress })
                }
              })

              // Supprimer de la queue une fois terminé
              get().removeFromUploadQueue(file.id)

              stateLog.info('✅ File uploaded successfully', { fileId: file.id })

            } catch (error) {
              stateLog.error('❌ File upload failed', { fileId: file.id, error })

              // Garder dans la queue pour retry ultérieur
              set((state) => {
                state.uploadInProgress.delete(file.id)
              })
            }
          }

          timer.end({ success: true, processedFiles: files.length })

        } catch (error) {
          timer.end({ error })
          stateLog.error('❌ Upload queue processing failed', { error })
        }
      },

      pauseUploads: () => {
        transferOrchestrator.pauseUploads()
        stateLog.debug('⏸️ Uploads paused')
      },

      resumeUploads: () => {
        transferOrchestrator.resumeUploads()
        get().processUploadQueue()
        stateLog.debug('▶️ Uploads resumed')
      },

      // ==================== PROGRESS TRACKING ====================

      updateTaskProgress: (taskId, progress) => {
        set((state) => {
          const task = state.activeTasks.get(taskId)
          if (task) {
            task.progress = { ...(task.progress ?? { transferred: 0, total: 0, percentage: 0, speed: 0, estimatedTimeRemaining: 0 }), ...progress }

            // Mettre à jour les totaux globaux
            const totalTransferred = Array.from(state.activeTasks.values())
              .reduce((sum: number, t) => sum + (((t as TransferTask).progress?.transferred) || 0), 0)

            const totalToTransfer = Array.from(state.activeTasks.values())
              .reduce((sum: number, t) => sum + (((t as TransferTask).progress?.total) || 0), 0)

            state.totalBytesTransferred = totalTransferred
            state.totalBytesToTransfer = totalToTransfer
          }
        })
      },

      updateUploadProgress: (fileId, progress) => {
        set((state) => {
          const existing = state.uploadInProgress.get(fileId)
          if (existing) {
            Object.assign(existing, progress)
          }
        })
      },

      // ==================== UI ACTIONS ====================

      setTransferModal: (show) => {
        set((state) => {
          state.showTransferModal = show
        })
      },

      setSelectedTask: (taskId) => {
        set((state) => {
          state.selectedTaskId = taskId
        })
      },

      setTransferFilters: (filters) => {
        set((state) => {
          Object.assign(state.transferFilters, filters)
        })
      },

      // ==================== STATISTICS ====================

      updateStats: () => {
        set((state) => {
          const activeTasks = Array.from(state.activeTasks.values())
          const completedTasks = Array.from(state.completedTasks.values())
          const failedTasks = Array.from(state.failedTasks.values())

          state.stats = {
            totalTasks: activeTasks.length + completedTasks.length + failedTasks.length,
            successfulTasks: completedTasks.length,
            failedTasks: failedTasks.length,
            averageSpeed: activeTasks.reduce((sum: number, task) => sum + (((task as TransferTask).progress?.speed) || 0), 0) / Math.max(activeTasks.length, 1),
            lastTransferTime: completedTasks.length > 0
              ? new Date(Math.max(...completedTasks.map(t => (t as TransferTask).endTime?.getTime() || 0)))
              : null
          }
        })

        // Persister les stats
        storageManager.set(STORAGE_KEYS.TRANSFER_STATS, get().stats).catch(error => {
          stateLog.error('Failed to persist transfer stats', { error })
        })
      },

      getTasksByMachine: (machineId) => {
        const state = get()
        const allTasks = [
          ...Array.from(state.activeTasks.values()),
          ...Array.from(state.completedTasks.values()),
          ...Array.from(state.failedTasks.values())
        ]

        return allTasks.filter(task => task.machineId === machineId)
      },

      getActiveTasksCount: () => {
        return get().activeTasks.size
      },

      // ==================== PERSISTENCE ====================

      loadPersistedQueue: async () => {
        const timer = logger.time('transfer', 'Load persisted queue')

        try {
          const [uploadQueue, stats, failedTasks] = await Promise.all([
            storageManager.get<FileMetadata[]>(STORAGE_KEYS.UPLOAD_QUEUE),
            storageManager.get<TransferState['stats']>(STORAGE_KEYS.TRANSFER_STATS),
            storageManager.get<TransferTask[]>(STORAGE_KEYS.FAILED_TASKS)
          ])

          set((state) => {
            // Restaurer la queue d'upload
            if (uploadQueue) {
              state.uploadQueue.clear()
              uploadQueue.forEach(file => {
                state.uploadQueue.set(file.id, file)
              })
            }

            // Restaurer les stats
            if (stats) {
              state.stats = stats
            }

            // Restaurer les tâches échouées
            if (failedTasks) {
              state.failedTasks.clear()
              failedTasks.forEach(task => {
                state.failedTasks.set(task.id, task)
              })
            }
          })

          timer.end({
            success: true,
            queueSize: uploadQueue?.length || 0,
            failedTasksCount: failedTasks?.length || 0
          })

          stateLog.info('✅ Transfer state restored', {
            uploadQueue: uploadQueue?.length || 0,
            failedTasks: failedTasks?.length || 0
          })

        } catch (error) {
          timer.end({ error })
          stateLog.error('❌ Failed to load persisted transfer state', { error })
        }
      },

      saveQueue: async () => {
        try {
          const state = get()

          await Promise.all([
            storageManager.set(STORAGE_KEYS.UPLOAD_QUEUE, Array.from(state.uploadQueue.values())),
            storageManager.set(STORAGE_KEYS.FAILED_TASKS, Array.from(state.failedTasks.values()))
          ])

        } catch (error) {
          stateLog.error('Failed to save transfer queue', { error })
        }
      },

      cleanup: () => {
        stateLog.debug('🧹 Transfer store cleanup')

        // Annuler toutes les tâches actives
        const activeTasks = Array.from(get().activeTasks.keys())
        activeTasks.forEach(taskId => {
          get().cancelTask(taskId)
        })

        // Arrêter les uploads
        get().pauseUploads()

        // Reset l'état
        set(() => initialState)
      }
    }))
  )
)

// ==================== SELECTORS ====================

export const transferSelectors = {
  activeTasks: (state: TransferStore) => Array.from(state.activeTasks.values()),
  completedTasks: (state: TransferStore) => Array.from(state.completedTasks.values()),
  failedTasks: (state: TransferStore) => Array.from(state.failedTasks.values()),
  uploadQueue: (state: TransferStore) => Array.from(state.uploadQueue.values()),
  uploadInProgress: (state: TransferStore) => Array.from(state.uploadInProgress.values()),

  filteredTasks: (state: TransferStore) => {
    let tasks: TransferTask[] = []

    const { status } = state.transferFilters

    switch (status) {
      case 'active':
        tasks = Array.from(state.activeTasks.values())
        break
      case 'completed':
        tasks = Array.from(state.completedTasks.values())
        break
      case 'failed':
        tasks = Array.from(state.failedTasks.values())
        break
      default:
        tasks = [
          ...Array.from(state.activeTasks.values()),
          ...Array.from(state.completedTasks.values()),
          ...Array.from(state.failedTasks.values())
        ]
    }

    const { machine, dateRange } = state.transferFilters

    if (machine) {
      tasks = tasks.filter(task => task.machineId === machine)
    }

    if (dateRange) {
      tasks = tasks.filter(task => {
        const taskDate = task.startTime
        return taskDate && taskDate >= dateRange.start && taskDate <= dateRange.end
      })
    }

    return tasks.sort((a, b) => (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0))
  },

  globalProgress: (state: TransferStore) => ({
    percentage: state.totalBytesToTransfer > 0
      ? (state.totalBytesTransferred / state.totalBytesToTransfer) * 100
      : 0,
    transferred: state.totalBytesTransferred,
    total: state.totalBytesToTransfer,
    isActive: state.isTransferring
  })
}

// ==================== HOOKS ====================

export const useActiveTasks = () => useTransferStore(transferSelectors.activeTasks)
export const useUploadQueue = () => useTransferStore(transferSelectors.uploadQueue)
export const useGlobalProgress = () => useTransferStore(transferSelectors.globalProgress)
export const useTransferStats = () => useTransferStore(state => state.stats)

// Types exportés
export type { TransferStore, TransferState, TransferActions }
