/**
 * DeviceConnectionPill Component - Indicateur d'état de connexion BLE
 * Affiche l'état de connexion d'un device avec actions de connexion/déconnexion
 */

import React, { useCallback } from 'react'
import { Bluetooth, BluetoothConnected, Loader2, AlertCircle, Power } from 'lucide-react'
import { Button, Badge } from '@/shared/ui/components'
import { useDevice } from '../hooks/useDevice'
import { logger } from '@/core/utils/logger'
import { cn } from '@/core/utils/cn'
import type { DeviceConnectionPillProps } from '../types'
import type { BleConnectionStatus } from '@/core/types'

// ==================== LOGGER SETUP ====================

const connectionLog = {
  debug: (msg: string, data?: unknown) => logger.debug('deviceConnection', msg, data),
  info: (msg: string, data?: unknown) => logger.info('deviceConnection', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('deviceConnection', msg, data),
  error: (msg: string, data?: unknown) => logger.error('deviceConnection', msg, data)
}

// ==================== CONNECTION STATUS CONFIG ====================

interface ConnectionStatusConfig {
  label: string
  icon: React.ComponentType<{ className?: string }>
  variant: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  className: string
  clickable: boolean
  action?: 'connect' | 'disconnect' | 'retry'
}

const getConnectionConfig = (
  status: BleConnectionStatus,
  isConnecting?: boolean,
  isScanning?: boolean,
  error?: string
): ConnectionStatusConfig => {
  if (isScanning) {
    return {
      label: 'Recherche...',
      icon: Loader2,
      variant: 'secondary',
      className: 'animate-spin',
      clickable: false
    }
  }

  if (isConnecting) {
    return {
      label: 'Connexion...',
      icon: Loader2,
      variant: 'warning',
      className: 'animate-spin',
      clickable: false
    }
  }

  switch (status) {
    case 'connected':
      return {
        label: 'Connecté',
        icon: BluetoothConnected,
        variant: 'success',
        className: 'text-success-600',
        clickable: true,
        action: 'disconnect'
      }

    case 'connecting':
      return {
        label: 'Connexion...',
        icon: Loader2,
        variant: 'warning',
        className: 'animate-spin text-warning-600',
        clickable: false
      }

    case 'disconnected':
      return {
        label: 'Déconnecté',
        icon: Bluetooth,
        variant: 'secondary',
        className: 'text-gray-500',
        clickable: true,
        action: 'connect'
      }

    case 'error':
      return {
        label: error ? 'Erreur' : 'Échec',
        icon: AlertCircle,
        variant: 'danger',
        className: 'text-danger-600',
        clickable: true,
        action: 'retry'
      }

    default:
      return {
        label: 'Inconnu',
        icon: Bluetooth,
        variant: 'secondary',
        className: 'text-gray-400',
        clickable: false
      }
  }
}

// ==================== MAIN COMPONENT ====================

export const DeviceConnectionPill: React.FC<DeviceConnectionPillProps> = ({
  deviceId,
  showLabel = true,
  size = 'md',
  onClick
}) => {
  const {
    device,
    connectDevice,
    disconnectDevice,
    error: deviceError
  } = useDevice(deviceId)

  // Récupérer l'état de connexion depuis le hook
  const bleConnection = device?.bleConnection
  const status = bleConnection?.status || 'disconnected'
  const isConnecting = bleConnection?.isConnecting || false
  const isScanning = bleConnection?.isScanning || false
  const connectionError = bleConnection?.error

  const config = getConnectionConfig(status, isConnecting, isScanning, connectionError)

  // ==================== HANDLERS ====================

  const handleClick = useCallback(async () => {
    connectionLog.debug('Connection pill clicked', {
      deviceId,
      status,
      action: config.action
    })

    // Callback externe en premier
    onClick?.()

    if (!config.clickable || !config.action) {
      return
    }

    try {
      switch (config.action) {
        case 'connect':
        case 'retry':
          connectionLog.info('Attempting to connect device', { deviceId })
          await connectDevice({
            autoProbeFiles: true,
            timeout: 15000
          })
          break

        case 'disconnect':
          connectionLog.info('Attempting to disconnect device', { deviceId })
          await disconnectDevice()
          break

        default:
          connectionLog.warn('Unknown connection action', { action: config.action })
      }
    } catch (error) {
      connectionLog.error('Connection action failed', { deviceId, action: config.action, error })
      // L'erreur sera gérée par le hook useDevice
    }
  }, [deviceId, status, config, connectDevice, disconnectDevice, onClick])

  // ==================== SIZE CLASSES ====================

  const sizeClasses = {
    sm: {
      button: 'h-6 px-2 text-xs',
      icon: 'w-3 h-3',
      badge: 'text-xs px-1.5 py-0.5'
    },
    md: {
      button: 'h-8 px-3 text-sm',
      icon: 'w-4 h-4',
      badge: 'text-sm px-2 py-1'
    },
    lg: {
      button: 'h-10 px-4 text-base',
      icon: 'w-5 h-5',
      badge: 'text-base px-3 py-1.5'
    }
  }

  const sizes = sizeClasses[size]

  // ==================== RENDER ====================

  const IconComponent = config.icon

  if (config.clickable) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={!config.clickable}
        className={cn(
          'flex items-center space-x-2',
          sizes.button,
          config.className
        )}
        title={connectionError || config.label}
      >
        <IconComponent className={cn(sizes.icon, config.className)} />
        {showLabel && (
          <span className="font-medium">
            {config.label}
          </span>
        )}
      </Button>
    )
  }

  return (
    <Badge
      variant={config.variant}
      className={cn(
        'flex items-center space-x-1.5',
        sizes.badge,
        config.className
      )}
      title={connectionError || config.label}
    >
      <IconComponent className={cn(sizes.icon, config.className)} />
      {showLabel && (
        <span>
          {config.label}
        </span>
      )}
    </Badge>
  )
}

// ==================== DISPLAY NAME ====================

DeviceConnectionPill.displayName = 'DeviceConnectionPill'

// ==================== EXAMPLES ====================

/**
 * Exemples d'utilisation:
 *
 * // Pill simple avec label
 * <DeviceConnectionPill deviceId={machine.id} />
 *
 * // Pill compacte sans label
 * <DeviceConnectionPill
 *   deviceId={machine.id}
 *   showLabel={false}
 *   size="sm"
 * />
 *
 * // Pill avec callback de clic
 * <DeviceConnectionPill
 *   deviceId={machine.id}
 *   onClick={() => navigate(`/devices/${machine.id}`)}
 * />
 *
 * // Dans un tableau ou liste
 * {devices.map(device => (
 *   <tr key={device.machine.id}>
 *     <td>{device.machine.name}</td>
 *     <td>
 *       <DeviceConnectionPill
 *         deviceId={device.machine.id}
 *         size="sm"
 *       />
 *     </td>
 *   </tr>
 * ))}
 */