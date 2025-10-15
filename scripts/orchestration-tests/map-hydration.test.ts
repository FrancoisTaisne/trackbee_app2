import { describe, expect, it } from 'vitest'
import type { HydrateData } from '@/core/hooks/useHydrate'
import type { BleExtendedConnectionState } from '@/core/state/stores/ble.store'
import type { Machine, Site } from '@/core/types'
import { mapHydrationToDeviceBundles } from '@/features/device/utils/mapHydrationToDeviceBundles'

const baseMachine = (overrides: Partial<Machine> = {}): Machine => ({
  id: 1,
  name: 'TrackBee Alpha',
  description: 'Primary tracker',
  macAddress: 'AA:BB:CC:DD:EE:FF',
  macD: 'AABBCCDDEEFF',
  type: 'trackbee',
  model: 'v1',
  firmwareVersion: '1.0.0',
  batteryLevel: 80,
  isActive: true,
  installation: undefined,
  lastSeen: new Date().toISOString(),
  signalStrength: -40,
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
})

const baseSite = (overrides: Partial<Site> = {}): Site => ({
  id: 1,
  name: 'Paris HQ',
  description: 'Rooftop antenna',
  address: '10 Rue de Test, Paris',
  lat: 48.8566,
  lng: 2.3522,
  altitude: 35,
  coordinateSystem: 'WGS84',
  isPublic: false,
  ownership: 'owner',
  sharedRole: undefined,
  metadata: undefined,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
})

const connectionSnapshot: BleExtendedConnectionState = {
  status: 'connected',
  deviceId: 'ble-001',
  lastConnection: new Date(),
  activeCampaigns: new Set(),
  filesByCampaign: new Map(),
  isScanning: false,
  isConnecting: false,
  isProbing: false,
  isDownloading: false
}

describe('mapHydrationToDeviceBundles', () => {
  it('normalises hydration payload into device bundles', () => {
    const hydrateData: HydrateData = {
      machines: [
        baseMachine(),
        baseMachine({ id: 'invalid' as unknown as number, name: 'Broken machine' })
      ],
      sites: [baseSite()],
      installations: [
        {
          id: 10,
          siteId: 1,
          machineId: 1,
          installationRef: 'Main rooftop',
          positionIndex: 1,
          installedAt: '2024-01-05T12:00:00.000Z',
          uninstalledAt: undefined,
          isActive: true
        }
      ],
      campaigns: [
        {
          id: 20,
          siteId: 1,
          machineId: 1,
          installationId: 10,
          name: 'Routine survey',
          description: 'Weekly survey',
          type: 'static_simple',
          status: 'active',
          scheduledAt: '2024-01-06T09:00:00.000Z'
        }
      ],
      calculations: [
        {
          id: 30,
          siteId: 1,
          machineId: 1,
          campaignId: 20,
          installationId: 10,
          status: 'queued',
          type: 'static_simple'
        }
      ]
    }

    const bleConnections: Record<string, BleExtendedConnectionState> = {
      '1': connectionSnapshot
    }

    const bundles = mapHydrationToDeviceBundles({
      hydrateData,
      machines: hydrateData.machines,
      sites: hydrateData.sites,
      bleConnections
    })

    expect(bundles).toHaveLength(1)
    const bundle = bundles[0]

    expect(bundle.machine.id).toBe(1)
    expect(bundle.machine.macAddress).toBe('AA:BB:CC:DD:EE:FF')
    expect(bundle.installation?.siteId).toBe(1)
    expect(bundle.campaigns).toHaveLength(1)
    expect(bundle.calculations).toHaveLength(1)
    expect(bundle.bleConnection?.status).toBe('connected')
  })

  it('ignores partial entries without valid ids', () => {
    const hydrateData: HydrateData = {
      machines: [baseMachine({ id: 1 })],
      sites: [baseSite()],
      installations: [
        {
          id: 10,
          siteId: 0, // invalid -> should be ignored
          machineId: 1,
          installationRef: 'Invalid site',
          positionIndex: 1,
          installedAt: '2024-01-05T12:00:00.000Z',
          uninstalledAt: undefined,
          isActive: true
        }
      ],
      campaigns: [
        {
          id: 20,
          siteId: 999, // invalid -> ignored
          machineId: 1,
          installationId: 10,
          name: 'Ghost',
          description: 'Invalid campaign',
          type: 'static_simple',
          status: 'active'
        }
      ],
      calculations: [
        {
          id: 30,
          siteId: 1,
          machineId: 0, // invalid
          campaignId: 20,
          installationId: 10,
          status: 'queued',
          type: 'static_simple'
        }
      ]
    }

    const bundles = mapHydrationToDeviceBundles({
      hydrateData,
      machines: hydrateData.machines,
      sites: hydrateData.sites,
      bleConnections: {}
    })

    expect(bundles).toHaveLength(1)
    expect(bundles[0].campaigns).toHaveLength(1)
    expect(bundles[0].calculations).toHaveLength(0)
    expect(bundles[0].site).toBeUndefined()
  })
})
