/**
 * SiteDetailPage Component - Page de dÃ©tail d'un site
 * Interface complÃ¨te pour gÃ©rer un site: installations, campagnes, statistiques
 */

import React, { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Edit3,
  MapPin,
  Settings,
  Activity,
  BarChart3,
  Plus,
  Download,
  Map,
  Globe,
  Lock,
  Calendar,
  Wifi
} from 'lucide-react'
import {
  PageHeader,
  Section,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/ui/components'
import {
  SiteMapView,
  SiteForm,
  InstallationCard
} from '../components'
import { useSite } from '../hooks'
import { useDeviceList } from '@/features/device'
import { logger } from '@/core/utils/logger'
import { formatDistanceToNow } from '@/core/utils/time'
import type {
  SiteBundle,
  UpdateSiteData,
  CreateInstallationData,
  SiteExportData
} from '../types'
import type { Machine } from '@/core/types'

// ==================== LOGGER SETUP ====================

const siteDetailLog = {
  debug: (msg: string, data?: unknown) => logger.debug('siteDetailPage', msg, data),
  info: (msg: string, data?: unknown) => logger.info('siteDetailPage', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('siteDetailPage', msg, data),
  error: (msg: string, data?: unknown) => logger.error('siteDetailPage', msg, data)
}

// ==================== SITE INFO TAB COMPONENT ====================

interface SiteInfoTabProps {
  site: SiteBundle
  onEdit: () => void
  onExport: (options: SiteExportData) => void
}

const SiteInfoTab: React.FC<SiteInfoTabProps> = ({ site, onEdit, onExport }) => {
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportOptions, setExportOptions] = useState<SiteExportData>({
    format: 'json',
    includeMachines: true,
    includeCampaigns: true,
    includeCalculations: true
  })

  const { site: siteData } = site

  const handleExport = useCallback(() => {
    onExport(exportOptions)
    setShowExportModal(false)
  }, [onExport, exportOptions])

  return (
    <>
      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Informations générales</CardTitle>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExportModal(true)}
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Exporter
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                  leftIcon={<Edit3 className="w-4 h-4" />}
                >
                  Modifier
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-600">Nom</label>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {siteData.name}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">VisibilitÃ©</label>
                <div className="mt-1 flex items-center space-x-2">
                  {siteData.isPublic ? (
                    <>
                      <Globe className="w-4 h-4 text-success-600" />
                      <Badge variant="success">Public</Badge>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-gray-400" />
                      <Badge variant="secondary">Privé</Badge>
                    </>
                  )}
                  {siteData.ownership === 'shared' && (
                    <Badge variant="primary">Partagés</Badge>
                  )}
                </div>
              </div>

              {siteData.description && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-600">Description</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {siteData.description}
                  </p>
                </div>
              )}

              {siteData.address && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-600">Adresse</label>
                  <p className="text-sm text-gray-900 mt-1 flex items-center space-x-1">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{siteData.address}</span>
                  </p>
                </div>
              )}
            </div>

            {siteData.lat && siteData.lng && (
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">CoordonnÃ©es</label>
                    <p className="text-sm font-mono text-gray-900 mt-1">
                      {siteData.lat.toFixed(6)}, {siteData.lng.toFixed(6)}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">SystÃ¨me</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {siteData.coordinateSystem || 'WGS84'}
                    </p>
                  </div>

                  {siteData.altitude && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Altitude</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {siteData.altitude} m
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200 text-xs text-gray-500 space-y-1">
              <p>ID: #{siteData.id}</p>
              <p>CrÃ©Ã© le: {new Date(siteData.createdAt).toLocaleDateString('fr-FR')}</p>
              <p>ModifiÃ© le: {new Date(siteData.updatedAt).toLocaleDateString('fr-FR')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Map View */}
        {siteData.lat && siteData.lng && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Map className="w-5 h-5" />
                <span>Localisation</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SiteMapView
                sites={[site]}
                selectedSite={site}
                height="300px"
                showControls={true}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      >
        <ModalHeader>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Exporter les donnees du site
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Exporter les donnees de "{siteData.name}"
            </p>
          </div>
        </ModalHeader>
        <ModalContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Donnees a inclure :</label>
            <Select
              value={exportOptions.format}
              onValueChange={(value) => setExportOptions(prev => ({
                ...prev,
                format: value as SiteExportData['format']
              }))}
            >
              <SelectTrigger className="w-full mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON - Donnees structurees</SelectItem>
                <SelectItem value="csv">CSV - Tableur compatible</SelectItem>
                <SelectItem value="kml">KML - Google Earth</SelectItem>
                <SelectItem value="geojson">GeoJSON - Cartographie</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Donnees a inclure :</label>

            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeMachines}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeMachines: e.target.checked }))}
                />
                <span className="text-sm">Devices et installations</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeCampaigns}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeCampaigns: e.target.checked }))}
                />
                <span className="text-sm">Campagnes de mesure</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeCalculations}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeCalculations: e.target.checked }))}
                />
                <span className="text-sm">Resultats de calculs</span>
              </label>
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setShowExportModal(false)}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleExport}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Exporter
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

// ==================== INSTALLATIONS TAB COMPONENT ====================

interface InstallationsTabProps {
  site: SiteBundle
  onCreateInstallation: () => void
  onEditInstallation: (installationId: number) => void
  onRemoveInstallation: (installationId: number) => void
  onNavigateToDevice: (machineId: number) => void
}

const InstallationsTab: React.FC<InstallationsTabProps> = ({
  site,
  onCreateInstallation,
  onEditInstallation,
  onRemoveInstallation,
  onNavigateToDevice
}) => {
  const { installations, machines, statistics } = site

  // Associer les machines aux installations
  const installationWithMachines = installations.map(installation => {
    const machine = machines.find(m => m.id === installation.machineId)
    return { installation, machine }
  }).filter(item => item.machine) as Array<{
    installation: typeof installations[0]
    machine: Machine
  }>

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-primary-50 rounded-lg">
            <div className="text-2xl font-bold text-primary-600">
              {statistics.totalInstallations}
            </div>
            <div className="text-sm text-primary-600">
              Total installations
            </div>
          </div>

          <div className="text-center p-3 bg-success-50 rounded-lg">
            <div className="text-2xl font-bold text-success-600">
              {statistics.activeInstallations}
            </div>
            <div className="text-sm text-success-600">
              Actives
            </div>
          </div>

          <div className="text-center p-3 bg-warning-50 rounded-lg">
            <div className="text-2xl font-bold text-warning-600">
              {statistics.connectedMachines}
            </div>
            <div className="text-sm text-warning-600">
              ConnectÃ©es BLE
            </div>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={onCreateInstallation}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Nouvelle installation
        </Button>
      </div>

      {/* Installations Grid */}
      {installationWithMachines.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Settings className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucune installation
          </h3>
          <p className="text-gray-600 mb-4">
            Ce site n'a pas encore d'installation de device.
          </p>
          <Button
            variant="primary"
            onClick={onCreateInstallation}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Première installation
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {installationWithMachines.map(({ installation, machine }) => (
            <InstallationCard
              key={installation.id}
              installation={installation}
              machine={machine}
              siteBundle={site}
              onEdit={() => onEditInstallation(installation.id)}
              onRemove={() => onRemoveInstallation(installation.id)}
              onNavigateToDevice={() => onNavigateToDevice(machine.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== STATISTICS TAB COMPONENT ====================

interface StatisticsTabProps {
  site: SiteBundle
}

const StatisticsTab: React.FC<StatisticsTabProps> = ({ site }) => {
  const { campaigns, calculations, statistics } = site

  const recentCampaigns = campaigns
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const recentCalculations = calculations
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="text-center p-4">
            <div className="text-2xl font-bold text-primary-600">
              {statistics.totalCampaigns}
            </div>
            <div className="text-sm text-gray-600">
              Campagnes total
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="text-center p-4">
            <div className="text-2xl font-bold text-success-600">
              {statistics.activeCampaigns}
            </div>
            <div className="text-sm text-gray-600">
              Campagnes actives
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="text-center p-4">
            <div className="text-2xl font-bold text-blue-600">
              {statistics.completedCalculations}
            </div>
            <div className="text-sm text-gray-600">
              Calculs rÃ©ussis
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="text-center p-4">
            <div className="text-2xl font-bold text-danger-600">
              {statistics.failedCalculations}
            </div>
            <div className="text-sm text-gray-600">
              Calculs Ã©chouÃ©s
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Campagnes récentes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentCampaigns.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">Aucune campagne</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {campaign.name || `Campagne ${campaign.id}`}
                      </div>
                      <div className="text-sm text-gray-600">
                        {campaign.type} â€¢ {formatDistanceToNow(new Date(campaign.createdAt))}
                      </div>
                    </div>
                    <Badge
                      variant={
                        campaign.status === 'active' ? 'success' :
                        campaign.status === 'done' ? 'secondary' :
                        campaign.status === 'canceled' ? 'danger' :
                        'warning'
                      }
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Calculations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Calculs rÃ©cents</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentCalculations.length === 0 ? (
              <div className="text-center py-6">
                <BarChart3 className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">Aucun calcul</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentCalculations.map((calculation) => (
                  <div
                    key={calculation.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">
                        Calcul #{calculation.id}
                      </div>
                      <div className="text-sm text-gray-600">
                        {calculation.type} â€¢ {formatDistanceToNow(new Date(calculation.createdAt))}
                      </div>
                    </div>
                    <Badge
                      variant={
                        calculation.status === 'done' ? 'success' :
                        calculation.status === 'failed' ? 'danger' :
                        calculation.status === 'running' ? 'warning' :
                        'secondary'
                      }
                    >
                      {calculation.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Last Activity */}
      {statistics.lastActivity && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>DerniÃ¨re activitÃ©</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              DerniÃ¨re activitÃ© enregistrÃ©e: {formatDistanceToNow(statistics.lastActivity)}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ==================== MAIN COMPONENT ====================

export const SiteDetailPage: React.FC = () => {
  const { siteId: siteIdParam } = useParams<{ siteId: string }>()
  const navigate = useNavigate()

  siteDetailLog.debug('🎯 SiteDetailPage rendered with route params', {
    siteIdParam,
    typeOfId: typeof siteIdParam,
    idIsUndefined: siteIdParam === undefined,
    idIsNull: siteIdParam === null,
    rawId: siteIdParam
  })

  const siteId = siteIdParam ? parseInt(siteIdParam, 10) : 0

  siteDetailLog.debug('🔢 Parsed siteId', {
    siteId,
    originalId: siteIdParam,
    isNaN: Number.isNaN(siteId),
    isFinite: Number.isFinite(siteId)
  })

  const [activeTab, setActiveTab] = useState('info')
  const [showEditForm, setShowEditForm] = useState(false)
  const [_showCreateInstallation, setShowCreateInstallation] = useState(false)

  // Hooks
  const {
    site,
    isLoading,
    error,
    refetch,
    updateSite,
    deleteSite,
    createInstallation,
    removeInstallation,
    exportSite
  } = useSite(siteId)

  const { devices: _availableDevices } = useDeviceList({
    // Filtrer les devices non installÃ©s sur ce site
  })

  // ==================== HANDLERS ====================

  const handleBack = useCallback(() => {
    navigate('/sites')
  }, [navigate])

  const handleUpdateSite = useCallback(async (data: UpdateSiteData) => {
    try {
      await updateSite(data)
      setShowEditForm(false)
      siteDetailLog.info('Site updated from detail page', { siteId })
    } catch (error) {
      siteDetailLog.error('Failed to update site from detail page', { siteId, error })
      throw error
    }
  }, [updateSite, siteId])

  const _handleCreateInstallation = useCallback(async (data: CreateInstallationData) => {
    try {
      await createInstallation(data)
      setShowCreateInstallation(false)
      siteDetailLog.info('Installation created from site detail', { siteId })
    } catch (error) {
      siteDetailLog.error('Failed to create installation', { siteId, error })
      throw error
    }
  }, [createInstallation, siteId])

  const handleRemoveInstallation = useCallback(async (installationId: number) => {
    try {
      await removeInstallation(installationId)
      siteDetailLog.info('Installation removed from site detail', { siteId, installationId })
    } catch (error) {
      siteDetailLog.error('Failed to remove installation', { siteId, installationId, error })
    }
  }, [removeInstallation, siteId])

  const handleExportSite = useCallback(async (options: SiteExportData) => {
    try {
      const blob = await exportSite(options)

      // CrÃ©er un lien de tÃ©lÃ©chargement
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `site-${site?.site.name || siteId}-export.${options.format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      siteDetailLog.info('Site exported successfully', { siteId, format: options.format })
    } catch (error) {
      siteDetailLog.error('Failed to export site', { siteId, error })
    }
  }, [exportSite, site?.site.name, siteId])

  // ==================== ERROR & LOADING STATES ====================

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !site) {
    return (
      <div className="text-center py-12">
          <div className="text-danger-600 mb-4">
            <MapPin className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Site non trouvÃ©
          </h3>
          <p className="text-gray-600 mb-4">
            {error?.message || 'Le site demandÃ© n\'existe pas ou n\'est pas accessible.'}
          </p>
          <div className="flex justify-center space-x-3">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <Button onClick={() => refetch()}>
              RÃ©essayer
            </Button>
          </div>
        </div>
    )
  }

  // ==================== EDIT FORM ====================

  if (showEditForm) {
    return (
      <>
        <PageHeader
          title={`Modifier le site "${site.site.name}"`}
          breadcrumbs={[
            { label: 'Sites', href: '/sites' },
            { label: site.site.name, href: `/sites/${siteId}` },
            { label: 'Modifier', href: `/sites/${siteId}/edit` }
          ]}
        />

        <Section>
          <SiteForm
            initialData={site.site}
            onSubmit={handleUpdateSite}
            onCancel={() => setShowEditForm(false)}
          />
        </Section>
      </>
    )
  }

  // ==================== MAIN RENDER ====================

  return (
    <>
      <PageHeader
        title={site.site.name}
        description={
          site.site.description ||
          `Site gÃ©ographique avec ${site.statistics.totalInstallations} installation(s)`
        }
        breadcrumbs={[
          { label: 'Sites', href: '/sites' },
          { label: site.site.name, href: `/sites/${siteId}` }
        ]}
        action={
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleBack}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </div>
        }
      />

      <Section>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="info" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Informations</span>
            </TabsTrigger>
            <TabsTrigger value="installations" className="flex items-center space-x-2">
              <Wifi className="w-4 h-4" />
              <span>Installations ({site.statistics.totalInstallations})</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Statistiques</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-6">
            <SiteInfoTab
              site={site}
              onEdit={() => setShowEditForm(true)}
              onExport={handleExportSite}
            />
          </TabsContent>

          <TabsContent value="installations" className="mt-6">
            <InstallationsTab
              site={site}
              onCreateInstallation={() => setShowCreateInstallation(true)}
              onEditInstallation={(id) => {
                // TODO: ImplÃ©menter modal d'Ã©dition d'installation
                siteDetailLog.debug('Edit installation requested', { installationId: id })
              }}
              onRemoveInstallation={handleRemoveInstallation}
              onNavigateToDevice={(machineId) => navigate(`/devices/${machineId}`)}
            />
          </TabsContent>

          <TabsContent value="stats" className="mt-6">
            <StatisticsTab site={site} />
          </TabsContent>
        </Tabs>
      </Section>
    </>
  )
}

// ==================== DISPLAY NAME & EXPORT ====================

SiteDetailPage.displayName = 'SiteDetailPage'

export default SiteDetailPage















