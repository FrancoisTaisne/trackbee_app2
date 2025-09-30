/**
 * Auth Store - Gestion état authentification
 * Store Zustand pour l'état client de l'authentification
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { User } from '@/features/auth/types'
import { stateLog } from '@/core/utils/logger'
import { storageManager } from '@/core/services/storage/StorageManager'
import { httpClient } from '@/core/services/api/HttpClient'
import { AuthService, type UserHydrationData } from '@/core/services/api/services/AuthService'
import { HydrationService } from '@/core/services/hydration/HydrationService'
import { database } from '@/core/database/schema'
import { authStorageFix } from './auth.store.fix'

// ==================== TYPES ====================

interface UserSession {
  refreshToken: string
  expiresAt: Date
  permissions: string[]
  roles: string[]
}

interface AuthState {
  // État de session
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean

  // Données utilisateur
  user: User | null
  session: UserSession | null
  token: string | null

  // État UI
  showLoginModal: boolean
  loginError: string | null
  lastActivity: Date | null

  // Permissions et rôles
  permissions: string[]
  roles: string[]

  // Hydratation tracking
  isHydrated: boolean
  lastHydration: Date | null
  hydrationError: string | null
  hydratedData: UserHydrationData | null
}

interface AuthActions {
  // Actions de session
  login: (credentials: { email: string; password: string }) => Promise<UserSession>
  register: (data: any) => Promise<UserSession>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>

  // Gestion utilisateur
  updateUser: (updates: Partial<User>) => void
  updateSession: (updates: Partial<UserSession>) => void

  // UI Actions
  setLoginModal: (show: boolean) => void
  clearError: () => void
  trackActivity: () => void

  // Initialisation
  initialize: () => Promise<void>
  cleanup: () => void

  // Hydratation des données
  hydrateUserData: () => Promise<void>
  hydrateUserDataWithData: (data: UserHydrationData) => Promise<void>
  refreshUserData: () => Promise<void>

  // Validation session
  validateSession: () => boolean
  isSessionExpired: () => boolean
}

type AuthStore = AuthState & AuthActions

// ==================== INITIAL STATE ====================

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  user: null,
  session: null,
  token: null,

  showLoginModal: false,
  loginError: null,
  lastActivity: null,

  permissions: [],
  roles: [],

  isHydrated: false,
  lastHydration: null,
  hydrationError: null,
  hydratedData: null
}

// ==================== STORAGE KEYS ====================

const STORAGE_KEYS = {
  SESSION: 'user_session',
  TOKEN: 'auth_token',
  USER: 'user_data',
  LAST_ACTIVITY: 'last_activity'
} as const

// ==================== STORE ====================

export const useAuthStore = create<AuthStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialState,

      // ==================== SESSION ACTIONS ====================

      login: async (credentials) => {
        const timer = stateLog.time('Login attempt')

        set((state) => {
          state.isLoading = true
          state.loginError = null
        })

        try {
          stateLog.debug('🔐 Login attempt', { email: credentials.email })

          // Use the corrected AuthService which handles the data transformation
          const loginResponse = await AuthService.login(credentials)

          const { user, token, expiresAt, refreshToken } = loginResponse

          // Map user role to permissions (basic implementation)
          const userRole = user.role || 'user'
          const permissions = (userRole === 'admin') ? ['read', 'write', 'delete'] : ['read']

          // Create session object from login response
          const session: UserSession = {
            refreshToken: refreshToken || '',
            expiresAt: new Date(expiresAt),
            permissions,
            roles: [userRole] // Convert single role to array for compatibility
          }

          // Stocker les données de session (avec fallback pour le web)
          await Promise.all([
            storageManager.setWithFallback(STORAGE_KEYS.SESSION, session),
            storageManager.setWithFallback(STORAGE_KEYS.TOKEN, token),
            storageManager.set(STORAGE_KEYS.USER, user),
            storageManager.set(STORAGE_KEYS.LAST_ACTIVITY, new Date().toISOString())
          ])

          // Configurer le token HTTP
          await httpClient.setAuthToken(token, session.refreshToken, session.expiresAt.getTime())

          // Mettre à jour l'état
          set((state) => {
            state.isAuthenticated = true
            state.isLoading = false
            state.user = user
            state.session = session
            state.token = token
            state.permissions = permissions
            state.roles = [userRole]
            state.lastActivity = new Date()
            state.showLoginModal = false
            state.loginError = null
          })

          timer.end({ success: true })
          stateLog.info('✅ Login successful', {
            userId: user.id,
            email: user.email,
            roles: [userRole]
          })

          // 🎯 HYDRATATION IMMÉDIATE - utiliser le payload du login
          try {
            const rawLoginData = AuthService.getLastLoginData()
            if (rawLoginData) {
              stateLog.debug('🌊 Starting immediate hydration with login data...')
              const hydrationData = HydrationService.parse(rawLoginData)
              await HydrationService.syncToDexie(hydrationData)

              set((state) => {
                state.isHydrated = true
                state.lastHydration = new Date()
                state.hydrationError = null
                state.hydratedData = hydrationData
              })

              stateLog.info('✅ User data hydrated and cached locally', {
                machines: hydrationData.machines.length,
                sites: hydrationData.sites.length,
                installations: hydrationData.installations.length,
                campaigns: hydrationData.campaigns.length,
                calculations: hydrationData.calculations.length
              })
            } else {
              stateLog.warn('⚠️ No login data available for hydration')
            }
          } catch (hydrationError) {
            stateLog.warn('⚠️ Hydration failed, but login successful', { hydrationError })
            set((state) => {
              state.isHydrated = false
              state.hydrationError = hydrationError instanceof Error ? hydrationError.message : 'Unknown hydration error'
              state.hydratedData = null
            })
          }

          return session

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Login failed'

          set((state) => {
            state.isLoading = false
            state.loginError = errorMsg
            state.isAuthenticated = false
          })

          timer.end({ error: errorMsg })
          stateLog.error('❌ Login failed', { error: errorMsg })

          throw new Error(errorMsg)
        }
      },

      register: async (data) => {
        const timer = stateLog.time('Register attempt')

        set((state) => {
          state.isLoading = true
          state.loginError = null
        })

        try {
          stateLog.debug('📝 Register attempt', { email: data.email })

          // Use AuthService for registration
          const registerResponse = await AuthService.register(data)

          const { user, token, expiresAt, refreshToken } = registerResponse

          // Map user role to permissions
          const userRole = user.role || 'user'
          const permissions = (userRole === 'admin') ? ['read', 'write', 'delete'] : ['read']

          // Create session object from register response
          const session: UserSession = {
            refreshToken: refreshToken || '',
            expiresAt: new Date(expiresAt),
            permissions,
            roles: [userRole]
          }

          // Store session data (with fallback for web)
          await Promise.all([
            storageManager.setWithFallback(STORAGE_KEYS.SESSION, session),
            storageManager.setWithFallback(STORAGE_KEYS.TOKEN, token),
            storageManager.set(STORAGE_KEYS.USER, user),
            storageManager.set(STORAGE_KEYS.LAST_ACTIVITY, new Date().toISOString())
          ])

          // Configure HTTP token
          await httpClient.setAuthToken(token, session.refreshToken, session.expiresAt.getTime())

          // Update state
          set((state) => {
            state.isAuthenticated = true
            state.isLoading = false
            state.user = user
            state.session = session
            state.token = token
            state.permissions = permissions
            state.roles = [userRole]
            state.lastActivity = new Date()
            state.showLoginModal = false
            state.loginError = null
          })

          timer.end({ success: true })
          stateLog.info('✅ Register successful', {
            userId: user.id,
            email: user.email,
            roles: [userRole]
          })

          return session

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Register failed'

          set((state) => {
            state.isLoading = false
            state.loginError = errorMsg
            state.isAuthenticated = false
          })

          timer.end({ error: errorMsg })
          stateLog.error('❌ Register failed', { error: errorMsg })

          throw new Error(errorMsg)
        }
      },

      logout: async () => {
        const timer = stateLog.time('Logout')

        try {
          stateLog.debug('🚪 Logout initiated')

          // Appel API de déconnexion (si connecté)
          if (get().isAuthenticated) {
            try {
              await AuthService.logout()
            } catch (error) {
              stateLog.warn('Logout API call failed', { error })
              // Continue avec la déconnexion locale
            }
          }

          // Nettoyer le storage (multi-backend pour robustesse)
          const safeRemove = async (key: string) => {
            // Tenter sur plusieurs backends sans échouer globalement
            for (const type of ['secure', 'preferences', 'local'] as const) {
              try {
                // @ts-expect-error: type is narrowed above
                await storageManager.remove(key, { type })
              } catch {}
            }
          }

          await Promise.all([
            safeRemove(STORAGE_KEYS.SESSION),
            safeRemove(STORAGE_KEYS.TOKEN),
            safeRemove(STORAGE_KEYS.USER),
            safeRemove(STORAGE_KEYS.LAST_ACTIVITY)
          ])

          // Nettoyer le client HTTP
          await httpClient.clearAuth()

          // Reset de l'état
          set(() => ({ ...initialState, isInitialized: true }))

          timer.end({ success: true })
          stateLog.info('✅ Logout completed')

        } catch (error) {
          timer.end({ error })
          stateLog.error('❌ Logout error', { error })

          // Force reset même en cas d'erreur
          set(() => ({ ...initialState, isInitialized: true }))
        }
      },

      refreshToken: async () => {
        const timer = stateLog.time('Token refresh')

        try {
          const session = get().session
          if (!session?.refreshToken) {
            throw new Error('No refresh token available')
          }

          stateLog.debug('🔄 Token refresh attempt')

          const response = await AuthService.refreshToken(session.refreshToken)

          const { token, expiresAt } = response
          const newRefreshToken = session.refreshToken // Keep existing refresh token

          // Mettre à jour la session
          const updatedSession: UserSession = {
            ...session,
            refreshToken: newRefreshToken,
            expiresAt: new Date(expiresAt)
          }

          // Stocker les nouvelles données (avec fallback web)
          await Promise.all([
            storageManager.setWithFallback(STORAGE_KEYS.SESSION, updatedSession),
            storageManager.setWithFallback(STORAGE_KEYS.TOKEN, token)
          ])

          // Configurer le nouveau token
          await httpClient.setAuthToken(token, updatedSession.refreshToken, updatedSession.expiresAt.getTime())

          // Mettre à jour l'état
          set((state) => {
            state.token = token
            state.session = updatedSession
          })

          timer.end({ success: true })
          stateLog.info('✅ Token refreshed successfully')

          return true

        } catch (error) {
          timer.end({ error })
          stateLog.error('❌ Token refresh failed', { error })

          // Déconnecter l'utilisateur si le refresh échoue
          await get().logout()
          return false
        }
      },

      // ==================== USER ACTIONS ====================

      updateUser: (updates) => {
        set((state) => {
          if (state.user) {
            Object.assign(state.user, updates)
          }
        })

        stateLog.debug('User updated', { updates })

        // Persister les changements
        const user = get().user
        if (user) {
          storageManager.set(STORAGE_KEYS.USER, user).catch(error => {
            stateLog.error('Failed to persist user update', { error })
          })
        }
      },

      updateSession: (updates) => {
        set((state) => {
          if (state.session) {
            Object.assign(state.session, updates)
          }
        })

        stateLog.debug('Session updated', { updates })

        // Persister les changements
        const session = get().session
        if (session) {
          storageManager.setWithFallback(STORAGE_KEYS.SESSION, session).catch((error: any) => {
            stateLog.error('Failed to persist session update', { error })
          })
        }
      },

      // ==================== UI ACTIONS ====================

      setLoginModal: (show) => {
        set((state) => {
          state.showLoginModal = show
          if (!show) {
            state.loginError = null
          }
        })
      },

      clearError: () => {
        set((state) => {
          state.loginError = null
        })
      },

      trackActivity: () => {
        const now = new Date()

        set((state) => {
          state.lastActivity = now
        })

        // Persister asynchrone
        storageManager.set(STORAGE_KEYS.LAST_ACTIVITY, now.toISOString()).catch(error => {
          stateLog.warn('Failed to persist activity', { error })
        })
      },

      // ==================== INITIALIZATION ====================

      initialize: async () => {
        const timer = stateLog.time('Store initialization')

        set((state) => {
          state.isLoading = true
        })

        try {
          stateLog.debug('🔧 Initializing auth store')

          // 🔧 VALIDATION ET CORRECTION DE L'ÉTAT D'AUTHENTIFICATION
          const validationResult = await authStorageFix.validateAndSyncAuthState()

          if (!validationResult.isValid) {
            stateLog.warn('⚠️ Auth state issues detected:', validationResult)

            if (validationResult.fixed) {
              stateLog.info('✅ Auth state automatically fixed')
            } else if (validationResult.issues.some(issue => issue.includes('corrompu') || issue.includes('expiré'))) {
              stateLog.warn('🧹 Clearing corrupted auth state')
              await authStorageFix.clearAllAuthStorage()

              set(() => ({
                ...initialState,
                isInitialized: true
              }))

              timer.end({ success: true, cleaned: true })
              return
            }
          }

          // Charger les données persistées (avec fallback)
          const [sessionRes, tokenRes, user, lastActivity] = await Promise.all([
            storageManager.getWithFallback<UserSession>(STORAGE_KEYS.SESSION),
            storageManager.getWithFallback<string>(STORAGE_KEYS.TOKEN),
            storageManager.get<User>(STORAGE_KEYS.USER),
            storageManager.get<string>(STORAGE_KEYS.LAST_ACTIVITY)
          ])

          const session = sessionRes?.value || null
          const token = tokenRes?.value || null

          if (session && token && user) {
            // Restaurer les dates depuis les chaînes JSON
            const restoredSession: UserSession = {
              ...session,
              expiresAt: new Date(session.expiresAt)
            }

            // Vérifier si la session est encore valide
            const isExpired = restoredSession.expiresAt ? Date.now() > restoredSession.expiresAt.getTime() : false

            if (!isExpired) {
              // Configurer le token HTTP
              await httpClient.setAuthToken(token, restoredSession.refreshToken, restoredSession.expiresAt.getTime())

              // Restaurer l'état
              set((state) => {
                state.isAuthenticated = true
                state.user = user
                state.session = restoredSession
                state.token = token
                state.lastActivity = lastActivity ? new Date(lastActivity) : null
                state.permissions = restoredSession.permissions || []
                state.roles = restoredSession.roles || []
              })

              stateLog.info('✅ Session restored', { userId: user.id })
            } else {
              stateLog.warn('⚠️ Session expired during initialization')
              await get().logout()
            }
          } else {
            stateLog.debug('No stored session found')
          }

          timer.end({ success: true })

        } catch (error) {
          timer.end({ error })
          stateLog.error('❌ Auth store initialization failed', { error })
        } finally {
          set((state) => {
            state.isLoading = false
            state.isInitialized = true
          })
        }
      },

      cleanup: () => {
        stateLog.debug('🧹 Auth store cleanup')
        set(() => initialState)
      },

      // ==================== DATA HYDRATION ====================

      hydrateUserData: async () => {
        const timer = stateLog.time('User data hydration')

        try {
          const { isAuthenticated } = get()
          if (!isAuthenticated) {
            throw new Error('Cannot hydrate data: user not authenticated')
          }

          stateLog.debug('🌊 Starting data hydration...')

          const hydrationData = await HydrationService.fetch()
          await HydrationService.syncToDexie(hydrationData as UserHydrationData)
          await database.saveAppState('lastDataSync', new Date())

          // Mémoriser en store (mémoire) l'hydratation
          set((state) => {
            state.isHydrated = true
            state.lastHydration = new Date()
            state.hydrationError = null
            state.hydratedData = hydrationData
          })

          timer.end({ success: true })
          stateLog.info('✅ User data hydration completed', {
            machines: hydrationData.machines.length,
            sites: hydrationData.sites.length,
            installations: hydrationData.installations.length,
            campaigns: hydrationData.campaigns.length,
            calculations: hydrationData.calculations.length
          })

        } catch (error) {
          timer.end({ error })
          stateLog.error('❌ User data hydration failed', { error })
          set((state) => {
            state.isHydrated = false
            state.hydrationError = error instanceof Error ? error.message : 'Hydration failed'
            state.hydratedData = null
          })
          throw error
        }
      },

      hydrateUserDataWithData: async (hydrationData: UserHydrationData) => {
        const timer = stateLog.time('User data hydration with data')

        try {
          stateLog.debug('🌊 Starting data hydration with provided data...', {
            machines: hydrationData.machines?.length || 0,
            sites: hydrationData.sites?.length || 0,
            installations: hydrationData.installations?.length || 0
          })

          await HydrationService.syncToDexie(hydrationData)
          await database.saveAppState('lastDataSync', new Date())

          // Mémoriser en store (mémoire) l'hydratation
          set((state) => {
            state.isHydrated = true
            state.lastHydration = new Date()
            state.hydrationError = null
            state.hydratedData = hydrationData
          })

          timer.end({ success: true })
          stateLog.info('✅ User data hydration with data completed', {
            machines: hydrationData.machines?.length || 0,
            sites: hydrationData.sites?.length || 0,
            installations: hydrationData.installations?.length || 0
          })

        } catch (error) {
          timer.end({ error })
          stateLog.error('❌ User data hydration with data failed', { error })
          set((state) => {
            state.isHydrated = false
            state.hydrationError = error instanceof Error ? error.message : 'Hydration failed'
            state.hydratedData = null
          })
          throw error
        }
      },

      refreshUserData: async () => {
        try {
          const lastSync = await database.getAppState<Date>('lastDataSync')
          const now = new Date()

          // Refresh toutes les 5 minutes
          if (!lastSync || (now.getTime() - lastSync.getTime()) > 5 * 60 * 1000) {
            stateLog.debug('🔄 Refreshing user data (5min threshold reached)')
            await get().hydrateUserData()
          } else {
            stateLog.debug('⏭️ Skipping refresh - data still fresh')
          }
        } catch (error) {
          stateLog.error('❌ User data refresh failed', { error })
          // Ne pas faire échouer, c'est juste un refresh
        }
      },

      // ==================== VALIDATION ====================

      validateSession: () => {
        const { session, isAuthenticated } = get()

        if (!isAuthenticated || !session) {
          return false
        }

        const isExpired = get().isSessionExpired()
        if (isExpired) {
          stateLog.warn('Session validation failed - expired')
          get().logout()
          return false
        }

        return true
      },

      isSessionExpired: () => {
        const { session } = get()
        if (!session?.expiresAt) return false

        return Date.now() > session.expiresAt.getTime()
      }
    }))
  )
)

// ==================== SELECTORS ====================

export const authSelectors = {
  isAuthenticated: (state: AuthStore) => state.isAuthenticated,
  user: (state: AuthStore) => state.user,
  session: (state: AuthStore) => state.session,
  isLoading: (state: AuthStore) => state.isLoading,
  isInitialized: (state: AuthStore) => state.isInitialized,
  hasRole: (role: string) => (state: AuthStore) => state.roles.includes(role),
  hasPermission: (permission: string) => (state: AuthStore) => state.permissions.includes(permission),
  canAccess: (requiredRoles: string[]) => (state: AuthStore) =>
    requiredRoles.some(role => state.roles.includes(role))
}

// ==================== HOOKS ====================

export const useAuth = () => useAuthStore()
export const useUser = () => useAuthStore(authSelectors.user)
export const useIsAuthenticated = () => useAuthStore(authSelectors.isAuthenticated)
export const useAuthLoading = () => useAuthStore(authSelectors.isLoading)

// Types exportés
export type { AuthStore, AuthState, AuthActions }
