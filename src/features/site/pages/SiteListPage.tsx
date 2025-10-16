/**
 * SiteListPage Component - Page de liste des sites
 * Interface principale pour visualiser, gÃ©rer et crÃ©er des sites gÃ©ographiques
 */

import React, { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Map,
  List,
  Globe,
  Lock,
  MapPin,
  Users,
  Settings,
  MoreVertical,
  Edit3,
  Trash2,
  ExternalLink
} from 'lucide-react'

// UI Components imports
import { PageHeader, Section } from '@/shared/ui/components/Layout'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/components/Card/Card'
import { Button } from '@/shared/ui/components/Button/Button'
import { Input } from '@/shared/ui/components/Input/Input'
import { Badge } from '@/shared/ui/components/Badge/Badge'
import { ConfirmationModal } from '@/shared/ui/components/Modal/Modal'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@/shared/ui/components/Tabs/Tabs'

// Site feature imports
import { useSiteList } from '../hooks/useSiteList'
import { useSiteMap } from '../hooks/useSiteMap'
import { SiteMapView } from '../components/SiteMapView'
import { SiteForm } from '../components/SiteForm'
import type {
  SiteBundle,
  SiteFilters,
  SiteSorting,
  CreateSiteData
} from '../types'

// Core utilities
import { logger } from '@/core/utils/logger'
import { formatDistanceToNow } from '@/core/utils/time'

// ==================== LOGGER SETUP ====================

const siteListLog = {
  debug: (msg: string, data?: unknown) => logger.debug('siteListPage', msg, data),
  info: (msg: string, data?: unknown) => logger.info('siteListPage', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('siteListPage', msg, data),
  error: (msg: string, data?: unknown) => logger.error('siteListPage', msg, data)
}

// ==================== SITE CARD COMPONENT ====================

interface SiteCardProps {
  site: SiteBundle
  onSelect: (site: SiteBundle) => void
  onEdit: (site: SiteBundle) => void
  onDelete: (site: SiteBundle) => void
  onViewOnMap: (site: SiteBundle) => void
}

const SiteCard: React.FC<SiteCardProps> = ({
  site,
  onSelect,
  onEdit,
  onDelete,
  onViewOnMap
}) => {
  const { site: siteData, statistics } = site
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <Card
      className="transition-all duration-200 hover:shadow-md cursor-pointer group"
      onClick={() => onSelect(site)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex items-center space-x-2">
              <span className="text-lg font-semibold text-gray-900 truncate">
                {siteData.name}
              </span>
              <div className="flex items-center space-x-1">
                {siteData.isPublic ? (
                  <Globe className="w-4 h-4 text-success-500" />
                ) : (
                  <Lock className="w-4 h-4 text-gray-400" />
                )}
                {siteData.ownership === 'shared' && (
                  <Users className="w-4 h-4 text-primary-500" />
                )}
              </div>
            </CardTitle>

            {siteData.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {siteData.description}
              </p>
            )}

            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              {siteData.address && (
                <div className="flex items-center space-x-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{siteData.address}</span>
                </div>
              )}
              {siteData.coordinateSystem && siteData.coordinateSystem !== 'WGS84' && (
                <Badge variant="outline" size="sm">
                  {siteData.coordinateSystem}
                </Badge>
              )}
            </div>
          </div>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(event) => {
                event.stopPropagation()
                setMenuOpen((prev) => !prev)
              }}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg z-10"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onEdit(site)
                  }}
                  className="flex w-full items-center px-3 py-2 text-sm hover:bg-gray-100"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onViewOnMap(site)
                  }}
                  className="flex w-full items-center px-3 py-2 text-sm hover:bg-gray-100"
                >
                  <Map className="w-4 h-4 mr-2" />
                  Voir sur la carte
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onSelect(site)
                  }}
                  className="flex w-full items-center px-3 py-2 text-sm hover:bg-gray-100"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Voir le dÃ©tail
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onDelete(site)
                  }}
                  className="flex w-full items-center px-3 py-2 text-sm text-danger-600 hover:bg-danger-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Position */}
        {siteData.lat && siteData.lng ? (
          <div className="p-3 bg-primary-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-primary-700">
                Position GPS
              </div>
              <div className="text-xs font-mono text-primary-600">
                {siteData.lat.toFixed(4)}, {siteData.lng.toFixed(4)}
                {siteData.altitude && ` â€¢ ${siteData.altitude}m`}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>Position non dÃ©finie</span>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-lg font-semibold text-primary-600">
              {statistics.totalInstallations}
            </div>
            <div className="text-xs text-gray-600">
              Installations
            </div>
          </div>

          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-lg font-semibold text-success-600">
              {statistics.activeCampaigns}
            </div>
            <div className="text-xs text-gray-600">
              Campagnes actives
            </div>
          </div>
        </div>

        {/* Last Activity */}
        {statistics.lastActivity && (
          <div className="text-xs text-gray-500 text-center">
            DerniÃ¨re activitÃ©: {formatDistanceToNow(statistics.lastActivity)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ==================== MAIN COMPONENT ====================

export const SiteListPage: React.FC = () => {
  const navigate = useNavigate()

  // State management
  const [view, setView] = useState<'list' | 'map'>('list')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [siteToDelete, setSiteToDelete] = useState<SiteBundle | null>(null)
  const [selectedSite, setSelectedSite] = useState<SiteBundle | undefined>(undefined)

  // Filters and sorting
  const [filters, setFilters] = useState<SiteFilters>({
    search: '',
    ownership: 'all' as const,
    hasInstallations: undefined,
    isPublic: undefined
  })

  const [sorting, setSorting] = useState<SiteSorting>({
    field: 'name',
    direction: 'asc'
  })

  // Hooks
  const {
    sites,
    isLoading,
    error,
    refetch,
    createSite,
    deleteSite
  } = useSiteList(filters, sorting)

  const { sites: mapSites } = useSiteMap()

  // ==================== HANDLERS ====================

  const handleSearchChange = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, search: value }))
  }, [])

  const handleFilterChange = useCallback(
    <K extends keyof SiteFilters>(key: K, value: SiteFilters[K] | undefined) => {
      setFilters(prev => ({ ...prev, [key]: value }))
    },
    []
  )

  const handleSiteSelect = useCallback((site: SiteBundle) => {
    siteListLog.debug('Site selected from list', {
      siteId: site.site.id,
      siteName: site.site.name
    })
    navigate(`/sites/${site.site.id}`)
  }, [navigate])

  const handleSiteEdit = useCallback((site: SiteBundle) => {
    siteListLog.debug('Edit site requested', {
      siteId: site.site.id
    })
    navigate(`/sites/${site.site.id}/edit`)
  }, [navigate])

  const handleSiteDelete = useCallback((site: SiteBundle) => {
    siteListLog.debug('Delete site requested', {
      siteId: site.site.id
    })
    setSiteToDelete(site)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!siteToDelete) return

    siteListLog.info('Confirming site deletion', {
      siteId: siteToDelete.site.id
    })

    try {
      await deleteSite(siteToDelete.site.id)
      setSiteToDelete(null)

      siteListLog.info('Site deleted successfully', {
        siteId: siteToDelete.site.id
      })
    } catch (error) {
      siteListLog.error('Failed to delete site', {
        siteId: siteToDelete.site.id,
        error
      })
    }
  }, [siteToDelete, deleteSite])

  const handleViewOnMap = useCallback((site: SiteBundle) => {
    siteListLog.debug('View site on map requested', {
      siteId: site.site.id
    })
    setSelectedSite(site)
    setView('map')
  }, [])

  const handleCreateSite = useCallback(async (data: CreateSiteData) => {
    siteListLog.info('Creating new site', { data })

    try {
      const newSite = await createSite(data)
      setShowCreateForm(false)

      siteListLog.info('Site created successfully', { siteId: newSite.id })
      navigate(`/sites/${newSite.id}`)
    } catch (error) {
      siteListLog.error('Failed to create site', { error })
      throw error
    }
  }, [createSite, navigate])

  // ==================== COMPUTED VALUES ====================

  const stats = useMemo(() => {
    const total = sites.length
    const withPosition = sites.filter(s => s.site.lat && s.site.lng).length
    const withInstallations = sites.filter(s => s.statistics.totalInstallations > 0).length
    const publicSites = sites.filter(s => s.site.isPublic).length

    return {
      total,
      withPosition,
      withInstallations,
      publicSites,
      privateSites: total - publicSites
    }
  }, [sites])

  // ==================== RENDER ====================

  if (showCreateForm) {
    return (
      <>
        <PageHeader
          title="CrÃ©er un nouveau site"
          description="DÃ©finissez un site gÃ©ographique pour y installer vos devices TrackBee"
          breadcrumbs={[
            { label: 'Sites', href: '/sites' },
            { label: 'Nouveau', href: '/sites/new' }
          ]}
        />

        <Section>
          <SiteForm
            onSubmit={handleCreateSite}
            onCancel={() => setShowCreateForm(false)}
          />
        </Section>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Sites gÃ©ographiques"
        description="GÃ©rez vos sites de mesure et leurs installations"
        action={
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowCreateForm(true)}
          >
            Nouveau site
          </Button>
        }
      />

      {/* Filters & Stats */}
      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Search & Filters */}
          <div className="lg:col-span-2 space-y-4">
            <Input
              placeholder="Rechercher par nom, adresse, description..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />

            <div className="flex flex-wrap gap-3">
              <select
                className="w-40 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.ownership ?? 'all'}
                onChange={(event) => {
                  const value = event.target.value as SiteFilters['ownership'] | 'all'
                  handleFilterChange('ownership', value === 'all' ? undefined : value)
                }}
              >
                <option value="all">Tous les sites</option>
                <option value="owner">Mes sites</option>
                <option value="shared">Sites partagÃ©s</option>
              </select>

              <select
                className="w-44 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={
                  filters.hasInstallations === undefined
                    ? 'all'
                    : filters.hasInstallations
                      ? 'with'
                      : 'without'
                }
                onChange={(event) => {
                  const value = event.target.value
                  handleFilterChange(
                    'hasInstallations',
                    value === 'all' ? undefined : value === 'with'
                  )
                }}
              >
                <option value="all">Toutes installations</option>
                <option value="with">Avec installations</option>
                <option value="without">Sans installation</option>
              </select>

              <select
                className="w-36 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={
                  filters.isPublic === undefined
                    ? 'all'
                    : filters.isPublic
                      ? 'public'
                      : 'private'
                }
                onChange={(event) => {
                  const value = event.target.value
                  handleFilterChange(
                    'isPublic',
                    value === 'all' ? undefined : value === 'public'
                  )
                }}
              >
                <option value="all">Public/PrivÃ©</option>
                <option value="public">Public</option>
                <option value="private">PrivÃ©</option>
              </select>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-primary-50 rounded-lg">
                <p className="text-2xl font-bold text-primary-700">
                  {stats.total}
                </p>
                <p className="text-sm text-primary-600">
                  Total sites
                </p>
              </div>

              <div className="text-center p-3 bg-success-50 rounded-lg">
                <p className="text-2xl font-bold text-success-700">
                  {stats.withInstallations}
                </p>
                <p className="text-sm text-success-600">
                  Avec installations
                </p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* View Toggle & Content */}
      <Section>
        <Tabs value={view} onValueChange={(value) => setView(value as 'list' | 'map')}>
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="list" className="flex items-center space-x-2">
                <List className="w-4 h-4" />
                <span>Liste</span>
              </TabsTrigger>
              <TabsTrigger value="map" className="flex items-center space-x-2">
                <Map className="w-4 h-4" />
                <span>Carte</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center space-x-2">
              <select
                className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={`${sorting.field}-${sorting.direction}`}
                onChange={(event) => {
                  const [field, direction] = event.target.value.split('-') as [
                    SiteSorting['field'],
                    SiteSorting['direction']
                  ]
                  setSorting({ field, direction })
                }}
              >
                <option value="name-asc">Nom A â†’ Z</option>
                <option value="name-desc">Nom Z â†’ A</option>
                <option value="createdAt-desc">Plus rÃ©cents</option>
                <option value="createdAt-asc">Plus anciens</option>
                <option value="installationCount-desc">Plus d'installations</option>
                <option value="installationCount-asc">Moins d'installations</option>
              </select>
            </div>
          </div>

          <TabsContent value="list">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="h-16 bg-gray-200 rounded"></div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="h-12 bg-gray-200 rounded"></div>
                          <div className="h-12 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-danger-600 mb-4">
                  <Settings className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Erreur de chargement
                </h3>
                <p className="text-gray-600 mb-4">
                  {error.message}
                </p>
                <Button onClick={() => refetch()}>
                  RÃ©essayer
                </Button>
              </div>
            ) : sites.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <MapPin className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Aucun site trouvÃ©
                </h3>
                <p className="text-gray-600 mb-4">
                  {filters.search
                    ? 'Aucun site ne correspond Ã  votre recherche.'
                    : 'Commencez par crÃ©er votre premier site de mesure.'
                  }
                </p>
                <Button
                  variant="primary"
                  onClick={() => setShowCreateForm(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  CrÃ©er un site
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sites.map((site) => (
                  <SiteCard
                    key={site.site.id}
                    site={site}
                    onSelect={handleSiteSelect}
                    onEdit={handleSiteEdit}
                    onDelete={handleSiteDelete}
                    onViewOnMap={handleViewOnMap}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="map">
            <div className="h-[600px]">
              <SiteMapView
                sites={mapSites}
                selectedSite={selectedSite}
                onSiteSelect={(site) => {
                  setSelectedSite(site)
                  handleSiteSelect(site)
                }}
                showControls={true}
                height="100%"
              />
            </div>
          </TabsContent>
        </Tabs>
      </Section>

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={!!siteToDelete}
        onClose={() => setSiteToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Supprimer le site"
        message={
          siteToDelete
            ? `ÃŠtes-vous sÃ»r de vouloir supprimer le site "${siteToDelete.site.name}" ? Cette action est irrÃ©versible et supprimera Ã©galement toutes les installations associÃ©es.`
            : ''
        }
        confirmText="Supprimer"
        variant="danger"
      />
    </>
  )
}

// ==================== DISPLAY NAME ====================

SiteListPage.displayName = 'SiteListPage'

// ==================== EXPORT ====================

export default SiteListPage




