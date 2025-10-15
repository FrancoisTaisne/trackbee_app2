/**
 * useSiteList (nouvelle implémentation simplifiée)
 */

import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '@/core/services/api/HttpClient'
import { logger } from '@/core/utils/logger'
import type { Site, SiteId } from '@/core/types'
import type {
  SiteBundle,
  SiteFilters,
  SiteSorting,
  CreateSiteData,
  UpdateSiteData,
  UseSiteListReturn,
  GeocodeResult
} from '../types'
import { siteQueryKeys } from './useSite'

const siteListLog = logger.extend('siteList')

const defaultSorting: SiteSorting = {
  field: 'name',
  direction: 'asc'
}

const toSiteBundle = (site: Site): SiteBundle => ({
  site,
  installations: [],
  machines: [],
  campaigns: [],
  calculations: [],
  statistics: {
    totalInstallations: 0,
    activeInstallations: 0,
    totalMachines: 0,
    connectedMachines: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
    completedCalculations: 0,
    failedCalculations: 0,
    lastActivity: undefined
  }
})

const getDistanceMetric = (bundle: SiteBundle): number => {
  const metadata = (bundle.site as { metadata?: Record<string, unknown> }).metadata
  const directDistance = (metadata?.distance ?? metadata?.distanceMeters) as number | undefined
  if (typeof directDistance === 'number' && Number.isFinite(directDistance)) {
    return directDistance
  }
  return Number.POSITIVE_INFINITY
}

const sortSites = (bundles: SiteBundle[], sorting: SiteSorting): SiteBundle[] => {
  const { field, direction } = sorting
  const multiplier = direction === 'asc' ? 1 : -1

  const compareNumbers = (left: number, right: number) => {
    if (left === right) return 0
    return left < right ? -1 : 1
  }

  const compareStrings = (left: string, right: string) => {
    return left.localeCompare(right, 'fr', { sensitivity: 'base' })
  }

  return [...bundles].sort((a, b) => {
    let result: number

    switch (field) {
      case 'name':
        result = compareStrings(a.site.name ?? '', b.site.name ?? '')
        break
      case 'createdAt':
        result = compareNumbers(
          a.site.createdAt ? new Date(a.site.createdAt).getTime() : 0,
          b.site.createdAt ? new Date(b.site.createdAt).getTime() : 0
        )
        break
      case 'updatedAt':
        result = compareNumbers(
          a.site.updatedAt ? new Date(a.site.updatedAt).getTime() : 0,
          b.site.updatedAt ? new Date(b.site.updatedAt).getTime() : 0
        )
        break
      case 'installationCount':
        result = compareNumbers(a.installations.length, b.installations.length)
        break
      case 'distance':
        result = compareNumbers(getDistanceMetric(a), getDistanceMetric(b))
        break
      default:
        result = 0
    }

    return result * multiplier
  })
}

const applyFilters = (bundles: SiteBundle[], filters: SiteFilters): SiteBundle[] => {
  let filtered = bundles

  if (filters.search) {
    const term = filters.search.toLowerCase()
    filtered = filtered.filter(bundle =>
      bundle.site.name.toLowerCase().includes(term) ||
      bundle.site.description?.toLowerCase().includes(term) ||
      bundle.site.address?.toLowerCase().includes(term)
    )
  }

  if (filters.ownership && filters.ownership !== 'all') {
    filtered = filtered.filter(bundle => bundle.site.ownership === filters.ownership)
  }

  if (filters.hasInstallations !== undefined) {
    filtered = filtered.filter(bundle =>
      filters.hasInstallations ? bundle.installations.length > 0 : bundle.installations.length === 0
    )
  }

  if (filters.isPublic !== undefined) {
    filtered = filtered.filter(bundle => bundle.site.isPublic === filters.isPublic)
  }

  return filtered
}

const fetchSiteBundles = async (
  filters: SiteFilters,
  sorting: SiteSorting
): Promise<SiteBundle[]> => {
  siteListLog.debug('Fetching sites', { filters, sorting })

  try {
    const response = await httpClient.get<Site[]>('/api/sites')
    const sites = response.data ?? []

    const bundles = sites.map(toSiteBundle)
    const filtered = applyFilters(bundles, filters)
    return sortSites(filtered, sorting)
  } catch (error) {
    siteListLog.error('Failed to fetch sites', { error })
    return []
  }
}

const geocodeAddress = async (address: string): Promise<GeocodeResult[]> => {
  if (!address.trim()) return []

  try {
    const params = new URLSearchParams({ address })
    const response = await httpClient.get<Array<Record<string, unknown>>>(`/api/geocode?${params}`)
    const payload = Array.isArray(response.data) ? response.data : []

    return payload.map((item) => ({
      address: String(item.address ?? address),
      formattedAddress: String(item.formattedAddress ?? item.address ?? address),
      position: {
        lat: Number((item.position as { lat?: number })?.lat ?? (item.lat ?? 0)),
        lng: Number((item.position as { lng?: number })?.lng ?? (item.lng ?? 0)),
        accuracy: undefined,
        source: 'address'
      },
      components: {
        street: typeof item.street === 'string' ? item.street : undefined,
        city: typeof item.city === 'string' ? item.city : undefined,
        postalCode: typeof item.postalCode === 'string' ? item.postalCode : undefined,
        country: typeof item.country === 'string' ? item.country : undefined,
        region: typeof item.region === 'string' ? item.region : undefined
      },
      confidence: Number(item.confidence ?? 0)
    }))
  } catch (error) {
    siteListLog.error('Geocoding failed', { error, address })
    return []
  }
}

export function useSiteList(
  filters: SiteFilters = {},
  sorting: SiteSorting = defaultSorting
): UseSiteListReturn {
  const queryClient = useQueryClient()

  const queryKey = siteQueryKeys.list({ ...filters, sorting })

  const {
    data: sites = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: () => fetchSiteBundles(filters, sorting),
    staleTime: 60_000,
    gcTime: 5 * 60_000
  })

  const createMutation = useMutation({
    mutationFn: async (data: CreateSiteData) => {
      const response = await httpClient.post<Site>('/api/sites', data)
      return response.data!
    },
    onSuccess: (site) => {
      siteListLog.info('Site created', { siteId: site.id })
      queryClient.invalidateQueries({ queryKey: siteQueryKeys.lists() })
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: SiteId; data: UpdateSiteData }) => {
      const response = await httpClient.put<Site>(`/api/sites/${id}`, data)
      return response.data!
    },
    onSuccess: (site) => {
      siteListLog.info('Site updated', { siteId: site.id })
      queryClient.invalidateQueries({ queryKey: siteQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: siteQueryKeys.detail(site.id) })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: SiteId) => {
      await httpClient.delete(`/api/sites/${id}`)
    },
    onSuccess: (_data, id) => {
      siteListLog.info('Site deleted', { siteId: id })
      queryClient.invalidateQueries({ queryKey: siteQueryKeys.lists() })
      queryClient.removeQueries({ queryKey: siteQueryKeys.detail(id) })
    }
  })

  const handleCreate = useCallback(
    (data: CreateSiteData) => createMutation.mutateAsync(data),
    [createMutation]
  )

  const handleUpdate = useCallback(
    (id: SiteId, data: UpdateSiteData) => updateMutation.mutateAsync({ id, data }),
    [updateMutation]
  )

  const handleDelete = useCallback(
    (id: SiteId) => deleteMutation.mutateAsync(id),
    [deleteMutation]
  )

  const handleGeocode = useCallback(
    (address: string) => geocodeAddress(address),
    []
  )

  const wrappedRefetch = useCallback(async () => {
    await refetch()
  }, [refetch])

  return {
    sites,
    isLoading,
    error: error instanceof Error ? error : error ? new Error('Failed to load sites') : null,
    refetch: wrappedRefetch,
    createSite: handleCreate,
    updateSite: handleUpdate,
    deleteSite: handleDelete,
    geocodeAddress: handleGeocode
  }
}
