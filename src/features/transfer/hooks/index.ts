/**
 * Transfer Hooks Export Index
 * Point d'entrée centralisé pour tous les hooks de gestion des transferts
 */

export {
  useTransfer,
  getTransferProgress,
  getTransferSpeed,
  getEstimatedTimeRemaining,
  formatTransferSize,
  formatTransferSpeed,
  formatTransferTime,
  canStartTransfer,
  canPauseTransfer,
  canResumeTransfer,
  canCancelTransfer,
  canRetryTransfer,
  canDeleteTransfer,
  getTransferStatusColor,
  getTransferPriorityColor
} from './useTransfer'

export {
  useTransferList,
  getDefaultFilters,
  buildSearchQuery,
  filterTransfersByStatus,
  filterTransfersByProtocol,
  groupTransfersByProtocol,
  groupTransfersByStatus,
  sortTransfers,
  calculateQueueStats,
  getActiveTransfers,
  getFailedTransfers,
  getRetryableTransfers
} from './useTransferList'

export {
  useBLETransfer,
  isBLEAvailable,
  getBLECapabilities,
  formatBLEDeviceInfo,
  getBLESignalStrength,
  estimateBLETransferTime,
  validateBLETransferOptions
} from './useBLETransfer'

export {
  useWiFiTransfer,
  isWiFiAvailable,
  validateIPAddress,
  isLocalIPAddress,
  formatWiFiDeviceInfo,
  getWiFiSignalQuality,
  estimateWiFiTransferTime,
  validateWiFiTransferOptions,
  buildWiFiConnectionString,
  parseWiFiConnectionString,
  getDefaultWiFiPort
} from './useWiFiTransfer'

export {
  useOfflineQueue,
  isOfflineQueueSupported,
  getQueueStorageUsage,
  formatQueueStatistics
} from './useOfflineQueue'

// Re-export types for convenience
export type {
  UseTransferReturn,
  UseTransferListReturn,
  UseBLETransferReturn,
  UseWiFiTransferReturn,
  UseOfflineQueueReturn,
  BLEDeviceInfo,
  WiFiDeviceInfo,
  OfflineQueue,
  OfflineTransfer
} from '../types'