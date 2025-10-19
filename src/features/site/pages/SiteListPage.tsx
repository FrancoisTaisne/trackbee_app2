/**
 * SiteListPage Component - Page de liste des sites
 * Interface principale pour visualiser, gérer et créer des sites géographiques
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

// ==================== SITE CARD COMPONENT (COMPACT) ====================

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
      <CardHeader className="pb-1">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex items-center gap-1 mb-0.5">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {siteData.name}
              </span>
              <div className="flex items-center gap-1">
                {siteData.isPublic ? (
                  <Globe className="w-3 h-3 text-success-500 flex-shrink-0" />
                ) : (
                  <Lock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                )}
                {siteData.ownership === 'shared' && (
                  <Users className="w-3 h-3 text-primary-500 flex-shrink-0" />
                )}
              </div>
            </CardTitle>

            {siteData.description && (
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                {siteData.description}
              </p>
            )}

            {siteData.address && (
              <div className="flex items-center gap-0.5 mt-0.5">
                <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{siteData.address}</span>
              </div>
            )}
          </div>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
              onClick={(event) => {
                event.stopPropagation()
                setMenuOpen((prev) => !prev)
              }}
            >
              <MoreVertical className="w-3 h-3" />
            </Button>
            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-40 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-1 shadow-lg z-10"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onEdit(site)
                  }}
                  className="flex w-full items-center px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Edit3 className="w-3 h-3 mr-2" />
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onViewOnMap(site)
                  }}
                  className="flex w-full items-center px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Map className="w-3 h-3 mr-2" />
                  Voir sur la carte
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onSelect(site)
                  }}
                  className="flex w-full items-center px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ExternalLink className="w-3 h-3 mr-2" />
                  Voir le détail
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onDelete(site)
                  }}
                  className="flex w-full items-center px-3 py-1.5 text-xs text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/30"
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Supprimer
                </button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-1.5 pt-1.5">
        {/* Position - Compact */}
        {siteData.lat && siteData.lng ? (
          <div className="p-1.5 bg-primary-50 dark:bg-primary-900/20 rounded">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-primary-700 dark:text-primary-400">
                GPS
              </div>
              <div className="text-xs font-mono text-primary-600 dark:text-primary-500">
                {siteData.lat.toFixed(4)}, {siteData.lng.toFixed(4)}
                {siteData.altitude && ` • ${siteData.altitude}m`}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-1.5 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
              <MapPin className="w-3 h-3" />
              <span>Position non définie</span>
            </div>
          </div>
        )}

        {/* Statistics - Compact */}
        <div className="grid grid-cols-2 gap-1.5">
          <div className="text-center p-1 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-base font-semibold text-primary-600 dark:text-primary-400">
              {statistics.totalInstallations}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Installations
            </div>
          </div>

          <div className="text-center p-1 bg-gray-50 dark:bg-gray-800 rounded">
            <div className="text-base font-semibold text-success-600 dark:text-success-400">
              {statistics.activeCampaigns}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Campagnes
            </div>
          </div>
        </div>

        {/* Last Activity - Compact */}
        {statistics.lastActivity && (
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {formatDistanceToNow(statistics.lastActivity)}
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
          title="Créer un nouveau site"
          description="Définissez un site géographique pour y installer vos devices TrackBee"
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
        title="Sites"
        // description="Gérez vos sites de mesure et leurs installations"
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

      {/* Filters & Stats - MINIMAL */}
      {/*<Section className="space-y-2">*/}
      {/*  <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">*/}
      {/*    /!* Search & Filters *!/*/}
      {/*    <div className="lg:col-span-2 space-y-2">*/}
      {/*      <Input*/}
      {/*        placeholder="Rechercher par nom, adresse, description..."*/}
      {/*        value={filters.search}*/}
      {/*        onChange={(e) => handleSearchChange(e.target.value)}*/}
      {/*        leftIcon={<Search className="w-4 h-4" />}*/}
      {/*        className="h-9"*/}
      {/*      />*/}

      {/*      <div className="flex flex-wrap gap-2">*/}
      {/*        <select*/}
      {/*          className="w-36 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800"*/}
      {/*          value={filters.ownership ?? 'all'}*/}
      {/*          onChange={(event) => {*/}
      {/*            const value = event.target.value as SiteFilters['ownership'] | 'all'*/}
      {/*            handleFilterChange('ownership', value === 'all' ? undefined : value)*/}
      {/*          }}*/}
      {/*        >*/}
      {/*          <option value="all">Tous les sites</option>*/}
      {/*          <option value="owner">Mes sites</option>*/}
      {/*          <option value="shared">Sites partagés</option>*/}
      {/*        </select>*/}

      {/*        <select*/}
      {/*          className="w-40 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800"*/}
      {/*          value={*/}
      {/*            filters.hasInstallations === undefined*/}
      {/*              ? 'all'*/}
      {/*              : filters.hasInstallations*/}
      {/*                ? 'with'*/}
      {/*                : 'without'*/}
      {/*          }*/}
      {/*          onChange={(event) => {*/}
      {/*            const value = event.target.value*/}
      {/*            handleFilterChange(*/}
      {/*              'hasInstallations',*/}
      {/*              value === 'all' ? undefined : value === 'with'*/}
      {/*            )*/}
      {/*          }}*/}
      {/*        >*/}
      {/*          <option value="all">Toutes installations</option>*/}
      {/*          <option value="with">Avec installations</option>*/}
      {/*          <option value="without">Sans installation</option>*/}
      {/*        </select>*/}

      {/*        <select*/}
      {/*          className="w-32 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800"*/}
      {/*          value={*/}
      {/*            filters.isPublic === undefined*/}
      {/*              ? 'all'*/}
      {/*              : filters.isPublic*/}
      {/*                ? 'public'*/}
      {/*                : 'private'*/}
      {/*          }*/}
      {/*          onChange={(event) => {*/}
      {/*            const value = event.target.value*/}
      {/*            handleFilterChange(*/}
      {/*              'isPublic',*/}
      {/*              value === 'all' ? undefined : value === 'public'*/}
      {/*            )*/}
      {/*          }}*/}
      {/*        >*/}
      {/*          <option value="all">Public/Privé</option>*/}
      {/*          <option value="public">Public</option>*/}
      {/*          <option value="private">Privé</option>*/}
      {/*        </select>*/}
      {/*      </div>*/}
      {/*    </div>*/}

      {/*    /!* Quick Stats - COMPACT *!/*/}
      {/*    <div className="lg:col-span-2">*/}
      {/*      <div className="grid grid-cols-2 gap-2">*/}
      {/*        <div className="text-center p-1.5 bg-primary-50 dark:bg-primary-900/20 rounded">*/}
      {/*          <p className="text-lg font-bold text-primary-700 dark:text-primary-400">*/}
      {/*            {stats.total}*/}
      {/*          </p>*/}
      {/*          <p className="text-xs text-primary-600 dark:text-primary-500">*/}
      {/*            Total sites*/}
      {/*          </p>*/}
      {/*        </div>*/}

      {/*        <div className="text-center p-1.5 bg-success-50 dark:bg-success-900/20 rounded">*/}
      {/*          <p className="text-lg font-bold text-success-700 dark:text-success-400">*/}
      {/*            {stats.withInstallations}*/}
      {/*          </p>*/}
      {/*          <p className="text-xs text-success-600 dark:text-success-500">*/}
      {/*            Avec installations*/}
      {/*          </p>*/}
      {/*        </div>*/}
      {/*      </div>*/}
      {/*    </div>*/}
      {/*  </div>*/}
      {/*</Section>*/}

      {/* View Toggle & Content */}
      <Section>
        <Tabs value={view} onValueChange={(value) => setView(value as 'list' | 'map')}>
          <div className="flex items-center justify-between mb-3">
            <TabsList>
              <TabsTrigger value="list" className="flex items-center gap-1.5 text-xs px-2.5 py-1">
                <List className="w-3 h-3" />
                <span>Liste</span>
              </TabsTrigger>
              <TabsTrigger value="map" className="flex items-center gap-1.5 text-xs px-2.5 py-1">
                <Map className="w-3 h-3" />
                <span>Carte</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <select
                className="w-44 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800"
                value={`${sorting.field}-${sorting.direction}`}
                onChange={(event) => {
                  const [field, direction] = event.target.value.split('-') as [
                    SiteSorting['field'],
                    SiteSorting['direction']
                  ]
                  setSorting({ field, direction })
                }}
              >
                <option value="name-asc">Nom A → Z</option>
                <option value="name-desc">Nom Z → A</option>
                <option value="createdAt-desc">Plus récents</option>
                <option value="createdAt-asc">Plus anciens</option>
                <option value="installationCount-desc">Plus d'installations</option>
                <option value="installationCount-asc">Moins d'installations</option>
              </select>
            </div>
          </div>

          <TabsContent value="list">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="pb-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-1"></div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="space-y-2">
                        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Erreur de chargement
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {error.message}
                </p>
                <Button onClick={() => refetch()}>
                  Réessayer
                </Button>
              </div>
            ) : sites.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <MapPin className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Aucun site trouvé
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {filters.search
                    ? 'Aucun site ne correspond à votre recherche.'
                    : 'Commencez par créer votre premier site de mesure.'
                  }
                </p>
                <Button
                  variant="primary"
                  onClick={() => setShowCreateForm(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Créer un site
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
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
            ? `Êtes-vous sûr de vouloir supprimer le site "${siteToDelete.site.name}" ? Cette action est irréversible et supprimera également toutes les installations associées.`
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
