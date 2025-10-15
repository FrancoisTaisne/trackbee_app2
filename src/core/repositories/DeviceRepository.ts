/**
 * Device Repository - Repository pour la logique métier des appareils
 * Centralise la logique de combinaison machines/installations/sites
 */

import { MachineService, SiteService } from '@/core/services/api/services'
import { httpClient } from '@/core/services/api/HttpClient'
import { logger } from '@/core/utils/logger'
import type { Machine, Installation, Site } from '@/core/types'

// ==================== LOGGER SETUP ====================

const deviceLog = {
  debug: (msg: string, data?: unknown) => logger.debug('device-repo', msg, data),
  info: (msg: string, data?: unknown) => logger.info('device-repo', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('device-repo', msg, data),
  error: (msg: string, data?: unknown) => logger.error('device-repo', msg, data)
}

// ==================== TYPES ====================

export interface DeviceBundle {
  machine: Machine
  installation?: Installation
  site?: Site
  status: 'active' | 'inactive' | 'maintenance' | 'error'
  lastSeen?: Date
  batteryLevel?: number
  signalStrength?: number
}

export interface DeviceStatistics {
  totalMachines: number
  activeMachines: number
  machinesWithInstallation: number
  machinesWithoutInstallation: number
  totalSites: number
  sitesWithMachines: number
  averageMachinesPerSite: number
  byStatus: Record<string, number>
  byModel: Record<string, number>
}

export interface CreateDeviceRequest {
  machine: {
    name: string
    macAddress: string
    model?: string
    serialNumber?: string
  }
  installation?: {
    siteId: number
    latitude: number
    longitude: number
    altitude?: number
    description?: string
  }
}

// ==================== DEVICE REPOSITORY ====================

export class DeviceRepository {
  /**
   * Récupérer tous les appareils avec leurs données liées
   */
  static async getBundledDevices(): Promise<DeviceBundle[]> {
    deviceLog.debug('Fetching bundled devices data')

    try {
      // Récupérer toutes les données en parallèle
      const [machines, installations, sites] = await Promise.all([
        MachineService.getAll(),
        this.getInstallations(), // Méthode temporaire en attendant le service
        SiteService.list()
      ])

      // Créer des maps pour optimiser les lookups
      const installationsByMachine = new Map<number, Installation>()
      const sitesById = new Map<number, Site>()

      installations.forEach(installation => {
        installationsByMachine.set(installation.machineId, installation)
      })

      sites.forEach(site => {
        sitesById.set(site.id, site)
      })

      // Combiner les données
      const bundles = machines.map((machine): DeviceBundle => {
        const installation = installationsByMachine.get(machine.id)
        const site = installation ? sitesById.get(installation.siteId) : undefined

        return {
          machine,
          installation,
          site,
          status: this.determineDeviceStatus(machine, installation),
          lastSeen: machine.lastSeen ? (machine.lastSeen instanceof Date ? machine.lastSeen : new Date(machine.lastSeen)) : undefined,
          batteryLevel: machine.batteryLevel,
          signalStrength: machine.signalStrength
        }
      })

      deviceLog.info('Successfully fetched bundled devices', {
        totalMachines: machines.length,
        withInstallation: bundles.filter(b => b.installation).length,
        withSite: bundles.filter(b => b.site).length
      })

      return bundles
    } catch (error) {
      deviceLog.error('Failed to fetch bundled devices', error)
      throw error
    }
  }

  /**
   * Créer un nouvel appareil avec installation optionnelle
   */
  static async createDevice(request: CreateDeviceRequest): Promise<DeviceBundle> {
    deviceLog.debug('Creating new device', { request })

    try {
      // Créer la machine
      const machine = await MachineService.create(request.machine)

      // Créer l'installation si fournie
      let installation: Installation | undefined
      if (request.installation) {
        installation = await this.createInstallation({
          ...request.installation,
          machineId: machine.id
        })
      }

      // Récupérer le site si installation créée
      let site: Site | undefined
      if (installation) {
        site = await SiteService.getOne(installation.siteId)
      }

      const bundle: DeviceBundle = {
        machine,
        installation,
        site,
        status: this.determineDeviceStatus(machine, installation)
      }

      deviceLog.info('Successfully created device', {
        machineId: machine.id,
        hasInstallation: !!installation,
        hasSite: !!site
      })

      return bundle
    } catch (error) {
      deviceLog.error('Failed to create device', error)
      throw error
    }
  }

  /**
   * Obtenir les statistiques des appareils
   */
  static async getStatistics(): Promise<DeviceStatistics> {
    deviceLog.debug('Calculating device statistics')

    try {
      const bundles = await this.getBundledDevices()
      const sites = await SiteService.list()

      const stats: DeviceStatistics = {
        totalMachines: bundles.length,
        activeMachines: bundles.filter(b => b.status === 'active').length,
        machinesWithInstallation: bundles.filter(b => b.installation).length,
        machinesWithoutInstallation: bundles.filter(b => !b.installation).length,
        totalSites: sites.length,
        sitesWithMachines: sites.filter(site =>
          bundles.some(b => b.site?.id === site.id)
        ).length,
        averageMachinesPerSite: sites.length > 0 ? bundles.filter(b => b.site).length / sites.length : 0,
        byStatus: {},
        byModel: {}
      }

      // Calculer les statistiques par statut et modèle
      bundles.forEach(bundle => {
        // Par statut
        stats.byStatus[bundle.status] = (stats.byStatus[bundle.status] || 0) + 1

        // Par modèle
        if (bundle.machine.model) {
          stats.byModel[bundle.machine.model] = (stats.byModel[bundle.machine.model] || 0) + 1
        }
      })

      deviceLog.info('Calculated device statistics', stats)

      return stats
    } catch (error) {
      deviceLog.error('Failed to calculate statistics', error)
      throw error
    }
  }

  /**
   * Rechercher des appareils avec filtres avancés
   */
  static async searchDevices(filters: {
    name?: string
    model?: string
    status?: DeviceBundle['status']
    siteId?: number
    hasInstallation?: boolean
    batteryLevelMin?: number
    signalStrengthMin?: number
  }): Promise<DeviceBundle[]> {
    deviceLog.debug('Searching devices with filters', filters)

    try {
      const bundles = await this.getBundledDevices()

      const filtered = bundles.filter(bundle => {
        // Filtre par nom
        if (filters.name && !bundle.machine.name.toLowerCase().includes(filters.name.toLowerCase())) {
          return false
        }

        // Filtre par modèle
        if (filters.model && bundle.machine.model !== filters.model) {
          return false
        }

        // Filtre par statut
        if (filters.status && bundle.status !== filters.status) {
          return false
        }

        // Filtre par site
        if (filters.siteId && bundle.site?.id !== filters.siteId) {
          return false
        }

        // Filtre présence installation
        if (filters.hasInstallation !== undefined) {
          const hasInstallation = !!bundle.installation
          if (hasInstallation !== filters.hasInstallation) {
            return false
          }
        }

        // Filtre niveau batterie
        if (filters.batteryLevelMin &&
            (!bundle.batteryLevel || bundle.batteryLevel < filters.batteryLevelMin)) {
          return false
        }

        // Filtre force du signal
        if (filters.signalStrengthMin &&
            (!bundle.signalStrength || bundle.signalStrength < filters.signalStrengthMin)) {
          return false
        }

        return true
      })

      deviceLog.info('Device search completed', {
        totalFound: filtered.length,
        filters
      })

      return filtered
    } catch (error) {
      deviceLog.error('Failed to search devices', error)
      throw error
    }
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Déterminer le statut d'un appareil
   */
  private static determineDeviceStatus(
    machine: Machine,
    installation?: Installation
  ): DeviceBundle['status'] {
    if (machine.status === 'maintenance') return 'maintenance'
    if (machine.status === 'error') return 'error'
    if (!installation) return 'inactive'
    if (installation.isActive) return 'active'
    return 'inactive'
  }

  /**
   * Récupérer les installations (méthode temporaire)
   */
  private static async getInstallations(): Promise<Installation[]> {
    const response = await httpClient.get<Installation[]>('/api/installations')
    return response.data || []
  }

  /**
   * Créer une installation (méthode temporaire)
   */
  private static async createInstallation(data: {
    machineId: number
    siteId: number
    latitude: number
    longitude: number
    altitude?: number
    description?: string
  }): Promise<Installation> {
    const response = await httpClient.post<Installation>('/api/insta', data)
    if (!response.data) {
      throw new Error('No data in create installation response')
    }
    return response.data
  }
}

// ==================== EXPORT ====================

export default DeviceRepository
