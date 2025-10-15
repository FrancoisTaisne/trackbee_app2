/**
 * Campaign Detail Component
 * Vue détaillée d'une campagne avec gestion des actions et calculs
 */

import React, { useMemo, useState } from 'react'
import {
  Play, Pause, Square, Edit, Trash2, Clock, Calendar,
  Target, Route, Radio, Repeat, FileText, Download, RefreshCw,
  CheckCircle, XCircle, Loader, MoreVertical,
  Activity, Plus, Settings
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { logger } from '@/core/utils/logger'
import { useCampaign, getCampaignProgress, getCampaignDuration, canStartCampaign, canPauseCampaign, canCancelCampaign, canEditCampaign, canDeleteCampaign } from '../hooks'
import { CampaignForm } from './CampaignForm'
import type {
  CampaignDetailProps,
  UpdateCampaignData,
  CampaignFile as CampaignFileInfo,
  CampaignStatistics as CampaignStats,
  CreateCampaignData
} from '../types'
import { CAMPAIGN_TYPES, CAMPAIGN_STATUS_LABELS, CAMPAIGN_PRIORITIES, CAMPAIGN_STATUS_COLORS } from '../types'
import type { Campaign, CalculationStatus, CalculationId } from '@/core/types/domain'
import type { CampaignCalculation } from '../types'

// Logger dédié à la fiche campagne
const campaignLog = {
  debug: (msg: string, data?: unknown) => logger.debug('campaignDetail', msg, data),
  info: (msg: string, data?: unknown) => logger.info('campaignDetail', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('campaignDetail', msg, data),
  error: (msg: string, data?: unknown) => logger.error('campaignDetail', msg, data)
}

type UseCampaignResult = ReturnType<typeof useCampaign>
type CampaignEntity = NonNullable<UseCampaignResult['campaign']>
type CampaignCalculations = UseCampaignResult['calculations']
type CampaignFiles = UseCampaignResult['files']
type CampaignStatsData = UseCampaignResult['statistics']
type CampaignTab = 'overview' | 'calculations' | 'files' | 'settings'

const CAMPAIGN_TYPE_ICONS: Record<keyof typeof CAMPAIGN_TYPES, LucideIcon> = {
  static_simple: Target,
  static_multiple: Repeat,
  kinematic: Route,
  rover_base: Radio
}

const STATUS_COLORS = CAMPAIGN_STATUS_COLORS

const CALCULATION_STATUS_ICONS: Record<CalculationStatus, LucideIcon> = {
  queued: Clock,
  running: Loader,
  done: CheckCircle,
  failed: XCircle,
  pending: Clock,
  completed: CheckCircle
}

const CALCULATION_STATUS_COLORS: Record<CalculationStatus, 'yellow' | 'blue' | 'green' | 'red'> = {
  queued: 'yellow',
  running: 'blue',
  done: 'green',
  failed: 'red',
  pending: 'yellow',
  completed: 'green'
}

interface CalculationItemProps {
  calculation: CampaignCalculation
  compact?: boolean
  onRetry?: () => void
}

export function CampaignDetail({
  campaignId,
  onUpdate,
  onDelete,
  className = ''
}: CampaignDetailProps) {
  const [showEditForm, setShowEditForm] = useState(false)
  const [activeTab, setActiveTab] = useState<CampaignTab>('overview')
  const [showActions, setShowActions] = useState(false)

  const {
    campaign,
    calculations,
    files,
    statistics,
    isLoading,
    error,
    updateCampaign,
    deleteCampaign,
    startCampaign,
    pauseCampaign,
    resumeCampaign,
    cancelCampaign,
    createCalculation,
    retryCalculation,
    refetch
  } = useCampaign(campaignId)

  const handleAction = async (action: string) => {
    try {
      campaignLog.debug('Campaign action', { campaignId, action })

      switch (action) {
        case 'start':
          await startCampaign()
          break
        case 'pause':
          await pauseCampaign()
          break
        case 'resume':
          await resumeCampaign()
          break
        case 'cancel':
          if (confirm('Êtes-vous sûr de vouloir annuler cette campagne ?')) {
            await cancelCampaign()
          }
          break
        case 'delete':
          if (confirm('Êtes-vous sûr de vouloir supprimer cette campagne ?')) {
            await deleteCampaign()
            onDelete?.(campaignId)
          }
          break
        case 'create-calculation':
          await createCalculation()
          break
      }

      setShowActions(false)
      campaignLog.info('Campaign action completed', { campaignId, action })
    } catch (error) {
      campaignLog.error('Campaign action failed', { campaignId, action, error })
    }
  }

  const handleEditSubmit = async (formData: CreateCampaignData) => {
    try {
      const updatePayload: UpdateCampaignData = {
        name: formData.name,
        description: formData.description,
        priority: formData.priority,
        tags: formData.tags,
        scheduledAt: formData.schedule?.type === 'scheduled' ? formData.schedule.scheduledAt : undefined,
        rrule: formData.schedule?.type === 'recurring' ? formData.schedule.rrule : undefined
      }

      const updated = await updateCampaign(updatePayload)
      setShowEditForm(false)
      onUpdate?.(updated)
      await refetch()
    } catch (error) {
      campaignLog.error('Failed to update campaign', { error })
      throw error
    }
  }

  const handleRetryCalculation = async (calculationId: CalculationId) => {
    try {
      await retryCalculation(calculationId)
    } catch (error) {
      campaignLog.error('Failed to retry calculation', { calculationId, error })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
        <span className="ml-3 text-gray-600">Chargement...</span>
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-600 mb-2">
          {error?.message || 'Campagne non trouvée'}
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
        >
          Réessayer
        </button>
      </div>
    )
  }

  const typeKey = campaign.type as keyof typeof CAMPAIGN_TYPES
  const typeConfig = CAMPAIGN_TYPES[typeKey] ?? CAMPAIGN_TYPES.static_simple
  const TypeIcon = CAMPAIGN_TYPE_ICONS[typeKey] ?? Target

  const statusKey = campaign.status as keyof typeof STATUS_COLORS
  const statusColor = STATUS_COLORS[statusKey] ?? 'gray'
  const statusLabel = CAMPAIGN_STATUS_LABELS[statusKey] ?? campaign.status

  const priorityKey = (campaign.priority ?? 5) as keyof typeof CAMPAIGN_PRIORITIES
  const priorityConfig = CAMPAIGN_PRIORITIES[priorityKey] ?? { label: 'Normale', color: 'blue' }

  const progress = getCampaignProgress(campaign, calculations)
  const duration = getCampaignDuration(campaign)
  const tabs = useMemo(
    () =>
      [
        { id: 'overview' as const, label: 'Vue d\'ensemble', icon: Target },
        { id: 'calculations' as const, label: 'Calculs', icon: Activity, count: calculations.length },
        { id: 'files' as const, label: 'Fichiers', icon: FileText, count: files.length },
        { id: 'settings' as const, label: 'Paramètres', icon: Settings }
      ],
    [calculations.length, files.length]
  )

  return (
    <div className={`campaign-detail ${className}`}>
      {/* En-tête */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg bg-${typeConfig.color}-100`}>
              <TypeIcon className={`w-6 h-6 text-${typeConfig.color}-600`} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {campaign.name || `Campagne #${campaign.id}`}
              </h1>
              <p className="text-gray-600 mb-3">
                {campaign.description || typeConfig.description}
              </p>

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Créée le {new Date(campaign.createdAt).toLocaleDateString('fr-FR')}
                </span>
                {campaign.scheduledAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Planifiée le {new Date(campaign.scheduledAt).toLocaleDateString('fr-FR')}
                  </span>
                )}
                {duration && (
                  <span className="flex items-center gap-1">
                    <Activity className="w-4 h-4" />
                    Durée: {Math.floor(duration / 60)}min {duration % 60}s
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Statut */}
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-${statusColor}-100 text-${statusColor}-800`}>
              {statusLabel}
            </span>

            {/* Priorité */}
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${priorityConfig.color}-100 text-${priorityConfig.color}-800`}>
              Priorité {campaign.priority || 5}
            </span>

            {/* Actions */}
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {showActions && (
                <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-md shadow-lg z-10 py-1 min-w-48">
                  {canStartCampaign(campaign) && (
                    <button
                      onClick={() => handleAction('start')}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      <Play className="w-4 h-4 mr-2 inline text-green-600" />
                      Démarrer
                    </button>
                  )}

                  {canPauseCampaign(campaign) && (
                    <button
                      onClick={() => handleAction('pause')}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      <Pause className="w-4 h-4 mr-2 inline text-yellow-600" />
                      Mettre en pause
                    </button>
                  )}

                  {campaign.status === 'paused' && (
                    <button
                      onClick={() => handleAction('resume')}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      <Play className="w-4 h-4 mr-2 inline text-green-600" />
                      Reprendre
                    </button>
                  )}

                  {canEditCampaign(campaign) && (
                    <button
                      onClick={() => setShowEditForm(true)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      <Edit className="w-4 h-4 mr-2 inline text-blue-600" />
                      Modifier
                    </button>
                  )}

                  <button
                    onClick={() => handleAction('create-calculation')}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    <Plus className="w-4 h-4 mr-2 inline text-blue-600" />
                    Nouveau calcul
                  </button>

                  <hr className="my-1" />

                  {canCancelCampaign(campaign) && (
                    <button
                      onClick={() => handleAction('cancel')}
                      className="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50"
                    >
                      <Square className="w-4 h-4 mr-2 inline" />
                      Annuler
                    </button>
                  )}

                  {canDeleteCampaign(campaign) && (
                    <button
                      onClick={() => handleAction('delete')}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2 inline" />
                      Supprimer
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Barre de progression */}
        {progress > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
              <span>Progression</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full bg-${statusColor}-600`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Navigation des onglets */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                    isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Contenu des onglets */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <OverviewTab
            campaign={campaign}
            statistics={statistics}
            calculations={calculations}
          />
        )}

        {activeTab === 'calculations' && (
          <CalculationsTab
            calculations={calculations}
            onRetryCalculation={handleRetryCalculation}
          />
        )}

        {activeTab === 'files' && (
          <FilesTab files={files} />
        )}

        {activeTab === 'settings' && (
          <SettingsTab campaign={campaign} />
        )}
      </div>

      {/* Formulaire d'édition */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <CampaignForm
                siteId={campaign.siteId}
                machineId={campaign.machineId}
                installationId={campaign.installationId}
                initialData={{
                  name: campaign.name,
                  description: campaign.description,
                  type: campaign.type,
                  duration_s: campaign.duration_s,
                  priority: campaign.priority,
                  tags: campaign.tags
                }}
                mode="edit"
                onSubmit={handleEditSubmit}
                onCancel={() => setShowEditForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== TAB COMPONENTS ====================

// Vue d'ensemble
function OverviewTab({
  campaign,
  statistics,
  calculations
}: {
  campaign: CampaignEntity
  statistics: CampaignStatsData
  calculations: CampaignCalculations
}) {
  const totalCalculations = calculations.length
  const completedCount = calculations.filter(c => c.status === 'done' || c.status === 'completed').length
  const failedCount = calculations.filter(c => c.status === 'failed').length
  const runningCount = calculations.filter(c => c.status === 'running').length
  const pendingCount = calculations.filter(c => c.status === 'queued' || c.status === 'pending').length
  const totalFiles = statistics?.totalFiles ?? 0
  const totalDataSize = statistics?.totalDataSize ?? 0
  const lastActivityLabel = statistics?.lastActivity
    ? new Date(statistics.lastActivity).toLocaleString('fr-FR')
    : new Date(campaign.updatedAt).toLocaleString('fr-FR')
  const formattedDataSize = totalDataSize > 0 ? (totalDataSize / (1024 * 1024)).toFixed(2) : '0.00'
  const typeKey = campaign.type as keyof typeof CAMPAIGN_TYPES
  const typeConfig = CAMPAIGN_TYPES[typeKey] ?? CAMPAIGN_TYPES.static_simple
  const tags = campaign.tags ?? []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Statistiques */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Statistiques</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalCalculations}</div>
              <div className="text-sm text-gray-500">Calculs total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {completedCount}
              </div>
              <div className="text-sm text-gray-500">Réussis</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {failedCount}
              </div>
              <div className="text-sm text-gray-500">Échoués</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {runningCount + pendingCount}
              </div>
              <div className="text-sm text-gray-500">En cours</div>
            </div>
          </div>
        </div>

        {/* Derniers calculs */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Derniers calculs</h3>
          <div className="space-y-3">
            {calculations.slice(0, 5).map((calculation) => (
              <CalculationItem
                key={calculation.id}
                calculation={calculation}
                compact
              />
            ))}
          </div>
        </div>
      </div>

      {/* Informations détaillées */}
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Détails</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Type</dt>
              <dd className="text-sm text-gray-900">{typeConfig.label}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Durée configurée</dt>
              <dd className="text-sm text-gray-900">
                {campaign.duration_s ? `${Math.floor(campaign.duration_s / 60)}min ${campaign.duration_s % 60}s` : '-'}
              </dd>
            </div>
            {campaign.rrule && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Récurrence</dt>
                <dd className="text-sm text-gray-900">{formatRRule(campaign.rrule)}</dd>
              </div>
            )}
            {tags.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Tags</dt>
                <dd className="text-sm text-gray-900">
                  <div className="flex flex-wrap gap-1 mt-1">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Fichiers suivis</dt>
              <dd className="text-sm text-gray-900">
                {totalFiles} fichiers
                {totalDataSize > 0 && (
                  <> • {formattedDataSize} Mo</>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Dernière activité</dt>
              <dd className="text-sm text-gray-900">{lastActivityLabel}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}

// Onglet calculs
function CalculationsTab({
  calculations,
  onRetryCalculation
}: {
  calculations: CampaignCalculations
  onRetryCalculation: (calculationId: CalculationId) => Promise<void> | void
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Calculs ({calculations.length})
        </h3>
      </div>
      <div className="divide-y divide-gray-200">
        {calculations.map((calculation) => (
          <CalculationItem
            key={calculation.id}
            calculation={calculation}
            onRetry={() => onRetryCalculation(calculation.id)}
          />
        ))}
      </div>
    </div>
  )
}

// Onglet fichiers
function FilesTab({ files }: { files: CampaignFiles }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Fichiers ({files.length})
        </h3>
      </div>
      <div className="divide-y divide-gray-200">
        {files.map((file) => (
          <div key={file.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">{file.name}</div>
                <div className="text-sm text-gray-500">
                  {file.size && `${Math.round(file.size / 1024)} KB`}
                  {file.uploadedAt && ` • Uploadé le ${new Date(file.uploadedAt).toLocaleDateString('fr-FR')}`}
                </div>
              </div>
            </div>
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <Download className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// Onglet paramètres
function SettingsTab({ campaign }: { campaign: CampaignEntity }) {
  const scheduleInfo = campaign.scheduledAt
    ? new Date(campaign.scheduledAt).toLocaleString('fr-FR')
    : 'Exécution immédiate'

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Paramètres</h3>
      <dl className="space-y-3 text-sm text-gray-600">
        <div>
          <dt className="font-medium text-gray-500">Site</dt>
          <dd className="text-gray-900">#{campaign.siteId}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">Machine</dt>
          <dd className="text-gray-900">#{campaign.machineId}</dd>
        </div>
        {campaign.installationId && (
          <div>
            <dt className="font-medium text-gray-500">Installation</dt>
            <dd className="text-gray-900">#{campaign.installationId}</dd>
          </div>
        )}
        <div>
          <dt className="font-medium text-gray-500">Planification</dt>
          <dd className="text-gray-900">{scheduleInfo}</dd>
        </div>
        <div>
          <dt className="font-medium text-gray-500">Priorité</dt>
          <dd className="text-gray-900">{campaign.priority ?? 5}</dd>
        </div>
      </dl>
    </div>
  )
}

// ==================== CALCULATION ITEM COMPONENT ====================

function CalculationItem({ calculation, compact = false, onRetry }: CalculationItemProps) {
  const StatusIcon = CALCULATION_STATUS_ICONS[calculation.status] ?? Clock
  const statusColor = CALCULATION_STATUS_COLORS[calculation.status]

  return (
    <div className={`flex items-center justify-between ${compact ? 'py-2' : 'p-4'}`}>
      <div className="flex items-center gap-3">
        <StatusIcon className={`w-5 h-5 text-${statusColor}-600 ${
          calculation.status === 'running' ? 'animate-spin' : ''
        }`} />
        <div>
          <div className="font-medium text-gray-900">
            {calculation.title || `Calcul #${calculation.id}`}
          </div>
          <div className="text-sm text-gray-500">
            {calculation.strategy}
            {calculation.actual_start && ` • ${new Date(calculation.actual_start).toLocaleDateString('fr-FR')}`}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${statusColor}-100 text-${statusColor}-800`}>
          {calculation.status}
        </span>
        {calculation.status === 'failed' && onRetry && (
          <button
            onClick={onRetry}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// ==================== HELPERS ====================

function formatRRule(rrule: string): string {
  if (!rrule) return ''

  const parts = rrule.split(';')
  const freq = parts.find(p => p.startsWith('FREQ='))?.split('=')[1]

  switch (freq) {
    case 'DAILY':
      return 'Quotidien'
    case 'WEEKLY':
      return 'Hebdomadaire'
    case 'MONTHLY':
      return 'Mensuel'
    default:
      return 'Récurrent'
  }
}

