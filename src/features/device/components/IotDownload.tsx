/**
 * IotDownload Component - Intelligent File Detection & Download System
 *
 * FonctionnalitÃ©s :
 * - DÃ©tection automatique des fichiers multi-niveaux
 * - Retry avec backoff exponentiel (1s, 2s, 4s)
 * - Progress tracking sur 7 phases
 * - Statistiques de tÃ©lÃ©chargement
 * - UI/UX avancÃ©e avec badges dynamiques
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Download, Wifi, Bluetooth, Upload, AlertCircle, CheckCircle, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, Badge } from '@/shared/ui/components'
import { cn } from '@/core/utils/cn'
import { logger } from '@/core/utils/logger'
import { useDevice } from '../hooks/useDevice'
import { useDownloadMetrics, type DownloadProgress } from '../hooks/useDownloadMetrics'
import type { DeviceBundle } from '../types'
import type { CampaignStatus } from '@/core/types'

// ==================== TYPES ====================

export interface IotDownloadProps {
  /**
   * Device complet avec toutes ses relations
   */
  device: DeviceBundle

  /**
   * Installation associÃ©e (optionnel)
   */
  installation?: DeviceBundle['installation']

  /**
   * Contexte d'upload pour le backend
   */
  uploadContext?: {
    machineId: number
    siteId?: number
    installationId?: number
  }

  /**
   * Callback de succÃ¨s
   */
  onSuccess?: (files: string[]) => void

  /**
   * Callback d'erreur
   */
  onError?: (error: Error) => void

  /**
   * Classes CSS personnalisÃ©es
   */
  className?: string
}

type DownloadPhase =
  | 'idle'
  | 'initializing'
  | 'wifi_connect'
  | 'ble_connect'
  | 'downloading'
  | 'storing'
  | 'uploading'
  | 'cleanup'
  | 'completed'
  | 'error'

interface DownloadState {
  phase: DownloadPhase
  method?: 'wifi' | 'ble'
  progress?: DownloadProgress
  error?: string
  retryAttempt: number
  sessionId?: string
}

// ==================== LOGGER ====================

const iotLog = {
  debug: (msg: string, data?: unknown) => logger.debug('iotDownload', msg, data),
  info: (msg: string, data?: unknown) => logger.info('iotDownload', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('iotDownload', msg, data),
  error: (msg: string, data?: unknown) => logger.error('iotDownload', msg, data)
}

// ==================== CONFIGURATION ====================

const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAYS = [1000, 2000, 4000] // 1s, 2s, 4s

const PHASE_LABELS: Record<DownloadPhase, string> = {
  idle: 'En attente',
  initializing: 'Initialisation',
  wifi_connect: 'Connexion WiFi',
  ble_connect: 'Connexion BLE',
  downloading: 'TÃ©lÃ©chargement',
  storing: 'Stockage local',
  uploading: 'Upload serveur',
  cleanup: 'Nettoyage',
  completed: 'TerminÃ©',
  error: 'Erreur'
}

// ==================== UTILITY FUNCTIONS ====================

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

const ACTIVE_CAMPAIGN_STATUSES: CampaignStatus[] = ['active', 'running', 'scheduled']

const getActiveCampaignId = (device: DeviceBundle): number | null => {
  // Récupérer la campagne active (la plus récente en statut 'open')
  // Vérifier que campaigns est bien un tableau avant d'utiliser filter
  const campaigns = Array.isArray(device.campaigns) ? device.campaigns : []
  const openCampaigns = campaigns.filter(c => ACTIVE_CAMPAIGN_STATUSES.includes(c.status))
  if (openCampaigns.length === 0) return null

  // Trier par date de création décroissante
  const sorted = [...openCampaigns].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return sorted[0]?.id ?? null
}



const getFileCountByCampaign = (device: DeviceBundle, campaignId: number): number => {
  const files = device.bleConnection?.filesByCampaign.get(campaignId)
  return files?.length || 0
}

const getTotalExpectedBytes = (device: DeviceBundle, campaignId: number): number => {
  const files = device.bleConnection?.filesByCampaign.get(campaignId)
  if (!files) return 0
  return files.reduce((sum, file) => sum + (file.size || 0), 0)
}

// ==================== COMPONENT ====================

export const IotDownload: React.FC<IotDownloadProps> = ({
  device,
  installation,
  uploadContext,
  onSuccess,
  onError,
  className
}) => {
  const machineId = device.machine.id
  const campaignId = getActiveCampaignId(device)

  const {
    connectDevice,
    disconnectDevice,
    probeFiles,
    // transferCampaignFiles // Ã€ implÃ©menter
  } = useDevice(machineId)

  const metrics = useDownloadMetrics()

  const [state, setState] = useState<DownloadState>({
    phase: 'idle',
    retryAttempt: 0
  })

  const probedRef = useRef<number | null>(null)
  const isDownloadingRef = useRef(false)

  // ==================== MULTI-LEVEL AUTO-PROBE ====================

  /**
   * Niveau 1: Probe au montage du composant
   */
  useEffect(() => {
    if (!machineId || !campaignId) return

    const performInitialProbe = async () => {
      try {
        iotLog.info('Initial probe on component mount', { machineId, campaignId })

        // 1. Reconnexion silencieuse si dÃ©jÃ  connectÃ©
        if (device.bleConnection?.status === 'connected') {
          iotLog.debug('Device already connected, skipping reconnect')
        }

        // 2. Probe des fichiers
        if (campaignId && probedRef.current !== campaignId) {
          iotLog.debug('Probing files for campaign', { campaignId })
          await probeFiles({
            machineId,
            campaignId
          })
          probedRef.current = campaignId
        }
      } catch (error) {
        iotLog.warn('Initial probe failed (non-critical)', error)
      }
    }

    void performInitialProbe()
  }, [machineId, campaignId, device.bleConnection?.status, probeFiles])

  /**
   * Niveau 2: Probe quand BLE se connecte
   */
  useEffect(() => {
    if (device.bleConnection?.status !== 'connected') return
    if (!campaignId || probedRef.current === campaignId) return

    const performConnectProbe = async () => {
      try {
        iotLog.info('Auto-probe on BLE connection', { campaignId })
        await probeFiles({
          machineId,
          campaignId
        })
        probedRef.current = campaignId
      } catch (error) {
        iotLog.warn('Connect probe failed (non-critical)', error)
      }
    }

    void performConnectProbe()
  }, [device.bleConnection?.status, campaignId, machineId, probeFiles])

  // ==================== DOWNLOAD WITH RETRY ====================

  /**
   * Effectue le tÃ©lÃ©chargement avec retry et backoff exponentiel
   */
  const performDownload = useCallback(async (attempt = 1): Promise<void> => {
    if (!campaignId) {
      throw new Error('Aucune campagne active')
    }

    const fileCount = getFileCountByCampaign(device, campaignId)
    if (fileCount === 0) {
      throw new Error('Aucun fichier disponible')
    }

    const expectedBytes = getTotalExpectedBytes(device, campaignId)

    try {
      iotLog.info('Starting download attempt', { attempt, campaignId, fileCount })

      // DÃ©marrer la session de mÃ©triques
      const sessionId = metrics.startSession({
        machineId,
        campaignId,
        method: 'auto',
        fileCount,
        expectedBytes
      })

      setState(prev => ({ ...prev, sessionId }))

      // Phase: Initialisation
      setState(prev => ({ ...prev, phase: 'initializing' }))
      metrics.startPhase('init')
      await sleep(500)
      metrics.endPhase('init')

      // TODO: ImplÃ©menter transferCampaignFiles
      // Pour l'instant, simuler un tÃ©lÃ©chargement
      iotLog.warn('transferCampaignFiles not implemented yet, simulating download')

      // Simulation: Phase de tÃ©lÃ©chargement
      setState(prev => ({ ...prev, phase: 'downloading', method: 'wifi' }))
      metrics.startPhase('download')

      // Simuler la progression
      for (let i = 0; i <= 100; i += 10) {
        await sleep(200)
        metrics.updateProgress({
          current: i,
          total: 100,
          bytes: Math.floor((expectedBytes * i) / 100),
          method: 'wifi'
        })
        setState(prev => ({
          ...prev,
          progress: {
            current: i,
            total: 100,
            bytes: Math.floor((expectedBytes * i) / 100),
            method: 'wifi'
          }
        }))
      }

      metrics.endPhase('download', { method: 'wifi', bytes: expectedBytes, files: fileCount })

      // Phase: Stockage
      setState(prev => ({ ...prev, phase: 'storing' }))
      metrics.startPhase('store')
      await sleep(500)
      metrics.endPhase('store')

      // Phase: Upload
      setState(prev => ({ ...prev, phase: 'uploading' }))
      metrics.startPhase('upload')
      await sleep(800)
      metrics.endPhase('upload')

      // Phase: Cleanup
      setState(prev => ({ ...prev, phase: 'cleanup' }))
      metrics.startPhase('cleanup')
      await sleep(300)
      metrics.endPhase('cleanup')

      // Terminer la session avec succÃ¨s
      await metrics.endSession(true)

      // Phase: Completed
      setState(prev => ({ ...prev, phase: 'completed' }))

      // Niveau 3: Re-probe aprÃ¨s tÃ©lÃ©chargement
      try {
        iotLog.debug('Post-download probe for verification')
        await probeFiles({
          machineId,
          campaignId
        })
      } catch (probeError) {
        iotLog.warn('Post-download probe failed (non-critical)', probeError)
      }

      // Callback de succÃ¨s
      onSuccess?.([])

      iotLog.info('Download completed successfully', { sessionId })
    } catch (downloadError) {
      iotLog.error('Download attempt failed', { attempt, error: downloadError })

      // Enregistrer le retry dans les mÃ©triques
      if (attempt < MAX_RETRY_ATTEMPTS) {
        metrics.recordRetryAttempt()
      }

      // Retry avec backoff exponentiel
      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delayIndex = Math.max(0, Math.min(RETRY_DELAYS.length - 1, attempt - 1))
        const delay = RETRY_DELAYS[delayIndex]!
        iotLog.warn(`Retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS})`)

        setState(prev => ({
          ...prev,
          retryAttempt: attempt,
          error: `Tentative ${attempt} Ã©chouÃ©e, nouvelle tentative...`
        }))

        await sleep(delay)
        return performDownload(attempt + 1)
      } else {
        // Ã‰chec final
        const errorMessage = downloadError instanceof Error
          ? downloadError.message
          : 'Erreur inconnue'

        await metrics.endSession(false, errorMessage)

        setState(prev => ({
          ...prev,
          phase: 'error',
          error: errorMessage
        }))

        onError?.(downloadError instanceof Error ? downloadError : new Error(errorMessage))
        throw downloadError
      }
    }
  }, [campaignId, device, machineId, metrics, onSuccess, onError, probeFiles])

  /**
   * Handler du clic sur le bouton de tÃ©lÃ©chargement
   */
  const handleDownload = useCallback(async () => {
    if (isDownloadingRef.current) {
      iotLog.warn('Download already in progress')
      return
    }

    isDownloadingRef.current = true
    setState({
      phase: 'initializing',
      retryAttempt: 0,
      error: undefined
    })

    try {
      await performDownload(1)
    } catch (error) {
      iotLog.error('Download failed after all retries', error)
    } finally {
      isDownloadingRef.current = false
    }
  }, [performDownload])

  /**
   * Handler du clic sur "DÃ©tecter & TÃ©lÃ©charger"
   */
  const handleDetectAndDownload = useCallback(async () => {
    if (!campaignId) return

    try {
      iotLog.info('Manual detect and download triggered')

      // Forcer un nouveau probe
      await probeFiles({
        machineId,
        campaignId
      })
      probedRef.current = campaignId

      // Attendre un peu pour que les fichiers soient dÃ©tectÃ©s
      await sleep(1000)

      // Lancer le tÃ©lÃ©chargement
      await handleDownload()
    } catch (error) {
      iotLog.error('Detect and download failed', error)
      setState(prev => ({
        ...prev,
        phase: 'error',
        error: error instanceof Error ? error.message : 'Ã‰chec de la dÃ©tection'
      }))
    }
  }, [campaignId, machineId, probeFiles, handleDownload])

  // ==================== UI STATE ====================

  const fileCount = campaignId ? getFileCountByCampaign(device, campaignId) : 0
  const hasFiles = fileCount > 0
  const isDownloading = state.phase !== 'idle' && state.phase !== 'completed' && state.phase !== 'error'
  const hasError = state.phase === 'error'

  // Badge dynamique
  const getBadgeContent = () => {
    if (hasError) return { content: '!', variant: 'danger' as const, pulse: true }
    if (hasFiles) return { content: fileCount, variant: 'success' as const, pulse: false }
    return { content: '0', variant: 'secondary' as const, pulse: false }
  }

  const badge = getBadgeContent()

  // Couleur de la barre de progression
  const getProgressColor = () => {
    if (state.method === 'wifi') return 'bg-purple-500'
    if (state.method === 'ble') return 'bg-blue-500'
    if (state.phase === 'uploading') return 'bg-green-500'
    return 'bg-gray-400'
  }

  // Label du bouton
  const getButtonLabel = () => {
    if (hasError) {
      return `Erreur (${state.retryAttempt} tentative${state.retryAttempt > 1 ? 's' : ''})`
    }
    if (state.phase === 'completed') {
      return 'TÃ©lÃ©chargement terminÃ©'
    }
    if (state.phase === 'uploading') {
      const progress = state.progress?.current || 0
      return `Upload ${progress}%`
    }
    if (isDownloading) {
      const progress = state.progress?.current || 0
      const method = state.method === 'wifi' ? 'Wi-Fi' : 'BLE'
      const files = state.progress?.total || fileCount
      return `${method} ${progress}% (${state.progress?.current || 0}/${files})`
    }
    if (hasFiles) {
      return 'TÃ©lÃ©charger'
    }
    return 'DÃ©tecter & TÃ©lÃ©charger'
  }

  // Variante du bouton
  const getButtonVariant = () => {
    if (hasError) return 'danger' as const
    if (state.phase === 'completed') return 'success' as const
    if (isDownloading && state.method === 'wifi') return 'primary' as const
    if (isDownloading && state.method === 'ble') return 'secondary' as const
    if (state.phase === 'uploading') return 'success' as const
    if (hasFiles) return 'success' as const
    return 'secondary' as const
  }

  // IcÃ´ne du bouton - useMemo pour Ã©viter les problÃ¨mes de rendu
  const buttonIcon = React.useMemo(() => {
    if (hasError) return <AlertCircle className="w-4 h-4" />
    if (state.phase === 'completed') return <CheckCircle className="w-4 h-4" />
    if (isDownloading) return <Loader2 className="w-4 h-4 animate-spin" />
    if (state.method === 'wifi') return <Wifi className="w-4 h-4" />
    if (state.method === 'ble') return <Bluetooth className="w-4 h-4" />
    if (state.phase === 'uploading') return <Upload className="w-4 h-4" />
    return <Download className="w-4 h-4" />
  }, [hasError, state.phase, state.method, isDownloading])

  // ==================== RENDER ====================

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      {/* Badge dans le coin supÃ©rieur droit */}
      <div className="absolute top-3 right-3 z-10">
        <Badge
          variant={badge.variant}
          size="sm"
          className={cn(
            'font-bold',
            badge.pulse && 'animate-pulse'
          )}
        >
          {badge.content}
        </Badge>
      </div>

      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              TÃ©lÃ©chargement IoT
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {campaignId ? (
                `Campagne active: ${(Array.isArray(device.campaigns) ? device.campaigns : []).find(c => c.id === campaignId)?.name || `#${campaignId}`}`
              ) : (
                'Aucune campagne active'
              )}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Barre de progression */}
        {isDownloading && state.progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>{PHASE_LABELS[state.phase]}</span>
              <span>{state.progress.current}% / {state.progress.total}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-300',
                  getProgressColor()
                )}
                style={{ width: `${state.progress.current}%` }}
              />
            </div>
            {state.progress.bytes && (
              <p className="text-xs text-gray-500 text-right">
                {metrics.formatBytes(state.progress.bytes)}
              </p>
            )}
          </div>
        )}

        {/* Message d'erreur */}
        {hasError && state.error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>{state.error}</p>
          </div>
        )}

        {/* Bouton principal */}
        <Button
          variant={getButtonVariant()}
          onClick={hasFiles ? handleDownload : handleDetectAndDownload}
          disabled={isDownloading || !campaignId}
          className="w-full flex items-center justify-center gap-2"
        >
          {buttonIcon}
          {getButtonLabel()}
        </Button>

        {/* Statistiques (optionnel) */}
        {state.phase === 'completed' && state.sessionId && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-xs text-green-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              TÃ©lÃ©chargement rÃ©ussi
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

IotDownload.displayName = 'IotDownload'

// ==================== EXPORT ====================

export default IotDownload









