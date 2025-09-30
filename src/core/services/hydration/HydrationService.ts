import { z } from 'zod'
import { httpClient } from '@/core/services/api/HttpClient'
import { storageManager } from '@/core/services/storage/StorageManager'
import { database } from '@/core/database/schema'
import { getSiteRepository } from '@/core/repositories/SiteRepository'
import { getInstallationRepository } from '@/core/repositories/InstallationRepository'
import { logger } from '@/core/utils/logger'

const HYDRATION_ENDPOINT = '/api/me/hydrate?includeCampaigns=1&includeCalculations=1'
const HYDRATION_CACHE_KEY = 'hydrate_cache'
const HYDRATION_ETAG_KEY = 'hydrate_etag'

const RawHydrationSchema = z.object({
  machines: z.array(z.record(z.any())).optional(),
  sites: z
    .object({
      owned: z.array(z.record(z.any())).optional(),
      shared: z
        .object({
          viewer: z.array(z.record(z.any())).optional(),
          editor: z.array(z.record(z.any())).optional()
        })
        .optional()
    })
    .optional(),
  campaigns: z.array(z.record(z.any())).optional(),
  calculations: z.array(z.record(z.any())).optional()
}).passthrough()

export interface HydrationInstallation {
  id: number
  siteId: number
  machineId: number
  installationRef?: string
  positionIndex?: number
  installedAt?: string
  uninstalledAt?: string
  isActive: boolean
}

export interface HydrationMachine {
  id: number
  name: string
  macAddress: string
  description?: string
  model?: string
  type: string
  isActive: boolean
  lastSeenAt?: string
  installation?: HydrationInstallation
}

export interface HydrationSite {
  id: number
  name: string
  description?: string
  address?: string
  lat?: number
  lng?: number
  ownership: 'owner' | 'shared'
  sharedRole?: 'viewer' | 'editor'
  installations: HydrationInstallation[]
}

export interface HydrationCampaign {
  id: number
  siteId?: number
  machineId?: number
  installationId?: number
  name: string
  description?: string
  type: 'static_simple' | 'static_multiple' | 'kinematic'
  status: string
  scheduledAt?: string
}

export interface HydrationCalculation {
  id: number
  campaignId?: number
  siteId?: number
  machineId?: number
  installationId?: number
  status: string
  type: 'static_simple' | 'static_multiple' | 'kinematic'
}

export interface HydrationData {
  machines: HydrationMachine[]
  sites: HydrationSite[]
  installations: HydrationInstallation[]
  campaigns: HydrationCampaign[]
  calculations: HydrationCalculation[]
}

const log = (message: string, extras?: Record<string, unknown>) => logger.info('hydrate', message, extras)

export const HydrationService = {
  parse(raw: unknown): HydrationData {
    const payload = RawHydrationSchema.parse(raw ?? {})

    const machineResult = normalizeMachines(payload.machines ?? [])
    const siteResult = normalizeSites(payload.sites)

    const installationMap = new Map<number, HydrationInstallation>()
    machineResult.installations.forEach(inst => installationMap.set(inst.id, inst))
    siteResult.installations.forEach(inst => {
      if (!installationMap.has(inst.id)) installationMap.set(inst.id, inst)
    })

    return {
      machines: machineResult.machines,
      sites: siteResult.sites,
      installations: Array.from(installationMap.values()),
      campaigns: normalizeCampaigns(payload.campaigns ?? []),
      calculations: normalizeCalculations(payload.calculations ?? [])
    }
  },

  async fetch(options: { force?: boolean } = {}): Promise<HydrationData> {
    const { force = false } = options
    const previousEtag = force ? null : (await storageManager.getWithFallback<string>(HYDRATION_ETAG_KEY))?.value
    const headers = previousEtag ? { 'If-None-Match': previousEtag } : undefined

    const response = await httpClient.getWithMeta<any>(HYDRATION_ENDPOINT, force ? {} : { headers })

    if (response.status === 304) {
      const cached = await storageManager.getWithFallback<any>(HYDRATION_CACHE_KEY)
      if (!cached?.value) throw new Error('Hydration cache missing for 304 response')
      const data = this.parse(cached.value)
      log('Hydration served from cache (304)', { machines: data.machines.length, sites: data.sites.length })
      return data
    }

    if (!response.data) throw new Error('No data in hydration response')

    const data = this.parse(response.data)
    if (response.headers['etag']) await storageManager.setWithFallback(HYDRATION_ETAG_KEY, response.headers['etag'])
    await storageManager.setWithFallback(HYDRATION_CACHE_KEY, response.data)

    log('Hydration payload fetched from backend', {
      machines: data.machines.length,
      sites: data.sites.length,
      installations: data.installations.length,
      campaigns: data.campaigns.length,
      calculations: data.calculations.length
    })

    return data
  },

  async syncToDexie(data: HydrationData): Promise<void> {
    await database.transaction('rw', [
      database.machines,
      database.sites,
      database.installations,
      database.campaigns,
      database.calculations
    ], async () => {
      await database.machines.clear()
      if (data.machines.length) {
        await database.machines.bulkPut(data.machines.map(toDatabaseMachine))
      }

      if (data.sites.length) {
        await getSiteRepository(database).syncFromBackend(data.sites.map(toDatabaseSite))
      }

      if (data.installations.length) {
        await getInstallationRepository(database).syncFromBackend(data.installations.map(toDatabaseInstallation))
      }

      if (data.campaigns.length) {
        await database.campaigns.bulkPut(data.campaigns.map(toDatabaseCampaign))
      }

      if (data.calculations.length) {
        await database.calculations.bulkPut(data.calculations.map(toDatabaseCalculation))
      }
    })
  },

  async loadFromDexie(): Promise<HydrationData> {
    const [machines, sites, installations, campaigns, calculations] = await Promise.all([
      database.machines.toArray(),
      database.sites.toArray(),
      database.installations.toArray(),
      database.campaigns.toArray(),
      database.calculations.toArray()
    ])

    const installationBySite = new Map<number, HydrationInstallation[]>()
    installations.forEach(inst => {
      const normalized = fromDatabaseInstallation(inst)
      const current = installationBySite.get(normalized.siteId) || []
      current.push(normalized)
      installationBySite.set(normalized.siteId, current)
    })

    return {
      machines: machines.map(fromDatabaseMachine),
      sites: sites.map(site => ({
        ...fromDatabaseSite(site),
        installations: installationBySite.get(site.id) ?? []
      })),
      installations: installations.map(fromDatabaseInstallation),
      campaigns: campaigns.map(fromDatabaseCampaign),
      calculations: calculations.map(fromDatabaseCalculation)
    }
  },

  async clearCache(): Promise<void> {
    await storageManager.removeWithFallback(HYDRATION_CACHE_KEY)
    await storageManager.removeWithFallback(HYDRATION_ETAG_KEY)
  }
}

function normalizeMachines(rawMachines: Array<Record<string, any>>): {
  machines: HydrationMachine[]
  installations: HydrationInstallation[]
} {
  const machines: HydrationMachine[] = []
  const installations: HydrationInstallation[] = []

  for (const raw of rawMachines) {
    if (!raw) continue
    const id = toNumber(raw.id)
    const macAddress = raw.macD || raw.macd || raw.macAddress
    if (!Number.isFinite(id) || !macAddress) continue

    const isActive = raw.status === true || raw.status === 'ACTIVE'
    const installation = raw.installation ? normalizeInstallation(raw.installation, raw.installation.machineId ?? id) : undefined
    if (installation) installations.push(installation)

    machines.push({
      id,
      name: raw.name || `Machine ${macAddress}`,
      macAddress,
      description: raw.description || undefined,
      model: raw.model || undefined,
      type: raw.type || 'trackbee',
      isActive,
      lastSeenAt: toIso(raw.lastSeenAt),
      installation
    })
  }

  return { machines, installations }
}

function normalizeSites(rawSites?: {
  owned?: Array<Record<string, any>>
  shared?: {
    viewer?: Array<Record<string, any>>
    editor?: Array<Record<string, any>>
  }
}): { sites: HydrationSite[]; installations: HydrationInstallation[] } {
  if (!rawSites) return { sites: [], installations: [] }

  const siteMap = new Map<number, HydrationSite>()
  const installations: HydrationInstallation[] = []

  const processSite = (siteRaw: Record<string, any>, ownership: 'owner' | 'shared', sharedRole?: 'viewer' | 'editor') => {
    const id = toNumber(siteRaw?.id)
    if (!Number.isFinite(id)) return

    if (!siteMap.has(id)) {
      siteMap.set(id, {
        id,
        name: siteRaw.name || `Site ${id}`,
        description: siteRaw.description || undefined,
        address: siteRaw.address || undefined,
        lat: toNumber(siteRaw.lat),
        lng: toNumber(siteRaw.lon ?? siteRaw.lng),
        ownership,
        sharedRole,
        installations: []
      })
    } else if (sharedRole) {
      siteMap.get(id)!.sharedRole = sharedRole
    }

    if (Array.isArray(siteRaw.installations)) {
      siteRaw.installations.forEach(instRaw => {
        const inst = normalizeInstallation(instRaw, instRaw.machineId)
        siteMap.get(id)!.installations.push(inst)
        installations.push(inst)
      })
    }
  }

  rawSites.owned?.forEach(site => processSite(site, 'owner'))
  rawSites.shared?.viewer?.forEach(site => processSite(site, 'shared', 'viewer'))
  rawSites.shared?.editor?.forEach(site => processSite(site, 'shared', 'editor'))

  return { sites: Array.from(siteMap.values()), installations }
}

function normalizeCampaigns(rawCampaigns: Array<Record<string, any>>): HydrationCampaign[] {
  return rawCampaigns
    .map(c => {
      const id = toNumber(c.id)
      if (!Number.isFinite(id)) return null
      return {
        id,
        siteId: toNumber(c.siteId),
        machineId: toNumber(c.machineId),
        installationId: toNumber(c.installationId),
        name: c.title || c.seriesRef || `C-${id}`,
        description: c.notes || undefined,
        type: normalizeCampaignType(c.strategy || c.pos_mode || c.type || 'static_multiple'),
        status: typeof c.status === 'string' ? c.status : 'active',
        scheduledAt: toIso(c.planned_start)
      }
    })
    .filter(Boolean) as HydrationCampaign[]
}

function normalizeCalculations(rawCalcs: Array<Record<string, any>>): HydrationCalculation[] {
  return rawCalcs
    .map(calc => {
      const id = toNumber(calc.id)
      if (!Number.isFinite(id)) return null
      return {
        id,
        campaignId: toNumber(calc.campaignId),
        siteId: toNumber(calc.siteId),
        machineId: toNumber(calc.machineId),
        installationId: toNumber(calc.installationId),
        status: typeof calc.status === 'string' ? calc.status : 'queued',
        type: normalizeCampaignType(calc.pos_mode || calc.type || 'static_multiple')
      }
    })
    .filter(Boolean) as HydrationCalculation[]
}

function normalizeInstallation(raw: Record<string, any>, fallbackMachineId?: number): HydrationInstallation {
  const id = toNumber(raw?.id) ?? Date.now()
  return {
    id,
    siteId: toNumber(raw?.siteId) ?? 0,
    machineId: toNumber(raw?.machineId ?? fallbackMachineId) ?? 0,
    installationRef: raw?.installationRef || undefined,
    positionIndex: toNumber(raw?.positionIndex) ?? undefined,
    installedAt: toIso(raw?.installedAt),
    uninstalledAt: toIso(raw?.uninstalledAt),
    isActive: raw?.uninstalledAt == null
  }
}

function toDatabaseMachine(machine: HydrationMachine) {
  return {
    id: machine.id,
    name: machine.name,
    description: machine.description,
    macAddress: machine.macAddress,
    model: machine.model,
    type: machine.type,
    isActive: machine.isActive,
    lastSeenAt: toDate(machine.lastSeenAt),
    createdAt: new Date(),
    updatedAt: new Date(),
    syncedAt: new Date()
  }
}

function toDatabaseSite(site: HydrationSite) {
  return {
    id: site.id,
    name: site.name,
    description: site.description,
    address: site.address,
    location: site.lat != null && site.lng != null ? { lat: site.lat, lng: site.lng } : undefined,
    altitude: undefined,
    userId: 0,
    ownership: site.ownership,
    sharedRole: site.sharedRole,
    isPublic: false,
    installationCount: site.installations.length,
    lastActivity: new Date(),
    tags: [],
    localNotes: undefined,
    syncedAt: new Date()
  }
}

function toDatabaseInstallation(installation: HydrationInstallation) {
  return {
    id: installation.id,
    siteId: installation.siteId,
    machineId: installation.machineId,
    userId: 0,
    installationRef: installation.installationRef,
    positionIndex: installation.positionIndex,
    installedAt: toDate(installation.installedAt) ?? new Date(),
    uninstalledAt: toDate(installation.uninstalledAt),
    isActive: installation.isActive,
    lastActivity: new Date(),
    syncedAt: new Date()
  }
}

function toDatabaseCampaign(campaign: HydrationCampaign) {
  return {
    id: campaign.id,
    siteId: campaign.siteId ?? 0,
    machineId: campaign.machineId ?? 0,
    installationId: campaign.installationId ?? 0,
    name: campaign.name,
    description: campaign.description,
    type: campaign.type,
    status: campaign.status,
    priority: 5,
    tags: [],
    scheduledAt: campaign.scheduledAt ? toDate(campaign.scheduledAt) : undefined,
    startedAt: undefined,
    completedAt: undefined,
    syncedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  }
}

function toDatabaseCalculation(calculation: HydrationCalculation) {
  return {
    id: calculation.id,
    campaignId: calculation.campaignId ?? 0,
    siteId: calculation.siteId ?? 0,
    machineId: calculation.machineId ?? 0,
    installationId: calculation.installationId ?? 0,
    status: calculation.status,
    type: calculation.type,
    createdAt: new Date(),
    updatedAt: new Date(),
    syncedAt: new Date()
  }
}

function fromDatabaseMachine(machine: any): HydrationMachine {
  return {
    id: machine.id,
    name: machine.name,
    macAddress: machine.macAddress,
    description: machine.description,
    model: machine.model,
    type: machine.type || 'trackbee',
    isActive: machine.isActive,
    lastSeenAt: machine.lastSeenAt?.toISOString()
  }
}

function fromDatabaseSite(site: any): HydrationSite {
  return {
    id: site.id,
    name: site.name,
    description: site.description,
    address: site.address,
    lat: site.location?.lat,
    lng: site.location?.lng,
    ownership: site.ownership || 'owner',
    sharedRole: site.sharedRole,
    installations: []
  }
}

function fromDatabaseInstallation(installation: any): HydrationInstallation {
  return {
    id: installation.id,
    siteId: installation.siteId,
    machineId: installation.machineId,
    installationRef: installation.installationRef,
    positionIndex: installation.positionIndex,
    installedAt: installation.installedAt?.toISOString(),
    uninstalledAt: installation.uninstalledAt?.toISOString(),
    isActive: installation.isActive ?? true
  }
}

function fromDatabaseCampaign(campaign: any): HydrationCampaign {
  return {
    id: campaign.id,
    siteId: campaign.siteId,
    machineId: campaign.machineId,
    installationId: campaign.installationId,
    name: campaign.name,
    description: campaign.description,
    type: normalizeCampaignType(campaign.type || 'static_multiple'),
    status: campaign.status,
    scheduledAt: campaign.scheduledAt?.toISOString()
  }
}

function fromDatabaseCalculation(calculation: any): HydrationCalculation {
  return {
    id: calculation.id,
    campaignId: calculation.campaignId,
    siteId: calculation.siteId,
    machineId: calculation.machineId,
    installationId: calculation.installationId,
    status: calculation.status,
    type: normalizeCampaignType(calculation.type || 'static_multiple')
  }
}

function normalizeCampaignType(type: string): 'static_simple' | 'static_multiple' | 'kinematic' {
  const value = (type || '').toLowerCase()
  if (value.includes('kinematic')) return 'kinematic'
  if (value.includes('static') && value.includes('simple')) return 'static_simple'
  return 'static_multiple'
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function toIso(value: unknown): string | undefined {
  if (!value) return undefined
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  }
  return undefined
}

function toDate(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

