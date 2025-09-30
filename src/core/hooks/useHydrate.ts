/**
 * Hook centralisé pour l'hydratation des données via /api/me/hydrate
 * Solution optimale pour récupérer toutes les données utilisateur en une seule requête
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/core/state/stores/auth.store'
import { logger } from '../utils/logger'
import { AuthService } from '@/core/services/api/services/AuthService'
import { database } from '@/core/database/schema'
import { getSiteRepository } from '@/core/repositories/SiteRepository'
import { getInstallationRepository } from '@/core/repositories/InstallationRepository'
import { getCampaignRepository } from '@/core/repositories/CampaignRepository'
import type { DatabaseSite, DatabaseInstallation, DatabaseCampaign, DatabaseCalculation, DatabaseMachine } from '@/core/database/schema'
import type { Site, Machine } from '../types'

export interface HydrateData {
  sites: Site[]
  machines: Machine[]
  installations: any[]
  campaigns?: any[]
  calculations?: any[]
}

export interface HydrateResult {
  data?: HydrateData;
  sites: Site[];
  machines: Machine[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook principal d'hydratation - récupère toutes les données utilisateur
 */
export function useHydrate(): HydrateResult {
  const queryClient = useQueryClient()
  const { user, isAuthenticated } = useAuthStore()

  const {
    data: hydrateData,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['hydrate', user?.id],
    queryFn: async (): Promise<HydrateData> => {
      if (!isAuthenticated || !user) {
        throw new Error('User not authenticated')
      }

      logger.info('hydrate', '🚀 Hydratation via AuthService.hydrate()')

      try {
        // Utiliser AuthService.hydrate() qui fait l'appel à /api/me/hydrate
        const data = await AuthService.hydrate()

        logger.info('hydrate', '✅ Données reçues du backend:', {
          sites: data.sites?.length || 0,
          machines: data.machines?.length || 0,
          installations: data.installations?.length || 0
        })

        // 🎯 HYDRATATION AUTOMATIQUE - Synchroniser avec IndexedDB
        await hydrateIndexedDB(data)

        // Invalider les caches des hooks spécialisés
        queryClient.invalidateQueries({ queryKey: ['sites'] })
        queryClient.invalidateQueries({ queryKey: ['devices'] })
        queryClient.invalidateQueries({ queryKey: ['machines'] })

        return data

      } catch (error) {
        logger.error('hydrate', '❌ Erreur lors de l\'hydratation:', error)

        // Fallback: récupérer depuis IndexedDB
        logger.info('hydrate', '🔄 Fallback vers IndexedDB...')
        const fallbackData = await getFallbackFromIndexedDB()
        return fallbackData
      }
    },
    enabled: isAuthenticated && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })

  // Extraire les données typées
  const sites = hydrateData?.sites || []
  const machines = hydrateData?.machines || []

  return {
    data: hydrateData,
    sites,
    machines,
    isLoading,
    isError,
    error: error as Error | null,
    refetch
  }
}

/**
 * Synchronise les données backend avec IndexedDB via transaction
 */
async function hydrateIndexedDB(data: HydrateData): Promise<void> {
  try {
    logger.info('hydrate', '💧 Synchronisation IndexedDB...')

    // Utiliser une transaction pour assurer la cohérence
    await database.transaction('rw',
      [database.sites, database.machines, database.installations, database.campaigns, database.calculations],
      async () => {
        // Mapper et synchroniser les sites
        if (data.sites && data.sites.length > 0) {
          const siteRepository = getSiteRepository(database)
          const mappedSites = data.sites.map(mapSiteToDatabase)
          await siteRepository.syncFromBackend(mappedSites)
          logger.info('hydrate', `✅ ${data.sites.length} sites synchronisés`)
        }

        // Mapper et synchroniser les machines
        if (data.machines && data.machines.length > 0) {
          const mappedMachines = data.machines.map(mapMachineToDatabase)
          await database.machines.clear() // Clear et re-insert pour éviter les conflits
          await database.machines.bulkAdd(mappedMachines)
          logger.info('hydrate', `✅ ${data.machines.length} machines synchronisées`)
        }

        // Mapper et synchroniser les installations
        if (data.installations && data.installations.length > 0) {
          const installationRepository = getInstallationRepository(database)
          const mappedInstallations = data.installations.map(mapInstallationToDatabase)
          await installationRepository.syncFromBackend(mappedInstallations)
          logger.info('hydrate', `✅ ${data.installations.length} installations synchronisées`)
        }
        // Campagnes
        if (data.campaigns && data.campaigns.length > 0) {
          const campaignRepository = getCampaignRepository(database)
          const mappedCampaigns = data.campaigns.map(mapCampaignToDatabase)
          await campaignRepository.syncFromBackend(mappedCampaigns as any)
          logger.info('hydrate', `✅ ${data.campaigns.length} campagnes synchronisées`)
        }
        // Calculs
        if (data.calculations && data.calculations.length > 0) {
          const mappedCalcs = data.calculations.map(mapCalculationToDatabase)
          await database.calculations.bulkPut(mappedCalcs as any)
          logger.info('hydrate', `✅ ${data.calculations.length} calculs synchronisés`)
        }
      }
    )

    logger.info('hydrate', '✅ Synchronisation IndexedDB terminée')

  } catch (error) {
    logger.error('hydrate', '❌ Erreur lors de la synchronisation IndexedDB:', error)
    throw error
  }
}

/**
 * Récupère les données depuis IndexedDB en cas d'échec backend
 */
async function getFallbackFromIndexedDB(): Promise<HydrateData> {
  try {
    logger.info('hydrate', '🔄 Récupération fallback depuis IndexedDB...')

    const siteRepository = getSiteRepository(database)
    const installationRepository = getInstallationRepository(database)

    const [sitesResult, machines, installationsResult, campaigns, calculations] = await Promise.all([
      siteRepository.findAll(),
      database.machines.toArray(),
      installationRepository.findAll(),
      database.campaigns.toArray(),
      database.calculations.toArray()
    ])

    // Mapper les données DB vers les types domain
    const sites = sitesResult.data.map(mapDatabaseToSite)
    const mappedMachines = machines.map(mapDatabaseToMachine)
    const installations = installationsResult.data.map(mapDatabaseToInstallation)

    logger.info('hydrate', '📦 Données fallback:', {
      sites: sites.length,
      machines: mappedMachines.length,
      installations: installations.length
    })

    return {
      sites,
      machines: mappedMachines,
      installations,
      campaigns: campaigns as any,
      calculations: calculations as any
    }

  } catch (error) {
    logger.error('hydrate', '❌ Erreur lors du fallback IndexedDB:', error)
    return { sites: [], machines: [], installations: [], campaigns: [], calculations: [] }
  }
}

/**
 * Hook spécialisé pour les sites (utilise l'hydratation)
 */
export function useHydrateSites() {
  const { sites, isLoading, isError, error, refetch } = useHydrate();

  return {
    sites,
    isLoading,
    isError,
    error,
    refetch
  };
}

/**
 * Hook spécialisé pour les machines (utilise l'hydratation)
 */
export function useHydrateMachines() {
  const { machines, isLoading, isError, error, refetch } = useHydrate();

  return {
    machines,
    isLoading,
    isError,
    error,
    refetch
  };
}

/**
 * Hook pour forcer une re-synchronisation complète
 */
export function useForceHydration() {
  const queryClient = useQueryClient()

  return {
    forceRefresh: () => {
      logger.info('hydrate', '🔄 Force refresh hydration...')
      queryClient.invalidateQueries({ queryKey: ['hydrate'] })
      queryClient.refetchQueries({ queryKey: ['hydrate'] })
    },
    clearCache: () => {
      logger.info('hydrate', '🧹 Clear hydration cache...')
      queryClient.removeQueries({ queryKey: ['hydrate'] })
      queryClient.removeQueries({ queryKey: ['sites'] })
      queryClient.removeQueries({ queryKey: ['devices'] })
      queryClient.removeQueries({ queryKey: ['machines'] })
    }
  }
}

// ==================== MAPPERS ====================

/**
 * Map Site domain type to DatabaseSite
 */
function mapSiteToDatabase(site: Site): Omit<DatabaseSite, 'createdAt' | 'updatedAt'> {
  return {
    id: site.id,
    name: site.name,
    description: site.description,
    address: site.address,
    location: site.lat && (site as any).lng ? { lat: site.lat, lng: (site as any).lng } : undefined,
    altitude: site.altitude,
    userId: site.userId || 0,
    tags: [],
    syncedAt: new Date()
  }
}

/**
 * Map Machine domain type to DatabaseMachine
 */
function mapMachineToDatabase(machine: Machine): DatabaseMachine {
  return {
    id: machine.id,
    name: machine.name,
    macAddress: machine.macAddress,
    model: machine.model,
    description: machine.description,
    type: machine.type || 'trackbee',
    userId: machine.userId || 0,
    isActive: machine.isActive,
    lastConnectionState: machine.lastConnectionState ? {
      status: machine.lastConnectionState,
      timestamp: new Date(),
      signal: undefined,
      battery: undefined
    } : undefined,
    lastSeenAt: machine.lastSeenAt ? new Date(machine.lastSeenAt) : new Date(),
    syncedAt: new Date(),
    createdAt: machine.createdAt ? new Date(machine.createdAt) : new Date(),
    updatedAt: machine.updatedAt ? new Date(machine.updatedAt) : new Date()
  }
}

/**
 * Map installation to DatabaseInstallation
 */
function mapInstallationToDatabase(installation: any): Omit<DatabaseInstallation, 'createdAt' | 'updatedAt'> {
  return {
    id: installation.id,
    machineId: installation.machineId,
    siteId: installation.siteId,
    userId: installation.userId || 0,
    installationRef: installation.installationRef || '',
    positionIndex: installation.positionIndex || 1,
    installedAt: installation.installedAt ? new Date(installation.installedAt) : new Date(),
    uninstalledAt: installation.uninstalledAt ? new Date(installation.uninstalledAt) : undefined,
    isActive: installation.isActive ?? true,
    lastActivity: new Date(),
    syncedAt: new Date()
  }
}

/**
 * Map DatabaseSite to Site domain type
 */
function mapDatabaseToSite(dbSite: DatabaseSite): Site {
  return {
    id: dbSite.id,
    name: dbSite.name,
    description: dbSite.description,
    address: dbSite.address,
    lat: dbSite.location?.lat,
    lng: dbSite.location?.lng,
    altitude: dbSite.altitude,
    userId: dbSite.userId,
    createdAt: dbSite.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: dbSite.updatedAt?.toISOString() || new Date().toISOString()
  }
}

/**
 * Map DatabaseMachine to Machine domain type
 */
function mapDatabaseToMachine(dbMachine: DatabaseMachine): Machine {
  return {
    id: dbMachine.id,
    name: dbMachine.name,
    macAddress: dbMachine.macAddress,
    model: dbMachine.model,
    description: dbMachine.description,
    type: dbMachine.type,
    userId: dbMachine.userId,
    isActive: dbMachine.isActive,
    lastConnectionState: dbMachine.lastConnectionState?.status,
    lastSeenAt: dbMachine.lastSeenAt?.toISOString(),
    createdAt: dbMachine.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: dbMachine.updatedAt?.toISOString() || new Date().toISOString()
  }
}

/**
 * Map DatabaseInstallation to installation type
 */
function mapDatabaseToInstallation(dbInstallation: DatabaseInstallation): any {
  return {
    id: dbInstallation.id,
    machineId: dbInstallation.machineId,
    siteId: dbInstallation.siteId,
    userId: dbInstallation.userId,
    installationRef: dbInstallation.installationRef,
    positionIndex: dbInstallation.positionIndex,
    installedAt: dbInstallation.installedAt?.toISOString(),
    uninstalledAt: dbInstallation.uninstalledAt?.toISOString(),
    isActive: dbInstallation.isActive,
    lastActivity: dbInstallation.lastActivity?.toISOString(),
    createdAt: dbInstallation.createdAt?.toISOString(),
    updatedAt: dbInstallation.updatedAt?.toISOString()
  }
}
// Campaign mapper
function mapCampaignToDatabase(c: any): Omit<DatabaseCampaign, 'createdAt' | 'updatedAt'> {
  const type = c.type || 'static_multiple'
  return {
    id: c.id,
    siteId: c.siteId,
    machineId: c.machineId,
    installationId: c.installationId,
    name: c.name || `C-${c.id}`,
    description: c.description || '',
    type,
    status: c.status || 'active',
    priority: c.priority ?? 5,
    scheduledAt: c.scheduledAt,
    startedAt: c.startedAt,
    completedAt: c.completedAt,
    syncedAt: new Date()
  } as any
}

// Calculation mapper
function mapCalculationToDatabase(p: any): Omit<DatabaseCalculation, 'createdAt' | 'updatedAt'> {
  return {
    id: p.id,
    campaignId: p.campaignId,
    siteId: p.siteId,
    machineId: p.machineId,
    installationId: p.installationId,
    status: p.status || 'queued',
    type: p.type || 'static_multiple',
    syncedAt: new Date()
  } as any
}
