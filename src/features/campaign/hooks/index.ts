/**
 * Campaign Hooks Export Index
 * Point d'entrée centralisé pour tous les hooks de gestion des campagnes
 */

export { useCampaign, getCampaignProgress, getCampaignDuration, getNextScheduledEvent, canStartCampaign, canPauseCampaign, canCancelCampaign, canEditCampaign, canDeleteCampaign } from './useCampaign'
export { useCampaignList, getDefaultFilters, buildSearchQuery, filterCampaignsByStatus, groupCampaignsByType, sortCampaigns } from './useCampaignList'
export { useCampaignScheduler, getUpcomingEventsForToday, getUpcomingEventsForWeek, groupEventsByDate, isEventConflicting, findConflictingEvents, formatRecurrenceDescription } from './useCampaignScheduler'

// Re-export types for convenience
export type {
  UseCampaignReturn,
  UseCampaignListReturn,
  UseCampaignSchedulerReturn,
  ScheduledEvent
} from '../types'