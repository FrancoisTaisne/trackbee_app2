/**
 * Campaign Feature Export Index
 * Point d'entrée centralisé pour toute la feature de gestion des campagnes GNSS
 */

// ==================== HOOKS ====================
export {
  useCampaign,
  useCampaignList,
  useCampaignScheduler,
  getCampaignProgress,
  getCampaignDuration,
  getNextScheduledEvent,
  canStartCampaign,
  canPauseCampaign,
  canCancelCampaign,
  canEditCampaign,
  canDeleteCampaign,
  getDefaultFilters,
  buildSearchQuery,
  filterCampaignsByStatus,
  groupCampaignsByType,
  sortCampaigns,
  getUpcomingEventsForToday,
  getUpcomingEventsForWeek,
  groupEventsByDate,
  isEventConflicting,
  findConflictingEvents,
  formatRecurrenceDescription
} from './hooks'

// ==================== COMPONENTS ====================
export {
  CampaignForm,
  CampaignList,
  CampaignDetail,
  CampaignScheduler
} from './components'

// ==================== PAGES ====================
export {
  CampaignListPage,
  CampaignDetailPage,
  CampaignListPageRoute,
  CampaignDetailPageRoute,
  CampaignListPageBreadcrumb,
  CampaignDetailPageBreadcrumb
} from './pages'

// ==================== TYPES ====================
export type {
  Campaign,
  CampaignId,
  CalculationId,
  CampaignBundle,
  CampaignStatistics,
  CreateCampaignData,
  UpdateCampaignData,
  CampaignFilters,
  CampaignSorting,
  CampaignSchedule,
  RecurrenceOptions,
  ScheduledEvent,
  CampaignFile,
  UseCampaignReturn,
  UseCampaignListReturn,
  UseCampaignSchedulerReturn,
  CampaignListProps,
  CampaignDetailProps,
  CampaignFormProps,
  CampaignSchedulerProps,
  CampaignStatsProps,
  CampaignError
} from './types'

// ==================== CONSTANTS ====================
export {
  CAMPAIGN_TYPES,
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_PRIORITIES,
  DEFAULT_DURATIONS,
  CampaignTypeSchema,
  CampaignStatusSchema,
  CreateCampaignSchema,
  UpdateCampaignSchema,
  CampaignFiltersSchema,
  RecurrenceOptionsSchema,
  campaignQueryKeys
} from './types'

// ==================== FEATURE INFO ====================

/**
 * Campaign Feature - Gestion complète des campagnes de mesure GNSS
 *
 * @description
 * Feature de gestion des campagnes GNSS avec planification, exécution,
 * et suivi des mesures statiques et cinématiques.
 *
 * @features
 * - CRUD complet des campagnes avec validation Zod stricte
 * - Gestion des 4 types de campagnes (static_simple, static_multiple, kinematic, rover_base)
 * - Planification avancée (immédiate, programmée, récurrente avec RRULE RFC5545)
 * - Interface de calendrier et timeline pour visualisation
 * - Gestion des calculs post-traitement associés
 * - Système de priorités et tags pour organisation
 * - Suivi des fichiers et résultats par campagne
 * - Actions de contrôle (start/pause/resume/cancel)
 * - Statistiques détaillées et métriques de performance
 * - Integration avec Site et Device Features
 * - Support offline avec cache intelligent
 * - Debug logging complet avec VITE_DEBUG
 *
 * @usage
 * ```typescript
 * import { useCampaignList, CampaignListPage, CampaignScheduler } from '@/features/campaign'
 *
 * // Hook de liste des campagnes
 * const { campaigns, createCampaign, filters, setFilters } = useCampaignList({
 *   siteId: 123,
 *   machineId: 456
 * })
 *
 * // Composant de planification
 * <CampaignScheduler
 *   siteId={siteId}
 *   machineId={machineId}
 *   onEventSelect={handleEventSelect}
 *   view="calendar"
 * />
 *
 * // Page de liste complète
 * <Route path="/campaigns" element={<CampaignListPage />} />
 * ```
 *
 * @architecture
 * - Hooks: useCampaign, useCampaignList, useCampaignScheduler avec TanStack Query
 * - Components: CampaignForm (création/édition), CampaignList (gestion), CampaignDetail (vue détaillée), CampaignScheduler (planification)
 * - Pages: CampaignListPage (liste/planification), CampaignDetailPage (vue complète)
 * - Scheduling: Support RRULE RFC5545 pour récurrence complexe
 * - Calendar: Vues calendrier, liste et timeline intégrées
 * - Actions: Contrôle complet du cycle de vie des campagnes
 *
 * @campaign_types
 * - **static_simple**: Mesure statique unique à durée définie
 * - **static_multiple**: Mesures statiques récurrentes avec planification RRULE
 * - **kinematic**: Mesure en mouvement avec enregistrement de trajectoire
 * - **rover_base**: Mesure différentielle RTK avec station de base
 *
 * @scheduling_system
 * - **Immédiate**: Exécution immédiate de la campagne
 * - **Programmée**: Planification à date/heure spécifique
 * - **Récurrente**: Planification avec RRULE (quotidien, hebdomadaire, mensuel)
 * - **Gestion conflits**: Détection automatique des chevauchements
 * - **Timeline**: Visualisation temporelle des événements planifiés
 *
 * @integration_features
 * - **Site Feature**: Liaison campagnes ↔ sites géographiques
 * - **Device Feature**: Intégration avec devices IoT et BLE
 * - **Processing Feature**: Connexion aux calculs post-traitement
 * - **Transfer Feature**: Coordination des transferts de fichiers
 * - Navigation croisée entre features avec context preservation
 *
 * @state_management
 * - Cache intelligent TanStack Query (2min stale pour campagnes)
 * - Invalidation automatique des dépendances
 * - Optimistic updates pour actions utilisateur
 * - Pagination infinie pour grandes listes
 * - Synchronisation temps réel des événements planifiés
 *
 * @offline_support
 * - Cache persistant des campagnes et événements
 * - Queue des actions différées (création, modification)
 * - Synchronisation automatique à la reconnexion
 * - Détection des conflits de concurrence
 *
 * @planning_features
 * - Calendrier mensuel avec événements visuels
 * - Vue liste chronologique détaillée
 * - Timeline hebdomadaire heure par heure
 * - Filtrage avancé par type, statut, priorité
 * - Recherche textuelle dans noms et descriptions
 * - Tri multi-critères avec persistance
 *
 * @calculation_integration
 * - Création automatique de calculs lors de campagnes
 * - Suivi temps réel des statuts (queued/running/done/failed)
 * - Retry automatique des calculs échoués
 * - Visualisation des résultats et métriques
 * - Export des données de calcul
 *
 * @file_management
 * - Association fichiers ↔ campagnes automatique
 * - Métadonnées extraites des noms de fichiers
 * - Suivi de l'intégrité (hashes, tailles)
 * - Download/upload depuis/vers devices IoT
 * - Nettoyage automatique des fichiers temporaires
 *
 * @debug_logging
 * - VITE_DEBUG=true active tous les logs campaign
 * - VITE_DEBUG_CAMPAIGN=true pour logs spécifiques
 * - Contextes: 'campaign', 'campaignList', 'scheduler', 'planning'
 * - Niveaux: trace/debug/info/warn/error avec données structurées
 * - Suivi des opérations de planification et actions
 */

export const CampaignFeatureInfo = {
  name: 'Campaign Feature',
  version: '1.0.0',
  description: 'Gestion complète des campagnes de mesure GNSS TrackBee',
  dependencies: [
    '@/core/services/api/HttpClient',
    '@/features/site (navigation sites)',
    '@/features/device (integration devices IoT)',
    '@/shared/ui/components',
    '@tanstack/react-query',
    'react-hook-form',
    '@hookform/resolvers/zod',
    'zod',
    'react-router-dom'
  ],
  exports: {
    hooks: [
      'useCampaign', 'useCampaignList', 'useCampaignScheduler',
      'getCampaignProgress', 'getCampaignDuration', 'getNextScheduledEvent',
      'canStartCampaign', 'canPauseCampaign', 'canCancelCampaign',
      'getUpcomingEventsForToday', 'formatRecurrenceDescription'
    ],
    components: [
      'CampaignForm', 'CampaignList', 'CampaignDetail', 'CampaignScheduler'
    ],
    pages: [
      'CampaignListPage', 'CampaignDetailPage'
    ],
    types: [
      'Campaign', 'CampaignBundle', 'CreateCampaignData', 'UpdateCampaignData',
      'CampaignSchedule', 'RecurrenceOptions', 'ScheduledEvent', 'CampaignFilters'
    ],
    constants: [
      'CAMPAIGN_TYPES', 'CAMPAIGN_STATUS_LABELS', 'CAMPAIGN_PRIORITIES', 'DEFAULT_DURATIONS'
    ]
  },
  routes: [
    { path: '/campaigns', component: 'CampaignListPage', auth: true, permissions: ['campaigns:read'] },
    { path: '/campaigns/:id', component: 'CampaignDetailPage', auth: true, permissions: ['campaigns:read'] }
  ],
  integrations: [
    {
      feature: 'Site Feature',
      relationship: 'Campaigns are executed at specific sites (many-to-one)',
      components: ['Site navigation', 'Location context']
    },
    {
      feature: 'Device Feature',
      relationship: 'Campaigns control device measurements (one-to-one per execution)',
      components: ['Device control', 'BLE communication', 'File transfer']
    },
    {
      feature: 'Processing Feature',
      relationship: 'Campaigns generate processing calculations (one-to-many)',
      components: ['Calculation management', 'Results display']
    }
  ],
  features: {
    campaignTypes: [
      'static_simple: Single static measurement with fixed duration',
      'static_multiple: Recurring static measurements with RRULE scheduling',
      'kinematic: Moving measurement with trajectory recording',
      'rover_base: Differential RTK measurement with base station'
    ],
    scheduling: [
      'Immediate execution for instant measurements',
      'Scheduled execution at specific date/time',
      'Recurring execution with RFC5545 RRULE support',
      'Conflict detection and resolution',
      'Calendar and timeline visualization'
    ],
    management: [
      'Full CRUD operations with validation',
      'Bulk operations (delete, duplicate)',
      'Priority and tag organization',
      'Advanced filtering and search',
      'Real-time status updates'
    ],
    planning: [
      'Monthly calendar view with events',
      'Chronological list view',
      'Weekly timeline view (hourly)',
      'Conflict detection and warnings',
      'Event details and quick actions'
    ]
  }
} as const
