/**
 * Transfer Feature Export Index
 * Point d'entrée centralisé pour toute la feature de gestion des transferts BLE/WiFi
 */

// ==================== HOOKS ====================
export {
  useTransfer,
  useTransferList,
  useBLETransfer,
  useWiFiTransfer,
  useOfflineQueue,
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
  getTransferPriorityColor,
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
  getRetryableTransfers,
  isBLEAvailable,
  getBLECapabilities,
  formatBLEDeviceInfo,
  getBLESignalStrength,
  estimateBLETransferTime,
  validateBLETransferOptions,
  isWiFiAvailable,
  validateIPAddress,
  isLocalIPAddress,
  formatWiFiDeviceInfo,
  getWiFiSignalQuality,
  estimateWiFiTransferTime,
  validateWiFiTransferOptions,
  buildWiFiConnectionString,
  parseWiFiConnectionString,
  getDefaultWiFiPort,
  isOfflineQueueSupported,
  getQueueStorageUsage,
  formatQueueStatistics,
  // transferQueryKeys PUSH FINAL: Commented out missing export
  // transferQueryKeys
} from './hooks'

// ==================== COMPONENTS ====================
// PUSH FINAL: Components not ready yet - comment out
// export {
//   TransferList
// } from './components'

// ==================== TYPES ====================
export type {
  Transfer,
  TransferBundle,
  TransferStatistics,
  CreateTransferData,
  UpdateTransferData,
  TransferFilters,
  TransferSorting,
  TransferQueue,
  QueuedTransfer,
  BLEDeviceInfo,
  BLETransferOptions,
  WiFiDeviceInfo,
  WiFiTransferOptions,
  OfflineQueue,
  OfflineTransfer,
  DeviceInfo,
  UseTransferReturn,
  UseTransferListReturn,
  UseBLETransferReturn,
  UseWiFiTransferReturn,
  UseOfflineQueueReturn,
  TransferListProps,
  TransferDetailProps,
  TransferFormProps,
  DeviceConnectionProps,
  FileTransferProps,
  QueueManagerProps,
  TransferError
} from './types'

// ==================== CONSTANTS ====================
export {
  TRANSFER_PROTOCOLS,
  TRANSFER_STATUS_LABELS,
  TRANSFER_PRIORITIES,
  DEFAULT_QUEUE_SETTINGS,
  BLE_DEFAULT_SETTINGS,
  WIFI_DEFAULT_SETTINGS,
  TransferProtocolSchema,
  TransferDirectionSchema,
  TransferStatusSchema,
  TransferPrioritySchema,
  CreateTransferSchema,
  UpdateTransferSchema,
  TransferFiltersSchema,
  BLETransferOptionsSchema,
  WiFiTransferOptionsSchema
} from './types'

// ==================== FEATURE INFO ====================

/**
 * Transfer Feature - Gestion complète des transferts de fichiers BLE/WiFi
 *
 * @description
 * Feature de gestion des transferts de fichiers entre devices IoT et application
 * avec support BLE, WiFi, et queue offline pour la synchronisation.
 *
 * @features
 * - CRUD complet des transferts avec validation Zod stricte
 * - Support multi-protocoles (BLE, WiFi, USB, Manuel)
 * - Transferts bidirectionnels (download/upload)
 * - Queue intelligente avec priorités et retry automatique
 * - Gestion offline avec persistance IndexedDB
 * - Monitoring en temps réel avec progression et vitesse
 * - Découverte automatique des devices BLE et WiFi
 * - Gestion des connexions avec auto-reconnexion
 * - Validation d'intégrité des fichiers (hashes)
 * - Interface unifiée pour tous les protocoles
 * - Statistiques détaillées et métriques de performance
 * - Integration avec Campaign et Device Features
 * - Debug logging complet avec VITE_DEBUG
 *
 * @usage
 * ```typescript
 * import { useTransferList, useBLETransfer, TransferList } from '@/features/transfer'
 *
 * // Hook de liste des transferts
 * const { transfers, createTransfer, startTransfers } = useTransferList({
 *   machineId: 123,
 *   protocol: 'ble'
 * })
 *
 * // Hook BLE spécialisé
 * const { scanForDevices, connectToDevice, downloadFile } = useBLETransfer()
 *
 * // Composant de liste complète
 * <TransferList
 *   machineId={machineId}
 *   campaignId={campaignId}
 *   onTransferSelect={handleTransferSelect}
 * />
 * ```
 *
 * @architecture
 * - Hooks: useTransfer, useTransferList, useBLETransfer, useWiFiTransfer, useOfflineQueue
 * - Components: TransferList (gestion), DeviceConnection (connexion), FileTransfer (interface)
 * - Queue: Système de queue intelligent avec priorités et retry
 * - Offline: Persistance IndexedDB avec synchronisation automatique
 * - Protocols: Abstraction unifiée pour BLE, WiFi, USB, Manuel
 * - Monitoring: Suivi temps réel des progressions et vitesses
 *
 * @protocol_support
 * - **BLE (Bluetooth LE)**: Transferts via Capacitor BluetoothLE plugin
 * - **WiFi**: Transferts HTTP/FTP/SCP avec découverte réseau local
 * - **USB**: Transferts directs via port série (futur)
 * - **Manuel**: Import/export de fichiers par l'utilisateur
 *
 * @ble_integration
 * - Scan automatique des devices TrackBee (TRB*)
 * - Connexion via MAC address ou device ID
 * - Protocol custom avec services A100/A101/A102
 * - Transferts par chunks avec MTU negotiation
 * - Gestion des notifications et acknowledgments
 * - Auto-reconnexion en cas de déconnexion
 * - Validation d'intégrité avec checksums
 *
 * @wifi_integration
 * - Découverte réseau local avec ping scan
 * - Support HTTP, FTP, SCP avec authentification
 * - Test de connectivité et latence
 * - Transferts avec progress streaming
 * - SSL/TLS pour sécurisation
 * - Configuration flexible des ports et timeouts
 *
 * @queue_management
 * - Queue persistante avec IndexedDB
 * - Priorités configurables (1-5)
 * - Retry automatique avec backoff
 * - Batch processing pour performances
 * - Synchronisation intelligente online/offline
 * - Nettoyage automatique des anciens transferts
 * - Statistiques en temps réel
 *
 * @offline_support
 * - Stockage persistant avec IndexedDB
 * - Queue automatique en cas de déconnexion
 * - Synchronisation à la reconnexion
 * - Compression et encryption optionnelles
 * - Gestion de l'espace de stockage
 * - Récupération après crash application
 *
 * @monitoring_features
 * - Progression en temps réel (%)
 * - Vitesse de transfert (bytes/sec)
 * - Temps restant estimé
 * - Détection des erreurs et timeouts
 * - Métriques de performance globales
 * - Historique des transferts
 * - Alertes et notifications
 *
 * @integration_features
 * - **Campaign Feature**: Transferts liés aux campagnes de mesure
 * - **Device Feature**: Integration avec devices IoT et BLE state
 * - **Site Feature**: Context géographique des transferts
 * - **Processing Feature**: Upload automatique pour post-traitement
 * - Navigation croisée avec preservation du contexte
 *
 * @state_management
 * - Cache intelligent TanStack Query (5s stale pour transferts actifs)
 * - Polling automatique pour transferts en cours
 * - Invalidation en cascade des dépendances
 * - Optimistic updates pour actions utilisateur
 * - Synchronisation entre hooks spécialisés
 *
 * @error_handling
 * - Types d'erreurs spécialisés par protocole
 * - Retry automatique avec exponential backoff
 * - Fallback entre protocoles si possible
 * - Logging détaillé pour debugging
 * - Recovery automatique après interruptions
 * - Messages d'erreur localisés
 *
 * @security_features
 * - Validation des devices par MAC address
 * - Encryption optionnelle des données
 * - Authentification pour protocols réseau
 * - Validation d'intégrité avec hashes
 * - Permissions granulaires par protocole
 * - Audit trail des transferts
 *
 * @performance_optimization
 * - Transferts parallèles limités par protocol
 * - Chunks adaptatifs selon MTU/bandwidth
 * - Compression automatique pour gros fichiers
 * - Cache des connexions devices
 * - Déduplication des fichiers identiques
 * - Monitoring de la bande passante
 *
 * @debug_logging
 * - VITE_DEBUG=true active tous les logs transfer
 * - VITE_DEBUG_TRANSFER=true pour logs spécifiques
 * - VITE_DEBUG_BLE=true pour logs BLE détaillés
 * - VITE_DEBUG_WIFI=true pour logs WiFi détaillés
 * - Contextes: 'transfer', 'transferList', 'ble', 'wifi', 'queue'
 * - Niveaux: trace/debug/info/warn/error avec données structurées
 * - Suivi complet des opérations de transfert
 */

export const TransferFeatureInfo = {
  name: 'Transfer Feature',
  version: '1.0.0',
  description: 'Gestion complète des transferts de fichiers BLE/WiFi TrackBee',
  dependencies: [
    '@/core/services/api/HttpClient',
    '@/features/campaign (integration campagnes)',
    '@/features/device (integration devices IoT)',
    '@/shared/ui/components',
    '@tanstack/react-query',
    'react-hook-form',
    '@hookform/resolvers/zod',
    'zod',
    '@capacitor-community/bluetooth-le',
    'idb-keyval'
  ],
  exports: {
    hooks: [
      'useTransfer', 'useTransferList', 'useBLETransfer', 'useWiFiTransfer', 'useOfflineQueue',
      'getTransferProgress', 'formatTransferSize', 'formatTransferSpeed',
      'isBLEAvailable', 'getBLECapabilities', 'validateIPAddress',
      'isOfflineQueueSupported', 'getQueueStorageUsage'
    ],
    components: [
      'TransferList', 'DeviceConnection', 'FileTransfer', 'QueueManager'
    ],
    types: [
      'Transfer', 'TransferBundle', 'CreateTransferData', 'TransferFilters',
      'BLEDeviceInfo', 'WiFiDeviceInfo', 'OfflineQueue', 'TransferStatistics'
    ],
    constants: [
      'TRANSFER_PROTOCOLS', 'TRANSFER_STATUS_LABELS', 'TRANSFER_PRIORITIES',
      'BLE_DEFAULT_SETTINGS', 'WIFI_DEFAULT_SETTINGS'
    ]
  },
  protocols: [
    {
      name: 'BLE (Bluetooth Low Energy)',
      description: 'Transferts via Bluetooth avec devices TrackBee',
      features: ['Device scanning', 'Auto-connection', 'Chunked transfer', 'MTU negotiation'],
      limitations: ['Range limité', 'Vitesse ~5KB/s', 'Taille max 50MB']
    },
    {
      name: 'WiFi',
      description: 'Transferts réseau avec HTTP/FTP/SCP',
      features: ['Network discovery', 'Multiple protocols', 'High speed', 'Large files'],
      limitations: ['Même réseau requis', 'Configuration IP']
    },
    {
      name: 'USB',
      description: 'Transferts directs par câble (futur)',
      features: ['Highest speed', 'Reliable', 'No range limit'],
      limitations: ['Câble requis', 'Drivers needed']
    },
    {
      name: 'Manuel',
      description: 'Import/export manuel par utilisateur',
      features: ['Universal', 'Simple', 'No tech requirements'],
      limitations: ['Manual process', 'Pas automatique']
    }
  ],
  integrations: [
    {
      feature: 'Campaign Feature',
      relationship: 'Transfers are triggered by campaign execution',
      components: ['File upload for processing', 'Results download']
    },
    {
      feature: 'Device Feature',
      relationship: 'Transfers communicate with IoT devices',
      components: ['BLE state management', 'Device discovery', 'Connection management']
    },
    {
      feature: 'Processing Feature',
      relationship: 'Transfers provide files for post-processing',
      components: ['Automatic upload', 'Results retrieval']
    }
  ],
  capabilities: {
    protocols: ['ble', 'wifi', 'usb', 'manual'],
    directions: ['download', 'upload'],
    fileTypes: ['ubx', 'obs', 'nav', 'cfg', 'log', 'json'],
    maxFileSizes: {
      ble: '50MB',
      wifi: '1GB',
      usb: '10GB',
      manual: 'unlimited'
    },
    averageSpeeds: {
      ble: '5KB/s',
      wifi: '1MB/s',
      usb: '10MB/s',
      manual: 'instant'
    }
  }
} as const