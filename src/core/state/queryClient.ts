/**
 * Query Client - Configuration TanStack Query
 * Gestion centralisée du cache et des requêtes serveur
 */

import { QueryClient, type QueryFunction } from '@tanstack/react-query'
import { stateLog, logger } from '@/core/utils/logger'
import { appConfig } from '@/core/utils/env'

type QueryEventContext = {
  queryKey: unknown
  meta?: Record<string, unknown>
}

type QueryErrorDetails = {
  message: string
  status?: number
  code?: string
  meta?: unknown
}

const extractErrorDetails = (error: unknown): QueryErrorDetails => {
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>
    const message =
      typeof record.message === 'string'
        ? record.message
        : error instanceof Error
          ? error.message
          : 'Unknown error'
    const status = typeof record.status === 'number' ? record.status : undefined
    const code = typeof record.code === 'string' ? record.code : undefined
    const meta = record.meta
    return { message, status, code, meta }
  }

  if (error instanceof Error) {
    return { message: error.message }
  }

  return { message: String(error ?? 'Unknown error') }
}

const hasAllKey = (value: unknown): value is { all: readonly unknown[] } => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'all' in value &&
    Array.isArray((value as { all?: unknown }).all)
  )
}


// ==================== QUERY DEFAULTS ====================

const queryDefaults = {
  queries: {
    // Cache par défaut
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (anciennement cacheTime)

    // Retry policy
    retry: (failureCount: number, error: Error | unknown) => {
      const details = extractErrorDetails(error)
      stateLog.debug('Query retry check', { failureCount, error: details.message })

      // Ne pas retry sur les erreurs 4xx sauf 408, 429
      const status = details.status
      if (typeof status === 'number' && status >= 400 && status < 500) {
        if (status === 408 || status === 429) {
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

const _defaultErrorHandler = (error: unknown, query?: QueryEventContext) => {
  const details = extractErrorDetails(error)
  const errorInfo = {
    message: details.message,
    status: details.status,
    code: details.code,
    queryKey: query?.queryKey,
    meta: query?.meta ?? details.meta
  }

  stateLog.error('Query error', errorInfo)

  // En dev, afficher plus de détails via logger
  if (appConfig.isDev) {
    logger.error('react-query', 'Detailed query error', {
      error: details,
      rawError: error,
      query
    })
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
    list: (filters?: Record<string, unknown>) =>
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
    list: (filters?: Record<string, unknown>) =>
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
    list: (filters?: Record<string, unknown>) =>
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
    list: (filters?: Record<string, unknown>) =>
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

const resolveDomainKey = (domain: keyof typeof queryKeys): readonly unknown[] => {
  const domainEntry = queryKeys[domain]
  if (hasAllKey(domainEntry)) {
    return domainEntry.all
  }

  return [domain]
}

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

    const queryKey = resolveDomainKey(domain)

    client.invalidateQueries({
      queryKey
    })

    timer.end({ domain })
    stateLog.debug(`Cache invalidated for domain: ${domain}`)
  },

  /**
   * Supprime toutes les queries d'un domaine
   */
  removeDomain: (client: QueryClient, domain: keyof typeof queryKeys) => {
    const timer = logger.time(`Remove ${domain}`)

    const queryKey = resolveDomainKey(domain)

    client.removeQueries({
      queryKey
    })

    timer.end({ domain })
    stateLog.debug(`Cache removed for domain: ${domain}`)
  },

  /**
   * Précharge une query
   */
  prefetch: async <T = unknown>(
    client: QueryClient,
    queryKey: readonly unknown[],
    queryFn: () => Promise<T>,
    options?: { staleTime?: number }
  ) => {
    const timer = logger.time(`Prefetch ${queryKey.join('.')}`)

    try {
      const wrappedQueryFn: QueryFunction<T, readonly unknown[], never> = async (context) => {
        void context
        return queryFn()
      }

      await client.prefetchQuery({
        queryKey,
        queryFn: wrappedQueryFn,
        staleTime: options?.staleTime
      })

      timer.end({ success: true })
      stateLog.debug('Query prefetched', { queryKey })
    } catch (error) {
      const details = extractErrorDetails(error)
      timer.end({ error: details })
      stateLog.error('Query prefetch failed', { queryKey, error: details })
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
