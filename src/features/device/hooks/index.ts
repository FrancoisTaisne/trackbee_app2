/**
 * Device Hooks Export Index
 * Point d'entrée centralisé pour tous les hooks de gestion des devices
 */

export { useDevice, deviceQueryKeys } from './useDevice'
export { useDeviceList } from './useDeviceList'
export { useDeviceScan } from './useDeviceScan'

// Re-export types for convenience
export type {
  UseDeviceDetailReturn,
  UseDeviceListReturn,
  UseDeviceScanReturn
} from '../types'