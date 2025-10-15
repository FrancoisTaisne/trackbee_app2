/**
 * State Layer - Export centralisé de la gestion d'état
 * Point d'entrée unique pour TanStack Query + Zustand
 */

// ==================== QUERY CLIENT ====================

import { queryClient as importedQueryClient } from './queryClient'
import { logger } from '@/core/utils/logger'

export {
  queryClient,
  createQueryClient,
  queryKeys,
  cacheUtils
} from './queryClient'

export type {
  QueryKey,
  CacheUtils
} from './queryClient'

// ==================== STORES ====================

// Auth Store
export {
  useAuthStore,
  authSelectors,
  useAuth,
  useUser,
  useIsAuthenticated,
  useAuthLoading
} from './stores/auth.store'

export type {
  AuthStore,
  AuthState,
  AuthActions
} from './stores/auth.store'

// Device Store
export {
  useDeviceStore,
  deviceSelectors,
  useDevices,
  useSites,
  useConnectedDevices,
  useDeviceConnection,
  useDeviceBundle
} from './stores/device.store'

export type {
  DeviceStore,
  DeviceState,
  DeviceActions
} from './stores/device.store'

// Transfer Store
export {
  useTransferStore,
  transferSelectors,
  useActiveTasks,
  useUploadQueue,
  useGlobalProgress,
  useTransferStats
} from './stores/transfer.store'

export type {
  TransferStore,
  TransferState,
  TransferActions
} from './stores/transfer.store'

// UI Store
export {
  useUIStore,
  uiSelectors,
  useToasts,
  useModals,
  useTopModal,
  useGlobalLoading,
  useTheme,
  useLanguage
} from './stores/ui.store'

export type {
  UIStore,
  UIState,
  UIActions,
  ToastMessage,
  ModalState,
  LoadingState
} from './stores/ui.store'

// ==================== PROVIDERS ====================

export { QueryProvider } from './providers/QueryProvider'
export { StoreProvider, useStores, useStoresReady } from './providers/StoreProvider'

export type { StoreProviderProps } from './providers/StoreProvider'

// ==================== QUERIES (à implémenter) ====================

// Placeholder pour les hooks de queries TanStack
// Ces hooks seront implémentés dans src/features/*/queries/

// Export des types pour les queries
export type {
  // Ces types seront définis quand on implémentera les queries
  // UserQueries,
  // DeviceQueries,
  // SiteQueries,
  // CampaignQueries,
  // ProcessingQueries
} from '@/core/types/transport'

// ==================== COMBINED PROVIDER ====================

/**
 * Provider combiné pour Query + Stores
 * Simplifie l'usage dans l'application
 */
import React, { type ReactNode } from 'react'
import { QueryProvider } from './providers/QueryProvider'
import { StoreProvider } from './providers/StoreProvider'

interface StateProviderProps {
  children: ReactNode
  showQueryDevtools?: boolean
}

export const StateProvider: React.FC<StateProviderProps> = ({
  children,
  showQueryDevtools
}) => {
  return (
    <QueryProvider showDevtools={showQueryDevtools}>
      <StoreProvider>
        {children}
      </StoreProvider>
    </QueryProvider>
  )
}

export type { StateProviderProps }

// ==================== UTILITIES ====================

/**
 * Utilitaires pour la gestion d'état
 */
export const stateUtils = {
  /**
   * Reset complet de l'état application
   * Utile pour la déconnexion ou le changement d'utilisateur
   */
  resetAllStores: async () => {
    const { useAuthStore } = await import('./stores/auth.store')
    const { useDeviceStore } = await import('./stores/device.store')
    const { useTransferStore } = await import('./stores/transfer.store')
    const { useUIStore } = await import('./stores/ui.store')

    // Cleanup tous les stores
    useAuthStore.getState().cleanup()
    useDeviceStore.getState().cleanup()
    useTransferStore.getState().cleanup()
    useUIStore.getState().cleanup()

    // Clear le cache des queries
    importedQueryClient.clear()
  },

  /**
   * Export de l'état pour debug
   */
  exportState: () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useAuthStore } = require('./stores/auth.store')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useDeviceStore } = require('./stores/device.store')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useTransferStore } = require('./stores/transfer.store')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useUIStore } = require('./stores/ui.store')

    return {
      auth: {
        isAuthenticated: useAuthStore.getState().isAuthenticated,
        user: useAuthStore.getState().user,
        session: useAuthStore.getState().session
      },
      devices: {
        machines: Array.from(useDeviceStore.getState().machines.values()),
        sites: Array.from(useDeviceStore.getState().sites.values()),
        connections: Array.from(useDeviceStore.getState().connections.entries())
      },
      transfers: {
        activeTasks: Array.from(useTransferStore.getState().activeTasks.values()),
        uploadQueue: Array.from(useTransferStore.getState().uploadQueue.values()),
        stats: useTransferStore.getState().stats
      },
      ui: {
        theme: useUIStore.getState().theme,
        language: useUIStore.getState().language,
        toasts: Array.from(useUIStore.getState().toasts.values()),
        modals: Array.from(useUIStore.getState().modals.values())
      },
      queryCache: importedQueryClient.getQueryCache().getAll().length
    }
  },

  /**
   * Import d'état pour debug/test
   */
  importState: (state: unknown) => {
    logger.warn('state', 'State import not implemented yet', state)
    // TODO: Implémenter si nécessaire pour les tests
  }
} as const

// ==================== DEBUG GLOBALS ====================

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Exposer les utilitaires d'état en dev
  Object.assign(window, {
    TrackBeeState: {
      ...stateUtils,
      queryClient: importedQueryClient,
      stores: {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        auth: () => require('./stores/auth.store').useAuthStore.getState(),
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        device: () => require('./stores/device.store').useDeviceStore.getState(),
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        transfer: () => require('./stores/transfer.store').useTransferStore.getState(),
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        ui: () => require('./stores/ui.store').useUIStore.getState()
      }
    }
  })
}
