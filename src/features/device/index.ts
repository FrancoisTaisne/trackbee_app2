/**
 * Device Feature Export Index
 * Point d'entrée centralisé pour toute la feature de gestion des devices IoT
 */

// ==================== HOOKS ====================
export {
  useDevice,
  useDeviceList,
  useDeviceScan,
  deviceQueryKeys
} from './hooks'

// ==================== COMPONENTS ====================
export {
  DeviceConnectionPill,
  DeviceScanModal,
  DeviceFileDownload
} from './components'

// ==================== PAGES ====================
export {
  DeviceListPage,
  DeviceDetailPage
} from './pages'

// ==================== TYPES ====================
export type {
  DeviceBundle,
  DeviceConnectionState,
  CreateDeviceData,
  UpdateDeviceData,
  AssignDeviceToSiteData,
  DeviceScanResult,
  DeviceScanOptions,
  DeviceFileProbeData,
  DeviceFileProbeResult,
  DeviceDownloadOptions,
  DeviceDownloadResult,
  DeviceSyncState,
  UseDeviceDetailReturn,
  UseDeviceListReturn,
  UseDeviceScanReturn,
  DeviceListProps,
  DeviceDetailProps,
  DeviceScanModalProps,
  DeviceConnectionPillProps,
  DeviceFileDownloadProps,
  DeviceError
} from './types'

// ==================== FEATURE INFO ====================

/**
 * Device Feature - Gestion complète des devices IoT TrackBee
 *
 * @description
 * Feature de gestion des devices IoT avec connexion BLE,
 * téléchargement de fichiers, et synchronisation des données.
 *
 * @features
 * - CRUD complet des devices avec validation Zod
 * - Scan et découverte BLE des devices TrackBee
 * - Connexion et gestion d'état BLE en temps réel
 * - Téléchargement automatique des fichiers .ubx
 * - Association devices/sites avec installations
 * - Interface de gestion par cartes et détail
 * - Surveillance des connexions et statistiques
 * - Gestion offline avec queue d'upload
 * - Support multi-campagnes par device
 * - Logs structurés avec VITE_DEBUG
 *
 * @usage
 * ```typescript
 * import { useDeviceList, DeviceListPage, DeviceConnectionPill } from '@/features/device'
 *
 * // Hook de liste des devices
 * const { devices, createDevice, scanForDevices } = useDeviceList({
 *   search: 'TRB',
 *   connected: true
 * })
 *
 * // Composant de connexion BLE
 * <DeviceConnectionPill
 *   deviceId={machine.id}
 *   onClick={() => navigate(`/devices/${machine.id}`)}
 * />
 *
 * // Page de liste complète
 * <Route path="/devices" element={<DeviceListPage />} />
 * ```
 *
 * @architecture
 * - Hooks: useDevice, useDeviceList, useDeviceScan avec TanStack Query
 * - Components: DeviceConnectionPill, DeviceScanModal, DeviceFileDownload
 * - Pages: DeviceListPage (grid view), DeviceDetailPage (tabs interface)
 * - Store: Integration avec deviceStore et bleStore (Zustand)
 * - BLE: Integration avec BleManager et TransferOrchestrator
 * - API: CRUD operations via HttpClient avec retry logic
 *
 * @ble_integration
 * - Auto-discovery des devices TRB* via BLE scan
 * - Gestion des connexions avec état centralisé
 * - Protocole A100/A101 pour communication ESP32
 * - Auto-probe des fichiers après connexion
 * - Download chunked avec progress callbacks
 * - Gestion MAC address endianness ESP32 vs DB
 *
 * @offline_support
 * - Cache des devices avec TanStack Query (5min stale)
 * - Queue d'upload pour les fichiers téléchargés
 * - Retry automatique des operations réseau
 * - Persistence de l'état BLE entre sessions
 * - Synchronisation intelligente des données
 *
 * @debug_logging
 * - VITE_DEBUG=true active tous les logs device
 * - VITE_DEBUG_BLE=true pour logs BLE spécifiques
 * - Contextes: 'device', 'deviceList', 'deviceScan', 'deviceConnection'
 * - Niveaux: trace/debug/info/warn/error avec données structurées
 */

export const DeviceFeatureInfo = {
  name: 'Device Feature',
  version: '1.0.0',
  description: 'Gestion complète des devices IoT TrackBee',
  dependencies: [
    '@/core/services/ble/BleManager',
    '@/core/services/api/HttpClient',
    '@/core/services/storage/StorageManager',
    '@/core/orchestrator/TransferOrchestrator',
    '@/core/state/stores/deviceStore',
    '@/core/state/stores/bleStore',
    '@/shared/ui/components',
    '@tanstack/react-query',
    'zod'
  ],
  exports: {
    hooks: ['useDevice', 'useDeviceList', 'useDeviceScan'],
    components: ['DeviceConnectionPill', 'DeviceScanModal', 'DeviceFileDownload'],
    pages: ['DeviceListPage', 'DeviceDetailPage'],
    types: [
      'DeviceBundle', 'DeviceConnectionState', 'CreateDeviceData',
      'UpdateDeviceData', 'DeviceScanResult', 'DeviceDownloadResult'
    ]
  },
  routes: [
    { path: '/devices', component: 'DeviceListPage', auth: true },
    { path: '/devices/:id', component: 'DeviceDetailPage', auth: true }
  ]
} as const