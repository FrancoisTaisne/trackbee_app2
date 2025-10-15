/**
 * DeviceScanModal - BLE scan modal for TrackBee devices
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Bluetooth,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  Signal
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader
} from '@/shared/ui/components'
import { useDeviceScan } from '../hooks/useDeviceScan'
import { logger } from '@/core/utils/logger'
import { formatDistanceToNow } from '@/core/utils/time'
import { cn } from '@/core/utils/cn'
import type { DeviceScanModalProps, DeviceScanResult } from '../types'

const scanModalLog = {
  debug: (message: string, data?: unknown) => logger.debug('deviceScanModal', message, data),
  info: (message: string, data?: unknown) => logger.info('deviceScanModal', message, data),
  warn: (message: string, data?: unknown) => logger.warn('deviceScanModal', message, data),
  error: (message: string, data?: unknown) => logger.error('deviceScanModal', message, data)
}

type SignalStrength = {
  label: string
  color: string
}

const resolveSignalStrength = (rssi: number): SignalStrength => {
  const absolute = Math.abs(rssi)
  if (absolute <= 50) {
    return { label: 'Signal excellent', color: 'text-success-600' }
  }
  if (absolute <= 65) {
    return { label: 'Signal bon', color: 'text-success-500' }
  }
  if (absolute <= 80) {
    return { label: 'Signal moyen', color: 'text-warning-500' }
  }
  return { label: 'Signal faible', color: 'text-danger-500' }
}

const isPromiseLike = (value: unknown): value is Promise<unknown> => {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
    return false
  }
  return typeof (value as PromiseLike<unknown>).then === 'function'
}

interface DeviceResultItemProps {
  result: DeviceScanResult
  onSelect: (result: DeviceScanResult) => void
  isConnecting: boolean
  isSelected: boolean
}

const DeviceResultItem: React.FC<DeviceResultItemProps> = ({ result, onSelect, isConnecting, isSelected }) => {
  const { device, machine, isKnown, rssi, timestamp } = result
  const signal = resolveSignalStrength(rssi)

  const handleSelect = useCallback(() => {
    onSelect(result)
  }, [onSelect, result])

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleSelect()
        }
      }}
      className={cn(
        'group border transition-all cursor-pointer',
        isSelected
          ? 'border-trackbee-500 bg-trackbee-50 shadow-md ring-2 ring-trackbee-500 ring-opacity-50'
          : 'border-gray-200 hover:border-trackbee-300 hover:shadow-sm',
        isKnown && !isSelected && 'bg-trackbee-50/40',
        !isKnown && !isSelected && 'bg-white',
        isConnecting && 'pointer-events-none opacity-70'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-md border border-gray-200 bg-white">
            <Bluetooth className={cn('h-6 w-6 text-gray-500', isKnown && 'text-trackbee-600')} />
          </div>

          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="max-w-[230px] truncate text-sm font-semibold text-gray-900">
                {device.name || 'Device sans nom'}
              </span>

              {isKnown ? (
                <Badge variant="success" size="sm" className="flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Connu
                </Badge>
              ) : (
                <Badge variant="secondary" size="sm">
                  Nouveau
                </Badge>
              )}

              <span className="text-xs font-mono text-gray-500">{device.id}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
              {machine ? (
                <span className="max-w-[220px] truncate">
                  {machine.name}
                  {machine.description ? ` - ${machine.description}` : ''}
                </span>
              ) : (
                <span className="max-w-[220px] truncate">Machine inconnue</span>
              )}

              <span className="flex items-center gap-1 text-gray-500">
                <Clock className="h-3.5 w-3.5" />
                {formatDistanceToNow(timestamp)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Signal className={cn('h-4 w-4', signal.color)} />
                <span className={cn('font-medium', signal.color)}>{rssi} dBm</span>
                <span className="text-gray-500">{signal.label}</span>
              </div>

              {isConnecting && (
                <span className="flex items-center gap-1 text-warning-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connexion en cours
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const DeviceScanModal: React.FC<DeviceScanModalProps> = ({
  isOpen,
  onClose,
  onDeviceSelected,
  filterByKnownMacs = true,
  autoConnect = false
}) => {
  const {
    isScanning,
    devices,
    error,
    startScan,
    stopScan,
    connectToDevice,
    clearResults
  } = useDeviceScan()

  const [searchTerm, setSearchTerm] = useState('')
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [selectedDevice, setSelectedDevice] = useState<DeviceScanResult | null>(null)

  const stopScanSafely = useCallback(() => {
    try {
      const maybePromise = stopScan() as unknown
      if (isPromiseLike(maybePromise)) {
        return maybePromise.catch(stopError => {
          scanModalLog.error('Failed to stop scan', stopError)
        })
      }
      return Promise.resolve()
    } catch (stopError) {
      scanModalLog.error('Failed to stop scan', stopError)
      return Promise.resolve()
    }
  }, [stopScan])

  const startScanWithDefaults = useCallback(async () => {
    scanModalLog.debug('Starting BLE scan', { filterByKnownMacs })
    try {
      await startScan({
        timeout: 30000,
        filterByKnownMacs,
        allowDuplicates: false
      })
    } catch (scanError) {
      scanModalLog.error('Unable to start BLE scan', scanError)
    }
  }, [startScan, filterByKnownMacs])

  useEffect(() => {
    if (!isOpen) {
      void stopScanSafely()
      clearResults()
      setSearchTerm('')
      setConnectingId(null)
      setSelectedDevice(null)
      return
    }

    clearResults()
    setSearchTerm('')
    setConnectingId(null)
    setSelectedDevice(null)
    void startScanWithDefaults()

    return () => {
      void stopScanSafely()
      clearResults()
      setConnectingId(null)
      setSelectedDevice(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const filteredDevices = useMemo(() => {
    if (!searchTerm.trim()) {
      return devices
    }

    const query = searchTerm.trim().toLowerCase()
    return devices.filter(result => {
      const nameMatch = result.device.name?.toLowerCase().includes(query)
      const idMatch = result.device.id.toLowerCase().includes(query)
      const machineNameMatch = result.machine?.name?.toLowerCase().includes(query)
      const machineDescriptionMatch = result.machine?.description?.toLowerCase().includes(query)
      return nameMatch || idMatch || machineNameMatch || machineDescriptionMatch
    })
  }, [devices, searchTerm])

  const handleManualScan = useCallback(async () => {
    scanModalLog.debug('Manual scan requested from modal')
    clearResults()
    setConnectingId(null)
    await stopScanSafely()
    await startScanWithDefaults()
  }, [clearResults, stopScanSafely, startScanWithDefaults])

  const handleToggleScan = useCallback(async () => {
    if (isScanning) {
      scanModalLog.debug('Stopping scan from modal toggle')
      await stopScanSafely()
      return
    }
    await handleManualScan()
  }, [isScanning, handleManualScan, stopScanSafely])

  const handleDeviceSelect = useCallback(async (result: DeviceScanResult) => {
    scanModalLog.debug('Device selected inside modal', {
      deviceId: result.device.id,
      autoConnect,
      isKnown: result.isKnown
    })

    // Sélectionner le device (pour le surligner dans la liste)
    setSelectedDevice(result)

    // Si autoConnect est activé, connecter immédiatement
    if (autoConnect && result.isKnown) {
      setConnectingId(result.device.id)
      try {
        await connectToDevice(result)
        scanModalLog.info('Device auto connected from modal', {
          deviceId: result.device.id,
          machineId: result.machine?.id
        })
        // Si connexion réussie, fermer et notifier
        onDeviceSelected(result)
      } catch (connectionError) {
        scanModalLog.error('Auto connect failed from modal', connectionError)
      } finally {
        setConnectingId(null)
      }
    }
  }, [autoConnect, connectToDevice, onDeviceSelected])

  const handleValidate = useCallback(() => {
    if (!selectedDevice) {
      scanModalLog.warn('No device selected for validation')
      return
    }

    scanModalLog.info('Device validated from modal', {
      deviceId: selectedDevice.device.id,
      machineId: selectedDevice.machine?.id
    })

    onDeviceSelected(selectedDevice)
  }, [selectedDevice, onDeviceSelected])

  const handleClose = useCallback(() => {
    scanModalLog.debug('Closing scan modal requested')
    setSearchTerm('')
    setConnectingId(null)
    setSelectedDevice(null)
    clearResults()
    void stopScanSafely()
    onClose()
  }, [clearResults, onClose, stopScanSafely])

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" title="Scanner les devices TrackBee">
      <ModalHeader>
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold text-gray-900">Scanner les devices TrackBee</h2>
            <p className="text-sm text-gray-500">
              Identifiez les TrackBee disponibles a proximite et connectez-vous en un clic.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={isScanning ? 'solid-success' : 'secondary'}
              size="sm"
              className="flex items-center gap-1"
            >
              {isScanning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Bluetooth className="h-3.5 w-3.5" />
              )}
              {isScanning ? 'Scan en cours' : 'Scan en pause'}
            </Badge>

            <Button
              variant={isScanning ? 'outline' : 'primary'}
              size="sm"
              onClick={handleToggleScan}
              className="flex items-center gap-2"
            >
              {isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Stopper
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Relancer le scan
                </>
              )}
            </Button>
          </div>
        </div>
      </ModalHeader>

      <ModalContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Rechercher par nom, MAC ou site"
                className="pl-9"
              />
            </div>

            <Badge variant="secondary" size="sm">
              {filteredDevices.length} resultat{filteredDevices.length > 1 ? 's' : ''}
            </Badge>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-md border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-medium">Le scan a rencontre une erreur</p>
                <p className="text-xs text-danger-600">
                  {error instanceof Error ? error.message : 'Erreur inconnue'}
                </p>
              </div>
            </div>
          )}

          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {filteredDevices.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
                {isScanning ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin text-trackbee-600" />
                    <p className="text-sm font-medium text-gray-600">
                      Scan en cours...
                    </p>
                    <p className="text-xs text-gray-500">
                      Approchez un TrackBee ou patientez quelques secondes.
                    </p>
                  </>
                ) : (
                  <>
                    <Bluetooth className="h-6 w-6 text-gray-400" />
                    <p className="text-sm font-medium text-gray-600">
                      Aucun device detecte pour le moment
                    </p>
                    <p className="text-xs text-gray-500">
                      Activez le Bluetooth et relancez un scan pour trouver un TrackBee.
                    </p>
                  </>
                )}
              </div>
            ) : (
              filteredDevices.map(result => (
                <DeviceResultItem
                  key={result.device.id}
                  result={result}
                  onSelect={handleDeviceSelect}
                  isConnecting={connectingId === result.device.id}
                  isSelected={selectedDevice?.device.id === result.device.id}
                />
              ))
            )}
          </div>
        </div>
      </ModalContent>

      <ModalFooter>
        <div className="flex items-center justify-between w-full">
          <Button variant="secondary" onClick={handleClose}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleValidate}
            disabled={!selectedDevice}
          >
            Valider
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  )
}
