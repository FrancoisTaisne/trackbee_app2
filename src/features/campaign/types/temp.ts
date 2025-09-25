/**
 * Types temporaires pour débloquer rapidement les erreurs TypeScript
 * À remplacer progressivement par des types stricts
 */

// Props temporaires any pour débloquer
export interface TempCampaignProps {
  campaign?: any
  statistics?: any
  calculations?: any
  onRetry?: any
  compact?: boolean
}

// Fonction utilitaire temporaire
export function getTempCampaignType(type: any): any {
  const CAMPAIGN_TYPES = {
    static_simple: { label: 'Statique Simple', icon: 'target', color: 'blue' },
    static_multiple: { label: 'Statique Multiple', icon: 'repeat', color: 'green' },
    kinematic: { label: 'Cinématique', icon: 'route', color: 'orange' },
    rover_base: { label: 'Rover-Base', icon: 'radio', color: 'purple' }
  } as const

  return (CAMPAIGN_TYPES as any)[type] || CAMPAIGN_TYPES.static_simple
}

// Props composants temporaires
export interface TempRecurrenceProps {
  register: any
  errors: any
  isOpen: boolean
  onToggle: () => void
}