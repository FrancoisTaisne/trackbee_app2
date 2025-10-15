/**
 * Site Feature Types
 * Types et schémas de validation pour la gestion des sites géographiques
 */

import { z } from 'zod'
import type {
  Site,
  Installation,
  Machine,
  Campaign,
  Calculation,
  SiteId,
  MachineId,
  InstallationId
} from '@/core/types'

// ==================== SITE TYPES ====================

/**
 * Site complet avec toutes ses relations
 */
export interface SiteBundle {
  site: Site
  installations: Installation[]
  machines: Machine[]
  campaigns: Campaign[]
  calculations: Calculation[]
  statistics: SiteStatistics
}

/**
 * Statistiques d'un site
 */
export interface SiteStatistics {
  totalInstallations: number
  activeInstallations: number
  totalMachines: number
  connectedMachines: number
  totalCampaigns: number
  activeCampaigns: number
  completedCalculations: number
  failedCalculations: number
  lastActivity?: Date
}

/**
 * Données pour créer un nouveau site
 */
export interface CreateSiteData {
  name: string
  description?: string
  address?: string
  lat?: number
  lng?: number
  altitude?: number
  coordinateSystem?: string
  isPublic?: boolean
  metadata?: Record<string, unknown>
}

/**
 * Données pour mettre à jour un site
 */
export interface UpdateSiteData {
  name?: string
  description?: string
  address?: string
  lat?: number
  lng?: number
  altitude?: number
  coordinateSystem?: string
  isPublic?: boolean
  metadata?: Record<string, unknown>
}

/**
 * Données pour créer une installation
 */
export interface CreateInstallationData {
  siteId: SiteId
  machineId: MachineId
  name?: string
  description?: string
  installationType?: 'rover' | 'base' | 'static'
  coordinates?: {
    x: number
    y: number
    z?: number
    system: string
  }
}

/**
 * Données pour mettre à jour une installation
 */
export interface UpdateInstallationData {
  name?: string
  description?: string
  installationType?: 'rover' | 'base' | 'static'
  coordinates?: {
    x: number
    y: number
    z?: number
    system: string
  }
}

/**
 * Position géographique pour la carte
 */
export interface MapPosition {
  lat: number
  lng: number
  accuracy?: number
  source: 'gps' | 'user' | 'address' | 'default'
}

/**
 * Bounds géographiques pour la vue carte
 */
export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
  center: MapPosition
  zoom: number
}

/**
 * Options de filtrage des sites
 */
export interface SiteFilters {
  search?: string
  ownership?: 'owner' | 'shared' | 'all'
  hasInstallations?: boolean
  isPublic?: boolean
  coordinateSystem?: string
  bounds?: MapBounds
}

/**
 * Options de tri des sites
 */
export interface SiteSorting {
  field: 'name' | 'createdAt' | 'updatedAt' | 'installationCount' | 'distance'
  direction: 'asc' | 'desc'
  userPosition?: MapPosition // Pour tri par distance
}

/**
 * Résultat de géocodage d'adresse
 */
export interface GeocodeResult {
  address: string
  position: MapPosition
  formattedAddress: string
  components: {
    street?: string
    city?: string
    postalCode?: string
    country?: string
    region?: string
  }
  confidence: number
}

/**
 * Options de géocodage
 */
export interface GeocodeOptions {
  address: string
  bounds?: MapBounds
  language?: string
  region?: string
}

/**
 * Données d'export de site
 */
export interface SiteExportData {
  format: 'json' | 'csv' | 'kml' | 'geojson'
  includeMachines?: boolean
  includeCampaigns?: boolean
  includeCalculations?: boolean
  coordinateSystem?: string
}

/**
 * Résultat d'import de sites
 */
export interface SiteImportResult {
  success: boolean
  imported: number
  failed: number
  errors: Array<{
    line: number
    error: string
    data?: Partial<CreateSiteData>
  }>
  sites: Site[]
}

// ==================== VALIDATION SCHEMAS ====================

/**
 * Schéma pour créer un site
 */
export const CreateSiteSchema = z.object({
  name: z.string()
    .min(1, 'Le nom est obligatoire')
    .max(100, 'Le nom est trop long'),
  description: z.string()
    .max(1000, 'La description est trop longue')
    .optional(),
  address: z.string()
    .max(500, 'L\'adresse est trop longue')
    .optional(),
  lat: z.number()
    .min(-90, 'Latitude invalide')
    .max(90, 'Latitude invalide')
    .optional(),
  lng: z.number()
    .min(-180, 'Longitude invalide')
    .max(180, 'Longitude invalide')
    .optional(),
  altitude: z.number()
    .min(-500, 'Altitude invalide')
    .max(10000, 'Altitude invalide')
    .optional(),
  coordinateSystem: z.string()
    .max(50, 'Système de coordonnées invalide')
    .optional(),
  isPublic: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional()
})

/**
 * Schéma pour mettre à jour un site
 */
export const UpdateSiteSchema = CreateSiteSchema.partial()

/**
 * Schéma pour créer une installation
 */
export const CreateInstallationSchema = z.object({
  siteId: z.number().int().positive(),
  machineId: z.number().int().positive(),
  name: z.string()
    .max(100, 'Le nom est trop long')
    .optional(),
  description: z.string()
    .max(500, 'La description est trop longue')
    .optional(),
  installationType: z.enum(['rover', 'base', 'static']).optional(),
  coordinates: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number().optional(),
    system: z.string().max(50)
  }).optional()
})

/**
 * Schéma pour mettre à jour une installation
 */
export const UpdateInstallationSchema = CreateInstallationSchema.omit({
  siteId: true,
  machineId: true
})

/**
 * Schéma pour la position géographique
 */
export const MapPositionSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
  source: z.enum(['gps', 'user', 'address', 'default'])
})

/**
 * Schéma pour les filtres de site
 */
export const SiteFiltersSchema = z.object({
  search: z.string().optional(),
  ownership: z.enum(['owner', 'shared', 'all']).optional(),
  hasInstallations: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  coordinateSystem: z.string().optional(),
  bounds: z.object({
    north: z.number(),
    south: z.number(),
    east: z.number(),
    west: z.number(),
    center: MapPositionSchema,
    zoom: z.number().min(1).max(20)
  }).optional()
})

// ==================== TYPE GUARDS ====================

/**
 * Vérifie si un objet est un SiteBundle valide
 */
export const isSiteBundle = (obj: unknown): obj is SiteBundle => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'site' in obj &&
    typeof (obj as Record<string, unknown>).site === 'object' &&
    'installations' in obj &&
    Array.isArray((obj as Record<string, unknown>).installations) &&
    'statistics' in obj &&
    typeof (obj as Record<string, unknown>).statistics === 'object'
  )
}

/**
 * Vérifie si un site a une position géographique
 */
export const siteHasPosition = (site: Site): boolean => {
  return typeof site.lat === 'number' && typeof site.lng === 'number'
}

/**
 * Vérifie si un site a des installations actives
 */
export const siteHasActiveInstallations = (bundle: SiteBundle): boolean => {
  return bundle.statistics.activeInstallations > 0
}

/**
 * Vérifie si deux positions sont proches
 */
export const positionsAreClose = (
  pos1: MapPosition,
  pos2: MapPosition,
  threshold = 0.001 // ~100m
): boolean => {
  const latDiff = Math.abs(pos1.lat - pos2.lat)
  const lngDiff = Math.abs(pos1.lng - pos2.lng)
  return latDiff < threshold && lngDiff < threshold
}

// ==================== UTILITY TYPES ====================

/**
 * Hooks return types
 */
export interface UseSiteListReturn {
  sites: SiteBundle[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  createSite: (data: CreateSiteData) => Promise<Site>
  updateSite: (id: SiteId, data: UpdateSiteData) => Promise<Site>
  deleteSite: (id: SiteId) => Promise<void>
  geocodeAddress: (address: string) => Promise<GeocodeResult[]>
}

export interface UseSiteDetailReturn {
  site: SiteBundle | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  updateSite: (data: UpdateSiteData) => Promise<Site>
  deleteSite: () => Promise<void>
  createInstallation: (data: CreateInstallationData) => Promise<Installation>
  updateInstallation: (id: InstallationId, data: UpdateInstallationData) => Promise<Installation>
  removeInstallation: (id: InstallationId) => Promise<void>
  exportSite: (options: SiteExportData) => Promise<Blob>
}

export interface UseSiteMapReturn {
  sites: SiteBundle[]
  bounds: MapBounds | null
  isLoading: boolean
  error: Error | null
  setFilters: (filters: SiteFilters) => void
  setBounds: (bounds: MapBounds) => void
  getCurrentPosition: () => Promise<MapPosition>
  searchNearby: (position: MapPosition, radius: number) => SiteBundle[]
}

/**
 * Component Props Types
 */
export interface SiteListProps {
  filters?: SiteFilters
  sorting?: SiteSorting
  onSiteSelect?: (site: SiteBundle) => void
  showMap?: boolean
  maxItems?: number
}

export interface SiteDetailProps {
  siteId: SiteId
  onSiteUpdate?: (site: Site) => void
  onNavigateToMachine?: (machineId: MachineId) => void
}

export interface SiteMapProps {
  sites: SiteBundle[]
  selectedSite?: SiteBundle
  onSiteSelect?: (site: SiteBundle) => void
  onPositionSelect?: (position: MapPosition) => void
  showControls?: boolean
  height?: string | number
}

export interface SiteFormProps {
  initialData?: Partial<CreateSiteData>
  onSubmit: (data: CreateSiteData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

export interface InstallationFormProps {
  siteId: SiteId
  initialData?: Partial<CreateInstallationData>
  availableMachines: Machine[]
  onSubmit: (data: CreateInstallationData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

// ==================== ERROR TYPES ====================

/**
 * Erreurs spécifiques à la Site Feature
 */
export type SiteError =
  | 'SITE_NOT_FOUND'
  | 'SITE_ALREADY_EXISTS'
  | 'INVALID_COORDINATES'
  | 'GEOCODING_FAILED'
  | 'INSTALLATION_FAILED'
  | 'PERMISSION_DENIED'
  | 'SITE_HAS_INSTALLATIONS'
  | 'MACHINE_ALREADY_INSTALLED'
  | 'COORDINATE_SYSTEM_INVALID'

/**
 * Messages d'erreur localisés
 */
export const SiteErrorMessages: Record<SiteError, string> = {
  SITE_NOT_FOUND: 'Site non trouvé',
  SITE_ALREADY_EXISTS: 'Un site avec ce nom existe déjà',
  INVALID_COORDINATES: 'Coordonnées géographiques invalides',
  GEOCODING_FAILED: 'Échec du géocodage de l\'adresse',
  INSTALLATION_FAILED: 'Échec de l\'installation du device',
  PERMISSION_DENIED: 'Permissions insuffisantes pour ce site',
  SITE_HAS_INSTALLATIONS: 'Impossible de supprimer un site avec des installations',
  MACHINE_ALREADY_INSTALLED: 'Ce device est déjà installé sur ce site',
  COORDINATE_SYSTEM_INVALID: 'Système de coordonnées invalide'
}

// ==================== CONSTANTS ====================

/**
 * Systèmes de coordonnées supportés
 */
export const COORDINATE_SYSTEMS = [
  { value: 'WGS84', label: 'WGS84 (GPS)', description: 'Système GPS mondial' },
  { value: 'RGF93_Lambert_93', label: 'RGF93 Lambert 93', description: 'France métropolitaine' },
  { value: 'RGF93_CC42', label: 'RGF93 CC42', description: 'Corse' },
  { value: 'RGFG95_UTM22N', label: 'RGFG95 UTM 22N', description: 'Guyane' },
  { value: 'RGR92_UTM40S', label: 'RGR92 UTM 40S', description: 'La Réunion' },
  { value: 'RGSPM06_UTM21N', label: 'RGSPM06 UTM 21N', description: 'Saint-Pierre et Miquelon' }
] as const

/**
 * Types d'installation supportés
 */
export const INSTALLATION_TYPES = [
  { value: 'static', label: 'Statique', description: 'Point fixe pour mesures statiques' },
  { value: 'rover', label: 'Rover', description: 'Mobile pour mesures cinématiques' },
  { value: 'base', label: 'Base', description: 'Station de référence pour RTK' }
] as const

/**
 * Formats d'export supportés
 */
export const EXPORT_FORMATS = [
  { value: 'json', label: 'JSON', description: 'Données structurées' },
  { value: 'csv', label: 'CSV', description: 'Tableur compatible' },
  { value: 'kml', label: 'KML', description: 'Google Earth compatible' },
  { value: 'geojson', label: 'GeoJSON', description: 'Format cartographique standard' }
] as const

// ==================== EXPORT TYPE ====================

export type {
  Site,
  Installation,
  Machine,
  Campaign,
  Calculation
} from '@/core/types'

// Hook return types re-exported from hooks to avoid circular deps
export type {
  UseGeocodingReturn,
  UseAddressLookupReturn
} from '../hooks/useGeocoding'
