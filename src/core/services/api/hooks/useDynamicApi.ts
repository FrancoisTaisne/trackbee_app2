/**
 * Hook React pour utiliser l'API dynamique basée sur OpenAPI Discovery
 * Combine la découverte automatique des routes avec des opérations typées
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useState, useCallback, useEffect } from 'react'
import { dynamicApiService, type DynamicEndpoint, type ApiOperation } from '../DynamicApiService'
import { useApiDiscovery } from '@/features/auth/hooks/useApiDiscovery'
import type { ApiResponse } from '@/core/types/transport'
import { logger, apiLog } from '@/core/utils/logger'

// ==================== TYPES ====================

export interface UseDynamicApiOptions {
  /** Activer la découverte automatique */
  autoDiscover?: boolean
  /** Forcer le refresh de la découverte */
  forceRefresh?: boolean
  /** Tags d'endpoints à découvrir spécifiquement */
  tags?: string[]
}

export interface UseDynamicApiReturn {
  /** Service API dynamique */
  api: typeof dynamicApiService
  /** État de la découverte */
  isDiscovering: boolean
  /** Endpoints découverts */
  endpoints: DynamicEndpoint[]
  /** Obtenir un endpoint spécifique */
  getEndpoint: (path: string, method: string) => DynamicEndpoint | null
  /** Obtenir des endpoints par tag */
  getEndpointsByTag: (tag: string) => DynamicEndpoint[]
  /** Créer une opération API */
  createOperation: (path: string, method: string) => ApiOperation | null
  /** Exécuter une opération */
  executeOperation: <T = any>(path: string, method: string, params?: any, data?: any) => Promise<ApiResponse<T>>
  /** Forcer une nouvelle découverte */
  refresh: () => Promise<void>
  /** Statistiques */
  stats: {
    endpointsDiscovered: number
    operationsCached: number
    lastDiscoveryTime: Date | null
    cacheValid: boolean
  }
}

// ==================== HOOK PRINCIPAL ====================

export function useDynamicApi(options: UseDynamicApiOptions = {}): UseDynamicApiReturn {
  const {
    autoDiscover = true,
    forceRefresh = false,
    tags = []
  } = options

  const queryClient = useQueryClient()
  const [isDiscovering, setIsDiscovering] = useState(false)

  // Utiliser le hook de découverte API existant
  const {
    discovery,
    isLoading: isDiscoveryLoading,
    refresh: refreshDiscovery
  } = useApiDiscovery({
    enabled: autoDiscover,
    forceRefresh
  })

  // État local des endpoints
  const [endpoints, setEndpoints] = useState<DynamicEndpoint[]>([])

  // Effet pour mettre à jour les endpoints quand la découverte change
  useEffect(() => {
    if (discovery && discovery.success) {
      const allEndpoints = discovery.endpoints.map(endpoint => ({
        path: endpoint.path,
        method: endpoint.method,
        summary: endpoint.summary,
        tags: endpoint.tags,
        requiresAuth: endpoint.requiresAuth,
        requestBodyRequired: endpoint.requestBodyRequired
      }))

      // Filtrer par tags si spécifiés
      const filteredEndpoints = tags.length > 0
        ? allEndpoints.filter(endpoint =>
            endpoint.tags.some(tag => tags.includes(tag))
          )
        : allEndpoints

      setEndpoints(filteredEndpoints)

      apiLog.debug('📊 Dynamic API endpoints updated', {
        total: allEndpoints.length,
        filtered: filteredEndpoints.length,
        tags
      })
    }
  }, [discovery, tags])

  // ==================== ACTIONS ====================

  const getEndpoint = useCallback((path: string, method: string): DynamicEndpoint | null => {
    return dynamicApiService.getEndpoint(path, method)
  }, [])

  const getEndpointsByTag = useCallback((tag: string): DynamicEndpoint[] => {
    return dynamicApiService.getEndpointsByTag(tag)
  }, [])

  const createOperation = useCallback((path: string, method: string): ApiOperation | null => {
    return dynamicApiService.createOperation(path, method)
  }, [])

  const executeOperation = useCallback(async <T = any>(
    path: string,
    method: string,
    params?: any,
    data?: any
  ): Promise<ApiResponse<T>> => {
    const operation = createOperation(path, method)
    if (!operation) {
      throw new Error(`Operation not found: ${method} ${path}`)
    }

    return operation.call<T>(params, data)
  }, [createOperation])

  const refresh = useCallback(async () => {
    setIsDiscovering(true)
    try {
      apiLog.debug('🔄 Refreshing dynamic API discovery...')

      await dynamicApiService.refresh()
      await refreshDiscovery()

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['api-discovery'] })
      queryClient.invalidateQueries({ queryKey: ['dynamic-api'] })

      apiLog.info('✅ Dynamic API refresh completed')
    } catch (error) {
      apiLog.error('❌ Dynamic API refresh failed', { error })
      throw error
    } finally {
      setIsDiscovering(false)
    }
  }, [refreshDiscovery, queryClient])

  // ==================== COMPUTED VALUES ====================

  const stats = dynamicApiService.getStats()
  const isLoadingState = isDiscoveryLoading || isDiscovering

  return {
    api: dynamicApiService,
    isDiscovering: isLoadingState,
    endpoints,
    getEndpoint,
    getEndpointsByTag,
    createOperation,
    executeOperation,
    refresh,
    stats
  }
}

// ==================== HOOKS SPÉCIALISÉS ====================

/**
 * Hook pour exécuter une opération API spécifique avec React Query
 */
export function useDynamicApiOperation<TData = any, TVariables = any>(
  path: string,
  method: string,
  options: {
    enabled?: boolean
  } = {}
) {
  const { createOperation } = useDynamicApi()
  const { enabled = true } = options

  return useQuery({
    queryKey: ['dynamic-api-operation', path, method],
    queryFn: async (): Promise<TData> => {
      const operation = createOperation(path, method)
      if (!operation) {
        throw new Error(`Operation not found: ${method} ${path}`)
      }

      const response = await operation.call<TData>()
      if (!response.success) {
        throw new Error('API operation failed')
      }

      return response.data!
    },
    enabled: enabled && !!path && !!method
  })
}

/**
 * Hook pour une mutation API dynamique
 */
export function useDynamicApiMutation<TData = any, TVariables = any>(
  path: string,
  method: string
) {
  const { executeOperation } = useDynamicApi()

  return useMutation({
    mutationFn: async (variables: TVariables): Promise<TData> => {
      const { params, data, ...rest } = variables as any

      const response = await executeOperation<TData>(path, method, params, data)
      if (!response.success) {
        throw new Error('API mutation failed')
      }

      return response.data!
    }
  })
}

/**
 * Hook pour les opérations d'authentification
 */
export function useDynamicAuth() {
  const { api } = useDynamicApi({ tags: ['Authentication'] })

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      return await api.login(credentials)
    }
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await api.logout()
    }
  })

  return {
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending
  }
}

/**
 * Hook pour les opérations sur les machines
 */
export function useDynamicMachines() {
  const { api } = useDynamicApi({ tags: ['Machines'] })

  const {
    data: machines,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['dynamic-machines'],
    queryFn: async () => {
      const response = await api.getMachines()
      return response.data
    }
  })

  const getMachine = useCallback(async (idOrMac: string) => {
    const response = await api.getMachine(idOrMac)
    return response.data
  }, [api])

  return {
    machines,
    isLoading,
    refetch,
    getMachine
  }
}

/**
 * Hook pour les opérations sur les sites
 */
export function useDynamicSites() {
  const { api } = useDynamicApi({ tags: ['Sites'] })
  const queryClient = useQueryClient()

  const {
    data: sites,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['dynamic-sites'],
    queryFn: async () => {
      const response = await api.getSites()
      return response.data
    }
  })

  const createSiteMutation = useMutation({
    mutationFn: async (siteData: any) => {
      const response = await api.createSite(siteData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dynamic-sites'] })
    }
  })

  return {
    sites,
    isLoading,
    refetch,
    createSite: createSiteMutation.mutateAsync,
    isCreating: createSiteMutation.isPending
  }
}

export default useDynamicApi