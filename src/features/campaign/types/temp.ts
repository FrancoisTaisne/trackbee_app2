/**
 * Types temporaires pour débloquer rapidement les erreurs TypeScript
 * À remplacer progressivement par des types stricts
 */

// Props temporaires unknown pour débloquer
export interface TempCampaignProps {
  campaign?: unknown
  statistics?: unknown
  calculations?: unknown
  onRetry?: () => void
  compact?: boolean
}

type CampaignTypeKey = 'static_simple' | 'static_multiple' | 'kinematic' | 'rover_base'

interface CampaignTypeInfo {
  label: string
  icon: string
  color: string
}

// Fonction utilitaire temporaire
export function getTempCampaignType(type: CampaignTypeKey | string): CampaignTypeInfo {
  const CAMPAIGN_TYPES: Record<CampaignTypeKey, CampaignTypeInfo> = {
    static_simple: { label: 'Statique Simple', icon: 'target', color: 'blue' },
    static_multiple: { label: 'Statique Multiple', icon: 'repeat', color: 'green' },
    kinematic: { label: 'Cinématique', icon: 'route', color: 'orange' },
    rover_base: { label: 'Rover-Base', icon: 'radio', color: 'purple' }
  } as const

  return CAMPAIGN_TYPES[type as CampaignTypeKey] || CAMPAIGN_TYPES.static_simple
}

// Props composants temporaires
export interface TempRecurrenceProps {
  register: unknown
  errors: unknown
  isOpen: boolean
  onToggle: () => void
}