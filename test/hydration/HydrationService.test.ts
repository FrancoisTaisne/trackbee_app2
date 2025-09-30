import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HydrationService } from '@/core/services/hydration/HydrationService'
import { httpClient } from '@/core/services/api/HttpClient'
import { storageManager } from '@/core/services/storage/StorageManager'

vi.mock('@/core/services/api/HttpClient', () => ({
  httpClient: {
    getWithMeta: vi.fn()
  }
}))

vi.mock('@/core/services/storage/StorageManager', () => {
  const store = new Map<string, unknown>()
  return {
    storageManager: {
      async setWithFallback(key: string, value: unknown) {
        store.set(key, value)
        return 'local'
      },
      async getWithFallback<T = unknown>(key: string) {
        return { value: (store.has(key) ? store.get(key) : null) as T | null, usedType: 'local' as const }
      },
      async remove(key: string) {
        store.delete(key)
      }
    }
  }
})

vi.mock('@/core/utils/env', () => ({
  appConfig: {
    api: { baseUrl: '', currentUrl: '', enabled: true },
    debug: { enabled: false, ble: false, wifi: false, performance: false, state: false, orchestrator: false },
    features: { offlineQueue: true, metrics: true, debugPanel: false },
    isDev: true
  },
  detectPlatform: () => ({ name: 'test', isCapacitor: false, isMobile: false, isWeb: true })
}))

const samplePayload = {
  machines: [
    {
      id: 1,
      name: 'Machine A',
      macD: 'AA:BB:CC:DD:EE:FF',
      status: true,
      installation: {
        id: 101,
        siteId: 10,
        machineId: 1,
        installationRef: '10-1'
      }
    }
  ],
  sites: {
    owned: [
      {
        id: 10,
        name: 'Site Alpha',
        description: 'Test site',
        lat: 48.85,
        lon: 2.35,
        installations: [
          {
            id: 102,
            siteId: 10,
            machineId: 1,
            installationRef: '10-2'
          }
        ]
      }
    ]
  },
  campaigns: [
    {
      id: 201,
      siteId: 10,
      machineId: 1,
      installationId: 101,
      title: 'Campaign Alpha',
      strategy: 'static_simple',
      status: 'active'
    }
  ],
  calculations: [
    {
      id: 301,
      campaignId: 201,
      machineId: 1,
      siteId: 10,
      status: 'queued',
      pos_mode: 'static_multiple'
    }
  ]
}

const mockedGetWithMeta = httpClient.getWithMeta as unknown as vi.Mock


beforeEach(async () => {
  vi.clearAllMocks()
  mockedGetWithMeta.mockReset()

  await storageManager.remove('hydrate_cache', { type: 'local' })
  await storageManager.remove('hydrate_etag', { type: 'local' })
})

describe('HydrationService', () => {
  it('parses backend payload into normalized data', () => {
    const result = HydrationService.parse(samplePayload)
    expect(result.machines).toHaveLength(1)
    expect(result.machines[0].macAddress).toBe('AA:BB:CC:DD:EE:FF')
    expect(result.installations).toHaveLength(2)
    expect(result.sites[0].installations).toHaveLength(1)
  })

  it('fetches payload, stores cache and returns parsed data', async () => {
    mockedGetWithMeta.mockResolvedValue({
      status: 200,
      data: samplePayload,
      headers: { etag: 'W/"123"' }
    })

    const setSpy = vi.spyOn(storageManager, 'setWithFallback')
    const data = await HydrationService.fetch()

    expect(data.machines.length).toBe(1)
    expect(mockedGetWithMeta).toHaveBeenCalledTimes(1)
    expect(setSpy).toHaveBeenCalledWith('hydrate_cache', samplePayload)
  })

  it('uses cached payload when server replies 304', async () => {
    await storageManager.setWithFallback('hydrate_cache', samplePayload, ['local'])
    mockedGetWithMeta.mockResolvedValue({ status: 304, data: null, headers: {} })

    const data = await HydrationService.fetch()
    expect(mockedGetWithMeta).toHaveBeenCalled()
    expect(data.machines[0].name).toBe('Machine A')
  })
})
