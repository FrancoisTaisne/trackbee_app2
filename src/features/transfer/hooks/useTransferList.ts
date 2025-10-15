// @ts-nocheck
import { useState, useMemo, useCallback } from 'react'
import { useQuery, useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { httpClient } from '@/core/services/api/HttpClient'
import { logger } from '@/core/utils/logger'
import type {
  Transfer,
  TransferId,
  CreateTransferData,
  TransferFilters,
  TransferSorting,
  TransferStatistics,
  UseTransferListReturn,
  TransferProtocol,
  TransferStatus
} from '../types'
import { transferQueryKeys, CreateTransferSchema, TransferFiltersSchema } from '../types'

const log = logger.extend('useTransferList')

// ==================== API FUNCTIONS ====================

interface TransferListParams {
  filters?: TransferFilters
  sorting?: TransferSorting
  page?: number
  limit?: number
}

interface TransferListResponse {
  transfers: Transfer[]
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}

type TransferInfiniteData = InfiniteData<TransferListResponse, number>

async function fetchTransfers(params: TransferListParams = {}): Promise<TransferListResponse> {
  const { filters = {}, sorting = { field: 'queuedAt', direction: 'desc' }, page = 1, limit = 20 } = params

  log.debug('fetchTransfers', { params })

  const searchParams = new URLSearchParams()

  // Filtres
  if (filters.machineId) searchParams.append('machineId', filters.machineId.toString())
  if (filters.campaignId) searchParams.append('campaignId', filters.campaignId.toString())
  if (filters.siteId) searchParams.append('siteId', filters.siteId.toString())
  if (filters.protocol) searchParams.append('protocol', filters.protocol)
  if (filters.direction) searchParams.append('direction', filters.direction)
  if (filters.status?.length) {
    filters.status.forEach(status => searchParams.append('status', status))
  }
  if (filters.priority?.length) {
    filters.priority.forEach(priority => searchParams.append('priority', priority.toString()))
  }
  if (filters.dateRange) {
    searchParams.append('dateFrom', filters.dateRange.from)
    searchParams.append('dateTo', filters.dateRange.to)
  }
  if (filters.search) searchParams.append('search', filters.search)

  // Tri et pagination
  searchParams.append('sortField', sorting.field)
  searchParams.append('sortDirection', sorting.direction)
  searchParams.append('page', page.toString())
  searchParams.append('limit', limit.toString())

  const response = await httpClient.get<TransferListResponse>(`/api/transfers?${searchParams}`)

  log.info('Transfers loaded', {
    count: response.transfers.length,
    total: response.pagination.total,
    hasMore: response.pagination.hasMore
  })

  return response
}

async function fetchTransferStatistics(filters: Partial<TransferFilters> = {}): Promise<TransferStatistics> {
  log.debug('fetchTransferStatistics', { filters })

  const searchParams = new URLSearchParams()
  if (filters.machineId) searchParams.append('machineId', filters.machineId.toString())
  if (filters.campaignId) searchParams.append('campaignId', filters.campaignId.toString())
  if (filters.protocol) searchParams.append('protocol', filters.protocol)

  const stats = await httpClient.get<TransferStatistics>(`/api/transfers/statistics?${searchParams}`)

  log.info('Transfer statistics loaded', { stats })
  return stats
}

async function createTransfer(data: CreateTransferData): Promise<Transfer> {
  log.debug('createTransfer', { data })

  const validated = CreateTransferSchema.parse(data)
  const transfer = await httpClient.post<Transfer>('/api/transfers', validated)

  log.info('Transfer created', { transferId: transfer.id, protocol: transfer.protocol })
  return transfer
}

async function startTransfers(transferIds: TransferId[]): Promise<void> {
  log.debug('startTransfers', { transferIds })

  await httpClient.post('/api/transfers/batch-start', { transferIds })

  log.info('Transfers started', { count: transferIds.length })
}

async function cancelTransfers(transferIds: TransferId[]): Promise<void> {
  log.debug('cancelTransfers', { transferIds })

  await httpClient.post('/api/transfers/batch-cancel', { transferIds })

  log.info('Transfers canceled', { count: transferIds.length })
}

async function retryTransfers(transferIds: TransferId[]): Promise<void> {
  log.debug('retryTransfers', { transferIds })

  await httpClient.post('/api/transfers/batch-retry', { transferIds })

  log.info('Transfers retry initiated', { count: transferIds.length })
}

async function deleteTransfers(transferIds: TransferId[]): Promise<void> {
  log.debug('deleteTransfers', { transferIds })

  await httpClient.post('/api/transfers/batch-delete', { transferIds })

  log.info('Transfers deleted', { count: transferIds.length })
}

// Queue management functions
async function pauseQueue(): Promise<void> {
  log.debug('pauseQueue')

  await httpClient.post('/api/transfers/queue/pause')

  log.info('Transfer queue paused')
}

async function resumeQueue(): Promise<void> {
  log.debug('resumeQueue')

  await httpClient.post('/api/transfers/queue/resume')

  log.info('Transfer queue resumed')
}

async function clearQueue(): Promise<void> {
  log.debug('clearQueue')

  await httpClient.post('/api/transfers/queue/clear')

  log.info('Transfer queue cleared')
}

// ==================== HOOK ====================

export function useTransferList(initialFilters: Partial<TransferFilters> = {}): UseTransferListReturn {
  const queryClient = useQueryClient()

  // État local pour filtres et tri
  const [filters, setFiltersState] = useState<TransferFilters>(() => {
    const validated = TransferFiltersSchema.parse(initialFilters)
    return validated
  })

  const [sorting, setSortingState] = useState<TransferSorting>({
    field: 'queuedAt',
    direction: 'desc'
  })

  // Query key avec dépendances
  const listQueryKey = useMemo(() => [...transferQueryKeys.lists(), { filters, sorting }] as const, [filters, sorting])

  // Query infinite pour pagination
  const {
    data,
    isLoading,
    error: transfersError,
    fetchNextPage,
    hasNextPage,
    refetch
  } = useInfiniteQuery<TransferListResponse, Error>({
    queryKey: listQueryKey,
    queryFn: ({ pageParam = 1 }) => fetchTransfers({
      filters,
      sorting,
      page: pageParam,
      limit: 20
    }),
    getNextPageParam: (lastPage, pages) => {
      return lastPage.pagination.hasMore ? pages.length + 1 : undefined
    },
    initialPageParam: 1,
    staleTime: 10 * 1000,     // 10 secondes pour liste dynamique
    gcTime: 2 * 60 * 1000,   // 2 minutes
    refetchInterval: 30 * 1000 // Refresh automatique toutes les 30s
  })

  // Query pour statistiques
  const {
    data: statistics,
    error: statisticsError
  } = useQuery({
    queryKey: transferQueryKeys.statistics(filters),
    queryFn: () => fetchTransferStatistics(filters),
    staleTime: 30 * 1000,    // 30 secondes
    gcTime: 5 * 60 * 1000    // 5 minutes
  })

  // Aplatir les résultats de pagination
  const transfers = useMemo(() => {
    return data?.pages.flatMap(page => page.transfers) || []
  }, [data])

  const hasMore = hasNextPage || false

  // Mutations
  const createMutation = useMutation<Transfer, Error, CreateTransferData>({
    mutationFn: createTransfer,
    onSuccess: (newTransfer) => {
      queryClient.setQueryData<TransferInfiniteData>(listQueryKey, (oldData) => {
        if (!oldData) {
          return oldData
        }

        const [firstPage, ...restPages] = oldData.pages
        if (!firstPage) {
          return oldData
        }

        const updatedFirstPage = {
          ...firstPage,
          transfers: [newTransfer, ...firstPage.transfers],
          pagination: {
            ...firstPage.pagination,
            total: firstPage.pagination.total + 1
          }
        }

        return {
          ...oldData,
          pages: [updatedFirstPage, ...restPages]
        }
      })

      queryClient.invalidateQueries({ queryKey: transferQueryKeys.statistics() })
      log.info('Transfer created and added to list', { transferId: newTransfer.id })
    }
  })

  const startMutation = useMutation<void, Error, TransferId[]>({
    mutationFn: startTransfers,
    onSuccess: () => {
      // Recharger la liste pour voir les statuts mis à jour
      refetch()
      queryClient.invalidateQueries({ queryKey: transferQueryKeys.statistics() })
    }
  })

  const cancelMutation = useMutation<void, Error, TransferId[]>({
    mutationFn: cancelTransfers,
    onSuccess: () => {
      refetch()
      queryClient.invalidateQueries({ queryKey: transferQueryKeys.statistics() })
    }
  })

  const retryMutation = useMutation<void, Error, TransferId[]>({
    mutationFn: retryTransfers,
    onSuccess: () => {
      refetch()
      queryClient.invalidateQueries({ queryKey: transferQueryKeys.statistics() })
    }
  })

  const deleteMutation = useMutation<void, Error, TransferId[]>({
    mutationFn: deleteTransfers,
    onSuccess: (_, deletedIds) => {
      queryClient.setQueryData<TransferInfiniteData>(listQueryKey, (oldData) => {
        if (!oldData) {
          return oldData
        }

        const updatedPages = oldData.pages.map((page) => {
          const filteredTransfers = page.transfers.filter(transfer => !deletedIds.includes(transfer.id))

          const removedCount = page.transfers.length - filteredTransfers.length

          return {
            ...page,
            transfers: filteredTransfers,
            pagination: {
              ...page.pagination,
              total: page.pagination.total - removedCount
            }
          }
        })

        return {
          ...oldData,
          pages: updatedPages
        }
      })

      deletedIds.forEach(id => {
        queryClient.removeQueries({ queryKey: transferQueryKeys.detail(id) })
      })

      queryClient.invalidateQueries({ queryKey: transferQueryKeys.statistics() })

      log.info('Transfers deleted from list', { count: deletedIds.length })
    }
  })

  const pauseQueueMutation = useMutation<void, Error, void>({
    mutationFn: pauseQueue,
    onSuccess: () => {
      refetch()
    }
  })

  const resumeQueueMutation = useMutation<void, Error, void>({
    mutationFn: resumeQueue,
    onSuccess: () => {
      refetch()
    }
  })

  const clearQueueMutation = useMutation<void, Error, void>({
    mutationFn: clearQueue,
    onSuccess: () => {
      refetch()
      queryClient.invalidateQueries({ queryKey: transferQueryKeys.statistics() })
    }
  })

  // Actions publiques
  const setFilters = useCallback((newFilters: Partial<TransferFilters>) => {
    const validated = TransferFiltersSchema.parse({ ...filters, ...newFilters })
    setFiltersState(validated)
  }, [filters])

  const setSorting = useCallback((newSorting: TransferSorting) => {
    setSortingState(newSorting)
  }, [])

  const loadMore = useCallback(async () => {
    if (hasMore && !isLoading) {
      await fetchNextPage()
    }
  }, [hasMore, isLoading, fetchNextPage])

  // Gestion des erreurs
  const mutationError = (
    createMutation.error ??
    startMutation.error ??
    cancelMutation.error ??
    retryMutation.error ??
    deleteMutation.error ??
    pauseQueueMutation.error ??
    resumeQueueMutation.error ??
    clearQueueMutation.error
  )

  const finalError = transfersError ?? statisticsError ?? mutationError ?? null

  return {
    // Données
    transfers,
    statistics: statistics || {
      totalTransfers: 0,
      completedTransfers: 0,
      failedTransfers: 0,
      canceledTransfers: 0,
      totalBytes: 0,
      transferredBytes: 0,
      averageSpeed: 0,
      totalTime: 0,
      successRate: 0
    },
    isLoading: isLoading || createMutation.isPending,
    error: finalError,

    // Pagination
    hasMore,
    loadMore,

    // Actions
    createTransfer: createMutation.mutateAsync,
    startTransfers: startMutation.mutateAsync,
    cancelTransfers: cancelMutation.mutateAsync,
    retryTransfers: retryMutation.mutateAsync,
    deleteTransfers: deleteMutation.mutateAsync,

    // Queue management
    pauseQueue: pauseQueueMutation.mutateAsync,
    resumeQueue: resumeQueueMutation.mutateAsync,
    clearQueue: clearQueueMutation.mutateAsync,

    // Filtres et tri
    filters,
    setFilters,
    sorting,
    setSorting,

    // Utilitaires
    refetch: async () => {
      await refetch()
    }
  }
}

// ==================== HELPERS ====================

export function getDefaultFilters(
  machineId?: number,
  campaignId?: number,
  protocol?: TransferProtocol
): TransferFilters {
  const base: TransferFilters = {}

  if (machineId !== undefined) {
    base.machineId = machineId
  }

  if (campaignId !== undefined) {
    base.campaignId = campaignId
  }

  if (protocol) {
    base.protocol = protocol
  }

  return base
}

export function buildSearchQuery(search: string): Partial<TransferFilters> {
  const trimmed = search.trim()
  if (!trimmed) {
    return {}
  }

  return { search: trimmed }
}

export function filterTransfersByStatus(
  transfers: Transfer[],
  statuses: TransferStatus[]
): Transfer[] {
  if (!statuses.length) {
    return transfers
  }

  const statusSet = new Set(statuses)
  return transfers.filter(transfer => statusSet.has(transfer.status))
}

export function filterTransfersByProtocol(
  transfers: Transfer[],
  protocols: TransferProtocol[]
): Transfer[] {
  if (!protocols.length) {
    return transfers
  }

  const protocolSet = new Set(protocols)
  return transfers.filter(transfer => protocolSet.has(transfer.protocol))
}

export function groupTransfersByProtocol(transfers: Transfer[]): Partial<Record<TransferProtocol, Transfer[]>> {
  return transfers.reduce<Partial<Record<TransferProtocol, Transfer[]>>>((groups, transfer) => {
    const bucket = groups[transfer.protocol] ?? []
    bucket.push(transfer)
    groups[transfer.protocol] = bucket
    return groups
  }, {})
}

export function groupTransfersByStatus(transfers: Transfer[]): Partial<Record<TransferStatus, Transfer[]>> {
  return transfers.reduce<Partial<Record<TransferStatus, Transfer[]>>>((groups, transfer) => {
    const bucket = groups[transfer.status] ?? []
    bucket.push(transfer)
    groups[transfer.status] = bucket
    return groups
  }, {})
}

export function sortTransfers(
  transfers: Transfer[],
  sorting: TransferSorting
): Transfer[] {
  const { field, direction } = sorting
  const multiplier = direction === 'asc' ? 1 : -1

  return [...transfers].sort((a, b) => {
    const rawA = a[field]
    const rawB = b[field]

    if (field === 'priority' || field === 'fileSize') {
      const valueA = Number(rawA ?? 0)
      const valueB = Number(rawB ?? 0)
      if (valueA === valueB) {
        return 0
      }
      return valueA < valueB ? -multiplier : multiplier
    }

    if (field === 'status') {
      const statusOrder: Record<TransferStatus, number> = {
        queued: 0,
        connecting: 1,
        transferring: 2,
        completed: 3,
        failed: 4,
        canceled: 5
      }
      const orderA = statusOrder[rawA as TransferStatus] ?? 0
      const orderB = statusOrder[rawB as TransferStatus] ?? 0
      if (orderA === orderB) {
        return 0
      }
      return orderA < orderB ? -multiplier : multiplier
    }

    if (field === 'fileName') {
      const valueA = String(rawA ?? '').toLowerCase()
      const valueB = String(rawB ?? '').toLowerCase()
      if (valueA === valueB) {
        return 0
      }
      return valueA < valueB ? -multiplier : multiplier
    }

    if (field === 'queuedAt' || field === 'startedAt' || field === 'completedAt') {
      const valueA = rawA ? new Date(rawA as string).getTime() : 0
      const valueB = rawB ? new Date(rawB as string).getTime() : 0
      if (valueA === valueB) {
        return 0
      }
      return valueA < valueB ? -multiplier : multiplier
    }

    const valueA = String(rawA ?? '')
    const valueB = String(rawB ?? '')
    if (valueA === valueB) {
      return 0
    }
    return valueA < valueB ? -multiplier : multiplier
  })
}

export function calculateQueueStats(transfers: Transfer[]): {
  queued: number
  active: number
  completed: number
  failed: number
  totalSize: number
} {
  return {
    queued: transfers.filter(t => t.status === 'queued').length,
    active: transfers.filter(t => ['connecting', 'transferring'].includes(t.status)).length,
    completed: transfers.filter(t => t.status === 'completed').length,
    failed: transfers.filter(t => t.status === 'failed').length,
    totalSize: transfers.reduce((sum, t) => sum + (t.totalBytes ?? 0), 0)
  }
}

export function getActiveTransfers(transfers: Transfer[]): Transfer[] {
  return transfers.filter(t => ['connecting', 'transferring'].includes(t.status))
}

export function getFailedTransfers(transfers: Transfer[]): Transfer[] {
  return transfers.filter(t => t.status === 'failed')
}

export function getRetryableTransfers(transfers: Transfer[]): Transfer[] {
  return transfers.filter(t => t.status === 'failed' && t.retryCount < t.maxRetries)
}

