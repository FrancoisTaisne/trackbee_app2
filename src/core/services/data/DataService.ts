/**
 * Data Service - Service centralisé pour accès aux données locales
 * Interface unifiée pour accéder aux repositories IndexedDB
 */

import { database } from '@/core/database/schema'
import type {
  DatabaseMachine,
  DatabaseSite,
  DatabaseInstallation,
  DatabaseCampaign,
  DatabaseCalculation
} from '@/core/database/schema'
import { stateLog } from '@/core/utils/logger'

// ==================== DATA SERVICE ====================

export class DataService {

  // ==================== MACHINES ====================

  /**
   * Récupérer toutes les machines depuis IndexedDB
   */
  static async getAllMachines(): Promise<DatabaseMachine[]> {
    try {
      const machines = await database.machines.orderBy('name').toArray()
      stateLog.debug('📦 Machines retrieved from IndexedDB', { count: machines.length })
      return machines
    } catch (error) {
      stateLog.error('❌ Failed to get machines from IndexedDB', { error })
      return []
    }
  }

  /**
   * Récupérer une machine par ID
   */
  static async getMachineById(id: string | number): Promise<DatabaseMachine | null> {
    try {
      const numericId = typeof id === 'string' ? Number(id) : id
      if (!Number.isFinite(numericId)) {
        stateLog.warn('⚠️ Invalid machine ID provided', { id })
        return null
      }

      const machine = await database.machines.get(numericId)
      return machine || null
    } catch (error) {
      stateLog.error('❌ Failed to get machine by ID', { id, error })
      return null
    }
  }

  /**
   * Récupérer les machines connectées
   */
  static async getConnectedMachines(): Promise<DatabaseMachine[]> {
    try {
      const machines = await database.machines
        .where('lastConnectionState')
        .equals('connected')
        .toArray()

      stateLog.debug('📡 Connected machines retrieved', { count: machines.length })
      return machines
    } catch (error) {
      stateLog.error('❌ Failed to get connected machines', { error })
      return []
    }
  }

  // ==================== SITES ====================

  /**
   * Récupérer tous les sites depuis IndexedDB
   */
  static async getAllSites(): Promise<DatabaseSite[]> {
    try {
      const sites = await database.sites.orderBy('name').toArray()
      stateLog.debug('📍 Sites retrieved from IndexedDB', { count: sites.length })
      return sites
    } catch (error) {
      stateLog.error('❌ Failed to get sites from IndexedDB', { error })
      return []
    }
  }

  /**
   * Récupérer un site par ID
   */
  static async getSiteById(id: string | number): Promise<DatabaseSite | null> {
    try {
      const numericId = typeof id === 'string' ? Number(id) : id
      if (!Number.isFinite(numericId)) {
        stateLog.warn('⚠️ Invalid site ID provided', { id })
        return null
      }

      const site = await database.sites.get(numericId)
      return site || null
    } catch (error) {
      stateLog.error('❌ Failed to get site by ID', { id, error })
      return null
    }
  }

  /**
   * Rechercher des sites par nom
   */
  static async searchSites(query: string): Promise<DatabaseSite[]> {
    try {
      const normalizedQuery = query.trim().toLowerCase()
      if (!normalizedQuery) {
        return []
      }

      const sites = await database.sites
        .filter((site) => {
          const name = site.name?.toLowerCase() ?? ''
          const description = site.description?.toLowerCase() ?? ''
          return name.includes(normalizedQuery) || description.includes(normalizedQuery)
        })
        .toArray()

      stateLog.debug('🔍 Sites search completed', { query, count: sites.length })
      return sites
    } catch (error) {
      stateLog.error('❌ Failed to search sites', { query, error })
      return []
    }
  }

  // ==================== INSTALLATIONS ====================

  /**
   * Récupérer toutes les installations
   */
  static async getAllInstallations(): Promise<DatabaseInstallation[]> {
    try {
      const installations = await database.installations.toArray()
      stateLog.debug('🔧 Installations retrieved from IndexedDB', { count: installations.length })
      return installations
    } catch (error) {
      stateLog.error('❌ Failed to get installations from IndexedDB', { error })
      return []
    }
  }

  /**
   * Récupérer les installations actives
   */
  static async getActiveInstallations(): Promise<DatabaseInstallation[]> {
    try {
      const installations = await database.installations
        .where('isActive')
        .equals(1)
        .toArray()

      stateLog.debug('🟢 Active installations retrieved', { count: installations.length })
      return installations
    } catch (error) {
      stateLog.error('❌ Failed to get active installations', { error })
      return []
    }
  }

  /**
   * Récupérer les installations par machine
   */
  static async getInstallationsByMachine(machineId: string | number): Promise<DatabaseInstallation[]> {
    try {
      const installations = await database.installations
        .where('machineId')
        .equals(String(machineId))
        .toArray()

      return installations
    } catch (error) {
      stateLog.error('❌ Failed to get installations by machine', { machineId, error })
      return []
    }
  }

  /**
   * Récupérer les installations par site
   */
  static async getInstallationsBySite(siteId: string | number): Promise<DatabaseInstallation[]> {
    try {
      const installations = await database.installations
        .where('siteId')
        .equals(String(siteId))
        .toArray()

      return installations
    } catch (error) {
      stateLog.error('❌ Failed to get installations by site', { siteId, error })
      return []
    }
  }

  // ==================== CAMPAIGNS ====================

  /**
   * Récupérer toutes les campagnes
   */
  static async getAllCampaigns(): Promise<DatabaseCampaign[]> {
    try {
      const campaigns = await database.campaigns
        .orderBy('createdAt')
        .reverse()
        .toArray()

      stateLog.debug('📋 Campaigns retrieved from IndexedDB', { count: campaigns.length })
      return campaigns
    } catch (error) {
      stateLog.error('❌ Failed to get campaigns from IndexedDB', { error })
      return []
    }
  }

  /**
   * Récupérer les campagnes par statut
   */
  static async getCampaignsByStatus(status: string): Promise<DatabaseCampaign[]> {
    try {
      const campaigns = await database.campaigns
        .where('status')
        .equals(status)
        .toArray()

      stateLog.debug('📊 Campaigns by status retrieved', { status, count: campaigns.length })
      return campaigns
    } catch (error) {
      stateLog.error('❌ Failed to get campaigns by status', { status, error })
      return []
    }
  }

  // ==================== DEVICE BUNDLES ====================

  /**
   * Construire les bundles de devices avec toutes les relations
   */
  static async buildDeviceBundles(): Promise<any[]> {
    try {
      stateLog.debug('🔄 Building device bundles from IndexedDB...')

      // Récupérer toutes les données en parallèle
      const [machines, sites, installations] = await Promise.all([
        DataService.getAllMachines(),
        DataService.getAllSites(),
        DataService.getAllInstallations()
      ])

      // Créer des maps pour optimiser les lookups
      const installationsByMachine = new Map<string, DatabaseInstallation>()
      const sitesById = new Map<string, DatabaseSite>()

      installations.forEach(installation => {
        installationsByMachine.set(String(installation.machineId), installation)
      })

      sites.forEach(site => {
        sitesById.set(String(site.id), site)
      })

      // Construire les bundles
      const bundles = machines.map((machine) => {
        const installation = installationsByMachine.get(String(machine.id))
        const site = installation ? sitesById.get(String(installation.siteId)) : undefined

        return {
          id: machine.id,
          name: machine.name,
          macAddress: machine.macAddress,
          model: machine.model,
          isActive: installation?.isActive ?? false,
          connected: machine.lastConnectionState?.status === 'connected',
          lastSeenAt: machine.lastSeenAt,

          // Installation info
          installation: installation ? {
            id: installation.id,
            installedAt: installation.createdAt,
            isActive: installation.isActive
          } : null,

          // Site info
          site: site ? {
            id: site.id,
            name: site.name,
            location: {
              latitude: site.lat,
              longitude: site.lng
            }
          } : null,

          // Statistics
          statistics: {
            totalCampaigns: 0, // TODO: Calculer depuis les campaigns
            activeCampaigns: 0,
            totalFiles: 0,
            lastActivity: machine.lastSeenAt
          }
        }
      })

      stateLog.info('✅ Device bundles built successfully', {
        machines: machines.length,
        sites: sites.length,
        installations: installations.length,
        bundles: bundles.length
      })

      return bundles

    } catch (error) {
      stateLog.error('❌ Failed to build device bundles', { error })
      return []
    }
  }

  // ==================== SITE BUNDLES ====================

  /**
   * Construire les bundles de sites avec statistiques
   */
  static async buildSiteBundles(): Promise<any[]> {
    try {
      stateLog.debug('🔄 Building site bundles from IndexedDB...')

      const [sites, installations, machines] = await Promise.all([
        DataService.getAllSites(),
        DataService.getAllInstallations(),
        DataService.getAllMachines()
      ])

      // Maps pour les relations
      const installationsBySite = new Map<string, DatabaseInstallation[]>()
      const machinesById = new Map<string, DatabaseMachine>()

      installations.forEach(installation => {
        const siteId = String(installation.siteId)
        if (!installationsBySite.has(siteId)) {
          installationsBySite.set(siteId, [])
        }
        installationsBySite.get(siteId)!.push(installation)
      })

      machines.forEach(machine => {
        machinesById.set(String(machine.id), machine)
      })

      const bundles = sites.map(site => {
        const siteInstallations = installationsBySite.get(String(site.id)) || []
        const siteMachines = siteInstallations
          .map(i => machinesById.get(String(i.machineId)))
          .filter(Boolean) as DatabaseMachine[]

        return {
          id: site.id,
          name: site.name,
          description: site.description,
          coordinates: site.lat && site.lng ? { latitude: site.lat, longitude: site.lng } : undefined,
          address: site.address,

          // Statistics
          statistics: {
            totalInstallations: siteInstallations.length,
            activeInstallations: siteInstallations.filter(i => i.isActive).length,
            totalMachines: siteMachines.length,
            connectedMachines: siteMachines.filter(m => m.lastConnectionState?.status === 'connected').length,
            lastActivity: site.lastActivity
          },

          // Relations
          installations: siteInstallations.map(inst => ({
            id: inst.id,
            machineId: inst.machineId,
            isActive: inst.isActive,
            installedAt: inst.createdAt
          })),

          machines: siteMachines.map(machine => ({
            id: machine.id,
            name: machine.name,
            macAddress: machine.macAddress,
           connected: machine.lastConnectionState?.status === 'connected'
          }))
        }
      })

      stateLog.info('✅ Site bundles built successfully', {
        sites: sites.length,
        bundles: bundles.length
      })

      return bundles

    } catch (error) {
      stateLog.error('❌ Failed to build site bundles', { error })
      return []
    }
  }

  // ==================== UTILITIES ====================

  /**
   * Vérifier si les données sont synchronisées récemment
   */
  static async isDataFresh(maxAgeMinutes: number = 5): Promise<boolean> {
    try {
      const lastSync = await database.getAppState<Date>('lastDataSync')
      if (!lastSync) return false

      const now = new Date()
      const ageMinutes = (now.getTime() - new Date(lastSync).getTime()) / (1000 * 60)

      return ageMinutes < maxAgeMinutes
    } catch (error) {
      stateLog.error('❌ Failed to check data freshness', { error })
      return false
    }
  }

  /**
   * Obtenir les statistiques de la base de données
   */
  static async getDatabaseStats(): Promise<{
    machines: number
    sites: number
    installations: number
    campaigns: number
    lastSync?: Date
  }> {
    try {
      const [machineCount, siteCount, installationCount, campaignCount, lastSync] = await Promise.all([
        database.machines.count(),
        database.sites.count(),
        database.installations.count(),
        database.campaigns.count(),
        database.getAppState<Date>('lastDataSync')
      ])

      const stats = {
        machines: machineCount,
        sites: siteCount,
        installations: installationCount,
        campaigns: campaignCount
      }

      if (lastSync) {
        return { ...stats, lastSync: new Date(lastSync) }
      }

      return stats

    } catch (error) {
      stateLog.error('❌ Failed to get database stats', { error })
      return {
        machines: 0,
        sites: 0,
        installations: 0,
        campaigns: 0
      }
    }
  }
}

// ==================== EXPORT ====================

export default DataService
