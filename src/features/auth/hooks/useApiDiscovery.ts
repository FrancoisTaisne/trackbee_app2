/**
 * Hook React pour la découverte automatique des routes API
 * Utilise le service OpenApiDiscovery pour découvrir et mettre en cache les endpoints
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useMemo } from 'react'
import { openApiDiscovery } from '@/core/services/api/OpenApiDiscovery'
import type { DiscoveryResult, ApiInfo, DiscoveredEndpoint } from '@/core/services/api/OpenApiDiscovery'
import { apiLog } from '@/core/utils/logger'

// ==================== TYPES ====================

export interface UseApiDiscoveryOptions {
  /** Forcer le refresh du cache */
  forceRefresh?: boolean
  /** Timeout pour la découverte en ms */
  timeout?: number
  /** Activer la découverte automatique */
  enabled?: boolean
  /** Intervalle de refetch en background (ms) */
  refetchInterval?: number
}

export interface UseApiDiscoveryReturn {
  /** Résultat de la découverte */
  discovery: DiscoveryResult | null
  /** Informations de base de l'API */
  apiInfo: ApiInfo | null
  /** Liste des endpoints découverts */
  endpoints: DiscoveredEndpoint[]
  /** Schémas de données disponibles */
  schemas: Record<string, unknown>
  /** État de chargement */
  isLoading: boolean
  /** Erreur éventuelle */
  error: Error | null
  /** Succès de la découverte */
  isSuccess: boolean
  /** Forcer un nouveau refresh */
  refresh: () => Promise<void>
  /** Vider le cache */
  clearCache: () => void
  /** Obtenir les endpoints par tag */
  getEndpointsByTag: (tag: string) => DiscoveredEndpoint[]
  /** Vérifier si un endpoint existe */
  hasEndpoint: (path: string, method?: string) => boolean
}

// ==================== HOOK PRINCIPAL ====================

export function useApiDiscovery(options: UseApiDiscoveryOptions = {}): UseApiDiscoveryReturn {
  const {
    forceRefresh = false,
    timeout = 10000,
    enabled = true,
    refetchInterval = 5 * 60 * 1000 // 5 minutes
  } = options

  const queryClient = useQueryClient()
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)

  // Query principale pour la découverte
  const log = apiLog
  const {
    data: discovery,
    isLoading: isQueryLoading,
    error,
    isSuccess,
    refetch
  } = useQuery({
    queryKey: ['api-discovery', forceRefresh, timeout],
    queryFn: async (): Promise<DiscoveryResult> => {
      log.debug('🔍 Starting API discovery via React hook', { forceRefresh, timeout })

      try {
        const result = await openApiDiscovery.discoverApi({
          forceRefresh,
          timeout
        })

        if (result.success) {
          log.info('✅ API discovery completed successfully', {
            endpoints: result.endpoints.length,
            schemas: Object.keys(result.schemas).length
          })
        } else {
          log.warn('⚠️ API discovery completed with errors', {
            errors: result.errors
          })
        }

        return result
      } catch (err) {
        log.error('❌ API discovery failed in hook', { error: err })
        throw err
      }
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: enabled ? refetchInterval : false,
    refetchIntervalInBackground: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })

  // États dérivés
  const isLoading = isQueryLoading || isManualRefreshing
  const apiInfo = discovery?.apiInfo || null
  const endpoints = useMemo(() => discovery?.endpoints || [], [discovery?.endpoints])
  const schemas = discovery?.schemas || {}

  // ==================== ACTIONS ====================

  const refresh = useCallback(async () => {
    setIsManualRefreshing(true)
    try {
      log.debug('🔄 Manual API discovery refresh triggered')

      // Forcer un nouveau refresh
      openApiDiscovery.clearCache()
      await refetch()

      log.info('✅ Manual API discovery refresh completed')
    } catch (err) {
      log.error('❌ Manual API discovery refresh failed', { error: err })
      throw err
    } finally {
      setIsManualRefreshing(false)
    }
  }, [refetch, log])

  const clearCache = useCallback(() => {
    log.debug('🗑️ Clearing API discovery cache')
    openApiDiscovery.clearCache()
    queryClient.invalidateQueries({ queryKey: ['api-discovery'] })
  }, [queryClient, log])

  // ==================== UTILITAIRES ====================

  const getEndpointsByTag = useCallback((tag: string): DiscoveredEndpoint[] => {
    return endpoints.filter(endpoint =>
      endpoint.tags.includes(tag)
    )
  }, [endpoints])

  const hasEndpoint = useCallback((path: string, method?: string): boolean => {
    return endpoints.some(endpoint => {
      const pathMatch = endpoint.path === path
      const methodMatch = !method || endpoint.method.toLowerCase() === method.toLowerCase()
      return pathMatch && methodMatch
    })
  }, [endpoints])

  return {
    discovery: discovery || null,
    apiInfo,
    endpoints,
    schemas,
    isLoading,
    error,
    isSuccess,
    refresh,
    clearCache,
    getEndpointsByTag,
    hasEndpoint
  }
}

// ==================== HOOKS SPÉCIALISÉS ====================

/**
 * Hook pour obtenir uniquement les informations de base de l'API
 */
export function useApiInfo(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options

  return useQuery({
    queryKey: ['api-info'],
    queryFn: async () => {
      const info = await openApiDiscovery.getApiInfo()
      if (!info) {
        throw new Error('Failed to fetch API info')
      }
      return info
    },
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1
  })
}

/**
 * Hook pour obtenir la santé du service OpenAPI
 */
export function useApiHealth(options: { enabled?: boolean; refetchInterval?: number } = {}) {
  const { enabled = true, refetchInterval = 30000 } = options

  return useQuery({
    queryKey: ['api-health'],
    queryFn: async () => {
      const health = await openApiDiscovery.checkApiHealth()
      if (!health) {
        throw new Error('API health check failed')
      }
      return health
    },
    enabled,
    refetchInterval,
    staleTime: 10000, // 10 secondes
    retry: 1
  })
}

/**
 * Hook pour obtenir les endpoints avec filtres
 */
export function useApiEndpoints(filters: { tag?: string; method?: string } = {}) {
  return useQuery({
    queryKey: ['api-endpoints', filters],
    queryFn: async () => {
      return await openApiDiscovery.getEndpoints(filters)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  })
}

export default useApiDiscovery
