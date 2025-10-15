/**
 * Campaign Scheduler Hook
 * Hook pour la gestion de la planification des campagnes (immédiate/programmée/récurrente)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '@/core/services/api/HttpClient'
import { logger } from '@/core/utils/logger'
import type {
  Campaign, CampaignId, CreateCampaignData, ScheduledEvent, CampaignSchedule,
  RecurrenceOptions, UseCampaignSchedulerReturn
} from '../types'
import { campaignQueryKeys, CreateCampaignSchema, RecurrenceOptionsSchema } from '../types'

const log = logger.extend('useCampaignScheduler')

// ==================== API FUNCTIONS ====================

interface ScheduledCampaignsParams {
  siteId?: number
  machineId?: number
  dateRange?: {
    from: string
    to: string
  }
}

async function fetchScheduledCampaigns(params: ScheduledCampaignsParams = {}): Promise<Campaign[]> {
  log.debug('fetchScheduledCampaigns', { params })

  const searchParams = new URLSearchParams()
  if (params.siteId) searchParams.append('siteId', params.siteId.toString())
  if (params.machineId) searchParams.append('machineId', params.machineId.toString())
  if (params.dateRange) {
    searchParams.append('dateFrom', params.dateRange.from)
    searchParams.append('dateTo', params.dateRange.to)
  }

  const response = await httpClient.get<Campaign[]>(`/api/campaigns/scheduled?${searchParams}`)
  const campaigns = response.data!

  log.info('Scheduled campaigns loaded', { count: campaigns.length })
  return campaigns
}

async function fetchUpcomingEvents(params: ScheduledCampaignsParams = {}): Promise<ScheduledEvent[]> {
  log.debug('fetchUpcomingEvents', { params })

  const searchParams = new URLSearchParams()
  if (params.siteId) searchParams.append('siteId', params.siteId.toString())
  if (params.machineId) searchParams.append('machineId', params.machineId.toString())
  if (params.dateRange) {
    searchParams.append('dateFrom', params.dateRange.from)
    searchParams.append('dateTo', params.dateRange.to)
  }

  const response = await httpClient.get<ScheduledEvent[]>(`/api/campaigns/events?${searchParams}`)
  const events = response.data!

  log.info('Upcoming events loaded', { count: events.length })
  return events
}

async function scheduleImmediate(data: CreateCampaignData): Promise<Campaign> {
  log.debug('scheduleImmediate', { data })

  const validated = CreateCampaignSchema.parse({
    ...data,
    scheduledAt: new Date().toISOString()
  })

  const response = await httpClient.post<Campaign>('/api/campaigns/immediate', validated)
  const campaign = response.data!

  log.info('Campaign scheduled immediately', { campaignId: campaign.id })
  return campaign
}

async function scheduleAt(data: CreateCampaignData, scheduledAt: string): Promise<Campaign> {
  log.debug('scheduleAt', { data, scheduledAt })

  const validated = CreateCampaignSchema.parse({
    ...data,
    scheduledAt
  })

  const response = await httpClient.post<Campaign>('/api/campaigns/scheduled', validated)
  const campaign = response.data!

  log.info('Campaign scheduled at specific time', { campaignId: campaign.id, scheduledAt })
  return campaign
}

async function scheduleRecurring(data: CreateCampaignData, recurrence: RecurrenceOptions): Promise<Campaign> {
  log.debug('scheduleRecurring', { data, recurrence })

  const validatedData = CreateCampaignSchema.parse(data)
  const validatedRecurrence = RecurrenceOptionsSchema.parse(recurrence)

  // Construire RRULE RFC5545
  const rrule = buildRRule(validatedRecurrence)

  const response = await httpClient.post<Campaign>('/api/campaigns/recurring', {
    ...validatedData,
    rrule,
    type: 'static_multiple' // Force le type pour récurrence
  })
  const campaign = response.data!

  log.info('Campaign scheduled with recurrence', {
    campaignId: campaign.id,
    rrule,
    frequency: recurrence.frequency
  })
  return campaign
}

async function updateSchedule(campaignId: CampaignId, schedule: CampaignSchedule): Promise<Campaign> {
  log.debug('updateSchedule', { campaignId, schedule })

  const response = await httpClient.put<Campaign>(`/api/campaigns/${campaignId}/schedule`, schedule)
  const campaign = response.data!

  log.info('Campaign schedule updated', { campaignId })
  return campaign
}

async function cancelSchedule(campaignId: CampaignId): Promise<void> {
  log.debug('cancelSchedule', { campaignId })

  await httpClient.delete(`/api/campaigns/${campaignId}/schedule`)

  log.info('Campaign schedule canceled', { campaignId })
}

// ==================== RRULE BUILDER ====================

function buildRRule(recurrence: RecurrenceOptions): string {
  const parts = [`FREQ=${recurrence.frequency.toUpperCase()}`]

  if (recurrence.interval && recurrence.interval > 1) {
    parts.push(`INTERVAL=${recurrence.interval}`)
  }

  if (recurrence.frequency === 'weekly' && recurrence.weekdays?.length) {
    const weekdayNames = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
    const byweekday = recurrence.weekdays.map(day => weekdayNames[day]).join(',')
    parts.push(`BYDAY=${byweekday}`)
  }

  if (recurrence.frequency === 'monthly' && recurrence.monthDays?.length) {
    parts.push(`BYMONTHDAY=${recurrence.monthDays.join(',')}`)
  }

  // Ajouter les heures comme données annexes (pas dans RRULE standard)
  if (recurrence.times.length) {
    parts.push(`BYHOUR=${recurrence.times.map(time => time.split(':')[0]).join(',')}`)
    parts.push(`BYMINUTE=${recurrence.times.map(time => time.split(':')[1]).join(',')}`)
  }

  return parts.join(';')
}

// ==================== HOOK ====================

export function useCampaignScheduler(params: ScheduledCampaignsParams = {}): UseCampaignSchedulerReturn {
  const queryClient = useQueryClient()

  // Requête pour campagnes planifiées
  const {
    data: scheduledCampaigns = [],
    isLoading: isLoadingCampaigns,
    error: campaignsError,
    refetch: refetchCampaigns
  } = useQuery({
    queryKey: campaignQueryKeys.scheduled(),
    queryFn: () => fetchScheduledCampaigns(params),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000     // 5 minutes
  })

  // Requête pour événements à venir
  const {
    data: upcomingEvents = [],
    isLoading: isLoadingEvents,
    error: eventsError,
    refetch: refetchEvents
  } = useQuery({
    queryKey: campaignQueryKeys.events(params.dateRange),
    queryFn: () => fetchUpcomingEvents(params),
    staleTime: 30 * 1000,     // 30 secondes
    gcTime: 2 * 60 * 1000     // 2 minutes
  })

  // Mutations pour planification
  const scheduleImmediateMutation = useMutation({
    mutationFn: scheduleImmediate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.scheduled() })
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.events() })
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.lists() })
    }
  })

  const scheduleAtMutation = useMutation({
    mutationFn: ({ data, scheduledAt }: { data: CreateCampaignData; scheduledAt?: string }) =>
      scheduleAt(data, scheduledAt ?? new Date().toISOString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.scheduled() })
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.events() })
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.lists() })
    }
  })

  const scheduleRecurringMutation = useMutation({
    mutationFn: ({ data, recurrence }: { data: CreateCampaignData, recurrence: RecurrenceOptions }) =>
      scheduleRecurring(data, recurrence),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.scheduled() })
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.events() })
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.lists() })
    }
  })

  const updateScheduleMutation = useMutation({
    mutationFn: ({ campaignId, schedule }: { campaignId: CampaignId, schedule: CampaignSchedule }) =>
      updateSchedule(campaignId, schedule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.scheduled() })
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.events() })
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.lists() })
    }
  })

  const cancelScheduleMutation = useMutation({
    mutationFn: cancelSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.scheduled() })
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.events() })
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.lists() })
    }
  })

  // Gestion des erreurs et loading
  const isLoading = isLoadingCampaigns || isLoadingEvents ||
                   scheduleImmediateMutation.isPending ||
                   scheduleAtMutation.isPending ||
                   scheduleRecurringMutation.isPending ||
                   updateScheduleMutation.isPending ||
                   cancelScheduleMutation.isPending

  const error = campaignsError || eventsError ||
               scheduleImmediateMutation.error ||
               scheduleAtMutation.error ||
               scheduleRecurringMutation.error ||
               updateScheduleMutation.error ||
               cancelScheduleMutation.error

  return {
    // Données
    scheduledCampaigns,
    upcomingEvents,
    isLoading,
    error,

    // Actions
    scheduleImmediate: scheduleImmediateMutation.mutateAsync,
    scheduleAt: async (data: CreateCampaignData, scheduledAt?: string) =>
      scheduleAtMutation.mutateAsync({ data, scheduledAt }),
    scheduleRecurring: async (data: CreateCampaignData, recurrence: RecurrenceOptions) =>
      scheduleRecurringMutation.mutateAsync({ data, recurrence }),
    updateSchedule: async (campaignId: CampaignId, schedule: CampaignSchedule) =>
      updateScheduleMutation.mutateAsync({ campaignId, schedule }),
    cancelSchedule: cancelScheduleMutation.mutateAsync,

    // Utilitaires
    refetch: async () => {
      await Promise.all([refetchCampaigns(), refetchEvents()])
    }
  }
}

// ==================== HELPERS ====================

export function getUpcomingEventsForToday(events: ScheduledEvent[]): ScheduledEvent[] {
  const [today] = new Date().toISOString().split('T')
  if (!today) return []

  return events.filter((event) => {
    const scheduledAt = event.scheduledAt
    return typeof scheduledAt === 'string' && scheduledAt.startsWith(today)
  })
}

export function getUpcomingEventsForWeek(events: ScheduledEvent[]): ScheduledEvent[] {
  const now = new Date()
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  return events.filter((event) => {
    const scheduledAt = event.scheduledAt
    if (!scheduledAt) return false

    const eventDate = new Date(scheduledAt)
    if (Number.isNaN(eventDate.getTime())) return false

    return eventDate >= now && eventDate <= weekFromNow
  })
}

export function groupEventsByDate(events: ScheduledEvent[]): Record<string, ScheduledEvent[]> {
  return events.reduce((groups, event) => {
    const date = event.scheduledAt?.split('T')[0]
    if (!date) return groups

    const groupedEvents = groups[date] ?? []
    groupedEvents.push(event)
    groups[date] = groupedEvents
    return groups
  }, {} as Record<string, ScheduledEvent[]>)
}

export function isEventConflicting(event1: ScheduledEvent, event2: ScheduledEvent): boolean {
  // Vérifier si deux événements se chevauchent
  const start1 = new Date(event1.scheduledAt)
  const start2 = new Date(event2.scheduledAt)

  const duration1 = (event1.duration_s || 3600) * 1000 // 1h par défaut
  const duration2 = (event2.duration_s || 3600) * 1000

  const end1 = new Date(start1.getTime() + duration1)
  const end2 = new Date(start2.getTime() + duration2)

  return start1 < end2 && start2 < end1
}

export function findConflictingEvents(events: ScheduledEvent[]): ScheduledEvent[][] {
  const conflicts: ScheduledEvent[][] = []

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const firstEvent = events[i]
      const secondEvent = events[j]
      if (!firstEvent || !secondEvent) continue

      if (isEventConflicting(firstEvent, secondEvent)) {
        // Chercher si l'un des ?v?nements est d?j?? dans un groupe de conflit
        let conflictGroup = conflicts.find(group =>
          group.includes(firstEvent) || group.includes(secondEvent)
        )

        if (!conflictGroup) {
          conflictGroup = []
          conflicts.push(conflictGroup)
        }

        if (!conflictGroup.includes(firstEvent)) conflictGroup.push(firstEvent)
        if (!conflictGroup.includes(secondEvent)) conflictGroup.push(secondEvent)
      }
    }
  }

  return conflicts
}
export function formatRecurrenceDescription(rrule: string): string {
  if (!rrule) return ''

  const parts = rrule.split(';')
  const freq = parts.find(p => p.startsWith('FREQ='))?.split('=')[1]
  const interval = parts.find(p => p.startsWith('INTERVAL='))?.split('=')[1]

  switch (freq) {
    case 'DAILY':
      return interval && Number(interval) > 1
        ? `Tous les ${interval} jours`
        : 'Quotidien'
    case 'WEEKLY':
      return interval && Number(interval) > 1
        ? `Toutes les ${interval} semaines`
        : 'Hebdomadaire'
    case 'MONTHLY':
      return interval && Number(interval) > 1
        ? `Tous les ${interval} mois`
        : 'Mensuel'
    default:
      return 'Récurrent'
  }
}





