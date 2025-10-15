import { useState, useCallback, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { logger } from '@/core/utils/logger'
import type {
  OfflineQueue,
  OfflineTransfer,
  TransferId,
  CreateTransferData,
  UseOfflineQueueReturn
} from '../types'
import { transferQueryKeys } from '../types'

const log = logger.extend('useOfflineQueue')

// ==================== STORAGE INTERFACE ====================

interface OfflineStorage {
  getQueue(): Promise<OfflineQueue | null>
  setQueue(queue: OfflineQueue): Promise<void>
  getTransfers(): Promise<OfflineTransfer[]>
  addTransfer(transfer: OfflineTransfer): Promise<void>
  removeTransfer(transferId: TransferId): Promise<void>
  updateTransfer(transferId: TransferId, updates: Partial<OfflineTransfer>): Promise<void>
  clear(): Promise<void>
}

// ==================== INDEXEDDB IMPLEMENTATION ====================

class IndexedDBStorage implements OfflineStorage {
  private dbName = 'trackbee_offline_transfers'
  private version = 1
  private db: IDBDatabase | null = null

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Store pour la configuration de la queue
        if (!db.objectStoreNames.contains('queue')) {
          db.createObjectStore('queue', { keyPath: 'id' })
        }

        // Store pour les transferts
        if (!db.objectStoreNames.contains('transfers')) {
          const transferStore = db.createObjectStore('transfers', { keyPath: 'id' })
          transferStore.createIndex('queueId', 'queueId', { unique: false })
          transferStore.createIndex('status', 'status', { unique: false })
          transferStore.createIndex('createdAt', 'createdAt', { unique: false })
        }
      }
    })
  }

  async getQueue(): Promise<OfflineQueue | null> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction(['queue'], 'readonly')
      const store = transaction.objectStore('queue')
      const request = store.get('default')

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      log.error('Failed to get queue from IndexedDB', { error })
      return null
    }
  }

  async setQueue(queue: OfflineQueue): Promise<void> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction(['queue'], 'readwrite')
      const store = transaction.objectStore('queue')

      return new Promise((resolve, reject) => {
        const request = store.put({ ...queue, id: 'default' })
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      log.error('Failed to set queue in IndexedDB', { error })
      throw error
    }
  }

  async getTransfers(): Promise<OfflineTransfer[]> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction(['transfers'], 'readonly')
      const store = transaction.objectStore('transfers')
      const request = store.getAll()

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      log.error('Failed to get transfers from IndexedDB', { error })
      return []
    }
  }

  async addTransfer(transfer: OfflineTransfer): Promise<void> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction(['transfers'], 'readwrite')
      const store = transaction.objectStore('transfers')

      return new Promise((resolve, reject) => {
        const request = store.add(transfer)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      log.error('Failed to add transfer to IndexedDB', { error })
      throw error
    }
  }

  async removeTransfer(transferId: TransferId): Promise<void> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction(['transfers'], 'readwrite')
      const store = transaction.objectStore('transfers')

      return new Promise((resolve, reject) => {
        const request = store.delete(transferId)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      log.error('Failed to remove transfer from IndexedDB', { error })
      throw error
    }
  }

  async updateTransfer(transferId: TransferId, updates: Partial<OfflineTransfer>): Promise<void> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction(['transfers'], 'readwrite')
      const store = transaction.objectStore('transfers')

      // Get existing transfer
      const getRequest = store.get(transferId)

      return new Promise((resolve, reject) => {
        getRequest.onsuccess = () => {
          const existing = getRequest.result
          if (!existing) {
            reject(new Error('Transfer not found'))
            return
          }

          const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() }
          const putRequest = store.put(updated)

          putRequest.onsuccess = () => resolve()
          putRequest.onerror = () => reject(putRequest.error)
        }
        getRequest.onerror = () => reject(getRequest.error)
      })
    } catch (error) {
      log.error('Failed to update transfer in IndexedDB', { error })
      throw error
    }
  }

  async clear(): Promise<void> {
    try {
      const db = await this.getDB()
      const transaction = db.transaction(['transfers'], 'readwrite')
      const store = transaction.objectStore('transfers')

      return new Promise((resolve, reject) => {
        const request = store.clear()
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      log.error('Failed to clear transfers from IndexedDB', { error })
      throw error
    }
  }
}

// ==================== STORAGE FACTORY ====================

function createStorage(): OfflineStorage {
  // Toujours utiliser IndexedDB pour la persistance
  return new IndexedDBStorage()
}

// ==================== DEFAULT QUEUE CONFIG ====================

const DEFAULT_QUEUE: OfflineQueue = {
  id: 'default',
  name: 'Queue Offline',
  isEnabled: true,
  maxSize: 100,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours

  storageType: 'indexeddb',
  compressionEnabled: false,
  encryptionEnabled: false,

  syncOnConnect: true,
  syncInterval: 30 * 1000, // 30 secondes
  batchSize: 5,

  statistics: {
    queuedItems: 0,
    processedItems: 0,
    failedItems: 0
  },

  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

// ==================== HOOK ====================

export function useOfflineQueue(): UseOfflineQueueReturn {
  const queryClient = useQueryClient()
  const storage = useMemo<OfflineStorage>(() => createStorage(), [])

  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | undefined>()

  // Query pour la configuration de la queue
  const {
    data: queue,
    isLoading: isLoadingQueue,
    error: queueError,
    refetch: refetchQueue
  } = useQuery<OfflineQueue, Error>({
    queryKey: transferQueryKeys.offline(),
    queryFn: async () => {
      const existing = await storage.getQueue()
      if (existing) {
        return existing
      }

      // Créer la queue par défaut
      await storage.setQueue(DEFAULT_QUEUE)
      return DEFAULT_QUEUE
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000 // 10 minutes
  })

  // Query pour les transferts en queue
  const {
    data: queuedTransfers = [],
    isLoading: isLoadingTransfers,
    error: transfersError,
    refetch: refetchTransfers
  } = useQuery<OfflineTransfer[], Error>({
    queryKey: [...transferQueryKeys.offline(), 'transfers'],
    queryFn: () => storage.getTransfers(),
    staleTime: 10 * 1000, // 10 secondes
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!queue
  })

  // Mutations
  const addToQueueMutation = useMutation<void, Error, CreateTransferData>({
    mutationFn: async (transferData: CreateTransferData) => {
      const transfer: OfflineTransfer = {
        id: crypto.randomUUID(),
        ...transferData,
        queueId: 'default',
        status: 'queued',
        direction: transferData.direction,
        protocol: transferData.protocol,
        priority: transferData.priority,
        bytesTransferred: 0,
        progressPercent: 0,
        retryCount: 0,
        maxRetries: transferData.maxRetries,
        autoRetry: transferData.autoRetry,
        deleteAfterTransfer: transferData.deleteAfterTransfer,
        validateIntegrity: transferData.validateIntegrity,
        syncAttempts: 0,
        queuedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await storage.addTransfer(transfer)

      // Mettre à jour les statistiques de la queue
      if (queue) {
        const updatedQueue = {
          ...queue,
          statistics: {
            ...queue.statistics,
            queuedItems: queue.statistics.queuedItems + 1
          },
          updatedAt: new Date().toISOString()
        }
        await storage.setQueue(updatedQueue)
      }

      log.info('Transfer added to offline queue', { transferId: transfer.id })
    },
    onSuccess: () => {
      refetchTransfers()
      refetchQueue()
    },
    onError: (error) => {
      log.error('Failed to add transfer to queue', { error })
    }
  })

  const removeFromQueueMutation = useMutation<void, Error, TransferId>({
    mutationFn: async (transferId: TransferId) => {
      await storage.removeTransfer(transferId)

      // Mettre à jour les statistiques
      if (queue) {
        const updatedQueue = {
          ...queue,
          statistics: {
            ...queue.statistics,
            queuedItems: Math.max(0, queue.statistics.queuedItems - 1)
          },
          updatedAt: new Date().toISOString()
        }
        await storage.setQueue(updatedQueue)
      }

      log.info('Transfer removed from offline queue', { transferId })
    },
    onSuccess: () => {
      refetchTransfers()
      refetchQueue()
    },
    onError: (error) => {
      log.error('Failed to remove transfer from queue', { error })
    }
  })

  const clearQueueMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      await storage.clear()

      // Reset des statistiques
      if (queue) {
        const updatedQueue = {
          ...queue,
          statistics: {
            queuedItems: 0,
            processedItems: queue.statistics.processedItems,
            failedItems: queue.statistics.failedItems,
            lastSyncAt: queue.statistics.lastSyncAt,
            nextSyncAt: queue.statistics.nextSyncAt
          },
          updatedAt: new Date().toISOString()
        }
        await storage.setQueue(updatedQueue)
      }

      log.info('Offline queue cleared')
    },
    onSuccess: () => {
      refetchTransfers()
      refetchQueue()
    },
    onError: (error) => {
      log.error('Failed to clear queue', { error })
    }
  })

  const updateQueueSettingsMutation = useMutation<OfflineQueue, Error, Partial<OfflineQueue>>({
    mutationFn: async (settings: Partial<OfflineQueue>) => {
      if (!queue) throw new Error('Queue not initialized')

      const updatedQueue = {
        ...queue,
        ...settings,
        updatedAt: new Date().toISOString()
      }

      await storage.setQueue(updatedQueue)
      log.info('Queue settings updated', { settings })
      return updatedQueue
    },
    onSuccess: () => {
      refetchQueue()
    },
    onError: (error) => {
      log.error('Failed to update queue settings', { error })
    }
  })

  // Synchronisation avec le serveur
  const syncQueueMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!queue || !queue.isEnabled) {
        throw new Error('Queue disabled or not initialized')
      }

      setIsSyncing(true)

      try {
        const transfers = await storage.getTransfers()
        const pendingTransfers = transfers.filter(t => t.status === 'queued')

        if (pendingTransfers.length === 0) {
          log.info('No pending transfers to sync')
          return
        }

        log.info('Starting queue sync', { pendingCount: pendingTransfers.length })

        // Traiter par batch
        const batchSize = queue.batchSize
        let processedCount = 0
        let failedCount = 0

        for (let i = 0; i < pendingTransfers.length; i += batchSize) {
          const batch = pendingTransfers.slice(i, i + batchSize)

          for (const transfer of batch) {
            try {
              // Incrémenter le compteur de tentatives
              await storage.updateTransfer(transfer.id, {
                syncAttempts: transfer.syncAttempts + 1,
                lastSyncAttempt: new Date().toISOString()
              })

              // Envoyer au serveur (API call)
              // TODO: Implémenter l'API call réelle
              await simulateSyncTransfer(transfer)

              // Marquer comme traité
              await storage.removeTransfer(transfer.id)
              processedCount++

              log.debug('Transfer synced successfully', { transferId: transfer.id })
            } catch (error) {
              // Marquer l'erreur
              await storage.updateTransfer(transfer.id, {
                syncError: error instanceof Error ? error.message : 'Unknown error',
                status: 'failed'
              })
              failedCount++

              log.warn('Transfer sync failed', { transferId: transfer.id, error })
            }
          }
        }

        // Mettre à jour les statistiques
        const updatedQueue = {
          ...queue,
          statistics: {
            ...queue.statistics,
            processedItems: queue.statistics.processedItems + processedCount,
            failedItems: queue.statistics.failedItems + failedCount,
            queuedItems: Math.max(0, queue.statistics.queuedItems - processedCount),
            lastSyncAt: new Date().toISOString(),
            nextSyncAt: new Date(Date.now() + queue.syncInterval).toISOString()
          },
          updatedAt: new Date().toISOString()
        }

        await storage.setQueue(updatedQueue)
        setLastSync(new Date())

        log.info('Queue sync completed', { processedCount, failedCount })
      } finally {
        setIsSyncing(false)
      }
    },
    onSuccess: () => {
      refetchTransfers()
      refetchQueue()
      // Invalider les listes de transferts pour voir les nouveaux transferts
      queryClient.invalidateQueries({ queryKey: transferQueryKeys.lists() })
    },
    onError: (error) => {
      log.error('Queue sync failed', { error })
      setIsSyncing(false)
    }
  })

  // Actions publiques
  const addToQueue = useCallback(async (transfer: CreateTransferData) => {
    await addToQueueMutation.mutateAsync(transfer)
  }, [addToQueueMutation])

  const removeFromQueue = useCallback(async (transferId: TransferId) => {
    await removeFromQueueMutation.mutateAsync(transferId)
  }, [removeFromQueueMutation])

  const clearQueue = useCallback(async () => {
    await clearQueueMutation.mutateAsync()
  }, [clearQueueMutation])

  const syncQueue = useCallback(async () => {
    await syncQueueMutation.mutateAsync()
  }, [syncQueueMutation])

  const updateQueueSettings = useCallback(async (settings: Partial<OfflineQueue>) => {
    await updateQueueSettingsMutation.mutateAsync(settings)
  }, [updateQueueSettingsMutation])

  const refetch = useCallback(async () => {
    await Promise.all([refetchQueue(), refetchTransfers()])
  }, [refetchQueue, refetchTransfers])

  // Auto-sync si activé
  useEffect(() => {
    if (!queue?.isEnabled || !queue.syncOnConnect) return

    const interval = setInterval(() => {
      if (!isSyncing && navigator.onLine) {
        syncQueue().catch(error => {
          log.warn('Auto-sync failed', { error })
        })
      }
    }, queue.syncInterval)

    return () => clearInterval(interval)
  }, [queue, isSyncing, syncQueue])

  // Nettoyage des transferts expirés
  useEffect(() => {
    if (!queue?.maxAge) return

    const cleanupInterval = setInterval(async () => {
      try {
        const transfers = await storage.getTransfers()
        const now = Date.now()
        const expiredTransfers = transfers.filter(t => {
          const age = now - new Date(t.createdAt).getTime()
          return age > queue.maxAge
        })

        for (const transfer of expiredTransfers) {
          await storage.removeTransfer(transfer.id)
          log.debug('Expired transfer removed', { transferId: transfer.id })
        }

        if (expiredTransfers.length > 0) {
          refetchTransfers()
          log.info('Cleanup completed', { removedCount: expiredTransfers.length })
        }
      } catch (error) {
        log.error('Cleanup failed', { error })
      }
    }, 60 * 60 * 1000) // Toutes les heures

    return () => clearInterval(cleanupInterval)
  }, [queue?.maxAge, refetchTransfers, storage])

  const isLoading = isLoadingQueue || isLoadingTransfers
  const error = queueError || transfersError

  return {
    queue: queue ?? null,
    queuedTransfers,
    isLoading,
    error,

    // Queue management
    addToQueue,
    removeFromQueue,
    clearQueue,

    // Synchronization
    syncQueue,
    isSyncing: isSyncing || syncQueueMutation.isPending,
    lastSync,

    // Configuration
    updateQueueSettings,

    refetch
  }
}

// ==================== SIMULATION ====================

async function simulateSyncTransfer(_transfer: OfflineTransfer): Promise<void> {
  // Simulation de l'API call - remplacer par la vraie implémentation
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simuler un taux de succès de 90%
      if (Math.random() > 0.1) {
        resolve()
      } else {
        reject(new Error('Simulated sync failure'))
      }
    }, 1000)
  })
}

// ==================== HELPERS ====================

export function isOfflineQueueSupported(): boolean {
  try {
    return 'indexedDB' in window && indexedDB !== null
  } catch {
    return false
  }
}

export function getQueueStorageUsage(): Promise<{ used: number, quota: number }> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    return navigator.storage.estimate().then(estimate => ({
      used: estimate.usage || 0,
      quota: estimate.quota || 0
    }))
  }

  return Promise.resolve({ used: 0, quota: 0 })
}

export function formatQueueStatistics(queue: OfflineQueue): {
  totalItems: number
  successRate: number
  lastSyncAgo?: string
} {
  const stats = queue.statistics
  const totalItems = stats.queuedItems + stats.processedItems + stats.failedItems
  const successRate = totalItems > 0 ? (stats.processedItems / totalItems) * 100 : 0

  let lastSyncAgo: string | undefined
  if (stats.lastSyncAt) {
    const ago = Date.now() - new Date(stats.lastSyncAt).getTime()
    lastSyncAgo = formatTimeAgo(ago)
  }

  return {
    totalItems,
    successRate: Math.round(successRate),
    lastSyncAgo
  }
}

function formatTimeAgo(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}j`
  if (hours > 0) return `${hours}h`
  if (minutes > 0) return `${minutes}min`
  return `${seconds}s`
}
