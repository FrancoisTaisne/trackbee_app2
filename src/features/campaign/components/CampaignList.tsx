/**
 * Campaign List Component
 * Liste des campagnes avec filtres, tri et actions
 */

import React, { useState } from 'react'
import {
  Search, Filter, Plus, MoreVertical,
  Copy, Trash2, Clock, Target, Route, Radio, Repeat
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { logger } from '@/core/utils/logger'
import { useCampaignList } from '../hooks'
import { CampaignForm } from './CampaignForm'
import type {
  CampaignListProps, CampaignFilters, CampaignSorting, CreateCampaignData
} from '../types'
import type { Campaign, CampaignStatus, CampaignType } from '@/core/types/domain'
import {
  CAMPAIGN_TYPES, CAMPAIGN_STATUS_LABELS, CAMPAIGN_PRIORITIES, CAMPAIGN_STATUS_COLORS
} from '../types'

const log = logger.extend('campaign')

const CAMPAIGN_TYPE_ICONS: Record<keyof typeof CAMPAIGN_TYPES, LucideIcon> = {
  static_simple: Target,
  static_multiple: Repeat,
  kinematic: Route,
  rover_base: Radio
}

const STATUS_COLORS = CAMPAIGN_STATUS_COLORS

type CampaignPriorityKey = keyof typeof CAMPAIGN_PRIORITIES

const hasOwn = <T extends object>(obj: T, key: PropertyKey): key is keyof T => (
  Object.prototype.hasOwnProperty.call(obj, key)
)

const toCampaignType = (value: string): CampaignType | undefined =>
  value && hasOwn(CAMPAIGN_TYPES, value) ? value as CampaignType : undefined

const toPriorityKey = (value: number | undefined): CampaignPriorityKey => {
  const candidate = value ?? 5
  return hasOwn(CAMPAIGN_PRIORITIES, candidate) ? candidate : 5
}

export function CampaignList({
  siteId,
  machineId,
  installationId,
  filters: initialFilters,
  onCampaignSelect,
  onCampaignCreate,
  className = ''
}: CampaignListProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<number>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const {
    campaigns,
    isLoading,
    error,
    hasMore,
    loadMore,
    createCampaign,
    duplicateCampaign,
    deleteCampaigns,
    filters,
    setFilters,
    sorting,
    setSorting,
    refetch
  } = useCampaignList({
    siteId,
    machineId,
    installationId,
    ...initialFilters
  })

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setFilters({ search: query.trim() || undefined })
  }

  const handleCreateCampaign = async (data: CreateCampaignData) => {
    try {
      log.debug('Creating campaign from list', { data })

      const campaign = await createCampaign(data)

      setShowCreateForm(false)
      onCampaignCreate?.(data)

      log.info('Campaign created successfully', { campaignId: campaign.id })
    } catch (error) {
      log.error('Failed to create campaign', { error })
      throw error
    }
  }

  const handleCampaignAction = async (campaign: Campaign, action: string) => {
    try {
      switch (action) {
        case 'select':
          onCampaignSelect?.(campaign)
          break
        case 'duplicate':
          await duplicateCampaign(campaign.id)
          break
        case 'delete':
          if (confirm(`Êtes-vous sûr de vouloir supprimer la campagne "${campaign.name || `#${campaign.id}`}" ?`)) {
            await deleteCampaigns([campaign.id])
          }
          break
      }
    } catch (error) {
      log.error('Campaign action failed', { action, campaignId: campaign.id, error })
    }
  }

  const handleBulkDelete = async () => {
    if (selectedCampaigns.size === 0) return

    const count = selectedCampaigns.size
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${count} campagne(s) ?`)) {
      try {
        await deleteCampaigns(Array.from(selectedCampaigns))
        setSelectedCampaigns(new Set())
      } catch (error) {
        log.error('Bulk delete failed', { error })
      }
    }
  }

  const toggleCampaignSelection = (campaignId: number) => {
    const newSelection = new Set(selectedCampaigns)
    if (newSelection.has(campaignId)) {
      newSelection.delete(campaignId)
    } else {
      newSelection.add(campaignId)
    }
    setSelectedCampaigns(newSelection)
  }

  const selectAllCampaigns = () => {
    if (selectedCampaigns.size === campaigns.length) {
      setSelectedCampaigns(new Set())
    } else {
      setSelectedCampaigns(new Set(campaigns.map(c => c.id)))
    }
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-600 mb-2">Erreur lors du chargement des campagnes</div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className={`campaign-list ${className}`}>
      {/* En-tête avec actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Campagnes</h2>
          <p className="text-sm text-gray-500">
            {campaigns.length} campagne{campaigns.length !== 1 ? 's' : ''}
            {selectedCampaigns.size > 0 && ` · ${selectedCampaigns.size} sélectionnée(s)`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedCampaigns.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-3 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-200 rounded-md hover:bg-red-200"
            >
              <Trash2 className="w-4 h-4 mr-1 inline" />
              Supprimer ({selectedCampaigns.size})
            </button>
          )}

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 text-sm font-medium border rounded-md ${
              showFilters
                ? 'text-blue-700 bg-blue-100 border-blue-200'
                : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4 mr-1 inline" />
            Filtres
          </button>

          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-1 inline" />
            Nouvelle campagne
          </button>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Rechercher des campagnes..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Filtres avancés */}
      {showFilters && (
        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          sorting={sorting}
          onSortingChange={setSorting}
        />
      )}

      {/* Liste des campagnes */}
      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
                <span className="ml-3 text-gray-600">Chargement...</span>
              </div>
            ) : (
              <div>
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune campagne</h3>
                <p className="text-gray-500 mb-4">
                  Créez votre première campagne de mesure GNSS
                </p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-1 inline" />
                  Créer une campagne
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* En-tête du tableau */}
            <div className="flex items-center px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
              <div className="w-8">
                <input
                  type="checkbox"
                  checked={selectedCampaigns.size === campaigns.length && campaigns.length > 0}
                  onChange={selectAllCampaigns}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">Campagne</div>
              <div className="w-32">Type</div>
              <div className="w-24">Statut</div>
              <div className="w-24">Priorité</div>
              <div className="w-32">Planification</div>
              <div className="w-8">Actions</div>
            </div>

            {/* Lignes des campagnes */}
            {campaigns.map((campaign) => (
              <CampaignRow
                key={campaign.id}
                campaign={campaign}
                isSelected={selectedCampaigns.has(campaign.id)}
                onSelect={() => toggleCampaignSelection(campaign.id)}
                onAction={(action) => handleCampaignAction(campaign, action)}
              />
            ))}

            {/* Bouton charger plus */}
            {hasMore && (
              <div className="text-center py-4">
                <button
                  onClick={loadMore}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-md hover:bg-blue-50 disabled:opacity-50"
                >
                  {isLoading ? 'Chargement...' : 'Charger plus'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Formulaire de création */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <CampaignForm
                siteId={siteId!}
                machineId={machineId!}
                installationId={installationId}
                mode="create"
                onSubmit={handleCreateCampaign}
                onCancel={() => setShowCreateForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== CAMPAIGN ROW COMPONENT ====================

interface CampaignRowProps {
  campaign: Campaign
  isSelected: boolean
  onSelect: () => void
  onAction: (action: string) => void
}

function CampaignRow({ campaign, isSelected, onSelect, onAction }: CampaignRowProps) {
  const [showActions, setShowActions] = useState(false)

  const typeKey = toCampaignType(campaign.type) ?? 'static_simple'
  const typeConfig = CAMPAIGN_TYPES[typeKey]
  const TypeIcon = CAMPAIGN_TYPE_ICONS[typeKey] ?? Target
  const statusColor = STATUS_COLORS[campaign.status] ?? 'gray'
  const statusLabel = CAMPAIGN_STATUS_LABELS[campaign.status] ?? campaign.status
  const priorityKey = toPriorityKey(campaign.priority)
  const priorityConfig = CAMPAIGN_PRIORITIES[priorityKey]

  return (
    <div className={`flex items-center px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 ${
      isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white'
    }`}>
      <div className="w-8">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </div>

      <div className="flex-1 cursor-pointer" onClick={() => onAction('select')}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-${typeConfig.color}-100`}>
            <TypeIcon className={`w-4 h-4 text-${typeConfig.color}-600`} />
          </div>
          <div>
            <h4 className="font-medium text-gray-900">
              {campaign.name || `Campagne #${campaign.id}`}
            </h4>
            {campaign.description && (
              <p className="text-sm text-gray-500">{campaign.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="w-32">
        <span className="text-sm font-medium text-gray-700">
          {typeConfig.label}
        </span>
      </div>

      <div className="w-24">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-800`}>
          {statusLabel}
        </span>
      </div>

      <div className="w-24">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${priorityConfig.color}-100 text-${priorityConfig.color}-800`}>
          {priorityConfig.label}
        </span>
      </div>

      <div className="w-32">
        {campaign.scheduledAt ? (
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Clock className="w-3 h-3" />
            {new Date(campaign.scheduledAt).toLocaleDateString('fr-FR')}
          </div>
        ) : (
          <span className="text-sm text-gray-400">-</span>
        )}
      </div>

      <div className="w-8 relative">
        <button
          onClick={() => setShowActions(!showActions)}
          className="p-1 rounded hover:bg-gray-200"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {showActions && (
          <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-10 py-1 min-w-32">
            <button
              onClick={() => {
                onAction('select')
                setShowActions(false)
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
            >
              Voir détails
            </button>
            <button
              onClick={() => {
                onAction('duplicate')
                setShowActions(false)
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
            >
              <Copy className="w-3 h-3 mr-2 inline" />
              Dupliquer
            </button>
            <hr className="my-1" />
            <button
              onClick={() => {
                onAction('delete')
                setShowActions(false)
              }}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3 mr-2 inline" />
              Supprimer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== FILTER PANEL COMPONENT ====================

interface FilterPanelProps {
  filters: CampaignFilters
  onFiltersChange: (filters: Partial<CampaignFilters>) => void
  sorting: CampaignSorting
  onSortingChange: (sorting: CampaignSorting) => void
}

function FilterPanel({ filters, onFiltersChange, sorting, onSortingChange }: FilterPanelProps) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            value={filters.type || ''}
            onChange={(e) => {
              const nextType = e.target.value
              onFiltersChange({ type: nextType ? toCampaignType(nextType) : undefined })
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Tous les types</option>
            {Object.entries(CAMPAIGN_TYPES).map(([type, config]) => (
              <option key={type} value={type}>{config.label}</option>
            ))}
          </select>
        </div>

        {/* Statut */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Statut
          </label>
          <select
            value={filters.status?.[0] || ''}
            onChange={(e) => {
              const selectedStatus = e.target.value as CampaignStatus | ''
              onFiltersChange({
                status: selectedStatus ? [selectedStatus] : undefined
              })
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(CAMPAIGN_STATUS_LABELS).map(([status, label]) => (
              <option key={status} value={status}>{label}</option>
            ))}
          </select>
        </div>

        {/* Tri */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Trier par
          </label>
          <select
            value={`${sorting.field}-${sorting.direction}`}
            onChange={(e) => {
              const [field, direction] = e.target.value.split('-') as [
                CampaignSorting['field'],
                CampaignSorting['direction']
              ]
              onSortingChange({ field, direction })
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="createdAt-desc">Plus récent</option>
            <option value="createdAt-asc">Plus ancien</option>
            <option value="name-asc">Nom (A-Z)</option>
            <option value="name-desc">Nom (Z-A)</option>
            <option value="priority-desc">Priorité décroissante</option>
            <option value="priority-asc">Priorité croissante</option>
            <option value="scheduledAt-asc">Planification</option>
          </select>
        </div>

        {/* Reset */}
        <div className="flex items-end">
          <button
            onClick={() => {
              onFiltersChange({
                type: undefined,
                status: undefined,
                search: undefined,
                dateRange: undefined,
                tags: undefined
              })
              onSortingChange({ field: 'createdAt', direction: 'desc' })
            }}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Réinitialiser
          </button>
        </div>
      </div>
    </div>
  )
}
