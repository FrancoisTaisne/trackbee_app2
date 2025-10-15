/**
 * Simplified BLE device scan hook built on top of the shared BleManager service.
 */

import { useState, useCallback } from 'react'
import { bleManager } from '@/core/services/ble/BleManager'
import { logger } from '@/core/utils/logger'
import { AppError } from '@/core/types/common'
import type { BleDevice } from '@/core/types'
import type {
  DeviceScanResult,
  DeviceScanOptions,
  UseDeviceScanReturn
} from '../types'

const scanLog = logger.extend('useDeviceScan')

const DEFAULT_SCAN_TIMEOUT = 10_000

export const useDeviceScan = (): UseDeviceScanReturn => {
  const [isScanning, setIsScanning] = useState(false)
  const [devices, setDevices] = useState<DeviceScanResult[]>([])
  const [error, setError] = useState<Error | null>(null)

  const clearResults = useCallback(() => {
    setDevices([])
  }, [])

  const startScan = useCallback(async (options?: DeviceScanOptions) => {
    const timeout = options?.timeout ?? DEFAULT_SCAN_TIMEOUT

    scanLog.debug('Starting BLE scan', { timeout })
    setIsScanning(true)
    setError(null)
    clearResults()

    try {
      const results = await bleManager.scanForDevices({ timeout })

      const normalized = (results ?? []).map(toDeviceScanResult)
      setDevices(normalized)
      normalized.forEach(result => options?.onDeviceFound?.(result))
      options?.onScanComplete?.(normalized)
      scanLog.info('BLE scan completed', { count: normalized.length })

    } catch (scanError) {
      const fallbackError = scanError instanceof AppError
        ? scanError
        : new AppError('BLE scan failed', 'BLE_SCAN_FAILED', 'BLE', scanError as Error)
      setError(fallbackError)
      scanLog.error('BLE scan failed', fallbackError)
      throw fallbackError
    } finally {
      await bleManager.stopScan()
      setIsScanning(false)
    }
  }, [clearResults])

  const stopScan = useCallback(() => {
    bleManager.stopScan().catch((stopError) => {
      scanLog.warn('Failed to stop BLE scan', { error: stopError })
    })
    setIsScanning(false)
  }, [])

  const connectToDevice = useCallback(async () => {
    throw new AppError('BLE connect is not implemented in useDeviceScan', 'BLE_CONNECTION_FAILED')
  }, [])

  return {
    isScanning,
    devices,
    error,
    startScan,
    stopScan,
    connectToDevice,
    clearResults
  }
}

function toDeviceScanResult(info: { deviceId: string; name: string; macd: string; rssi?: number; lastSeen: Date }): DeviceScanResult {
  const device: BleDevice = {
    id: info.deviceId,
    name: info.name,
    mac: info.macd,
    rssi: info.rssi,
    txPowerLevel: undefined,
    isConnectable: true,
    services: undefined,
    uuids: undefined,
    advertisementData: undefined,
    localName: info.name,
    manufacturerData: undefined,
    lastSeen: info.lastSeen
  }

  return {
    device,
    machine: undefined,
    isKnown: false,
    rssi: info.rssi ?? -80,
    timestamp: info.lastSeen
  }
}
