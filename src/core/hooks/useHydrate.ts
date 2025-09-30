/**
 * Hook centralisé pour l'hydratation des données via /api/me/hydrate
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/core/state/stores/auth.store'
import { logger } from '@/core/utils/logger'
import { HydrationService, type HydrationData } from '@/core/services/hydration/HydrationService'
import type { Site, Machine } from '../types'

export interface HydrateData {
  sites: Site[]
  machines: Machine[]
  installations: HydrationData['installations']
  campaigns: HydrationData['campaigns']
  calculations: HydrationData['calculations']
}

export interface HydrateResult {
  data?: HydrateData
  sites: Site[]
  machines: Machine[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

export function useHydrate(): HydrateResult {
  const queryClient = useQueryClient()
  const { user, isAuthenticated } = useAuthStore()

  const {
    data,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['hydrate', user?.id],
    enabled: isAuthenticated && !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    queryFn: async (): Promise<HydrateData> => {
      if (!isAuthenticated || !user) {
        throw new Error('User not authenticated')
      }

      try {
        logger.info('hydrate', '🚀 Fetching hydration payload with cache negotiation')

        const hydrationData = await HydrationService.fetch()
        await HydrationService.syncToDexie(hydrationData)

        logger.info('hydrate', '✅ Hydration payload synchronised', {
          machines: hydrationData.machines.length,
          sites: hydrationData.sites.length,
          installations: hydrationData.installations.length,
          campaigns: hydrationData.campaigns.length,
          calculations: hydrationData.calculations.length
        })

        queryClient.invalidateQueries({ queryKey: ['sites'] })
        queryClient.invalidateQueries({ queryKey: ['devices'] })
        queryClient.invalidateQueries({ queryKey: ['machines'] })

        return mapHydrationToUi(hydrationData)

      } catch (error) {
        logger.error('hydrate', '❌ Hydration failed, using Dexie fallback', { error })
        const fallback = await HydrationService.loadFromDexie()
        return mapHydrationToUi(fallback)
      }
    }
  })

  return {
    data,
    sites: data?.sites ?? [],
    machines: data?.machines ?? [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch
  }
}

function mapHydrationToUi(data: HydrationData): HydrateData {
  const machines: Machine[] = data.machines.map(machine => ({
    id: machine.id,
    name: machine.name,
    description: machine.description,
    macAddress: machine.macAddress,
    type: machine.type,
    model: machine.model,
    firmwareVersion: undefined,
    batteryLevel: undefined,
    isActive: machine.isActive,
    installation: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }))

  const sites: Site[] = data.sites.map(site => ({
    id: site.id,
    name: site.name,
    description: site.description,
    address: site.address,
    lat: site.lat,
    lng: site.lng,
    altitude: undefined,
    coordinateSystem: undefined,
    isPublic: false,
    ownership: site.ownership,
    sharedRole: site.sharedRole,
    metadata: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }))

  return {
    sites,
    machines,
    installations: data.installations,
    campaigns: data.campaigns,
    calculations: data.calculations
  }
}

