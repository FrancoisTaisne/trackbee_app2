/**
 * Site Feature Export Index
 * Point d'entrée centralisé pour toute la feature de gestion des sites géographiques
 */

// ==================== HOOKS ====================
export {
  useSite,
  useSiteList,
  useSiteMap,
  useGeocoding,
  useAddressLookup,
  siteQueryKeys
} from './hooks'

// ==================== COMPONENTS ====================
export {
  SiteMapView,
  SiteForm,
  InstallationCard
} from './components'

// ==================== PAGES ====================
export {
  SiteListPage,
  SiteDetailPage
} from './pages'

// ==================== TYPES ====================
export type {
  SiteBundle,
  SiteStatistics,
  CreateSiteData,
  UpdateSiteData,
  CreateInstallationData,
  UpdateInstallationData,
  SiteFilters,
  SiteSorting,
  MapPosition,
  MapBounds,
  GeocodeResult,
  GeocodeOptions,
  SiteExportData,
  SiteImportResult,
  UseSiteDetailReturn,
  UseSiteListReturn,
  UseSiteMapReturn,
  UseGeocodingReturn,
  UseAddressLookupReturn,
  SiteListProps,
  SiteDetailProps,
  SiteMapProps,
  SiteFormProps,
  SiteError
} from './types'

// ==================== CONSTANTS ====================
export {
  COORDINATE_SYSTEMS,
  INSTALLATION_TYPES,
  EXPORT_FORMATS
} from './types'

// ==================== FEATURE INFO ====================

/**
 * Site Feature - Gestion complète des sites géographiques
 *
 * @description
 * Feature de gestion des sites géographiques avec localisation,
 * installations de devices, et interface cartographique.
 *
 * @features
 * - CRUD complet des sites avec validation Zod
 * - Géocodage d'adresses avec suggestions en temps réel
 * - Interface cartographique interactive avec contrôles
 * - Gestion des installations device/site avec types (static, rover, base)
 * - Système de coordonnées multiples (WGS84, Lambert, etc.)
 * - Export des données en plusieurs formats (JSON, CSV, KML, GeoJSON)
 * - Filtrage et tri avancés des sites
 * - Vue liste et vue carte avec synchronisation
 * - Géolocalisation utilisateur avec permissions
 * - Statistiques détaillées par site (installations, campagnes, calculs)
 * - Support des sites publics/privés et partagés
 * - Debug logging complet avec VITE_DEBUG
 *
 * @usage
 * ```typescript
 * import { useSiteList, SiteListPage, SiteMapView } from '@/features/site'
 *
 * // Hook de liste des sites
 * const { sites, createSite, geocodeAddress } = useSiteList({
 *   search: 'Paris',
 *   ownership: 'owner',
 *   hasInstallations: true
 * })
 *
 * // Composant de carte interactive
 * <SiteMapView
 *   sites={sites}
 *   selectedSite={selectedSite}
 *   onSiteSelect={handleSiteSelect}
 *   onPositionSelect={handlePositionSelect}
 *   showControls={true}
 *   height="600px"
 * />
 *
 * // Page de liste complète
 * <Route path="/sites" element={<SiteListPage />} />
 * ```
 *
 * @architecture
 * - Hooks: useSite, useSiteList, useSiteMap, useGeocoding avec TanStack Query
 * - Components: SiteMapView (carte interactive), SiteForm (création/édition), InstallationCard
 * - Pages: SiteListPage (vue liste/carte), SiteDetailPage (tabs détaillées)
 * - Geocoding: Service intégré avec API backend et cache automatique
 * - Map: Interface placeholder extensible pour vraies cartes (Google Maps, OpenLayers)
 * - Export: Formats multiples avec options de contenu configurables
 *
 * @integration_device_feature
 * - InstallationCard utilise DeviceConnectionPill et DeviceFileDownload
 * - Liens bidirectionnels sites ↔ devices via installations
 * - Synchronisation des états BLE via device feature
 * - Navigation croisée entre sites et devices
 *
 * @geocoding_system
 * - Géocodage temps réel avec suggestions
 * - Support API backend avec fallback
 * - Cache intelligent des résultats
 * - Validation des coordonnées selon le système
 * - Conversion entre systèmes de coordonnées
 *
 * @map_system
 * - Interface abstraite extensible
 * - Contrôles de navigation (zoom, pan, layers)
 * - Markers interactifs avec tooltips
 * - Sélection de position pour création sites
 * - Bounds automatiques pour affichage optimal
 * - Géolocalisation utilisateur intégrée
 *
 * @offline_support
 * - Cache des sites avec TanStack Query (2min stale)
 * - Geocoding avec cache persistant
 * - Retry automatique des opérations réseau
 * - Synchronisation intelligente des données
 *
 * @debug_logging
 * - VITE_DEBUG=true active tous les logs site
 * - VITE_DEBUG_GEOCODING=true pour logs géocodage spécifiques
 * - Contextes: 'site', 'siteList', 'siteMap', 'geocoding', 'installation'
 * - Niveaux: trace/debug/info/warn/error avec données structurées
 * - Suivi des opérations de géocodage et export
 */

export const SiteFeatureInfo = {
  name: 'Site Feature',
  version: '1.0.0',
  description: 'Gestion complète des sites géographiques TrackBee',
  dependencies: [
    '@/core/services/api/HttpClient',
    '@/features/device (DeviceConnectionPill, DeviceFileDownload)',
    '@/shared/ui/components',
    '@tanstack/react-query',
    'react-hook-form',
    '@hookform/resolvers/zod',
    'zod'
  ],
  exports: {
    hooks: ['useSite', 'useSiteList', 'useSiteMap', 'useGeocoding', 'useAddressLookup'],
    components: ['SiteMapView', 'SiteForm', 'InstallationCard'],
    pages: ['SiteListPage', 'SiteDetailPage'],
    types: [
      'SiteBundle', 'SiteStatistics', 'CreateSiteData', 'UpdateSiteData',
      'MapPosition', 'MapBounds', 'GeocodeResult', 'SiteFilters'
    ],
    constants: ['COORDINATE_SYSTEMS', 'INSTALLATION_TYPES', 'EXPORT_FORMATS']
  },
  routes: [
    { path: '/sites', component: 'SiteListPage', auth: true },
    { path: '/sites/:id', component: 'SiteDetailPage', auth: true }
  ],
  integrations: [
    {
      feature: 'Device Feature',
      components: ['DeviceConnectionPill', 'DeviceFileDownload'],
      relationship: 'Sites contain device installations (many-to-many via Installation)'
    }
  ]
} as const
