/**
 * API Endpoints - Centralisation des endpoints du backend
 * Basé sur l'analyse du backend TrackBee Node.js/Express
 */

// Configuration de base
export const API_BASE_URL = '/api'

// ==================== ENDPOINTS CONFIGURATION ====================

/**
 * Endpoints d'authentification
 */
export const AUTH_ENDPOINTS = {
  // Authentification utilisateur
  register: '/api/auth/register',
  login: (apiRoute: string) => apiRoute, // Utilise USER_API_SIGNIN depuis env
  logout: '/api/auth/logout',

  // Authentification machine
  machineLogin: (apiRoute: string) => apiRoute, // Utilise MACHINE_API_SIGNIN depuis env

  // Vérification email
  verifyEmail: '/verify-email',
  setPassword: '/set-password',

  // Utilisateur connecté
  hydrate: '/api/me/hydrate'
} as const

/**
 * Endpoints pour les machines
 */
export const MACHINE_ENDPOINTS = {
  // Admin uniquement
  all: '/api/machine/all',
  findByIdOrMac: '/api/machine/findByIdOrMac',
  update: (id: string | number) => `/api/machine/${id}`,
  create: '/api/machine/create',

  // Modérateur ou admin
  assign: '/api/machine/assign',
  allByMod: '/api/machine/allByMod',

  // System
  health: '/api/health'
} as const

/**
 * Endpoints pour les installations
 */
export const INSTALLATION_ENDPOINTS = {
  // CRUD installations
  create: '/api/insta',
  move: (id: string | number) => `/api/insta/${id}/move`,
  uninstall: (id: string | number) => `/api/insta/${id}/uninstall`,

  // Requêtes par machine
  listForMachine: (machineId: string | number) => `/machine/${machineId}`,
  currentForMachine: (machineId: string | number) => `/machine/${machineId}/current`,

  // Géolocalisation
  nearestBase: '/api/insta/nearest-base',

  // Campagnes et calculs
  createCampaignAndRun: (id: string | number) => `/api/insta/${id}/calc`,
  listCalcs: (id: string | number) => `/api/insta/${id}/calcs`
} as const

/**
 * Endpoints pour les sites
 */
export const SITE_ENDPOINTS = {
  // CRUD sites
  create: '/api/site',
  list: '/api/site',
  getOne: (id: string | number) => `/api/site/${id}`,
  update: (id: string | number) => `/api/site/${id}`,
  delete: (id: string | number) => `/api/site/${id}`,

  // Partage
  share: (id: string | number) => `/api/site/${id}/share`,
  unshare: (id: string | number, userId: string | number) => `/api/site/${id}/share/${userId}`,

  // Machines actives
  listActiveMachines: (id: string | number) => `/api/site/${id}/machines`
} as const

/**
 * Endpoints pour les campagnes
 */
export const CAMPAIGN_ENDPOINTS = {
  // Listings par installation
  listByInstallation: (installationId: string | number) =>
    `/api/campaign/by-installation/${installationId}`,

  // Listings par site et machine
  listBySiteAndMachine: (siteId: string | number, machineId: string | number) =>
    `/api/campaign/by-site/${siteId}/machine/${machineId}`
} as const

/**
 * Endpoints pour le post-processing
 */
export const PROCESSING_ENDPOINTS = {
  // Upload et traitement
  upload: '/pp/upload',
  webhook: '/pp/webhook',
  status: (id: string | number) => `/pp/status/${id}`,
  health: '/pp/health',

  // Lectures et résumés
  listByInstallation: (installationId: string | number) =>
    `/pp/by-installation/${installationId}`,
  listBySiteAndMachine: (siteId: string | number, machineId: string | number) =>
    `/pp/by-site/${siteId}/machine/${machineId}`,
  campaignSummary: (campaignId: string | number) =>
    `/pp/campaign/${campaignId}/summary`
} as const

/**
 * Endpoints RGP (Réseau Géodésique Permanent)
 */
export const RGP_ENDPOINTS = {
  searchBase: '/rgp/search-base',
  updateStations: '/rgp/update'
} as const

/**
 * Endpoints de test (développement)
 */
export const TEST_ENDPOINTS = {
  all: '/api/test/all',
  user: '/api/test/user',
  moderator: '/api/test/mod',
  admin: '/api/test/admin'
} as const

// ==================== GROUPED ENDPOINTS ====================

/**
 * Tous les endpoints regroupés par domaine
 */
export const API_ENDPOINTS = {
  auth: AUTH_ENDPOINTS,
  machines: MACHINE_ENDPOINTS,
  installations: INSTALLATION_ENDPOINTS,
  sites: SITE_ENDPOINTS,
  campaigns: CAMPAIGN_ENDPOINTS,
  processing: PROCESSING_ENDPOINTS,
  rgp: RGP_ENDPOINTS,
  test: TEST_ENDPOINTS
} as const

// ==================== UTILITY TYPES ====================

/**
 * Types pour l'autocomplétion et la validation
 */
export type AuthEndpoint = keyof typeof AUTH_ENDPOINTS
export type MachineEndpoint = keyof typeof MACHINE_ENDPOINTS
export type InstallationEndpoint = keyof typeof INSTALLATION_ENDPOINTS
export type SiteEndpoint = keyof typeof SITE_ENDPOINTS
export type CampaignEndpoint = keyof typeof CAMPAIGN_ENDPOINTS
export type ProcessingEndpoint = keyof typeof PROCESSING_ENDPOINTS
export type RgpEndpoint = keyof typeof RGP_ENDPOINTS
export type TestEndpoint = keyof typeof TEST_ENDPOINTS

/**
 * Type union de tous les endpoints
 */
export type ApiEndpoint =
  | AuthEndpoint
  | MachineEndpoint
  | InstallationEndpoint
  | SiteEndpoint
  | CampaignEndpoint
  | ProcessingEndpoint
  | RgpEndpoint
  | TestEndpoint

// ==================== HELPER FUNCTIONS ====================

/**
 * Construit une URL complète pour un endpoint
 */
export const buildUrl = (endpoint: string): string => {
  if (endpoint.startsWith('/api') || endpoint.startsWith('/pp') || endpoint.startsWith('/rgp')) {
    return endpoint
  }
  return `${API_BASE_URL}${endpoint}`
}

/**
 * Valide qu'un endpoint existe
 */
export const isValidEndpoint = (endpoint: string): boolean => {
  const allEndpoints = Object.values(API_ENDPOINTS).flatMap(category =>
    Object.values(category)
  )
  return allEndpoints.some(ep =>
    typeof ep === 'string' ? ep === endpoint : false
  )
}

// ==================== EXAMPLES ====================

/**
 * Exemples d'utilisation:
 *
 * // Import
 * import { API_ENDPOINTS } from '@/core/services/api/endpoints'
 *
 * // Usage basique
 * const loginUrl = API_ENDPOINTS.auth.login
 * const machinesUrl = API_ENDPOINTS.machines.all
 *
 * // URLs dynamiques
 * const siteUrl = API_ENDPOINTS.sites.getOne(123)
 * const updateUrl = API_ENDPOINTS.machines.update(456)
 *
 * // Dans les services
 * await httpClient.get(API_ENDPOINTS.sites.list)
 * await httpClient.post(API_ENDPOINTS.installations.create, data)
 */