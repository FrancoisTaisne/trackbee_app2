import type { HydrateData } from '@/core/hooks/useHydrate'
import type { BleExtendedConnectionState } from '@/core/state/stores/ble.store'
import type {
  Machine,
  Site,
  Installation,
  Campaign,
  Calculation
} from '@/core/types'
import type { DeviceBundle } from '../types'

const sanitizePositiveId = (value: unknown): number | null => {
  const parsed = typeof value === 'string' ? Number(value) : value
  return Number.isInteger(parsed) && (parsed as number) > 0 ? (parsed as number) : null
}

export interface MapHydrationToDeviceBundlesParams {
  hydrateData?: HydrateData
  machines: Machine[]
  sites: Site[]
  bleConnections: Record<string, BleExtendedConnectionState | undefined>
}

export const mapHydrationToDeviceBundles = ({
  hydrateData,
  machines,
  sites,
  bleConnections
}: MapHydrationToDeviceBundlesParams): DeviceBundle[] => {
  if (!hydrateData) return []

  const installationsByMachine = new Map<number, Installation>()
  hydrateData.installations?.forEach((installation) => {
    const machineId = sanitizePositiveId(installation.machineId)
    const siteId = sanitizePositiveId(installation.siteId)
    if (!machineId || !siteId) return

    installationsByMachine.set(machineId, {
      id: installation.id,
      siteId,
      machineId,
      name: installation.installationRef,
      description: undefined,
      positionIndex: installation.positionIndex,
      installationType: undefined,
      coordinates: undefined,
      isActive: installation.isActive,
      site: undefined,
      machine: undefined,
      createdAt: installation.installedAt ?? new Date().toISOString(),
      updatedAt: installation.uninstalledAt ?? installation.installedAt ?? new Date().toISOString()
    })
  })

  const campaignsByMachine = new Map<number, Campaign[]>()
  hydrateData.campaigns?.forEach((campaign) => {
    const machineId = sanitizePositiveId(campaign.machineId)
    const siteId = sanitizePositiveId(campaign.siteId)
    if (!machineId || !siteId) return

    const normalized: Campaign = {
      id: campaign.id,
      siteId,
      machineId,
      installationId: sanitizePositiveId(campaign.installationId) ?? undefined,
      name: campaign.name,
      description: campaign.description,
      type: campaign.type as Campaign['type'],
      status: campaign.status as Campaign['status'],
      duration_s: undefined,
      period_s: undefined,
      priority: undefined,
      tags: undefined,
      scheduledAt: campaign.scheduledAt ?? undefined,
      startedAt: undefined,
      completedAt: undefined,
      rrule: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const existing = campaignsByMachine.get(machineId) ?? []
    existing.push(normalized)
    campaignsByMachine.set(machineId, existing)
  })

  const calculationsByMachine = new Map<number, Calculation[]>()
  hydrateData.calculations?.forEach((calculation) => {
    const machineId = sanitizePositiveId(calculation.machineId)
    const siteId = sanitizePositiveId(calculation.siteId)
    const campaignId = sanitizePositiveId(calculation.campaignId)
    if (!machineId || !siteId || !campaignId) return

    const normalized: Calculation = {
      id: calculation.id,
      campaignId,
      siteId,
      machineId,
      installationId: sanitizePositiveId(calculation.installationId) ?? undefined,
      status: calculation.status as Calculation['status'],
      type: calculation.type as Calculation['type'],
      filesCount: undefined,
      resultCoordinates: undefined,
      processingStartedAt: undefined,
      processingCompletedAt: undefined,
      errorMessage: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const existing = calculationsByMachine.get(machineId) ?? []
    existing.push(normalized)
    calculationsByMachine.set(machineId, existing)
  })

  const sitesById = new Map<number, Site>()
  sites.forEach((site) => {
    sitesById.set(site.id, site)
  })

  return machines
    .map((machine) => {
      const machineId = sanitizePositiveId(machine.id)
      if (!machineId) {
        return null
      }

      const normalizedInstallation = installationsByMachine.get(machineId)
      const normalizedSite = normalizedInstallation ? sitesById.get(normalizedInstallation.siteId) : undefined

      const normalizedMachine: Machine = {
        ...machine,
        id: machineId,
        macAddress: machine.macAddress ?? machine.macD ?? '',
        macD: machine.macD ?? machine.macAddress ?? '',
        isActive: machine.isActive ?? true,
        installation: normalizedInstallation,
        createdAt: machine.createdAt ?? new Date().toISOString(),
        updatedAt: machine.updatedAt ?? new Date().toISOString()
      }

      const connection = bleConnections[String(machineId)]
      const normalizedConnection = connection
        ? {
            status: connection.status,
            deviceId: connection.deviceId,
            lastConnection: connection.lastConnection,
            activeCampaigns: connection.activeCampaigns,
            filesByCampaign: connection.filesByCampaign,
            error: connection.error,
            isScanning: connection.isScanning ?? false,
            isConnecting: connection.isConnecting ?? false,
            isProbing: connection.isProbing ?? false,
            isDownloading: connection.isDownloading ?? false
          }
        : undefined

      const bundle: DeviceBundle = {
        machine: normalizedMachine,
        installation: normalizedInstallation,
        site: normalizedSite,
        campaigns: campaignsByMachine.get(machineId) ?? [],
        calculations: calculationsByMachine.get(machineId) ?? [],
        bleConnection: normalizedConnection
      }

      return bundle
    })
    .filter((bundle): bundle is DeviceBundle => bundle !== null)
}
