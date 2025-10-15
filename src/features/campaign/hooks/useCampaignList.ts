/**
 * Campaign List Hook
 * Hook pour la gestion de listes de campagnes avec filtres et pagination
 */

import { useState, useMemo, useCallback } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { httpClient } from '@/core/services/api/HttpClient'
import { logger } from '@/core/utils/logger'
import type {
  Campaign, CampaignId, CreateCampaignData, CampaignFilters, CampaignSorting,
  UseCampaignListReturn
} from '../types'
import { campaignQueryKeys, CreateCampaignSchema, CampaignFiltersSchema } from '../types'

const log = logger.extend('campaign')

// ==================== API FUNCTIONS ====================

interface CampaignListParams {
  filters?: CampaignFilters
  sorting?: CampaignSorting
  page?: number
  limit?: number
}

interface CampaignListResponse {
  campaigns: Campaign[]
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}

async function fetchCampaigns(params: CampaignListParams = {}): Promise<CampaignListResponse> {
  const { filters = {}, sorting = { field: 'createdAt', direction: 'desc' }, page = 1, limit = 20 } = params

  log.debug('ðŸ”„ Fetching campaigns from IndexedDB...', { params })

  try {
    // Import du service centralisÃ© pour accÃ¨s aux donnÃ©es locales
    const { DataService } = await import('@/core/services/data/DataService')

    // RÃ©cupÃ©rer toutes les campagnes depuis IndexedDB
    const allCampaigns = await DataService.getAllCampaigns()

    // Appliquer les filtres cÃ´tÃ© client
    let filteredCampaigns = allCampaigns

    // Filtrage par site
    if (filters.siteId) {
      filteredCampaigns = filteredCampaigns.filter(campaign =>
        campaign.siteId === filters.siteId
      )
    }

    // Filtrage par machine
    if (filters.machineId) {
      filteredCampaigns = filteredCampaigns.filter(campaign =>
        campaign.machineId === filters.machineId
      )
    }

    // Filtrage par statut
    if (filters.status?.length) {
      filteredCampaigns = filteredCampaigns.filter(campaign =>
        filters.status!.includes(campaign.status)
      )
    }

    // Filtrage par type
    if (filters.type) {
      filteredCampaigns = filteredCampaigns.filter(campaign =>
        campaign.type === filters.type
      )
    }

    // Filtrage par recherche textuelle
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filteredCampaigns = filteredCampaigns.filter(campaign =>
        campaign.name?.toLowerCase().includes(searchLower) ||
        campaign.description?.toLowerCase().includes(searchLower)
      )
    }

    // Tri
    const sortedCampaigns = sortCampaigns(filteredCampaigns, sorting)

    // Pagination cÃ´tÃ© client
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const campaigns = sortedCampaigns.slice(startIndex, endIndex)

    const response: CampaignListResponse = {
      campaigns,
      pagination: {
        page,
        limit,
        total: filteredCampaigns.length,
        hasMore: endIndex < filteredCampaigns.length
      }
    }

    log.info('âœ… Campaigns loaded from IndexedDB', {
      count: campaigns.length,
      total: response.pagination.total,
      hasMore: response.pagination.hasMore
    })

    return response

  } catch (error) {
    log.error('âŒ Failed to fetch campaigns from IndexedDB', { error })

    // Fallback: essayer de rÃ©cupÃ©rer depuis l'API si la DB locale Ã©choue
    log.warn('ðŸ”„ Falling back to API for campaigns...')

    try {
      const searchParams = new URLSearchParams()

      // Filtres
      if (filters.siteId) searchParams.append('siteId', filters.siteId.toString())
      if (filters.machineId) searchParams.append('machineId', filters.machineId.toString())
      if (filters.installationId) searchParams.append('installationId', filters.installationId.toString())
      if (filters.type) searchParams.append('type', filters.type)
      if (filters.status?.length) {
        filters.status.forEach(status => searchParams.append('status', status))
      }
      if (filters.dateRange) {
        searchParams.append('dateFrom', filters.dateRange.from)
        searchParams.append('dateTo', filters.dateRange.to)
      }
      if (filters.tags?.length) {
        filters.tags.forEach(tag => searchParams.append('tags', tag))
      }
      if (filters.search) searchParams.append('search', filters.search)

      // Tri et pagination
      searchParams.append('sortField', sorting.field)
      searchParams.append('sortDirection', sorting.direction)
      searchParams.append('page', page.toString())
      searchParams.append('limit', limit.toString())

      const response = await httpClient.get<CampaignListResponse>(`/api/campaigns?${searchParams}`)
      const data = response.data!

      log.warn('âš ï¸ Campaigns loaded from API fallback', {
        count: data.campaigns.length,
        total: data.pagination.total,
        hasMore: data.pagination.hasMore
      })

      return data

    } catch (apiError) {
      log.error('âŒ Both IndexedDB and API failed for campaigns', { apiError })

      // Retourner une rÃ©ponse vide en cas d'Ã©chec total
      return {
        campaigns: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          hasMore: false
        }
      }
    }
  }
}

async function createCampaign(data: CreateCampaignData): Promise<Campaign> {
  log.debug('createCampaign', { data })

  const validated = CreateCampaignSchema.parse(data)
  const response = await httpClient.post<Campaign>('/api/campaigns', validated)
  const campaign = response.data!

  log.info('Campaign created', { campaignId: campaign.id, type: campaign.type })
  return campaign
}

async function duplicateCampaign(campaignId: CampaignId): Promise<Campaign> {
  log.debug('duplicateCampaign', { campaignId })

  const response = await httpClient.post<Campaign>(`/api/campaigns/${campaignId}/duplicate`)
  const campaign = response.data!

  log.info('Campaign duplicated', { originalId: campaignId, newId: campaign.id })
  return campaign
}

async function deleteCampaigns(campaignIds: CampaignId[]): Promise<void> {
  log.debug('deleteCampaigns', { campaignIds })

  await httpClient.post('/api/campaigns/batch-delete', { campaignIds })

  log.info('Campaigns deleted', { count: campaignIds.length })
}

// ==================== HOOK ====================

export function useCampaignList(initialFilters: Partial<CampaignFilters> = {}): UseCampaignListReturn {
  const queryClient = useQueryClient()

  // Ã‰tat local pour filtres et tri
  const [filters, setFiltersState] = useState<CampaignFilters>(() => {
    const validated = CampaignFiltersSchema.parse(initialFilters)
    return validated
  })

  const [sorting, setSortingState] = useState<CampaignSorting>({
    field: 'createdAt',
    direction: 'desc'
  })

  // Query key avec dÃ©pendances
  const queryKey = useMemo(() => [...campaignQueryKeys.list(filters), { sorting }] as const, [filters, sorting])

  // Query infinite pour pagination
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    refetch
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = 1 }) => fetchCampaigns({
      filters,
      sorting,
      page: pageParam,
      limit: 20
    }),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000     // 5 minutes
  })

  // Aplatir les rÃ©sultats de pagination
  const campaigns = useMemo(() => {
    return data?.pages.flatMap(page => page.campaigns) || []
  }, [data])

  const hasMore = hasNextPage || false

  // Mutations
  const createMutation = useMutation({
    mutationFn: createCampaign,
    onSuccess: (newCampaign) => {
      // Ajouter au dÃ©but de la liste actuelle
      queryClient.setQueryData<InfiniteData<CampaignListResponse>>(queryKey, (oldData) => {
        if (!oldData?.pages?.length) return oldData

        const [firstPage, ...restPages] = oldData.pages as CampaignListResponse[]
        if (!firstPage) return oldData

        const updatedFirstPage: CampaignListResponse = {
          ...firstPage,
          campaigns: [newCampaign, ...firstPage.campaigns],
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

      // Invalider aussi les statistiques
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.statistics() })

      log.info('Campaign created and added to list', { campaignId: newCampaign.id })
    }
  })

  const duplicateMutation = useMutation({
    mutationFn: duplicateCampaign,
    onSuccess: () => {
      // Recharger la liste pour inclure le duplicata
      refetch()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCampaigns,
    onSuccess: (_, deletedIds) => {
      // Retirer les campagnes supprimÃ©es du cache
      queryClient.setQueryData<InfiniteData<CampaignListResponse>>(queryKey, (oldData) => {
        if (!oldData?.pages) return oldData

        const updatedPages = oldData.pages.map((page) => ({
          ...page,
          campaigns: page.campaigns.filter(c => !deletedIds.includes(c.id)),
          pagination: {
            ...page.pagination,
            total: Math.max(0, page.pagination.total - deletedIds.length)
          }
        }))

        return {
          ...oldData,
          pages: updatedPages
        }
      })

      // Nettoyer les caches des campagnes supprimÃ©es
      deletedIds.forEach(id => {
        queryClient.removeQueries({ queryKey: campaignQueryKeys.detail(id) })
      })

      // Invalider les statistiques
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.statistics() })

      log.info('Campaigns deleted from list', { count: deletedIds.length })
    }
  })

  // Actions publiques
  const setFilters = useCallback((newFilters: Partial<CampaignFilters>) => {
    const validated = CampaignFiltersSchema.parse({ ...filters, ...newFilters })
    setFiltersState(validated)
  }, [filters])

  const setSorting = useCallback((newSorting: CampaignSorting) => {
    setSortingState(newSorting)
  }, [])

  const loadMore = useCallback(async () => {
    if (hasMore && !isLoading) {
      await fetchNextPage()
    }
  }, [hasMore, isLoading, fetchNextPage])

  // Gestion des erreurs
  const mutationError = createMutation.error || duplicateMutation.error || deleteMutation.error
  const finalError = error || mutationError

  return {
    // DonnÃ©es
    campaigns,
    isLoading: isLoading || createMutation.isPending,
    error: finalError,

    // Pagination
    hasMore,
    loadMore,

    // Actions
    createCampaign: createMutation.mutateAsync,
    duplicateCampaign: duplicateMutation.mutateAsync,
    deleteCampaigns: deleteMutation.mutateAsync,

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
  siteId?: number,
  machineId?: number,
  installationId?: number
): CampaignFilters {
  return {
    ...(siteId && { siteId }),
    ...(machineId && { machineId }),
    ...(installationId && { installationId })
  }
}

export function buildSearchQuery(search: string): Partial<CampaignFilters> {
  if (!search.trim()) return {}

  return {
    search: search.trim()
  }
}

export function filterCampaignsByStatus(
  campaigns: Campaign[],
  statuses: string[]
): Campaign[] {
  if (!statuses.length) return campaigns
  return campaigns.filter(campaign => statuses.includes(campaign.status))
}

export function groupCampaignsByType(campaigns: Campaign[]): Record<string, Campaign[]> {
  return campaigns.reduce((groups, campaign) => {
    const type = campaign.type
    if (!groups[type]) groups[type] = []
    groups[type].push(campaign)
    return groups
  }, {} as Record<string, Campaign[]>)
}

export function sortCampaigns(
  campaigns: Campaign[],
  sorting: CampaignSorting
): Campaign[] {
  const { field, direction } = sorting
  const multiplier = direction === 'asc' ? 1 : -1

  return [...campaigns].sort((a, b) => {
    if (field === 'priority') {
      const aPriority = typeof a.priority === 'number' ? a.priority : Number(a.priority ?? 0)
      const bPriority = typeof b.priority === 'number' ? b.priority : Number(b.priority ?? 0)
      return (aPriority - bPriority) * multiplier
    }

    if (field === 'createdAt' || field === 'scheduledAt') {
      const aValue = a[field]
      const bValue = b[field]

      const aTime = typeof aValue === 'string' || aValue instanceof Date
        ? new Date(aValue).getTime()
        : 0
      const bTime = typeof bValue === 'string' || bValue instanceof Date
        ? new Date(bValue).getTime()
        : 0

      return (aTime - bTime) * multiplier
    }

    const aText = typeof a[field] === 'string' ? (a[field] as string).toLowerCase() : String(a[field] ?? '')
    const bText = typeof b[field] === 'string' ? (b[field] as string).toLowerCase() : String(b[field] ?? '')

    if (aText < bText) return -1 * multiplier
    if (aText > bText) return 1 * multiplier
    return 0
  })
}




