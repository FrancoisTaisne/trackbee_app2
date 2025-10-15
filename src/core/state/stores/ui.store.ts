/**
 * UI Store - Gestion état interface utilisateur
 * Store Zustand pour l'état client de l'UI globale
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { stateLog, logger } from '@/core/utils/logger'
import { storageManager } from '@/core/services/storage/StorageManager'
import { detectPlatform } from '@/core/utils/env'

// ==================== TYPES ====================

interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  actions?: Array<{
    label: string
    action: () => void
    style?: 'primary' | 'secondary'
  }>
  persistent?: boolean
  createdAt: Date
}

interface ModalState {
  id: string
  type: string
  props?: Record<string, unknown>
  persistent?: boolean
  onClose?: () => void
}

interface LoadingState {
  id: string
  message: string
  progress?: number
  cancellable?: boolean
  onCancel?: () => void
}

interface UIState {
  // Layout
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  headerHeight: number
  footerHeight: number

  // Theme et préférences
  theme: 'light' | 'dark' | 'auto'
  language: 'fr' | 'en'
  fontSize: 'small' | 'medium' | 'large'
  reducedMotion: boolean

  // Notifications
  toasts: Map<string, ToastMessage>
  notificationPermission: 'default' | 'granted' | 'denied'

  // Modales
  modals: Map<string, ModalState>
  modalStack: string[]

  // Loading states
  globalLoading: boolean
  loadingStates: Map<string, LoadingState>

  // Navigation
  currentRoute: string
  routeHistory: string[]
  canGoBack: boolean

  // Erreurs
  errors: Map<string, {
    id: string
    error: Error
    context?: Record<string, unknown>
    timestamp: Date
    acknowledged: boolean
  }>

  // Performance
  performanceMode: 'normal' | 'battery-saver' | 'high-performance'
  animationsEnabled: boolean
  autoRefreshEnabled: boolean

  // Debug
  debugPanelOpen: boolean
  debugLogs: Array<{
    timestamp: Date
    level: string
    module: string
    message: string
    data?: unknown
  }>
}

interface UIActions {
  // Layout
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setHeaderHeight: (height: number) => void
  setFooterHeight: (height: number) => void

  // Theme et préférences
  setTheme: (theme: UIState['theme']) => void
  setLanguage: (language: UIState['language']) => void
  setFontSize: (size: UIState['fontSize']) => void
  setReducedMotion: (reduced: boolean) => void
  toggleTheme: () => void

  // Notifications et toasts
  showToast: (toast: Omit<ToastMessage, 'id' | 'createdAt'>) => string
  hideToast: (id: string) => void
  clearToasts: () => void
  requestNotificationPermission: () => Promise<boolean>

  // Modales
  showModal: (modal: Omit<ModalState, 'id'>) => string
  hideModal: (id: string) => void
  hideTopModal: () => void
  clearModals: () => void

  // Loading states
  setGlobalLoading: (loading: boolean) => void
  showLoading: (loading: Omit<LoadingState, 'id'>) => string
  hideLoading: (id: string) => void
  updateLoadingProgress: (id: string, progress: number) => void

  // Navigation
  setCurrentRoute: (route: string) => void
  goBack: () => boolean
  clearHistory: () => void

  // Erreurs
  reportError: (error: Error, context?: Record<string, unknown>) => string
  acknowledgeError: (id: string) => void
  clearErrors: () => void

  // Performance
  setPerformanceMode: (mode: UIState['performanceMode']) => void
  setAnimationsEnabled: (enabled: boolean) => void
  setAutoRefreshEnabled: (enabled: boolean) => void

  // Debug
  toggleDebugPanel: () => void
  addDebugLog: (log: Omit<UIState['debugLogs'][0], 'timestamp'>) => void
  clearDebugLogs: () => void

  // Persistence
  loadPreferences: () => Promise<void>
  savePreferences: () => Promise<void>
  cleanup: () => void
}

type UIStore = UIState & UIActions

// ==================== INITIAL STATE ====================

const platform = detectPlatform()

const initialState: UIState = {
  // Layout
  sidebarOpen: !platform.isMobile,
  sidebarCollapsed: false,
  headerHeight: 60,
  footerHeight: 0,

  // Theme
  theme: 'auto',
  language: 'fr',
  fontSize: 'medium',
  reducedMotion: false,

  // Notifications
  toasts: new Map(),
  notificationPermission: 'default',

  // Modales
  modals: new Map(),
  modalStack: [],

  // Loading
  globalLoading: false,
  loadingStates: new Map(),

  // Navigation
  currentRoute: '/',
  routeHistory: ['/'],
  canGoBack: false,

  // Erreurs
  errors: new Map(),

  // Performance
  performanceMode: platform.isMobile ? 'battery-saver' : 'normal',
  animationsEnabled: !platform.isMobile,
  autoRefreshEnabled: true,

  // Debug
  debugPanelOpen: false,
  debugLogs: []
}

// ==================== STORAGE KEYS ====================

const STORAGE_KEYS = {
  PREFERENCES: 'ui_preferences',
  THEME: 'ui_theme',
  LANGUAGE: 'ui_language'
} as const

// ==================== HELPERS ====================

const generateId = () => `ui_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

const AUTO_HIDE_DURATION = {
  success: 4000,
  info: 6000,
  warning: 8000,
  error: 0 // Ne pas masquer automatiquement
}

// ==================== STORE ====================

export const useUIStore = create<UIStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialState,

      // ==================== LAYOUT ====================

      setSidebarOpen: (open) => {
        set((state) => {
          state.sidebarOpen = open
        })

        stateLog.debug('Sidebar toggled', { open })
      },

      setSidebarCollapsed: (collapsed) => {
        set((state) => {
          state.sidebarCollapsed = collapsed
        })

        stateLog.debug('Sidebar collapsed state changed', { collapsed })
      },

      setHeaderHeight: (height) => {
        set((state) => {
          state.headerHeight = height
        })
      },

      setFooterHeight: (height) => {
        set((state) => {
          state.footerHeight = height
        })
      },

      // ==================== THEME & PREFERENCES ====================

      setTheme: (theme) => {
        set((state) => {
          state.theme = theme
        })

        stateLog.debug('Theme changed', { theme })
        get().savePreferences()
      },

      setLanguage: (language) => {
        set((state) => {
          state.language = language
        })

        stateLog.debug('Language changed', { language })
        get().savePreferences()
      },

      setFontSize: (size) => {
        set((state) => {
          state.fontSize = size
        })

        stateLog.debug('Font size changed', { size })
        get().savePreferences()
      },

      setReducedMotion: (reduced) => {
        set((state) => {
          state.reducedMotion = reduced
          // Désactiver les animations si motion réduite
          if (reduced) {
            state.animationsEnabled = false
          }
        })

        stateLog.debug('Reduced motion changed', { reduced })
        get().savePreferences()
      },

      toggleTheme: () => {
        const currentTheme = get().theme
        const newTheme = currentTheme === 'light' ? 'dark' : 'light'
        get().setTheme(newTheme)
      },

      // ==================== NOTIFICATIONS & TOASTS ====================

      showToast: (toast) => {
        const id = generateId()
        const duration = toast.duration ?? AUTO_HIDE_DURATION[toast.type]

        const toastMessage: ToastMessage = {
          ...toast,
          id,
          createdAt: new Date()
        }

        set((state) => {
          state.toasts.set(id, toastMessage)
        })

        stateLog.debug('Toast shown', { id, type: toast.type, title: toast.title })

        // Auto-hide si pas persistant
        if (!toast.persistent && duration > 0) {
          setTimeout(() => {
            get().hideToast(id)
          }, duration)
        }

        return id
      },

      hideToast: (id) => {
        set((state) => {
          state.toasts.delete(id)
        })

        stateLog.debug('Toast hidden', { id })
      },

      clearToasts: () => {
        set((state) => {
          state.toasts.clear()
        })

        stateLog.debug('All toasts cleared')
      },

      requestNotificationPermission: async () => {
        if (!('Notification' in window)) {
          stateLog.warn('Notifications not supported')
          return false
        }

        try {
          const permission = await Notification.requestPermission()

          set((state) => {
            state.notificationPermission = permission
          })

          stateLog.debug('Notification permission', { permission })
          return permission === 'granted'

        } catch (error) {
          stateLog.error('Failed to request notification permission', { error })
          return false
        }
      },

      // ==================== MODALES ====================

      showModal: (modal) => {
        const id = generateId()

        const modalState: ModalState = {
          ...modal,
          id
        }

        set((state) => {
          state.modals.set(id, modalState)
          state.modalStack.push(id)
        })

        stateLog.debug('Modal shown', { id, type: modal.type })
        return id
      },

      hideModal: (id) => {
        set((state) => {
          const modal = state.modals.get(id)
          if (modal) {
            // Appeler onClose si défini
            if (modal.onClose) {
              try {
                modal.onClose()
              } catch (error) {
                stateLog.error('Modal onClose error', { id, error })
              }
            }

            state.modals.delete(id)
            state.modalStack = state.modalStack.filter((modalId: string) => modalId !== id)
          }
        })

        stateLog.debug('Modal hidden', { id })
      },

      hideTopModal: () => {
        const { modalStack } = get()
        if (modalStack.length > 0) {
          const topModalId = modalStack[modalStack.length - 1]!
          get().hideModal(topModalId)
        }
      },

      clearModals: () => {
        const { modals } = get()

        // Appeler onClose pour toutes les modales
        modals.forEach((modal) => {
          if (modal.onClose) {
            try {
              modal.onClose()
            } catch (error) {
              stateLog.error('Modal onClose error during cleanup', { id: modal.id, error })
            }
          }
        })

        set((state) => {
          state.modals.clear()
          state.modalStack = []
        })

        stateLog.debug('All modals cleared')
      },

      // ==================== LOADING STATES ====================

      setGlobalLoading: (loading) => {
        set((state) => {
          state.globalLoading = loading
        })
      },

      showLoading: (loading) => {
        const id = generateId()

        const loadingState: LoadingState = {
          ...loading,
          id
        }

        set((state) => {
          state.loadingStates.set(id, loadingState)
        })

        stateLog.debug('Loading shown', { id, message: loading.message })
        return id
      },

      hideLoading: (id) => {
        set((state) => {
          state.loadingStates.delete(id)
        })

        stateLog.debug('Loading hidden', { id })
      },

      updateLoadingProgress: (id, progress) => {
        set((state) => {
          const loading = state.loadingStates.get(id)
          if (loading) {
            loading.progress = progress
          }
        })
      },

      // ==================== NAVIGATION ====================

      setCurrentRoute: (route) => {
        set((state) => {
          // Ajouter à l'historique si différent
          if (state.currentRoute !== route) {
            state.routeHistory.push(route)
            // Limiter l'historique
            if (state.routeHistory.length > 50) {
              state.routeHistory.shift()
            }
            state.canGoBack = state.routeHistory.length > 1
          }
          state.currentRoute = route
        })

        stateLog.debug('Route changed', { route })
      },

      goBack: () => {
        const { routeHistory } = get()
        if (routeHistory.length > 1) {
          set((state) => {
            state.routeHistory.pop() // Supprimer la route actuelle
            const previousRoute = state.routeHistory[state.routeHistory.length - 1]
            if (previousRoute) {
              state.currentRoute = previousRoute
              state.canGoBack = state.routeHistory.length > 1
            }
          })

          stateLog.debug('Navigated back')
          return true
        }
        return false
      },

      clearHistory: () => {
        set((state) => {
          state.routeHistory = [state.currentRoute]
          state.canGoBack = false
        })

        stateLog.debug('Navigation history cleared')
      },

      // ==================== ERREURS ====================

      reportError: (error, context) => {
        const id = generateId()

        const errorState = {
          id,
          error,
          context,
          timestamp: new Date(),
          acknowledged: false
        }

        set((state) => {
          state.errors.set(id, errorState)
        })

        stateLog.error('Error reported to UI store', { id, error: error.message, context })

        // Afficher un toast d'erreur
        get().showToast({
          type: 'error',
          title: 'Erreur',
          message: error.message,
          persistent: true,
          actions: [
            {
              label: 'Ignorer',
              action: () => get().acknowledgeError(id),
              style: 'secondary'
            }
          ]
        })

        return id
      },

      acknowledgeError: (id) => {
        set((state) => {
          const error = state.errors.get(id)
          if (error) {
            error.acknowledged = true
          }
        })

        stateLog.debug('Error acknowledged', { id })
      },

      clearErrors: () => {
        set((state) => {
          state.errors.clear()
        })

        stateLog.debug('All errors cleared')
      },

      // ==================== PERFORMANCE ====================

      setPerformanceMode: (mode) => {
        set((state) => {
          state.performanceMode = mode

          // Ajuster les autres paramètres selon le mode
          switch (mode) {
            case 'battery-saver':
              state.animationsEnabled = false
              state.autoRefreshEnabled = false
              break
            case 'high-performance':
              state.animationsEnabled = true
              state.autoRefreshEnabled = true
              break
            case 'normal':
            default:
              // Garder les paramètres actuels
              break
          }
        })

        stateLog.debug('Performance mode changed', { mode })
        get().savePreferences()
      },

      setAnimationsEnabled: (enabled) => {
        set((state) => {
          state.animationsEnabled = enabled && !state.reducedMotion
        })

        stateLog.debug('Animations enabled changed', { enabled })
        get().savePreferences()
      },

      setAutoRefreshEnabled: (enabled) => {
        set((state) => {
          state.autoRefreshEnabled = enabled
        })

        stateLog.debug('Auto refresh enabled changed', { enabled })
        get().savePreferences()
      },

      // ==================== DEBUG ====================

      toggleDebugPanel: () => {
        set((state) => {
          state.debugPanelOpen = !state.debugPanelOpen
        })

        const { debugPanelOpen } = get()
        stateLog.debug('Debug panel toggled', { open: debugPanelOpen })
      },

      addDebugLog: (log) => {
        set((state) => {
          state.debugLogs.push({
            ...log,
            timestamp: new Date()
          })

          // Limiter les logs debug
          if (state.debugLogs.length > 1000) {
            state.debugLogs.shift()
          }
        })
      },

      clearDebugLogs: () => {
        set((state) => {
          state.debugLogs = []
        })

        stateLog.debug('Debug logs cleared')
      },

      // ==================== PERSISTENCE ====================

      loadPreferences: async () => {
        const timer = logger.time('ui', 'Load preferences')

        try {
          const preferences = await storageManager.get<Partial<UIState>>(STORAGE_KEYS.PREFERENCES)

          if (preferences) {
            set((state) => {
              // Appliquer seulement les préférences pertinentes
              const {
                theme,
                language,
                fontSize,
                reducedMotion,
                performanceMode,
                animationsEnabled,
                autoRefreshEnabled
              } = preferences

              if (theme) state.theme = theme
              if (language) state.language = language
              if (fontSize) state.fontSize = fontSize
              if (typeof reducedMotion === 'boolean') state.reducedMotion = reducedMotion
              if (performanceMode) state.performanceMode = performanceMode
              if (typeof animationsEnabled === 'boolean') state.animationsEnabled = animationsEnabled
              if (typeof autoRefreshEnabled === 'boolean') state.autoRefreshEnabled = autoRefreshEnabled
            })

            timer.end({ success: true })
            stateLog.info('✅ UI preferences loaded')
          } else {
            timer.end({ success: true, noPreferences: true })
            stateLog.debug('No UI preferences found')
          }

        } catch (error) {
          timer.end({ error })
          stateLog.error('❌ Failed to load UI preferences', { error })
        }
      },

      savePreferences: async () => {
        try {
          const {
            theme,
            language,
            fontSize,
            reducedMotion,
            performanceMode,
            animationsEnabled,
            autoRefreshEnabled
          } = get()

          const preferences = {
            theme,
            language,
            fontSize,
            reducedMotion,
            performanceMode,
            animationsEnabled,
            autoRefreshEnabled
          }

          await storageManager.set(STORAGE_KEYS.PREFERENCES, preferences)

          stateLog.debug('UI preferences saved')

        } catch (error) {
          stateLog.error('Failed to save UI preferences', { error })
        }
      },

      cleanup: () => {
        stateLog.debug('🧹 UI store cleanup')

        // Fermer toutes les modales
        get().clearModals()

        // Masquer tous les toasts
        get().clearToasts()

        // Masquer tous les loading states
        set((state) => {
          state.loadingStates.clear()
          state.globalLoading = false
        })

        // Reset l'état
        set(() => ({ ...initialState }))
      }
    }))
  )
)

// ==================== SELECTORS ====================

export const uiSelectors = {
  toasts: (state: UIStore) => Array.from(state.toasts.values()),
  modals: (state: UIStore) => Array.from(state.modals.values()),
  topModal: (state: UIStore) => {
    const topId = state.modalStack[state.modalStack.length - 1]
    return topId ? state.modals.get(topId) : null
  },
  loadingStates: (state: UIStore) => Array.from(state.loadingStates.values()),
  unacknowledgedErrors: (state: UIStore) =>
    Array.from(state.errors.values()).filter(error => !error.acknowledged),
  recentDebugLogs: (limit: number = 100) => (state: UIStore) =>
    state.debugLogs.slice(-limit)
}

// ==================== HOOKS ====================

export const useToasts = () => useUIStore(uiSelectors.toasts)
export const useModals = () => useUIStore(uiSelectors.modals)
export const useTopModal = () => useUIStore(uiSelectors.topModal)
export const useGlobalLoading = () => useUIStore(state => state.globalLoading)
export const useTheme = () => useUIStore(state => state.theme)
export const useLanguage = () => useUIStore(state => state.language)

// Types exportés
export type { UIStore, UIState, UIActions, ToastMessage, ModalState, LoadingState }
