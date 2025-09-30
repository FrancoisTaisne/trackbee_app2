/**
 * Repositories Index - Export centralisé de tous les repositories
 * Layer de logique métier entre les services API et les composants
 */

import DeviceRepository from './DeviceRepository'

// Export des types
export type {
  DeviceBundle,
  DeviceStatistics,
  CreateDeviceRequest
} from './DeviceRepository'

// Export des repositories
export { DeviceRepository }

// Export par défaut
export const repositories = {
  devices: DeviceRepository
} as const

export default repositories