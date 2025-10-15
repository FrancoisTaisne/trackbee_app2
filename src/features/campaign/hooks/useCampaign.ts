/**
 * Campaign Detail Hook
 * Hook principal pour la gestion d'une campagne spécifique
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '@/core/services/api/HttpClient'
import { logger } from '@/core/utils/logger'
import type { CampaignId, Campaign, CalculationId } from '@/core/types/domain'
import type {
  CampaignBundle,
  CampaignCalculation,
  CampaignFile,
  CampaignStatistics,
  UpdateCampaignData,
  UseCampaignReturn
} from '../types'
import { UpdateCampaignSchema } from '../types'

// ==================== TYPES ====================

type CalculationConfig = Record<string, unknown>

const campaignQueryKeys = {
  all: ['campaigns'] as const,
  lists: () => ['campaigns', 'list'] as const,
  detail: (id: CampaignId) => ['campaigns', 'detail', id] as const,
  bundle: (id: CampaignId) => ['campaigns', 'bundle', id] as const,
  calculations: (id: CampaignId) => ['campaigns', 'detail', id, 'calculations'] as const,
  statistics: () => ['campaigns', 'statistics'] as const,
}

const log = logger.extend('campaign')

// ==================== API FUNCTIONS ====================

async function fetchCampaignBundle(campaignId: CampaignId): Promise<CampaignBundle> {
  log.debug('fetchCampaignBundle', { campaignId })

  const campaignResponse = await httpClient.get<Campaign>(`/api/campaigns/${campaignId}`)
  const calculationsResponse = await httpClient.get<CampaignCalculation[]>(`/api/campaigns/${campaignId}/calculations`)
  const filesResponse = await httpClient.get<Array<Record<string, unknown>>>(`/api/campaigns/${campaignId}/files`)
  const statisticsResponse = await httpClient.get<Partial<CampaignStatistics> & { lastActivityAt?: string | Date }>(
    `/api/campaigns/${campaignId}/statistics`
  )

  const campaign = campaignResponse.data
  if (!campaign) {
    throw new Error(`Campaign ${campaignId} introuvable`)
  }

  const calculations = Array.isArray(calculationsResponse.data)
    ? (calculationsResponse.data as CampaignCalculation[])
    : []

  const files = (Array.isArray(filesResponse.data) ? filesResponse.data : []).map((file, index): CampaignFile => {
    const uploadedAt = (file.uploadedAt ?? (file as { uploaded_at?: string }).uploaded_at) as string | undefined
    const processed = file.processed ?? (file as { isProcessed?: boolean }).isProcessed ?? false

    return {
      id: typeof file.id === 'string' || typeof file.id === 'number'
        ? String(file.id)
        : `${campaignId}-file-${index}`,
      campaignId: campaign.id,
      name: typeof file.name === 'string' ? file.name : `fichier-${index + 1}`,
      type: (file.type as CampaignFile['type']) || 'result',
      size: typeof file.size === 'number' ? file.size : undefined,
      hash: typeof file.hash === 'string' ? file.hash : undefined,
      uploadedAt: uploadedAt ? new Date(uploadedAt).toISOString() : undefined,
      processed: Boolean(processed),
      recordedAt: typeof file.recordedAt === 'string' ? file.recordedAt : undefined,
      deviceTimestamp: typeof file.deviceTimestamp === 'string' ? file.deviceTimestamp : undefined
    }
  })

  const statsRaw = (statisticsResponse.data ?? {}) as Partial<CampaignStatistics> & {
    lastActivityAt?: string | Date
  }
  const lastActivitySource = statsRaw.lastActivity ?? statsRaw.lastActivityAt ?? campaign.updatedAt
  const lastActivity = lastActivitySource instanceof Date
    ? lastActivitySource.toISOString()
    : typeof lastActivitySource === 'string'
      ? lastActivitySource
      : undefined

  const statistics: CampaignStatistics = {
    totalCampaigns: statsRaw.totalCampaigns ?? 1,
    activeCampaigns: statsRaw.activeCampaigns ?? (campaign.status === 'active' ? 1 : 0),
    completedCampaigns: statsRaw.completedCampaigns ?? (['done', 'completed'].includes(campaign.status) ? 1 : 0),
    failedCampaigns: statsRaw.failedCampaigns ?? 0,
    totalCalculations: statsRaw.totalCalculations ?? calculations.length,
    successfulCalculations: statsRaw.successfulCalculations
      ?? calculations.filter(c => c.status === 'done' || c.status === 'completed').length,
    averageDuration: statsRaw.averageDuration ?? 0,
    totalFiles: statsRaw.totalFiles ?? files.length,
    totalDataSize: statsRaw.totalDataSize ?? files.reduce((acc, file) => acc + (file.size ?? 0), 0),
    lastActivity
  }

  log.info('Campaign bundle loaded', {
    campaignId,
    calculationsCount: calculations.length,
    filesCount: files.length
  })

  return {
    campaign,
    calculations,
    files,
    statistics
  }
}

async function updateCampaign(campaignId: CampaignId, data: UpdateCampaignData): Promise<Campaign> {
  log.debug('updateCampaign', { campaignId, data })

  const normalized: UpdateCampaignData = {
    ...data,
    scheduledAt: data.scheduledAt
      ? (data.scheduledAt instanceof Date ? data.scheduledAt.toISOString() : data.scheduledAt)
      : undefined
  }

  const validated = UpdateCampaignSchema.parse(normalized)
  const response = await httpClient.put<Campaign>(`/api/campaigns/${campaignId}`, validated)
  const updated = response.data
  if (!updated) {
    throw new Error('Campaign update response missing data')
  }

  log.info('Campaign updated', { campaignId, updated })
  return updated
}

async function deleteCampaign(campaignId: CampaignId): Promise<void> {
  log.debug('deleteCampaign', { campaignId })

  await httpClient.delete(`/api/campaigns/${campaignId}`)

  log.info('Campaign deleted', { campaignId })
}

async function startCampaign(campaignId: CampaignId): Promise<void> {
  log.debug('startCampaign', { campaignId })

  await httpClient.post(`/api/campaigns/${campaignId}/start`)

  log.info('Campaign started', { campaignId })
}

async function pauseCampaign(campaignId: CampaignId): Promise<void> {
  log.debug('pauseCampaign', { campaignId })

  await httpClient.post(`/api/campaigns/${campaignId}/pause`)

  log.info('Campaign paused', { campaignId })
}

async function resumeCampaign(campaignId: CampaignId): Promise<void> {
  log.debug('resumeCampaign', { campaignId })

  await httpClient.post(`/api/campaigns/${campaignId}/resume`)

  log.info('Campaign resumed', { campaignId })
}

async function cancelCampaign(campaignId: CampaignId): Promise<void> {
  log.debug('cancelCampaign', { campaignId })

  await httpClient.post(`/api/campaigns/${campaignId}/cancel`)

  log.info('Campaign canceled', { campaignId })
}

async function createCalculation(campaignId: CampaignId, config: CalculationConfig = {}): Promise<CampaignCalculation> {
  log.debug('createCalculation', { campaignId, config })

  const response = await httpClient.post<CampaignCalculation>(`/api/campaigns/${campaignId}/calculations`, config)
  const calculation = response.data

  if (!calculation) {
    throw new Error('Calculation creation response missing data')
  }

  log.info('Calculation created', { campaignId, calculationId: calculation.id })
  return calculation
}

async function retryCalculation(
  campaignId: CampaignId,
  calculationId: CalculationId
): Promise<CampaignCalculation> {
  log.debug('retryCalculation', { campaignId, calculationId })

  const response = await httpClient.post<CampaignCalculation>(
    `/api/campaigns/${campaignId}/calculations/${calculationId}/retry`
  )
  const calculation = response.data

  if (!calculation) {
    throw new Error('Calculation retry response missing data')
  }

  log.info('Calculation retried', { campaignId, calculationId })
  return calculation
}

// ==================== HOOK ====================

export function useCampaign(campaignId: CampaignId): UseCampaignReturn {
  const queryClient = useQueryClient()

  // Query principale pour récupérer le bundle complet
  const {
    data: bundle,
    isLoading,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: campaignQueryKeys.bundle(campaignId),
    queryFn: () => fetchCampaignBundle(campaignId),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,    // 5 minutes
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('404')) {
        return false // Ne pas retry si campagne n'existe pas
      }
      return failureCount < 3
    }
  })

  // Mutations pour actions sur la campagne
  const updateMutation = useMutation({
    mutationFn: (data: UpdateCampaignData) => updateCampaign(campaignId, data),
    onSuccess: (updatedCampaign) => {
      // Mise à jour du cache avec la campagne modifiée
      queryClient.setQueryData(campaignQueryKeys.bundle(campaignId), (oldBundle: CampaignBundle | undefined) =>
        oldBundle ? { ...oldBundle, campaign: updatedCampaign } : undefined
      )

      // Invalidation des listes de campagnes
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.lists() })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteCampaign(campaignId),
    onSuccess: () => {
      // Suppression du cache
      queryClient.removeQueries({ queryKey: campaignQueryKeys.detail(campaignId) })

      // Invalidation des listes
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.statistics() })
    }
  })

  const startMutation = useMutation({
    mutationFn: () => startCampaign(campaignId),
    onSuccess: () => {
      // Invalider pour recharger le statut
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.bundle(campaignId) })
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.lists() })
    }
  })

  const pauseMutation = useMutation({
    mutationFn: () => pauseCampaign(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.bundle(campaignId) })
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.lists() })
    }
  })

  const resumeMutation = useMutation({
    mutationFn: () => resumeCampaign(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.bundle(campaignId) })
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.lists() })
    }
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelCampaign(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.bundle(campaignId) })
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.lists() })
    }
  })

  const createCalculationMutation = useMutation({
    mutationFn: (config?: CalculationConfig) => createCalculation(campaignId, config),
    onSuccess: () => {
      // Invalider pour recharger les calculs
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.bundle(campaignId) })
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.calculations(campaignId) })
    }
  })

  const retryCalculationMutation = useMutation({
    mutationFn: (calculationId: CalculationId) => retryCalculation(campaignId, calculationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.bundle(campaignId) })
      queryClient.invalidateQueries({ queryKey: campaignQueryKeys.calculations(campaignId) })
    }
  })

  // Gestion des erreurs
  const error = queryError ||
                updateMutation.error ||
                deleteMutation.error ||
                startMutation.error ||
                pauseMutation.error ||
                resumeMutation.error ||
                cancelMutation.error ||
                createCalculationMutation.error ||
                retryCalculationMutation.error

  // Extraction des données du bundle
  const campaign = bundle?.campaign || null
  const calculations = bundle?.calculations || []
  const files = bundle?.files || []
  const statistics = bundle?.statistics || null

  return {
    // Données
    campaign,
    calculations,
    files,
    statistics,
    isLoading,
    error,

    // Actions sur la campagne
    updateCampaign: updateMutation.mutateAsync,
    deleteCampaign: deleteMutation.mutateAsync,
    startCampaign: startMutation.mutateAsync,
    pauseCampaign: pauseMutation.mutateAsync,
    resumeCampaign: resumeMutation.mutateAsync,
    cancelCampaign: cancelMutation.mutateAsync,

    // Actions sur les calculs
    createCalculation: createCalculationMutation.mutateAsync,
    retryCalculation: retryCalculationMutation.mutateAsync,

    // Utilitaires
    refetch: async () => {
      await refetch()
    }
  }
}

// ==================== HELPERS ====================

export function getCampaignProgress(campaign: Campaign, calculations: CampaignCalculation[]): number {
  if (['done', 'completed'].includes(campaign.status)) return 100
  if (['canceled', 'cancelled', 'failed', 'error'].includes(campaign.status)) return 0
  if (calculations.length === 0) return 0

  const completed = calculations.filter(c => c.status === 'done' || c.status === 'completed').length
  return Math.round((completed / calculations.length) * 100)
}

export function getCampaignDuration(campaign: Campaign): number | null {
  if (!campaign.startedAt) return null

  const endDate = campaign.completedAt ? new Date(campaign.completedAt) : new Date()
  const startDate = new Date(campaign.startedAt)

  return Math.round((endDate.getTime() - startDate.getTime()) / 1000)
}

export function getNextScheduledEvent(campaign: Campaign): Date | null {
  if (!campaign.scheduledAt) return null
  if (!['active', 'scheduled', 'running'].includes(campaign.status)) return null

  const scheduled = new Date(campaign.scheduledAt)
  if (scheduled > new Date()) return scheduled

  // Pour les campagnes récurrentes, calculer la prochaine occurrence
  if (campaign.rrule && campaign.type === 'static_multiple') {
    // TODO: Parser RRULE et calculer prochaine occurrence
    // Pour l'instant, retourner null
    return null
  }

  return null
}

export function canStartCampaign(campaign: Campaign): boolean {
  return ['draft', 'paused', 'scheduled', 'cancelled', 'canceled'].includes(campaign.status)
}

export function canPauseCampaign(campaign: Campaign): boolean {
  return ['active', 'running'].includes(campaign.status)
}

export function canCancelCampaign(campaign: Campaign): boolean {
  return ['draft', 'active', 'paused', 'scheduled', 'running'].includes(campaign.status)
}

export function canEditCampaign(campaign: Campaign): boolean {
  return ['draft', 'paused', 'scheduled'].includes(campaign.status)
}

export function canDeleteCampaign(campaign: Campaign): boolean {
  return ['draft', 'done', 'completed', 'canceled', 'cancelled', 'failed', 'error'].includes(campaign.status)
}
