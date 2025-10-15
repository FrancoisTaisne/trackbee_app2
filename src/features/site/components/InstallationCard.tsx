/**
 * InstallationCard Component - Carte d'une installation device/site
 * Affichage et gestion d'une installation avec actions et statut
 */

import React, { useCallback, useState } from 'react'
import {
  Settings,
  MapPin,
  MoreVertical,
  Edit3,
  Trash2,
  Activity,
  ExternalLink,
  Circle
} from 'lucide-react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  ConfirmationModal
} from '@/shared/ui/components'
import { DeviceConnectionPill, DeviceFileDownload } from '@/features/device'
import { logger } from '@/core/utils/logger'
import { formatDistanceToNow } from '@/core/utils/time'
import { cn } from '@/core/utils/cn'
import type {
  SiteBundle
} from '../types'
import type { Installation, Machine } from '@/core/types'

// ==================== LOGGER SETUP ====================

const installationLog = {
  debug: (msg: string, data?: unknown) => logger.debug('installation', msg, data),
  info: (msg: string, data?: unknown) => logger.info('installation', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('installation', msg, data),
  error: (msg: string, data?: unknown) => logger.error('installation', msg, data)
}

// ==================== TYPES ====================

interface InstallationCardProps {
  installation: Installation
  machine: Machine
  siteBundle: SiteBundle
  onEdit?: (installation: Installation) => void
  onRemove?: (installationId: number) => void
  onNavigateToDevice?: (machineId: number) => void
  showActions?: boolean
}

// ==================== INSTALLATION TYPE CONFIG ====================

const getInstallationTypeConfig = (type?: string) => {
  switch (type) {
    case 'static':
      return {
        label: 'Statique',
        icon: Circle,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        description: 'Point fixe de mesure'
      }
    case 'rover':
      return {
        label: 'Rover',
        icon: Activity,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        description: 'Mobile pour mesures cinématiques'
      }
    case 'base':
      return {
        label: 'Base RTK',
        icon: Settings,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        description: 'Station de référence'
      }
    default:
      return {
        label: 'Standard',
        icon: MapPin,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        description: 'Installation standard'
      }
  }
}

// ==================== MAIN COMPONENT ====================

export const InstallationCard: React.FC<InstallationCardProps> = ({
  installation,
  machine,
  siteBundle,
  onEdit,
  onRemove,
  onNavigateToDevice,
  showActions = true
}) => {
  const [showRemoveModal, setShowRemoveModal] = useState(false)

  const typeConfig = getInstallationTypeConfig(installation.installationType)
  const TypeIcon = typeConfig.icon

  // Trouver les campagnes et calculs liés à cette installation
  const relatedCampaigns = siteBundle.campaigns.filter(
    c => c.machineId === machine.id || c.installationId === installation.id
  )
  const relatedCalculations = siteBundle.calculations.filter(
    c => c.machineId === machine.id || c.installationId === installation.id
  )

  // Statistiques de l'installation
  const activeCampaigns = relatedCampaigns.filter(c => c.status === 'active')
  const completedCalculations = relatedCalculations.filter(c => c.status === 'done')
  const failedCalculations = relatedCalculations.filter(c => c.status === 'failed')

  // ==================== HANDLERS ====================

  const handleEdit = useCallback(() => {
    installationLog.debug('Edit installation requested', {
      installationId: installation.id,
      machineId: machine.id
    })
    onEdit?.(installation)
  }, [installation, machine.id, onEdit])

  const handleRemove = useCallback(() => {
    installationLog.debug('Remove installation requested', {
      installationId: installation.id,
      machineId: machine.id
    })
    setShowRemoveModal(true)
  }, [installation.id, machine.id])

  const handleConfirmRemove = useCallback(() => {
    installationLog.info('Confirming installation removal', {
      installationId: installation.id
    })
    onRemove?.(installation.id)
    setShowRemoveModal(false)
  }, [installation.id, onRemove])

  const handleNavigateToDevice = useCallback(() => {
    installationLog.debug('Navigate to device requested', {
      machineId: machine.id,
      installationId: installation.id
    })
    onNavigateToDevice?.(machine.id)
  }, [machine.id, installation.id, onNavigateToDevice])

  // ==================== RENDER ====================

  return (
    <>
      <Card className={cn(
        'transition-all duration-200 hover:shadow-md',
        typeConfig.borderColor,
        'border-l-4'
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className={cn(
                'p-2 rounded-lg',
                typeConfig.bgColor
              )}>
                <TypeIcon className={cn('w-5 h-5', typeConfig.color)} />
              </div>

              <div className="flex-1 min-w-0">
                <CardTitle className="flex items-center space-x-2">
                  <span className="truncate">
                    {installation.name || `Installation ${installation.id}`}
                  </span>
                  <Badge variant="outline" size="sm">
                    {typeConfig.label}
                  </Badge>
                </CardTitle>

                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-sm font-medium text-gray-700">
                    {machine.name}
                  </span>
                  <DeviceConnectionPill
                    deviceId={machine.id}
                    showLabel={false}
                    size="sm"
                  />
                </div>

                <div className="text-xs text-gray-500 mt-1">
                  MAC: {machine.macAddress}
                </div>
              </div>
            </div>

            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleNavigateToDevice}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Voir le device
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleRemove}
                    className="text-danger-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Retirer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Description */}
          {installation.description && (
            <p className="text-sm text-gray-600">
              {installation.description}
            </p>
          )}

          {/* Coordinates */}
          {installation.coordinates && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">Position:</span>
                <span className="font-mono text-gray-600">
                  X: {installation.coordinates.x.toFixed(3)},
                  Y: {installation.coordinates.y.toFixed(3)}
                  {installation.coordinates.z && `, Z: ${installation.coordinates.z.toFixed(3)}`}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Système: {installation.coordinates.system}
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="text-lg font-semibold text-primary-600">
                {activeCampaigns.length}
              </div>
              <div className="text-xs text-gray-600">
                Campagnes actives
              </div>
            </div>

            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="text-lg font-semibold text-success-600">
                {completedCalculations.length}
              </div>
              <div className="text-xs text-gray-600">
                Calculs réussis
              </div>
            </div>

            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="text-lg font-semibold text-danger-600">
                {failedCalculations.length}
              </div>
              <div className="text-xs text-gray-600">
                Calculs échoués
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          {relatedCampaigns.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">
                Campagnes récentes:
              </h4>
              <div className="space-y-1">
                {relatedCampaigns.slice(0, 2).map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {campaign.name || `Campagne ${campaign.id}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        {campaign.type} • {formatDistanceToNow(new Date(campaign.createdAt))}
                      </div>
                    </div>
                    <Badge
                      variant={
                        campaign.status === 'active' ? 'success' :
                        campaign.status === 'done' ? 'secondary' :
                        campaign.status === 'canceled' ? 'danger' :
                        'warning'
                      }
                      size="sm"
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                ))}

                {relatedCampaigns.length > 2 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    +{relatedCampaigns.length - 2} autres campagnes
                  </div>
                )}
              </div>
            </div>
          )}

          {/* File Download */}
          <div className="pt-2 border-t border-gray-200">
            <DeviceFileDownload
              deviceId={machine.id}
              onDownloadComplete={(files) => {
                installationLog.info('Files downloaded from installation card', {
                  installationId: installation.id,
                  machineId: machine.id,
                  fileCount: files.length
                })
              }}
              onError={(error) => {
                installationLog.error('File download error from installation card', {
                  installationId: installation.id,
                  machineId: machine.id,
                  error
                })
              }}
            />
          </div>

          {/* Installation Info */}
          <div className="pt-2 border-t border-gray-200 text-xs text-gray-500 space-y-1">
            <div className="flex justify-between">
              <span>Installé le:</span>
              <span>{new Date(installation.createdAt).toLocaleDateString('fr-FR')}</span>
            </div>
            {installation.positionIndex && (
              <div className="flex justify-between">
                <span>Position index:</span>
                <span>{installation.positionIndex}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Remove Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRemoveModal}
        onClose={() => setShowRemoveModal(false)}
        onConfirm={handleConfirmRemove}
        title="Retirer l'installation"
        message={`Êtes-vous sûr de vouloir retirer l'installation ${installation.name || `Installation ${installation.id}`} ? Le device ${machine.name} ne sera plus associé à ce site. Les campagnes et calculs existants seront conservés.`}
        confirmText="Retirer"
        variant="danger"
      />
    </>
  )
}

// ==================== DISPLAY NAME ====================

InstallationCard.displayName = 'InstallationCard'

// ==================== EXAMPLES ====================

/**
 * Exemples d'utilisation:
 *
 * // Installation card basique
 * <InstallationCard
 *   installation={installation}
 *   machine={machine}
 *   siteBundle={siteBundle}
 *   onEdit={handleEditInstallation}
 *   onRemove={handleRemoveInstallation}
 * />
 *
 * // Dans une grille d'installations
 * <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 *   {installations.map(({ installation, machine }) => (
 *     <InstallationCard
 *       key={installation.id}
 *       installation={installation}
 *       machine={machine}
 *       siteBundle={siteBundle}
 *       onNavigateToDevice={(id) => navigate(`/devices/${id}`)}
 *       showActions={userCanEdit}
 *     />
 *   ))}
 * </div>
 *
 * // Card sans actions (lecture seule)
 * <InstallationCard
 *   installation={installation}
 *   machine={machine}
 *   siteBundle={siteBundle}
 *   showActions={false}
 * />
 */
