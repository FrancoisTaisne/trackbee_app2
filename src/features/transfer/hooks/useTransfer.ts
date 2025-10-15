// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '@/core/services/api/HttpClient'
import { logger } from '@/core/utils/logger'
import type {
  TransferId,
  Transfer,
  TransferBundle,
  UpdateTransferData,
  UseTransferReturn,
  DeviceInfo,
  CampaignInfo,
  TransferStatus,
  TransferPriority
} from '../types'
import { transferQueryKeys, UpdateTransferSchema } from '../types'

const log = logger.extend('useTransfer')

// ==================== API FUNCTIONS ====================

async function fetchTransferBundle(transferId: TransferId): Promise<TransferBundle> {
  log.debug('fetchTransferBundle', { transferId })

  const transfer = await httpClient.get<Transfer>(`/api/transfers/${transferId}`)
  const relatedTransfers = await httpClient.get<Transfer[]>(`/api/transfers/${transferId}/related`)

  // Récupérer les informations contextuelles
  let deviceInfo: DeviceInfo | undefined
  let campaignInfo: CampaignInfo | undefined

  try {
    if (transfer.machineId) {
      deviceInfo = await httpClient.get<DeviceInfo>(`/api/devices/${transfer.machineId}/info`)
    }
  } catch (error) {
    log.warn('Failed to fetch device info', { machineId: transfer.machineId, error })
  }

  try {
    if (transfer.campaignId) {
      campaignInfo = await httpClient.get<CampaignInfo>(`/api/campaigns/${transfer.campaignId}/info`)
    }
  } catch (error) {
    log.warn('Failed to fetch campaign info', { campaignId: transfer.campaignId, error })
  }

  // Calculer les statistiques
  const allTransfers = [transfer, ...relatedTransfers]
  const statistics = {
    totalTransfers: allTransfers.length,
    completedTransfers: allTransfers.filter(t => t.status === 'completed').length,
    failedTransfers: allTransfers.filter(t => t.status === 'failed').length,
    canceledTransfers: allTransfers.filter(t => t.status === 'canceled').length,
    totalBytes: allTransfers.reduce((sum, t) => sum + (t.totalBytes || 0), 0),
    transferredBytes: allTransfers.reduce((sum, t) => sum + t.bytesTransferred, 0),
    averageSpeed: calculateAverageSpeed(allTransfers),
    totalTime: calculateTotalTime(allTransfers),
    successRate: calculateSuccessRate(allTransfers),
    lastTransferAt: getLastTransferTime(allTransfers)
  }

  const bundle: TransferBundle = {
    transfer,
    relatedTransfers,
    deviceInfo,
    campaignInfo,
    statistics
  }

  log.info('Transfer bundle loaded', {
    transferId,
    relatedCount: relatedTransfers.length,
    status: transfer.status,
    progress: transfer.progressPercent
  })

  return bundle
}

async function updateTransfer(transferId: TransferId, data: UpdateTransferData): Promise<Transfer> {
  log.debug('updateTransfer', { transferId, data })

  const validated = UpdateTransferSchema.parse(data)
  const updated = await httpClient.put<Transfer>(`/api/transfers/${transferId}`, validated)

  log.info('Transfer updated', { transferId, updated })
  return updated
}

async function deleteTransfer(transferId: TransferId): Promise<void> {
  log.debug('deleteTransfer', { transferId })

  await httpClient.delete(`/api/transfers/${transferId}`)

  log.info('Transfer deleted', { transferId })
}

async function startTransfer(transferId: TransferId): Promise<void> {
  log.debug('startTransfer', { transferId })

  await httpClient.post(`/api/transfers/${transferId}/start`)

  log.info('Transfer started', { transferId })
}

async function pauseTransfer(transferId: TransferId): Promise<void> {
  log.debug('pauseTransfer', { transferId })

  await httpClient.post(`/api/transfers/${transferId}/pause`)

  log.info('Transfer paused', { transferId })
}

async function resumeTransfer(transferId: TransferId): Promise<void> {
  log.debug('resumeTransfer', { transferId })

  await httpClient.post(`/api/transfers/${transferId}/resume`)

  log.info('Transfer resumed', { transferId })
}

async function cancelTransfer(transferId: TransferId): Promise<void> {
  log.debug('cancelTransfer', { transferId })

  await httpClient.post(`/api/transfers/${transferId}/cancel`)

  log.info('Transfer canceled', { transferId })
}

async function retryTransfer(transferId: TransferId): Promise<void> {
  log.debug('retryTransfer', { transferId })

  await httpClient.post(`/api/transfers/${transferId}/retry`)

  log.info('Transfer retry initiated', { transferId })
}

// ==================== HOOK ====================

export function useTransfer(transferId: TransferId): UseTransferReturn {
  const queryClient = useQueryClient()

  // Query principale pour récupérer le bundle complet
  const {
    data: bundle,
    isLoading,
    error: queryError,
    refetch
  } = useQuery<TransferBundle, Error>({
    queryKey: transferQueryKeys.bundle(transferId),
    queryFn: () => fetchTransferBundle(transferId),
    staleTime: 5 * 1000,      // 5 secondes pour transfers actifs
    gcTime: 30 * 1000,       // 30 secondes
    refetchInterval: (data) => {
      // Polling automatique pour les transferts actifs
      const transfer = data?.transfer
      if (transfer && ['connecting', 'transferring'].includes(transfer.status)) {
        return 2000 // 2 secondes pour transferts actifs
      }
      return false // Pas de polling pour transferts inactifs
    },
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('404')) {
        return false // Ne pas retry si transfert n'existe pas
      }
      return failureCount < 3
    }
  })

  // Mutations pour actions sur le transfert
  const updateMutation = useMutation<Transfer, Error, UpdateTransferData>({
    mutationFn: (data: UpdateTransferData) => updateTransfer(transferId, data),
    onSuccess: (updatedTransfer) => {
      // Mise à jour du cache avec le transfert modifié
      queryClient.setQueryData(transferQueryKeys.bundle(transferId), (oldBundle: TransferBundle | undefined) =>
        oldBundle ? { ...oldBundle, transfer: updatedTransfer } : undefined
      )

      // Invalidation des listes de transferts
      queryClient.invalidateQueries({ queryKey: transferQueryKeys.lists() })
    }
  })

  const deleteMutation = useMutation<void, Error, void>({
    mutationFn: () => deleteTransfer(transferId),
    onSuccess: () => {
      // Suppression du cache
      queryClient.removeQueries({ queryKey: transferQueryKeys.detail(transferId) })

      // Invalidation des listes
      queryClient.invalidateQueries({ queryKey: transferQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: transferQueryKeys.statistics() })
    }
  })

  const startMutation = useMutation<void, Error, void>({
    mutationFn: () => startTransfer(transferId),
    onSuccess: () => {
      // Invalider pour recharger le statut
      queryClient.invalidateQueries({ queryKey: transferQueryKeys.bundle(transferId) })
      queryClient.invalidateQueries({ queryKey: transferQueryKeys.lists() })
    }
  })

  const pauseMutation = useMutation<void, Error, void>({
    mutationFn: () => pauseTransfer(transferId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transferQueryKeys.bundle(transferId) })
      queryClient.invalidateQueries({ queryKey: transferQueryKeys.lists() })
    }
  })

  const resumeMutation = useMutation<void, Error, void>({
    mutationFn: () => resumeTransfer(transferId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transferQueryKeys.bundle(transferId) })
      queryClient.invalidateQueries({ queryKey: transferQueryKeys.lists() })
    }
  })

  const cancelMutation = useMutation<void, Error, void>({
    mutationFn: () => cancelTransfer(transferId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transferQueryKeys.bundle(transferId) })
      queryClient.invalidateQueries({ queryKey: transferQueryKeys.lists() })
    }
  })

  const retryMutation = useMutation<void, Error, void>({
    mutationFn: () => retryTransfer(transferId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transferQueryKeys.bundle(transferId) })
      queryClient.invalidateQueries({ queryKey: transferQueryKeys.lists() })
    }
  })

  // Gestion des erreurs
  const error = queryError ||
                updateMutation.error ||
                deleteMutation.error ||
                startMutation.error ||
                pauseMutation.error ||
                resumeMutation.error ||
                cancelMutation.error ||
                retryMutation.error

  // Extraction des données du bundle
  const transfer = bundle?.transfer || null

  return {
    // Données
    transfer,
    isLoading,
    error,

    // Actions
    startTransfer: startMutation.mutateAsync,
    pauseTransfer: pauseMutation.mutateAsync,
    resumeTransfer: resumeMutation.mutateAsync,
    cancelTransfer: cancelMutation.mutateAsync,
    retryTransfer: retryMutation.mutateAsync,
    updateTransfer: updateMutation.mutateAsync,
    deleteTransfer: deleteMutation.mutateAsync,

    // Utilitaires
    refetch: async () => {
      await refetch()
    }
  }
}

// ==================== HELPERS ====================

function calculateAverageSpeed(transfers: Transfer[]): number {
  const completedTransfers = transfers.filter(t =>
    t.status === 'completed' && t.startedAt && t.completedAt
  )

  if (completedTransfers.length === 0) return 0

  const totalSpeed = completedTransfers.reduce((sum, transfer) => {
    const startTime = new Date(transfer.startedAt!).getTime()
    const endTime = new Date(transfer.completedAt!).getTime()
    const duration = (endTime - startTime) / 1000 // en secondes

    if (duration > 0 && transfer.totalBytes) {
      return sum + (transfer.totalBytes / duration)
    }
    return sum
  }, 0)

  return Math.round(totalSpeed / completedTransfers.length)
}

function calculateTotalTime(transfers: Transfer[]): number {
  return transfers.reduce((total, transfer) => {
    if (transfer.startedAt && transfer.completedAt) {
      const startTime = new Date(transfer.startedAt).getTime()
      const endTime = new Date(transfer.completedAt).getTime()
      return total + ((endTime - startTime) / 1000)
    }
    return total
  }, 0)
}

function calculateSuccessRate(transfers: Transfer[]): number {
  if (transfers.length === 0) return 0

  const completedTransfers = transfers.filter(t => t.status === 'completed').length
  return Math.round((completedTransfers / transfers.length) * 100)
}

function getLastTransferTime(transfers: Transfer[]): string | undefined {
  const times = transfers
    .map(t => t.completedAt || t.startedAt)
    .filter(Boolean)
    .map(time => new Date(time!).getTime())

  if (times.length === 0) return undefined

  return new Date(Math.max(...times)).toISOString()
}

export function getTransferProgress(transfer: Transfer): number {
  if (transfer.status === 'completed') return 100
  if (transfer.status === 'failed' || transfer.status === 'canceled') return 0

  return Math.min(100, Math.max(0, transfer.progressPercent))
}

export function getTransferSpeed(transfer: Transfer): number {
  return transfer.transferRate || 0
}

export function getEstimatedTimeRemaining(transfer: Transfer): number | null {
  if (!transfer.estimatedTimeRemaining) return null
  if (transfer.status !== 'transferring') return null

  return Math.max(0, transfer.estimatedTimeRemaining)
}

export function formatTransferSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

export function formatTransferSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s'

  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  let speed = bytesPerSecond
  let unitIndex = 0

  while (speed >= 1024 && unitIndex < units.length - 1) {
    speed /= 1024
    unitIndex++
  }

  return `${speed.toFixed(1)} ${units[unitIndex]}`
}

export function formatTransferTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)

  return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`
}

export function canStartTransfer(transfer: Transfer): boolean {
  return transfer.status === 'queued'
}

export function canPauseTransfer(transfer: Transfer): boolean {
  return ['connecting', 'transferring'].includes(transfer.status)
}

export function canResumeTransfer(transfer: Transfer): boolean {
  return transfer.status === 'queued' // Dans notre système, pause = remise en queue
}

export function canCancelTransfer(transfer: Transfer): boolean {
  return ['queued', 'connecting', 'transferring'].includes(transfer.status)
}

export function canRetryTransfer(transfer: Transfer): boolean {
  return transfer.status === 'failed' && transfer.retryCount < transfer.maxRetries
}

export function canDeleteTransfer(transfer: Transfer): boolean {
  return ['completed', 'failed', 'canceled'].includes(transfer.status)
}

export function getTransferStatusColor(status: TransferStatus): string {
  switch (status) {
    case 'queued': return 'blue'
    case 'connecting': return 'yellow'
    case 'transferring': return 'blue'
    case 'completed': return 'green'
    case 'failed': return 'red'
    case 'canceled': return 'gray'
    default: return 'gray'
  }
}

export function getTransferPriorityColor(priority: TransferPriority): string {
  if (priority <= 2) return 'gray'
  if (priority === 3) return 'green'
  if (priority === 4) return 'orange'
  return 'red'
}

