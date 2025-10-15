/**
 * Device Store - Gestion état devices/machines
 * Store Zustand pour l'état client des devices IoT
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { Machine, Site, Installation, Campaign, MachineId, SiteId } from '@/core/types/domain'
import type { BleConnectionState, BleDeviceInfo } from '@/core/types/transport'
import { stateLog, logger } from '@/core/utils/logger'
import { bleManager } from '@/core/services/ble/BleManager'
import { storageManager } from '@/core/services/storage/StorageManager'

// ==================== TYPES ====================

interface DeviceState {
  // Collections de données
  machines: Map<string, Machine>
  sites: Map<string, Site>
  installations: Map<string, Installation>
  campaigns: Map<string, Campaign>

  // État BLE
  connections: Map<string, BleConnectionState>
  discoveredDevices: Map<string, BleDeviceInfo>
  knownDevices: Map<string, Machine>
  isScanning: boolean
  scanError: string | null

  // État UI
  selectedDeviceId: string | null
  selectedSiteId: string | null
  showDeviceModal: boolean
  showSiteModal: boolean

  // Cache et synchronisation
  lastSync: Date | null
  syncInProgress: boolean
  syncError: string | null

  // Filters et recherche
  deviceFilters: {
    status?: 'connected' | 'disconnected' | 'error'
    site?: string
    search?: string
  }
}

interface DeviceActions {
  // Gestion des machines
  setMachines: (machines: Machine[]) => void
  addMachine: (machine: Machine) => void
  updateMachine: (id: string, updates: Partial<Machine>) => void
  removeMachine: (id: string) => void
  getMachine: (id: string) => Machine | null

  // Gestion des sites
  setSites: (sites: Site[]) => void
  addSite: (site: Site) => void
  updateSite: (id: string, updates: Partial<Site>) => void
  removeSite: (id: string) => void
  getSite: (id: SiteId) => Site | null

  // Gestion des installations
  setInstallations: (installations: Installation[]) => void
  addInstallation: (installation: Installation) => void
  updateInstallation: (id: string, updates: Partial<Installation>) => void
  removeInstallation: (id: string) => void
  getInstallationByMachine: (machineId: MachineId) => Installation | null

  // Gestion des campagnes
  setCampaigns: (campaigns: Campaign[]) => void
  addCampaign: (campaign: Campaign) => void
  updateCampaign: (id: string, updates: Partial<Campaign>) => void
  removeCampaign: (id: string) => void
  getCampaignsByMachine: (machineId: MachineId) => Campaign[]

  // Actions BLE
  startScan: () => Promise<void>
  stopScan: () => void
  connectDevice: (machineId: MachineId, deviceId?: string) => Promise<boolean>
  disconnectDevice: (machineId: MachineId) => Promise<void>
  updateConnectionState: (machineId: MachineId, state: Partial<BleConnectionState>) => void
  getConnectionState: (machineId: MachineId) => BleConnectionState | null

  // UI Actions
  setSelectedDevice: (id: string | null) => void
  setSelectedSite: (id: string | null) => void
  setDeviceModal: (show: boolean) => void
  setSiteModal: (show: boolean) => void
  setDeviceFilters: (filters: Partial<DeviceState['deviceFilters']>) => void

  // Synchronisation
  syncAll: () => Promise<void>
  syncMachines: () => Promise<void>
  syncSites: () => Promise<void>

  // Utilitaires
  getDeviceBundle: (machineId: MachineId) => {
    machine: Machine | null
    site: Site | null
    installation: Installation | null
    campaigns: Campaign[]
    connection: BleConnectionState | null
  } | null
  cleanup: () => void
}

type DeviceStore = DeviceState & DeviceActions

// ==================== INITIAL STATE ====================

const initialState: DeviceState = {
  machines: new Map(),
  sites: new Map(),
  installations: new Map(),
  campaigns: new Map(),

  connections: new Map(),
  discoveredDevices: new Map(),
  knownDevices: new Map(),
  isScanning: false,
  scanError: null,

  selectedDeviceId: null,
  selectedSiteId: null,
  showDeviceModal: false,
  showSiteModal: false,

  lastSync: null,
  syncInProgress: false,
  syncError: null,

  deviceFilters: {}
}

// ==================== STORAGE KEYS ====================

const STORAGE_KEYS = {
  MACHINES: 'cached_machines',
  SITES: 'cached_sites',
  INSTALLATIONS: 'cached_installations',
  CAMPAIGNS: 'cached_campaigns',
  LAST_SYNC: 'last_device_sync'
} as const

// ==================== STORE ====================

export const useDeviceStore = create<DeviceStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialState,

      // ==================== MACHINES ====================

      setMachines: (machines) => {
        set((state) => {
          state.machines.clear()
          machines.forEach(machine => {
            state.machines.set(String(machine.id), machine)
          })
        })

        stateLog.debug('Machines set', { count: machines.length })

        // Cache asynchrone
        storageManager.set(STORAGE_KEYS.MACHINES, machines).catch(error => {
          stateLog.error('Failed to cache machines', { error })
        })
      },

      addMachine: (machine) => {
        set((state) => {
          state.machines.set(String(machine.id), machine)
        })

        stateLog.debug('Machine added', { id: machine.id, name: machine.name })
      },

      updateMachine: (id, updates) => {
        set((state) => {
          const machine = state.machines.get(String(id))
          if (machine) {
            Object.assign(machine, updates)
          }
        })

        stateLog.debug('Machine updated', { id, updates })
      },

      removeMachine: (id) => {
        set((state) => {
          state.machines.delete(String(id))
          // Nettoyer aussi la connexion
          state.connections.delete(String(id))
        })

        stateLog.debug('Machine removed', { id })
      },

      getMachine: (id) => {
        return get().machines.get(String(id)) || null
      },

      // ==================== SITES ====================

      setSites: (sites) => {
        set((state) => {
          state.sites.clear()
          sites.forEach(site => {
            state.sites.set(String(site.id), site)
          })
        })

        stateLog.debug('Sites set', { count: sites.length })

        // Cache asynchrone
        storageManager.set(STORAGE_KEYS.SITES, sites).catch(error => {
          stateLog.error('Failed to cache sites', { error })
        })
      },

      addSite: (site) => {
        set((state) => {
          state.sites.set(String(site.id), site)
        })

        stateLog.debug('Site added', { id: site.id, name: site.name })
      },

      updateSite: (id, updates) => {
        set((state) => {
          const site = state.sites.get(String(id))
          if (site) {
            Object.assign(site, updates)
          }
        })

        stateLog.debug('Site updated', { id, updates })
      },

      removeSite: (id) => {
        set((state) => {
          state.sites.delete(String(id))
        })

        stateLog.debug('Site removed', { id })
      },

      getSite: (id) => {
        return get().sites.get(String(id)) || null
      },

      // ==================== INSTALLATIONS ====================

      setInstallations: (installations) => {
        set((state) => {
          state.installations.clear()
          installations.forEach(installation => {
            state.installations.set(String(installation.id), installation)
          })
        })

        stateLog.debug('Installations set', { count: installations.length })

        // Cache asynchrone
        storageManager.set(STORAGE_KEYS.INSTALLATIONS, installations).catch(error => {
          stateLog.error('Failed to cache installations', { error })
        })
      },

      addInstallation: (installation) => {
        set((state) => {
          state.installations.set(String(installation.id), installation)
        })

        stateLog.debug('Installation added', { id: installation.id })
      },

      updateInstallation: (id, updates) => {
        set((state) => {
          const installation = state.installations.get(String(id))
          if (installation) {
            Object.assign(installation, updates)
          }
        })

        stateLog.debug('Installation updated', { id, updates })
      },

      removeInstallation: (id) => {
        set((state) => {
          state.installations.delete(String(id))
        })

        stateLog.debug('Installation removed', { id })
      },

      getInstallationByMachine: (machineId) => {
        const installations = Array.from(get().installations.values())
        return installations.find(inst => inst.machineId === machineId) || null
      },

      // ==================== CAMPAIGNS ====================

      setCampaigns: (campaigns) => {
        set((state) => {
          state.campaigns.clear()
          campaigns.forEach(campaign => {
            state.campaigns.set(String(campaign.id), campaign)
          })
        })

        stateLog.debug('Campaigns set', { count: campaigns.length })

        // Cache asynchrone
        storageManager.set(STORAGE_KEYS.CAMPAIGNS, campaigns).catch(error => {
          stateLog.error('Failed to cache campaigns', { error })
        })
      },

      addCampaign: (campaign) => {
        set((state) => {
          state.campaigns.set(String(campaign.id), campaign)
        })

        stateLog.debug('Campaign added', { id: campaign.id, type: campaign.type })
      },

      updateCampaign: (id, updates) => {
        set((state) => {
          const campaign = state.campaigns.get(String(id))
          if (campaign) {
            Object.assign(campaign, updates)
          }
        })

        stateLog.debug('Campaign updated', { id, updates })
      },

      removeCampaign: (id) => {
        set((state) => {
          state.campaigns.delete(String(id))
        })

        stateLog.debug('Campaign removed', { id })
      },

      getCampaignsByMachine: (machineId) => {
        const installation = get().getInstallationByMachine(machineId)
        if (!installation) return []

        const campaigns = Array.from(get().campaigns.values())
        return campaigns.filter(campaign => campaign.installationId === installation.id)
      },

      // ==================== BLE ACTIONS ====================

      startScan: async () => {
        const timer = logger.time('ble', 'Device scan')

        set((state) => {
          state.isScanning = true
          state.scanError = null
          state.discoveredDevices.clear()
        })

        try {
          stateLog.debug('🔍 Starting BLE scan')

          const knownMacs = Array.from(get().knownDevices.values())
            .map((machine: Machine) => machine.macAddress ?? machine.macD ?? null)
            .filter((mac): mac is string => typeof mac === 'string' && mac.trim().length > 0)

          const devices = await bleManager.scanForDevices({
            timeout: 10000,
            knownMacs
          })

          set((state) => {
            devices.forEach(device => {
              state.discoveredDevices.set(device.deviceId, device)
            })
          })

          stateLog.debug('BLE scan completed', { deviceCount: devices.length })

          timer.end({ success: true })

        } catch (error) {
          timer.end({ error })

          set((state) => {
            state.isScanning = false
            state.scanError = error instanceof Error ? error.message : 'Scan failed'
          })

          stateLog.error('❌ Scan failed to start', { error })
        }
      },

      stopScan: () => {
        bleManager.stopScan()

        set((state) => {
          state.isScanning = false
        })

        stateLog.debug('🛑 BLE scan stopped')
      },

      connectDevice: async (machineId, deviceId) => {
        const timer = logger.time('ble', `Connect device ${machineId}`)

        try {
          const machine = get().getMachine(String(machineId))
          if (!machine) {
            throw new Error(`Machine ${machineId} not found`)
          }

          // Mettre à jour l'état de connexion
          get().updateConnectionState(machineId, {
            status: 'connecting',
            error: undefined
          })

          const macAddress = machine.macAddress ?? machine.macD

          stateLog.debug('🔗 Connecting to device', { machineId, deviceId, mac: macAddress })

          // Utiliser deviceId fourni ou scanner par MAC
          let targetDeviceId = deviceId

          if (!targetDeviceId) {
            // Scanner pour trouver le device par MAC
            const discovered = Array.from(get().discoveredDevices.values())
            if (!macAddress) {
              throw new Error(`Machine ${machineId} does not have a MAC address`)
            }

            const normalizedMac = macAddress.replace(/:/g, '').toLowerCase()
            const matchingDevice = discovered.find(device =>
              device.name?.toLowerCase().includes(normalizedMac)
            )

            if (matchingDevice) {
              targetDeviceId = matchingDevice.deviceId
            } else {
              throw new Error(`Device not found for MAC ${macAddress}`)
            }
          }

          // Se connecter via BleManager
          const success = await bleManager.connect(targetDeviceId)

          if (success) {
            get().updateConnectionState(machineId, {
              status: 'connected',
              deviceId: targetDeviceId,
              connectedAt: new Date(),
              error: undefined
            })

            timer.end({ success: true })
            stateLog.info('✅ Device connected', { machineId, deviceId: targetDeviceId })

            return true
          } else {
            throw new Error('Connection failed')
          }

        } catch (error) {
          timer.end({ error })

          get().updateConnectionState(machineId, {
            status: 'error',
            error: error instanceof Error ? error.message : 'Connection failed'
          })

          stateLog.error('❌ Device connection failed', { machineId, error })
          return false
        }
      },

      disconnectDevice: async (machineId) => {
        const timer = logger.time('ble', `Disconnect device ${machineId}`)

        try {
          const connection = get().getConnectionState(machineId)
          if (!connection?.deviceId) {
            stateLog.warn('No connection to disconnect', { machineId })
            return
          }

          stateLog.debug('🔌 Disconnecting device', { machineId, deviceId: connection.deviceId })

          await bleManager.disconnect(connection.deviceId)

          get().updateConnectionState(machineId, {
            status: 'disconnected',
            deviceId: undefined,
            connectedAt: undefined,
            error: undefined
          })

          timer.end({ success: true })
          stateLog.info('✅ Device disconnected', { machineId })

        } catch (error) {
          timer.end({ error })
          stateLog.error('❌ Device disconnection failed', { machineId, error })
        }
      },

      updateConnectionState: (machineId, state) => {
        set((store) => {
          const machineKey = String(machineId)
          const existing = store.connections.get(machineKey) || {
            status: 'disconnected',
            deviceId: undefined,
            connectedAt: undefined,
            error: undefined
          }

          store.connections.set(machineKey, {
            ...existing,
            ...state
          })
        })
      },

      getConnectionState: (machineId) => {
        return get().connections.get(String(machineId)) || null
      },

      // ==================== UI ACTIONS ====================

      setSelectedDevice: (id) => {
        set((state) => {
          state.selectedDeviceId = id
        })
      },

      setSelectedSite: (id) => {
        set((state) => {
          state.selectedSiteId = id
        })
      },

      setDeviceModal: (show) => {
        set((state) => {
          state.showDeviceModal = show
        })
      },

      setSiteModal: (show) => {
        set((state) => {
          state.showSiteModal = show
        })
      },

      setDeviceFilters: (filters) => {
        set((state) => {
          Object.assign(state.deviceFilters, filters)
        })
      },

      // ==================== SYNCHRONISATION ====================

      syncAll: async () => {
        const timer = logger.time('device', 'Sync all')

        set((state) => {
          state.syncInProgress = true
          state.syncError = null
        })

        try {
          stateLog.debug('🔄 Syncing all device data')

          await Promise.all([
            get().syncMachines(),
            get().syncSites()
          ])

          set((state) => {
            state.lastSync = new Date()
          })

          // Persister la date de sync
          await storageManager.set(STORAGE_KEYS.LAST_SYNC, new Date().toISOString())

          timer.end({ success: true })
          stateLog.info('✅ Device sync completed')

        } catch (error) {
          timer.end({ error })

          set((state) => {
            state.syncError = error instanceof Error ? error.message : 'Sync failed'
          })

          stateLog.error('❌ Device sync failed', { error })
        } finally {
          set((state) => {
            state.syncInProgress = false
          })
        }
      },

      syncMachines: async () => {
        // Implementation will depend on API layer
        stateLog.debug('Syncing machines...')
        // TODO: Implement when API layer is ready
      },

      syncSites: async () => {
        // Implementation will depend on API layer
        stateLog.debug('Syncing sites...')
        // TODO: Implement when API layer is ready
      },

      // ==================== UTILITIES ====================

      getDeviceBundle: (machineId) => {
        const machine = get().getMachine(String(machineId))
        if (!machine) return null

        const installation = get().getInstallationByMachine(machineId)
        const site = installation ? get().getSite(installation.siteId) : null
        const campaigns = get().getCampaignsByMachine(machineId)
        const connection = get().getConnectionState(machineId)

        return {
          machine,
          site,
          installation,
          campaigns,
          connection
        }
      },

      cleanup: () => {
        stateLog.debug('🧹 Device store cleanup')

        // Déconnecter tous les devices
        const connections = Array.from(get().connections.keys())
        connections.forEach(machineId => {
          get().disconnectDevice(Number(machineId))
        })

        // Arrêter le scan
        get().stopScan()

        // Reset l'état
        set(() => initialState)
      }
    }))
  )
)

// ==================== SELECTORS ====================

export const deviceSelectors = {
  machines: (state: DeviceStore) => Array.from(state.machines.values()),
  sites: (state: DeviceStore) => Array.from(state.sites.values()),
  installations: (state: DeviceStore) => Array.from(state.installations.values()),
  campaigns: (state: DeviceStore) => Array.from(state.campaigns.values()),

  connectedDevices: (state: DeviceStore) => {
    const machines = Array.from(state.machines.values())
    return machines.filter(machine => {
      const connection = state.connections.get(String(machine.id))
      return connection?.status === 'connected'
    })
  },

  machinesByStatus: (status: BleConnectionState['status']) => (state: DeviceStore) => {
    const machines = Array.from(state.machines.values())
    return machines.filter(machine => {
      const connection = state.connections.get(String(machine.id))
      return connection?.status === status
    })
  },

  filteredMachines: (state: DeviceStore) => {
    let machines = Array.from(state.machines.values())

    const { status, site, search } = state.deviceFilters

    if (status) {
      machines = machines.filter(machine => {
        const connection = state.connections.get(String(machine.id))
        return connection?.status === status
      })
    }

    if (site) {
      machines = machines.filter(machine => {
        const installation = Array.from(state.installations.values())
          .find(inst => inst.machineId === machine.id)
        return installation?.siteId === Number(site)
      })
    }

    if (search) {
      const searchLower = search.toLowerCase()
      machines = machines.filter(machine =>
        machine.name.toLowerCase().includes(searchLower) ||
        (machine.macAddress ?? machine.macD ?? '').toLowerCase().includes(searchLower)
      )
    }

    return machines
  }
}

// ==================== HOOKS ====================

export const useDevices = () => useDeviceStore(deviceSelectors.machines)
export const useSites = () => useDeviceStore(deviceSelectors.sites)
export const useConnectedDevices = () => useDeviceStore(deviceSelectors.connectedDevices)
export const useDeviceConnection = (machineId: MachineId) =>
  useDeviceStore(state => state.getConnectionState(machineId))
export const useDeviceBundle = (machineId: MachineId) =>
  useDeviceStore(state => state.getDeviceBundle(machineId))

// Types exportés
export type { DeviceStore, DeviceState, DeviceActions }
