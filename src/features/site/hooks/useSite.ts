/**
 * useSite Hook - Gestion principale des sites géographiques
 * Interface unifiée pour CRUD sites, installations et géocodage
 */

import { useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEventBus } from '@/core/orchestrator/EventBus'
import { httpClient } from '@/core/services/api/HttpClient'
import { logger } from '@/core/utils/logger'
import { AppError } from '@/core/types/common'
import type { Site, Installation, Machine, Campaign, Calculation, SiteId, InstallationId } from '@/core/types'
import type {
  SiteBundle,
  SiteStatistics,
  UpdateSiteData,
  CreateInstallationData,
  UpdateInstallationData,
  SiteExportData,
  UseSiteDetailReturn,
  SiteError
} from '../types'

// ==================== LOGGER SETUP ====================

const siteLog = {
  trace: (msg: string, data?: unknown) => logger.trace('site', msg, data),
  debug: (msg: string, data?: unknown) => logger.debug('site', msg, data),
  info: (msg: string, data?: unknown) => logger.info('site', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('site', msg, data),
  error: (msg: string, data?: unknown) => logger.error('site', msg, data)
}

// ==================== QUERY KEYS ====================

export const siteQueryKeys = {
  all: ['sites'] as const,
  lists: () => [...siteQueryKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...siteQueryKeys.lists(), filters] as const,
  details: () => [...siteQueryKeys.all, 'detail'] as const,
  detail: (id: SiteId) => [...siteQueryKeys.details(), id] as const,
  bundles: () => [...siteQueryKeys.all, 'bundle'] as const,
  bundle: (id: SiteId) => [...siteQueryKeys.bundles(), id] as const,
  installations: (siteId: SiteId) => [...siteQueryKeys.detail(siteId), 'installations'] as const,
  campaigns: (siteId: SiteId) => [...siteQueryKeys.detail(siteId), 'campaigns'] as const,
  calculations: (siteId: SiteId) => [...siteQueryKeys.detail(siteId), 'calculations'] as const,
  statistics: (siteId: SiteId) => [...siteQueryKeys.detail(siteId), 'statistics'] as const,
  geocode: (address: string) => ['geocode', address] as const
}

// ==================== API FUNCTIONS ====================

/**
 * Récupère un site par ID depuis IndexedDB
 */
const fetchSite = async (id: SiteId): Promise<Site> => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id
  siteLog.debug('🔍 Fetching site from IndexedDB', { id, numericId, idType: typeof id })

  try {
    const { DataService } = await import('@/core/services/data/DataService')
    const { database } = await import('@/core/database/schema')

    // 🔍 DEBUG: Log all sites to see what we have
    const allSites = await database.sites.toArray()
    siteLog.debug('📊 All sites in IndexedDB:', {
      count: allSites.length,
      siteIds: allSites.map(s => s.id),
      lookingFor: numericId
    })

    const site = await DataService.getSiteById(numericId)

    if (!site) {
      siteLog.error('❌ Site not found in IndexedDB', {
        id,
        numericId,
        availableSites: allSites.length,
        availableIds: allSites.map(s => s.id)
      })
      throw new AppError(`Site not found: ${id}`, 'SITE_NOT_FOUND')
    }

    siteLog.info('✅ Site fetched from IndexedDB', { siteId: site.id, siteName: site.name })
    return site as Site
  } catch (error) {
    siteLog.error('❌ Failed to fetch site from IndexedDB', { id, numericId, error })
    throw error
  }
}

/**
 * Récupère un bundle complet (site + relations) depuis IndexedDB
 */
const fetchSiteBundle = async (id: SiteId): Promise<SiteBundle> => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id
  siteLog.debug('Fetching site bundle from IndexedDB', { id, numericId })

  try {
    const { DataService } = await import('@/core/services/data/DataService')
    const { database } = await import('@/core/database/schema')

    // Récupérer le site
    const site = await fetchSite(numericId)

    // Récupérer les installations pour ce site
    const installations = await DataService.getInstallationsBySite(numericId)

    // Récupérer les campagnes pour ce site
    const campaigns = await database.campaigns
      .where('siteId')
      .equals(numericId)
      .toArray()

    // Récupérer les calculs pour ce site
    const calculations = await database.calculations
      .where('siteId')
      .equals(numericId)
      .toArray()

    // Récupérer les machines associées aux installations
    const machines: Machine[] = []
    const machineIds = [...new Set(installations.map(i => i.machineId))]

    for (const machineId of machineIds) {
      const machine = await DataService.getMachineById(machineId)
      if (machine) {
        machines.push(machine as Machine)
      }
    }

    // Calculer les statistiques
    const statistics: SiteStatistics = {
      totalInstallations: installations.length,
      activeInstallations: installations.filter(i => i.isActive).length,
      totalMachines: machines.length,
      connectedMachines: 0, // TODO: Récupérer depuis BLE store
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === 'active').length,
    completedCalculations: calculations.filter(c => c.status === 'done').length,
    failedCalculations: calculations.filter(c => c.status === 'failed').length,
    lastActivity: installations.length > 0
      ? new Date(Math.max(...installations.map(i => new Date(i.updatedAt).getTime())))
      : undefined
  }

    const bundle: SiteBundle = {
      site,
      installations,
      machines,
      campaigns,
      calculations,
      statistics
    }

    siteLog.debug('Site bundle fetched from IndexedDB', { bundle })
    return bundle

  } catch (error) {
    siteLog.error('Failed to fetch site bundle from IndexedDB', { id, error })
    throw error
  }
}

/**
 * Met à jour un site
 */
const updateSite = async (id: SiteId, data: UpdateSiteData): Promise<Site> => {
  siteLog.debug('Updating site', { id, data })
  const response = await httpClient.put<Site>(`/api/sites/${id}`, data)
  const site = response.data!
  siteLog.info('Site updated', { site })
  return site
}

/**
 * Supprime un site
 */
const deleteSite = async (id: SiteId): Promise<void> => {
  siteLog.debug('Deleting site', { id })
  await httpClient.delete(`/api/sites/${id}`)
  siteLog.info('Site deleted', { id })
}

/**
 * Crée une nouvelle installation
 */
const createInstallation = async (data: CreateInstallationData & { siteId: SiteId }): Promise<Installation> => {
  siteLog.debug('Creating installation', { data })
  const response = await httpClient.post<Installation>('/api/installations', data)
  const installation = response.data!
  siteLog.info('Installation created', { installation })
  return installation
}

/**
 * Met à jour une installation
 */
const updateInstallation = async (id: InstallationId, data: UpdateInstallationData): Promise<Installation> => {
  siteLog.debug('Updating installation', { id, data })
  const response = await httpClient.put<Installation>(`/api/installations/${id}`, data)
  const installation = response.data!
  siteLog.info('Installation updated', { installation })
  return installation
}

/**
 * Supprime une installation
 */
const removeInstallation = async (id: InstallationId): Promise<void> => {
  siteLog.debug('Removing installation', { id })
  await httpClient.delete(`/api/installations/${id}`)
  siteLog.info('Installation removed', { id })
}

/**
 * Exporte les données d'un site
 */
const exportSiteData = async (siteId: SiteId, options: SiteExportData): Promise<Blob> => {
  siteLog.debug('Exporting site data', { siteId, options })

  const params = new URLSearchParams({
    format: options.format,
    includeMachines: String(options.includeMachines ?? true),
    includeCampaigns: String(options.includeCampaigns ?? true),
    includeCalculations: String(options.includeCalculations ?? true),
    ...(options.coordinateSystem && { coordinateSystem: options.coordinateSystem })
  })

  const response = await httpClient.get<Blob>(
    `/api/sites/${siteId}/export?${params}`,
    { responseType: 'blob' }
  )

  const blob = response.data
  if (!blob) {
    throw new AppError('Site export failed: empty response', 'PERMISSION_DENIED')
  }

  siteLog.info('Site data exported', { siteId, format: options.format })
  return blob
}

/**
 * Géocode une adresse
 */
interface GeocodeOptions {
  address: string
  language?: string
  region?: string
}

interface GeocodeResult {
  lat: number
  lng: number
  formattedAddress: string
}

const _geocodeAddress = async (options: GeocodeOptions): Promise<GeocodeResult[]> => {
  siteLog.debug('Geocoding address', { options })

  const params = new URLSearchParams({
    address: options.address,
    ...(options.language && { language: options.language }),
    ...(options.region && { region: options.region })
  })

  const response = await httpClient.get<GeocodeResult[]>(`/api/geocode?${params}`)
  const results = response.data!

  siteLog.debug('Address geocoded', {
    address: options.address,
    resultCount: results.length
  })

  return results
}

// ==================== SITE ERROR HELPER ====================

const createSiteError = (type: SiteError, originalError?: Error): AppError => {
  const SiteErrorMessages: Record<SiteError, string> = {
    SITE_NOT_FOUND: 'Site not found',
    SITE_ALREADY_EXISTS: 'A site with this name already exists',
    INVALID_COORDINATES: 'Provided coordinates are invalid',
    GEOCODING_FAILED: 'Geocoding request failed',
    INSTALLATION_FAILED: 'Installation operation failed',
    PERMISSION_DENIED: 'Permission denied',
    SITE_HAS_INSTALLATIONS: 'Cannot delete site with active installations',
    MACHINE_ALREADY_INSTALLED: 'Device is already installed on this site',
    COORDINATE_SYSTEM_INVALID: 'Unsupported coordinate system'
  }
  return new AppError(
    SiteErrorMessages[type],
    type,
    'SITE',
    originalError
  )
}

// ==================== MAIN HOOK ====================

/**
 * Hook principal pour la gestion d'un site spécifique
 */
export const useSite = (siteId: SiteId): UseSiteDetailReturn => {
  const queryClient = useQueryClient()
  const eventBus = useEventBus()

  // ==================== QUERIES ====================

  const {
    data: site,
    isLoading,
    error: queryError,
    refetch: refetchSite
  } = useQuery({
    queryKey: siteQueryKeys.bundle(siteId),
    queryFn: () => fetchSiteBundle(siteId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      siteLog.warn('Site fetch failed, retrying', { failureCount, error })
      return failureCount < 3
    }
  })

  // ==================== MUTATIONS ====================

  const updateSiteMutation = useMutation({
    mutationFn: (data: UpdateSiteData) => updateSite(siteId, data),
    onSuccess: (updatedSite) => {
      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: siteQueryKeys.detail(siteId) })
      queryClient.invalidateQueries({ queryKey: siteQueryKeys.bundle(siteId) })
      queryClient.invalidateQueries({ queryKey: siteQueryKeys.lists() })

      // Événement global
      eventBus.emit({ type: 'site:updated', data: { siteId, site: updatedSite } } as any)

      siteLog.info('Site updated successfully', { site: updatedSite })
    },
    onError: (error) => {
      siteLog.error('Site update failed', error)
      throw createSiteError('SITE_NOT_FOUND', error as Error)
    }
  })

  const deleteSiteMutation = useMutation({
    mutationFn: () => deleteSite(siteId),
    onSuccess: () => {
      // Nettoyer les caches
      queryClient.removeQueries({ queryKey: siteQueryKeys.detail(siteId) })
      queryClient.removeQueries({ queryKey: siteQueryKeys.bundle(siteId) })
      queryClient.invalidateQueries({ queryKey: siteQueryKeys.lists() })

      // Événement global
      eventBus.emit({ type: 'site:deleted', data: { siteId } } as any)

      siteLog.info('Site deleted successfully', { siteId })
    },
    onError: (error) => {
      siteLog.error('Site deletion failed', error)
      throw createSiteError('SITE_HAS_INSTALLATIONS', error as Error)
    }
  })

  const createInstallationMutation = useMutation({
    mutationFn: (data: CreateInstallationData) => createInstallation({ ...data, siteId }),
    onSuccess: (installation) => {
      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: siteQueryKeys.bundle(siteId) })
      queryClient.invalidateQueries({ queryKey: siteQueryKeys.installations(siteId) })

      // Événement global
      eventBus.emit({ type: 'installation:created', data: { siteId, installation } } as any)

      siteLog.info('Installation created successfully', { installation })
    },
    onError: (error) => {
      siteLog.error('Installation creation failed', error)
      throw createSiteError('INSTALLATION_FAILED', error as Error)
    }
  })

  const updateInstallationMutation = useMutation({
    mutationFn: ({ id, data }: { id: InstallationId; data: UpdateInstallationData }) =>
      updateInstallation(id, data),
    onSuccess: (installation) => {
      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: siteQueryKeys.bundle(siteId) })
      queryClient.invalidateQueries({ queryKey: siteQueryKeys.installations(siteId) })

      // Événement global
      eventBus.emit({ type: 'installation:updated', data: { siteId, installation } } as any)

      siteLog.info('Installation updated successfully', { installation })
    },
    onError: (error) => {
      siteLog.error('Installation update failed', error)
      throw createSiteError('INSTALLATION_FAILED', error as Error)
    }
  })

  const removeInstallationMutation = useMutation({
    mutationFn: removeInstallation,
    onSuccess: (_, installationId) => {
      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: siteQueryKeys.bundle(siteId) })
      queryClient.invalidateQueries({ queryKey: siteQueryKeys.installations(siteId) })

      // Événement global
      eventBus.emit({ type: 'installation:removed', data: { siteId, installationId } } as any)

      siteLog.info('Installation removed successfully', { installationId })
    },
    onError: (error) => {
      siteLog.error('Installation removal failed', error)
      throw createSiteError('INSTALLATION_FAILED', error as Error)
    }
  })

  // ==================== EXPORT FUNCTIONALITY ====================

  const exportSite = useCallback(async (options: SiteExportData): Promise<Blob> => {
    siteLog.debug('Exporting site', { siteId, options })

    try {
      const blob = await exportSiteData(siteId, options)

      // Événement global
      eventBus.emit({ type: 'site:exported', data: { siteId, format: options.format } } as any)

      return blob

    } catch (error) {
      siteLog.error('Site export failed', { siteId, error })
      throw createSiteError('PERMISSION_DENIED', error as Error)
    }
  }, [siteId, eventBus])

  // ==================== HELPER FUNCTIONS ====================

  const updateSiteHandler = useCallback((data: UpdateSiteData) => {
    return updateSiteMutation.mutateAsync(data)
  }, [updateSiteMutation])

  const deleteSiteHandler = useCallback(() => {
    return deleteSiteMutation.mutateAsync()
  }, [deleteSiteMutation])

  const createInstallationHandler = useCallback((data: CreateInstallationData) => {
    return createInstallationMutation.mutateAsync(data)
  }, [createInstallationMutation])

  const updateInstallationHandler = useCallback((id: InstallationId, data: UpdateInstallationData) => {
    return updateInstallationMutation.mutateAsync({ id, data })
  }, [updateInstallationMutation])

  const removeInstallationHandler = useCallback((id: InstallationId) => {
    return removeInstallationMutation.mutateAsync(id)
  }, [removeInstallationMutation])

  // ==================== RETURN ====================

  const error = queryError as Error | null

  return {
    site: site || null,
    isLoading,
    error,
    refetch: async () => {
      await refetchSite()
    },
    updateSite: updateSiteHandler,
    deleteSite: deleteSiteHandler,
    createInstallation: createInstallationHandler,
    updateInstallation: updateInstallationHandler,
    removeInstallation: removeInstallationHandler,
    exportSite
  }
}

// ==================== EXPORT ====================

export default useSite
