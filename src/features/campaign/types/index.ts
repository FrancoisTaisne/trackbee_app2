/**
 * Campaign Feature Types & Validation
 * Types stricts pour la gestion des campagnes de mesure GNSS
 */

import { z } from 'zod'
import type {
  CampaignId, SiteId, MachineId, InstallationId, CalculationId,
  CampaignType, CampaignStatus, CalculationStatus,
  Campaign, Calculation as DomainCalculation
} from '@/core/types/domain'

// Re-export Campaign and related IDs from domain for consistency
export type { Campaign, CampaignId, CalculationId } from '@/core/types/domain'

// ==================== BASE TYPES ====================

export interface CampaignBundle {
  campaign: Campaign
  calculations: CampaignCalculation[]
  files: CampaignFile[]
  statistics: CampaignStatistics
}



export interface CampaignCalculation extends Omit<DomainCalculation, "status"> {
  id: CalculationId
  campaignId: CampaignId
  siteId: SiteId
  machineId: MachineId
  installationId?: InstallationId

  status: CalculationStatus
  strategy: string          // "static_simple", "static_multiple", etc.

  // Configuration
  title?: string
  notes?: string
  planned_start?: string    // ISO string
  actual_start?: string     // ISO string
  actual_end?: string       // ISO string

  // RÃ©sultats
  result_lat?: number
  result_lng?: number
  result_alt?: number
  accuracy_m?: number
  quality_score?: number

  // Fichiers associÃ©s
  input_files?: string[]    // Noms des fichiers d'entrÃ©e
  output_files?: string[]   // Noms des fichiers de sortie

  createdAt: string
  updatedAt: string
}

export interface CampaignFile {
  id: string
  campaignId: CampaignId
  name: string              // "35_20250904_114651.ubx"
  type: 'ubx' | 'obs' | 'nav' | 'config' | 'result'
  size?: number
  hash?: string
  uploadedAt?: string       // ISO string
  processed: boolean

  // MÃ©tadonnÃ©es extraites du nom
  recordedAt?: string       // ISO string extrait du nom
  deviceTimestamp?: string  // Timestamp original device
}

export interface CampaignStatistics {
  totalCampaigns: number
  activeCampaigns: number
  completedCampaigns: number
  failedCampaigns: number
  totalCalculations: number
  successfulCalculations: number
  averageDuration: number   // DurÃ©e moyenne en secondes
  totalFiles: number
  totalDataSize: number     // Taille totale des donnÃ©es
  lastActivity?: string     // ISO string de derniÃ¨re activitÃ©
}

// ==================== SCHEDULING TYPES ====================

export interface CampaignSchedule {
  type: 'immediate' | 'scheduled' | 'recurring'
  scheduledAt?: string      // ISO string pour type scheduled
  rrule?: string           // RFC5545 pour type recurring
  timezone?: string        // Timezone pour planification
  maxOccurrences?: number  // Limite pour recurring
  endDate?: string         // ISO string fin pour recurring
}

export interface RecurrenceOptions {
  frequency: 'daily' | 'weekly' | 'monthly'
  interval?: number         // Tous les N jours/semaines/mois
  weekdays?: number[]      // 0=dimanche, 1=lundi, etc.
  monthDays?: number[]     // Jours du mois (1-31)
  times: string[]          // Heures de mesure ["09:00", "12:00", "15:00"]
  durationMin?: number     // DurÃ©e par occurrence en minutes
}

// ==================== FORM TYPES ====================

export interface CreateCampaignData {
  siteId: SiteId
  machineId: MachineId
  installationId?: InstallationId
  name?: string
  description?: string
  type: CampaignType

  // Configuration selon le type
  duration_s?: number       // Pour static_simple
  schedule?: CampaignSchedule
  recurrence?: RecurrenceOptions

  priority?: number
  tags?: string[]
}

export interface UpdateCampaignData {
  name?: string
  description?: string
  status?: CampaignStatus
  priority?: number
  tags?: string[]

  // Mise Ã  jour planning
  scheduledAt?: string | Date
  rrule?: string
}

export interface CampaignFilters {
  siteId?: SiteId
  machineId?: MachineId
  installationId?: InstallationId
  type?: CampaignType
  status?: CampaignStatus[]
  dateRange?: {
    from: string
    to: string
  }
  tags?: string[]
  search?: string
}

export interface CampaignSorting {
  field: 'name' | 'type' | 'status' | 'createdAt' | 'scheduledAt' | 'priority'
  direction: 'asc' | 'desc'
}

// ==================== HOOK RETURN TYPES ====================

export interface UseCampaignReturn {
  campaign: Campaign | null
  calculations: CampaignCalculation[]
  files: CampaignFile[]
  statistics: CampaignStatistics | null
  isLoading: boolean
  error: Error | null

  // Actions
  updateCampaign: (data: UpdateCampaignData) => Promise<Campaign>
  deleteCampaign: () => Promise<void>
  startCampaign: () => Promise<void>
  pauseCampaign: () => Promise<void>
  resumeCampaign: () => Promise<void>
  cancelCampaign: () => Promise<void>

  // Calculs
  createCalculation: (config?: Record<string, unknown>) => Promise<CampaignCalculation>
  retryCalculation: (calculationId: CalculationId) => Promise<CampaignCalculation>

  refetch: () => Promise<void>
}

export interface UseCampaignListReturn {
  campaigns: Campaign[]
  isLoading: boolean
  error: Error | null

  // Pagination
  hasMore: boolean
  loadMore: () => Promise<void>

  // Actions
  createCampaign: (data: CreateCampaignData) => Promise<Campaign>
  duplicateCampaign: (campaignId: CampaignId) => Promise<Campaign>
  deleteCampaigns: (campaignIds: CampaignId[]) => Promise<void>

  // Filters & Search
  filters: CampaignFilters
  setFilters: (filters: Partial<CampaignFilters>) => void
  sorting: CampaignSorting
  setSorting: (sorting: CampaignSorting) => void

  refetch: () => Promise<void>
}

export interface UseCampaignSchedulerReturn {
  scheduledCampaigns: Campaign[]
  upcomingEvents: ScheduledEvent[]
  isLoading: boolean
  error: Error | null

  // Actions
  scheduleImmediate: (data: CreateCampaignData) => Promise<Campaign>
  scheduleAt: (data: CreateCampaignData, scheduledAt: string) => Promise<Campaign>
  scheduleRecurring: (data: CreateCampaignData, recurrence: RecurrenceOptions) => Promise<Campaign>
  updateSchedule: (campaignId: CampaignId, schedule: CampaignSchedule) => Promise<Campaign>
  cancelSchedule: (campaignId: CampaignId) => Promise<void>

  refetch: () => Promise<void>
}

export interface ScheduledEvent {
  id: string
  campaignId: CampaignId
  campaignName: string
  siteId: SiteId
  siteName: string
  scheduledAt: string       // ISO string
  duration_s?: number
  type: CampaignType
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'canceled'
}

// ==================== COMPONENT PROPS ====================

export interface CampaignListProps {
  siteId?: SiteId
  machineId?: MachineId
  installationId?: InstallationId
  filters?: Partial<CampaignFilters>
  onCampaignSelect?: (campaign: Campaign) => void
  onCampaignCreate?: (data: CreateCampaignData) => void
  className?: string
}

export interface CampaignDetailProps {
  campaignId: CampaignId
  onUpdate?: (campaign: Campaign) => void
  onDelete?: (campaignId: CampaignId) => void
  className?: string
}

export interface CampaignFormProps {
  siteId: SiteId
  machineId: MachineId
  installationId?: InstallationId
  initialData?: Partial<CreateCampaignData>
  mode: 'create' | 'edit'
  onSubmit: (data: CreateCampaignData) => Promise<void>
  onCancel?: () => void
  className?: string
}

export interface CampaignSchedulerProps {
  siteId?: SiteId
  machineId?: MachineId
  onEventSelect?: (event: ScheduledEvent) => void
  view: 'calendar' | 'list' | 'timeline'
  className?: string
}

export interface CampaignStatsProps {
  siteId?: SiteId
  machineId?: MachineId
  installationId?: InstallationId
  period: 'day' | 'week' | 'month' | 'year'
  className?: string
}

// ==================== VALIDATION SCHEMAS ====================

export const CampaignTypeSchema = z.enum(['static_simple', 'static_multiple', 'kinematic', 'rover_base'])
export const CampaignStatusSchema = z.enum([
  'draft',
  'active',
  'paused',
  'done',
  'canceled',
  'cancelled',
  'scheduled',
  'running',
  'completed',
  'failed',
  'error'
])

export const CreateCampaignSchema = z.object({
  siteId: z.number().int().positive('Site ID requis'),
  machineId: z.number().int().positive('Machine ID requis'),
  installationId: z.number().int().positive().optional(),
  name: z.string().min(1, 'Nom requis').max(100, 'Nom trop long').optional(),
  description: z.string().max(500, 'Description trop longue').optional(),
  type: CampaignTypeSchema,

  // Configuration temporelle
  duration_s: z.number().int().min(1, 'DurÃ©e minimale 1s').max(86400, 'DurÃ©e maximale 24h').optional(),
  scheduledAt: z.string().datetime({ message: 'Date invalide' }).optional(),
  rrule: z.string().regex(/^FREQ=/, 'Format RRULE invalide').optional(),

  priority: z.number().int().min(1).max(10).default(5),
  tags: z.array(z.string().min(1).max(50)).max(10).default([])
})

export const UpdateCampaignSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  status: CampaignStatusSchema.optional(),
  priority: z.number().int().min(1).max(10).optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  scheduledAt: z.string().datetime().optional(),
  rrule: z.string().regex(/^FREQ=/).optional()
})

export const CampaignFiltersSchema = z.object({
  siteId: z.number().int().positive().optional(),
  machineId: z.number().int().positive().optional(),
  installationId: z.number().int().positive().optional(),
  type: CampaignTypeSchema.optional(),
  status: z.array(CampaignStatusSchema).optional(),
  dateRange: z.object({
    from: z.string().datetime(),
    to: z.string().datetime()
  }).optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().max(100).optional()
})

export const RecurrenceOptionsSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  interval: z.number().int().min(1).max(365).default(1),
  weekdays: z.array(z.number().int().min(0).max(6)).optional(),
  monthDays: z.array(z.number().int().min(1).max(31)).optional(),
  times: z.array(z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM requis')).min(1, 'Au moins une heure'),
  durationMin: z.number().int().min(1).max(1440).default(60)
})

// ==================== CONSTANTS ====================

export const CAMPAIGN_TYPES = {
  static_simple: {
    label: 'Statique Simple',
    description: 'Mesure statique unique Ã  durÃ©e dÃ©finie',
    icon: 'target',
    color: 'blue'
  },
  static_multiple: {
    label: 'Statique Multiple',
    description: 'Mesures statiques rÃ©currentes avec planification',
    icon: 'calendar-repeat',
    color: 'green'
  },
  kinematic: {
    label: 'CinÃ©matique',
    description: 'Mesure en mouvement avec trajectoire',
    icon: 'route',
    color: 'orange'
  },
  rover_base: {
    label: 'Rover-Base',
    description: 'Mesure diffÃ©rentielle avec station de base',
    icon: 'radio',
    color: 'purple'
  }
} as const

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Brouillon',
  active: 'Active',
  paused: 'En pause',
  done: 'Terminée',
  canceled: 'Annulée',
  cancelled: 'Annulée',
  scheduled: 'Planifiée',
  running: 'En cours',
  completed: 'Terminée',
  failed: 'Échec',
  error: 'Erreur'
}

export const CAMPAIGN_STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: 'gray',
  active: 'green',
  paused: 'yellow',
  done: 'green',
  canceled: 'red',
  cancelled: 'red',
  scheduled: 'blue',
  running: 'blue',
  completed: 'green',
  failed: 'red',
  error: 'orange'
}

export const CAMPAIGN_PRIORITIES = {
  1: { label: 'TrÃ¨s basse', color: 'gray' },
  2: { label: 'Basse', color: 'gray' },
  3: { label: 'Basse', color: 'gray' },
  4: { label: 'Normale', color: 'blue' },
  5: { label: 'Normale', color: 'blue' },
  6: { label: 'Normale', color: 'blue' },
  7: { label: 'Ã‰levÃ©e', color: 'orange' },
  8: { label: 'Ã‰levÃ©e', color: 'orange' },
  9: { label: 'TrÃ¨s Ã©levÃ©e', color: 'red' },
  10: { label: 'Critique', color: 'red' }
} as const

export const DEFAULT_DURATIONS = {
  static_simple: [60, 300, 900, 1800, 3600],      // 1min, 5min, 15min, 30min, 1h
  static_multiple: [300, 900, 1800, 3600],        // 5min, 15min, 30min, 1h par occurrence
  kinematic: [300, 600, 1200, 1800],             // 5min, 10min, 20min, 30min
  rover_base: [900, 1800, 3600, 7200]            // 15min, 30min, 1h, 2h
} as const

// ==================== ERROR TYPES ====================

export interface CampaignError extends Error {
  code: 'CAMPAIGN_NOT_FOUND' | 'CAMPAIGN_RUNNING' | 'CAMPAIGN_INVALID_STATE' |
        'SCHEDULE_CONFLICT' | 'DEVICE_BUSY' | 'VALIDATION_ERROR'
  campaignId?: CampaignId
  details?: Record<string, unknown>
}

// ==================== QUERY KEYS ====================

export const campaignQueryKeys = {
  all: ['campaigns'] as const,
  lists: () => [...campaignQueryKeys.all, 'list'] as const,
  list: (filters: Partial<CampaignFilters> = {}) => [...campaignQueryKeys.lists(), filters] as const,
  details: () => [...campaignQueryKeys.all, 'detail'] as const,
  detail: (id: CampaignId) => [...campaignQueryKeys.details(), id] as const,
  bundle: (id: CampaignId) => [...campaignQueryKeys.detail(id), 'bundle'] as const,
  calculations: (campaignId: CampaignId) => [...campaignQueryKeys.detail(campaignId), 'calculations'] as const,
  files: (campaignId: CampaignId) => [...campaignQueryKeys.detail(campaignId), 'files'] as const,
  statistics: (filters?: Partial<CampaignFilters>) => [...campaignQueryKeys.all, 'statistics', filters] as const,
  scheduled: () => [...campaignQueryKeys.all, 'scheduled'] as const,
  events: (dateRange?: { from: string, to: string }) => [...campaignQueryKeys.scheduled(), dateRange] as const
}

// ==================== TYPE GUARDS ====================

export function isCampaign(value: unknown): value is Campaign {
  return typeof value === 'object' && value !== null &&
         'id' in value && 'type' in value && 'status' in value
}

export function isCampaignBundle(value: unknown): value is CampaignBundle {
  return typeof value === 'object' && value !== null &&
         'campaign' in value && 'calculations' in value &&
         'files' in value && 'statistics' in value
}

export function isCampaignType(value: string): value is CampaignType {
  return ['static_simple', 'static_multiple', 'kinematic', 'rover_base'].includes(value)
}

export function isCampaignStatus(value: string): value is CampaignStatus {
  return ['draft', 'active', 'paused', 'done', 'canceled'].includes(value)
}

