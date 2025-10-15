/**
 * useDeviceList Hook - Gestion de la liste des devices
 * Interface pour lister, filtrer, créer et supprimer des devices
 * REFACTORED: Utilise désormais useHydrate pour une approche centralisée
 */

import { useCallback, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDeviceStore } from '@/core/state/stores/device.store'
import { useBleStore } from '@/core/state/stores/ble.store'
import { useEventBus } from '@/core/orchestrator/EventBus'
import { useHydrate } from '@/core/hooks/useHydrate'
import { httpClient } from '@/core/services/api/HttpClient'
import { logger } from '@/core/utils/logger'
import { AppError } from '@/core/types/common'
import { deviceQueryKeys } from './useDevice'
import type { Machine } from '@/core/types'
import type {
  DeviceBundle,
  CreateDeviceData,
  UpdateDeviceData,
  UseDeviceListReturn
} from '../types'
import { mapHydrationToDeviceBundles } from '../utils/mapHydrationToDeviceBundles'

type DeviceError =
  | 'DEVICE_NOT_FOUND'
  | 'INVALID_DEVICE_ID'
  | 'INSTALLATION_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'DEVICE_ALREADY_EXISTS'
  | 'BLE_SCAN_FAILED'

const DeviceErrorMessages: Record<DeviceError, string> = {
  DEVICE_NOT_FOUND: 'Device not found',
  INVALID_DEVICE_ID: 'Invalid device ID',
  INSTALLATION_NOT_FOUND: 'Installation not found',
  NETWORK_ERROR: 'Network error occurred',
  DEVICE_ALREADY_EXISTS: 'Device already exists',
  BLE_SCAN_FAILED: 'BLE scan failed'
}

// ==================== LOGGER SETUP ====================

const deviceListLog = {
  trace: (msg: string, data?: unknown) => logger.trace('deviceList', msg, data),
  debug: (msg: string, data?: unknown) => logger.debug('deviceList', msg, data),
  info: (msg: string, data?: unknown) => logger.info('deviceList', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('deviceList', msg, data),
  error: (msg: string, data?: unknown) => logger.error('deviceList', msg, data)
}

// ==================== API FUNCTIONS ====================

/**
 * Récupère tous les devices avec leurs relations - Backend First Strategy
 */

const createDevice = async (data: CreateDeviceData): Promise<Machine> => {
  const response = await httpClient.post<Machine>('/api/machine', data)
  const created = response.data
  if (!created) {
    throw new AppError('Failed to create device', 'DEVICE_NOT_FOUND')
  }
  return created
}

const updateDevice = async (id: number, data: UpdateDeviceData): Promise<Machine> => {
  const response = await httpClient.put<Machine>(`/api/machine/${id}`, data)
  const updated = response.data
  if (!updated) {
    throw new AppError('Device update failed', 'DEVICE_NOT_FOUND')
  }
  return updated
}

const deleteDevice = async (id: number): Promise<void> => {
  await httpClient.delete(`/api/machine/${id}`)
}

// ==================== DEVICE ERROR HELPER ====================

const createDeviceError = (type: DeviceError, originalError?: Error): AppError => {
  return new AppError(
    DeviceErrorMessages[type],
    type,
    'DEVICE',
    originalError
  )
}

// ==================== MAIN HOOK ====================

/**
 * Hook pour la gestion de la liste des devices
 */
export const useDeviceList = (filters?: {
  search?: string
  siteId?: number
  connected?: boolean
  active?: boolean
}): UseDeviceListReturn => {
  const queryClient = useQueryClient()
  const eventBus = useEventBus()
  const deviceStore = useDeviceStore()
  const bleConnections = useBleStore(state => state.connections)
  const removeBleConnection = useBleStore(state => state.removeConnection)

  // ==================== USE HYDRATE DATA ====================

  const { data: hydrateData, machines, sites, isLoading: hydrateLoading, error: hydrateError, refetch } = useHydrate()

  // Construire les bundles depuis les données hydratées
  const rawDevices = useMemo<DeviceBundle[]>(() =>
    mapHydrationToDeviceBundles({
      hydrateData,
      machines,
      sites,
      bleConnections
    })
  , [hydrateData, machines, sites, bleConnections])

  const isLoading = hydrateLoading
  const queryError = hydrateError

  // ==================== FILTERED DEVICES ====================

  const devices = useMemo(() => {
    let filtered = [...rawDevices]

    // Ajouter l'état de connexion BLE à chaque device
    filtered = filtered.map(bundle => ({
      ...bundle,
      bleConnection: bleConnections[String(bundle.machine.id)]
    }))

    // Filtrage par recherche textuelle
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(bundle =>
        bundle.machine.name.toLowerCase().includes(searchLower) ||
        bundle.machine.description?.toLowerCase().includes(searchLower) ||
        (bundle.machine.macAddress ?? '').toLowerCase().includes(searchLower) ||
        bundle.site?.name?.toLowerCase().includes(searchLower)
      )
    }

    // Filtrage par site
    if (filters?.siteId !== undefined) {
      filtered = filtered.filter(bundle =>
        bundle.installation?.siteId === filters.siteId
      )
    }

    // Filtrage par état de connexion
    if (filters?.connected !== undefined) {
      filtered = filtered.filter(bundle => {
        const connection = bleConnections[String(bundle.machine.id)]
        const isConnected = connection?.status === 'connected'
        return filters.connected ? isConnected : !isConnected
      })
    }

    // Filtrage par statut actif
    if (filters?.active !== undefined) {
      filtered = filtered.filter(bundle =>
        bundle.machine.isActive === filters.active
      )
    }

    // Tri par nom
    filtered.sort((a, b) => a.machine.name.localeCompare(b.machine.name))

    deviceListLog.debug('Devices filtered', {
      total: rawDevices.length,
      filtered: filtered.length,
      filters
    })

    return filtered
  }, [rawDevices, bleConnections, filters])

  // ==================== MUTATIONS ====================

  const createDeviceMutation = useMutation({
    mutationFn: createDevice,
    onSuccess: (newDevice) => {
      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: deviceQueryKeys.lists() })

      // Mettre à jour le store local
      // TODO: deviceStore.addDevice not available yet

      // Événement global
      eventBus.emit({ type: 'device:created', data: { device: newDevice } } as any)

      deviceListLog.info('Device created and caches updated', { device: newDevice })
    },
    onError: (error) => {
      deviceListLog.error('Device creation failed', error)
      throw createDeviceError('DEVICE_ALREADY_EXISTS', error as Error)
    }
  })

  const updateDeviceMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDeviceData }) =>
      updateDevice(id, data),
    onSuccess: (updatedDevice) => {
      // Invalider les caches spécifiques
      queryClient.invalidateQueries({ queryKey: deviceQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: deviceQueryKeys.detail(updatedDevice.id) })
      queryClient.invalidateQueries({ queryKey: deviceQueryKeys.bundle(updatedDevice.id) })

      // Mettre à jour le store local
      // TODO: deviceStore.updateDevice not available yet

      // Événement global
      eventBus.emit({ type: 'device:updated', data: { deviceId: String(updatedDevice.id) } } as any)

      deviceListLog.info('Device updated and caches invalidated', { device: updatedDevice })
    },
    onError: (error) => {
      deviceListLog.error('Device update failed', error)
      throw createDeviceError('DEVICE_NOT_FOUND', error as Error)
    }
  })

  const deleteDeviceMutation = useMutation({
    mutationFn: deleteDevice,
    onSuccess: (_, deletedId) => {
      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: deviceQueryKeys.lists() })
      queryClient.removeQueries({ queryKey: deviceQueryKeys.detail(deletedId) })
      queryClient.removeQueries({ queryKey: deviceQueryKeys.bundle(deletedId) })

      // Nettoyer le store local
      // TODO: deviceStore.removeDevice not available yet

      // Nettoyer la connexion BLE si elle existe
      removeBleConnection(deletedId)

      // Événement global
      eventBus.emit({ type: 'device:deleted', data: { deviceId: String(deletedId) } } as any)

      deviceListLog.info('Device deleted and cleaned up', { deviceId: deletedId })
    },
    onError: (error) => {
      deviceListLog.error('Device deletion failed', error)
      throw createDeviceError('DEVICE_NOT_FOUND', error as Error)
    }
  })

  // ==================== SCAN FUNCTIONALITY ====================

  const scanForDevices = useCallback(async (options = {}) => {
    deviceListLog.debug('Scanning for devices', { options })

    try {
      // Cette fonction sera implémentée dans useDeviceScan
      // Pour l'instant, on retourne une liste vide
      deviceListLog.warn('Device scanning not yet implemented')
      return []

    } catch (error) {
      deviceListLog.error('Device scan failed', error)
      throw createDeviceError('BLE_SCAN_FAILED', error as Error)
    }
  }, [])

  // ==================== HELPER FUNCTIONS ====================

  const createDeviceHandler = useCallback((data: CreateDeviceData) => {
    return createDeviceMutation.mutateAsync(data)
  }, [createDeviceMutation])

  const updateDeviceHandler = useCallback((id: number, data: UpdateDeviceData) => {
    return updateDeviceMutation.mutateAsync({ id, data })
  }, [updateDeviceMutation])

  const deleteDeviceHandler = useCallback((id: number) => {
    return deleteDeviceMutation.mutateAsync(id)
  }, [deleteDeviceMutation])

  // ==================== RETURN ====================

  const error = queryError as Error | null

  return {
    devices,
    isLoading,
    error,
    refetch: async () => { refetch() },
    createDevice: createDeviceHandler,
    updateDevice: updateDeviceHandler,
    deleteDevice: deleteDeviceHandler,
    scanForDevices
  }
}

// ==================== EXPORT ====================

export default useDeviceList
