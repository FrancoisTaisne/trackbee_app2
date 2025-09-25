/**
 * Query Client - Configuration TanStack Query
 * Gestion centralisée du cache et des requêtes serveur
 */

import { QueryClient } from '@tanstack/react-query'
import { stateLog, logger } from '@/core/utils/logger'
import { appConfig } from '@/core/utils/env'

// ==================== QUERY DEFAULTS ====================

const queryDefaults = {
  queries: {
    // Cache par défaut
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (anciennement cacheTime)

    // Retry policy
    retry: (failureCount: number, error: any) => {
      stateLog.debug('Query retry check', { failureCount, error: error?.message })

      // Ne pas retry sur les erreurs 4xx sauf 408, 429
      if (error?.status >= 400 && error?.status < 500) {
        if (error?.status === 408 || error?.status === 429) {
          return failureCount < 2
        }
        return false
      }

      // Retry sur erreurs réseau et 5xx
      return failureCount < 3
    },

    retryDelay: (attemptIndex: number) => {
      const delay = Math.min(1000 * Math.pow(2, attemptIndex), 30000)
      stateLog.debug('Query retry delay', { attemptIndex, delay })
      return delay
    },

    // Politique de refetch
    refetchOnWindowFocus: appConfig.isDev ? false : true,
    refetchOnReconnect: true,
    refetchOnMount: true,

    // Gestion des erreurs
    throwOnError: false,

    // Meta pour tracking
    meta: {
      source: 'trackbee-app'
    }
  },

  mutations: {
    retry: 1,
    retryDelay: 1000,
    throwOnError: false,

    meta: {
      source: 'trackbee-app'
    }
  }
} as const

// ==================== ERROR HANDLER ====================

const defaultErrorHandler = (error: any, query?: any) => {
  const errorInfo = {
    message: error?.message || 'Unknown error',
    status: error?.status,
    code: error?.code,
    queryKey: query?.queryKey,
    meta: query?.meta
  }

  stateLog.error('Query error', errorInfo)

  // En dev, afficher plus de détails
  if (appConfig.isDev) {
    console.group('🔴 Query Error Details')
    console.error('Error:', error)
    console.log('Query:', query)
    console.groupEnd()
  }

  // Ici on pourrait intégrer avec un système de reporting d'erreurs
  // Sentry, Bugsnag, etc.
}

// ==================== QUERY CLIENT ====================

export const createQueryClient = () => {
  const client = new QueryClient({
    defaultOptions: queryDefaults,

    // Logger n'existe plus dans QueryClient v5
    // Les logs sont gérés par les handlers d'erreur
  })

  // Les onError globaux n'existent plus dans v5
  // Ils sont remplacés par les error boundaries React

  // Event listeners pour monitoring
  client.getQueryCache().subscribe((event) => {
    if (appConfig.debug) {
      stateLog.trace('Query cache event', {
        type: event.type,
        query: event.query?.queryKey,
        state: event.query?.state
      })
    }
  })

  client.getMutationCache().subscribe((event) => {
    if (appConfig.debug) {
      stateLog.trace('Mutation cache event', {
        type: event.type,
        mutation: event.mutation?.options?.mutationKey,
        state: event.mutation?.state
      })
    }
  })

  stateLog.info('QueryClient initialized', {
    staleTime: queryDefaults.queries.staleTime,
    gcTime: queryDefaults.queries.gcTime,
    devMode: appConfig.isDev
  })

  return client
}

// ==================== QUERY KEYS ====================

/**
 * Query keys centralisées pour éviter les doublons
 * Pattern: [domain, action, ...params]
 */
export const queryKeys = {
  // Authentication
  auth: {
    user: ['auth', 'user'] as const,
    session: ['auth', 'session'] as const,
    permissions: ['auth', 'permissions'] as const
  },

  // Machines/Devices
  devices: {
    all: ['devices'] as const,
    lists: () => [...queryKeys.devices.all, 'list'] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.devices.lists(), { filters }] as const,
    details: () => [...queryKeys.devices.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.devices.details(), id] as const,
    installations: (id: string) =>
      [...queryKeys.devices.detail(id), 'installations'] as const,
    campaigns: (id: string) =>
      [...queryKeys.devices.detail(id), 'campaigns'] as const
  },

  // Sites
  sites: {
    all: ['sites'] as const,
    lists: () => [...queryKeys.sites.all, 'list'] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.sites.lists(), { filters }] as const,
    details: () => [...queryKeys.sites.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.sites.details(), id] as const,
    installations: (id: string) =>
      [...queryKeys.sites.detail(id), 'installations'] as const
  },

  // Campaigns
  campaigns: {
    all: ['campaigns'] as const,
    lists: () => [...queryKeys.campaigns.all, 'list'] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.campaigns.lists(), { filters }] as const,
    details: () => [...queryKeys.campaigns.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.campaigns.details(), id] as const,
    calculations: (id: string) =>
      [...queryKeys.campaigns.detail(id), 'calculations'] as const
  },

  // Calculations/Processing
  processing: {
    all: ['processing'] as const,
    lists: () => [...queryKeys.processing.all, 'list'] as const,
    list: (filters?: Record<string, any>) =>
      [...queryKeys.processing.lists(), { filters }] as const,
    details: () => [...queryKeys.processing.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.processing.details(), id] as const,
    status: (id: string) =>
      [...queryKeys.processing.detail(id), 'status'] as const,
    results: (id: string) =>
      [...queryKeys.processing.detail(id), 'results'] as const
  },

  // Files & Transfers
  files: {
    all: ['files'] as const,
    uploads: () => [...queryKeys.files.all, 'uploads'] as const,
    upload: (id: string) => [...queryKeys.files.uploads(), id] as const,
    queue: ['files', 'queue'] as const
  }
} as const

// ==================== CACHE UTILITIES ====================

/**
 * Utilitaires pour manipuler le cache
 */
export const cacheUtils = {
  /**
   * Invalide toutes les queries d'un domaine
   */
  invalidateDomain: (client: QueryClient, domain: keyof typeof queryKeys) => {
    const timer = logger.time(`Invalidate ${domain}`)

    client.invalidateQueries({
      queryKey: (queryKeys[domain] as any).all
    })

    timer.end({ domain })
    stateLog.debug(`Cache invalidated for domain: ${domain}`)
  },

  /**
   * Supprime toutes les queries d'un domaine
   */
  removeDomain: (client: QueryClient, domain: keyof typeof queryKeys) => {
    const timer = logger.time(`Remove ${domain}`)

    client.removeQueries({
      queryKey: (queryKeys[domain] as any).all
    })

    timer.end({ domain })
    stateLog.debug(`Cache removed for domain: ${domain}`)
  },

  /**
   * Précharge une query
   */
  prefetch: async (
    client: QueryClient,
    queryKey: readonly unknown[],
    queryFn: () => Promise<any>,
    options?: { staleTime?: number }
  ) => {
    const timer = logger.time(`Prefetch ${queryKey.join('.')}`)

    try {
      await client.prefetchQuery({
        queryKey,
        queryFn: queryFn as any,
        staleTime: options?.staleTime
      })

      timer.end({ success: true })
      stateLog.debug('Query prefetched', { queryKey })
    } catch (error) {
      timer.end({ error })
      stateLog.error('Query prefetch failed', { queryKey, error })
    }
  },

  /**
   * Met à jour le cache optimiste
   */
  updateOptimistic: <T>(
    client: QueryClient,
    queryKey: readonly unknown[],
    updater: (old: T | undefined) => T
  ) => {
    client.setQueryData(queryKey, updater)
    stateLog.debug('Optimistic update applied', { queryKey })
  }
}

// Instance par défaut
export const queryClient = createQueryClient()

// Types utiles
export type QueryKey = typeof queryKeys[keyof typeof queryKeys]
export type CacheUtils = typeof cacheUtils