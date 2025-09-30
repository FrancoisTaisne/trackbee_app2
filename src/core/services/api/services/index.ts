/**
 * API Services Index - Centralisation de tous les services API
 * Point d'entrée unique pour toutes les requêtes backend
 */

// Import des services traditionnels
import AuthService from './AuthService'
import MachineService from './MachineService'
import SiteService from './SiteService'

// Import des nouveaux services dynamiques
import { dynamicApiService, createDynamicApiService } from '../DynamicApiService'
import { openApiDiscovery } from '../OpenApiDiscovery'

// Import des types
export type {
  LoginResponse,
  RegisterResponse,
  RefreshResponse,
  MachineLoginCredentials,
  MachineLoginResponse
} from './AuthService'

export type {
  CreateMachineData,
  UpdateMachineData,
  AssignMachineData,
  MachineSearchQuery
} from './MachineService'

export type {
  CreateSiteData,
  UpdateSiteData,
  ShareSiteData,
  SiteWithMachines
} from './SiteService'

// Types des services dynamiques
export type {
  DynamicEndpoint,
  ApiOperation,
  DynamicApiServiceOptions
} from '../DynamicApiService'

export type {
  OpenApiSpec,
  DiscoveredEndpoint,
  ApiInfo,
  DiscoveryResult
} from '../OpenApiDiscovery'

// ==================== SERVICES EXPORT ====================

/**
 * Services API centralisés
 */
export const apiServices = {
  auth: AuthService,
  machines: MachineService,
  sites: SiteService,
  // Nouveaux services dynamiques
  dynamic: dynamicApiService,
  discovery: openApiDiscovery
} as const

// Export individuels pour usage direct
export {
  AuthService,
  MachineService,
  SiteService,
  // Services dynamiques
  dynamicApiService,
  createDynamicApiService,
  openApiDiscovery
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Vérifie si tous les services sont disponibles
 */
export const checkServicesAvailability = (): boolean => {
  const services = [AuthService, MachineService, SiteService]
  return services.every(service => typeof service === 'object' && service !== null)
}

/**
 * Liste tous les services disponibles
 */
export const getAvailableServices = (): string[] => {
  return Object.keys(apiServices)
}

// ==================== DEFAULT EXPORT ====================

/**
 * Export par défaut des services API
 */
export default apiServices

// ==================== USAGE EXAMPLES ====================

/**
 * Exemples d'utilisation:
 *
 * // Import complet
 * import apiServices from '@/core/services/api/services'
 *
 * // Import individuel
 * import { AuthService, MachineService } from '@/core/services/api/services'
 *
 * // Usage
 * const login = await apiServices.auth.login(credentials)
 * const machines = await apiServices.machines.getAll()
 * const sites = await apiServices.sites.list()
 *
 * // Ou directement
 * const user = await AuthService.hydrate()
 * const machine = await MachineService.findByIdOrMac({ id: 123 })
 * const site = await SiteService.getOne(456)
 *
 * // Services dynamiques (nouveaux)
 * import { useDynamicApi, useDynamicAuth } from '@/core/services/api/hooks/useDynamicApi'
 *
 * // Dans un composant React
 * const { api, endpoints, getEndpoint } = useDynamicApi()
 * const { login, logout } = useDynamicAuth()
 *
 * // API dynamique directe
 * await dynamicApiService.discoverEndpoints()
 * const operation = dynamicApiService.createOperation('/api/site', 'GET')
 * const response = await operation.call()
 */