import { describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AppError } from '@/core/types/common'
import { bleManager } from '@/core/services/ble/BleManager'
import { useDeviceScan } from '@/features/device/hooks/useDeviceScan'

vi.mock('@/core/services/ble/BleManager', () => {
  const scanForDevices = vi.fn()
  const stopScan = vi.fn()

  return {
    bleManager: {
      scanForDevices,
      stopScan
    }
  }
})

import { bleManager } from '@/core/services/ble/BleManager'

const mockedBleManager = vi.mocked(bleManager, true)

describe('useDeviceScan', () => {
  it('collects scan results et déclenche les callbacks', async () => {
    const onFound = vi.fn()
    const onComplete = vi.fn()

    mockedBleManager.scanForDevices.mockResolvedValueOnce([
      {
        deviceId: 'ble-01',
        name: 'TRB1234567890',
        macd: 'AA:BB:CC:DD:EE:FF',
        rssi: -42,
        lastSeen: new Date('2024-01-01T12:00:00.000Z')
      }
    ])

    const { result } = renderHook(() => useDeviceScan())

    await act(async () => {
      await result.current.startScan({
        timeout: 500,
        onDeviceFound: onFound,
        onScanComplete: onComplete
      })
    })

    expect(mockedBleManager.scanForDevices).toHaveBeenCalledWith({ timeout: 500 })
    expect(onFound).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(result.current.devices).toHaveLength(1)
    expect(result.current.isScanning).toBe(false)
    expect(mockedBleManager.stopScan).toHaveBeenCalled()
  })

  it('transforme les erreurs inconnues en AppError', async () => {
    mockedBleManager.scanForDevices.mockRejectedValueOnce(new Error('Bluetooth off'))

    const { result } = renderHook(() => useDeviceScan())

    await expect(
      act(async () => {
        await result.current.startScan()
      })
    ).rejects.toMatchObject({ code: 'BLE_SCAN_FAILED' })

    expect(mockedBleManager.stopScan).toHaveBeenCalled()
  })
})
