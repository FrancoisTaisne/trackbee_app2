/**
 * Auth Store - Gestion état authentification
 * Store Zustand pour l'état client de l'authentification
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { User, UserSession } from '@/core/types/domain'
import { stateLog } from '@/core/utils/logger'
import { storageManager } from '@/core/services/storage/StorageManager'
import { httpClient } from '@/core/services/api/HttpClient'

// ==================== TYPES ====================

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
}

interface AuthActions {
  // Actions de session
  login: (credentials: { email: string; password: string }) => Promise<boolean>
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
  roles: []
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

          // Appel API de connexion
          const response = await httpClient.post<{
            user: User
            session: UserSession
            token: string
            permissions: string[]
            roles: string[]
          }>('/api/auth/login', credentials)

          if (!response.success || !response.data) {
            throw new Error('Invalid login response')
          }

          const { user, session, token, permissions, roles } = response.data

          // Stocker les données de session
          await Promise.all([
            storageManager.set(STORAGE_KEYS.SESSION, session, { type: 'secure' }),
            storageManager.set(STORAGE_KEYS.TOKEN, token, { type: 'secure' }),
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
            state.roles = roles
            state.lastActivity = new Date()
            state.showLoginModal = false
            state.loginError = null
          })

          timer.end({ success: true })
          stateLog.info('✅ Login successful', {
            userId: user.id,
            email: user.email,
            roles: roles.length
          })

          return true

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Login failed'

          set((state) => {
            state.isLoading = false
            state.loginError = errorMsg
            state.isAuthenticated = false
          })

          timer.end({ error: errorMsg })
          stateLog.error('❌ Login failed', { error: errorMsg })

          return false
        }
      },

      logout: async () => {
        const timer = stateLog.time('Logout')

        try {
          stateLog.debug('🚪 Logout initiated')

          // Appel API de déconnexion (si connecté)
          if (get().isAuthenticated) {
            try {
              await httpClient.post('/api/auth/logout')
            } catch (error) {
              stateLog.warn('Logout API call failed', { error })
              // Continue avec la déconnexion locale
            }
          }

          // Nettoyer le storage
          await Promise.all([
            storageManager.remove(STORAGE_KEYS.SESSION, { type: 'secure' }),
            storageManager.remove(STORAGE_KEYS.TOKEN, { type: 'secure' }),
            storageManager.remove(STORAGE_KEYS.USER),
            storageManager.remove(STORAGE_KEYS.LAST_ACTIVITY)
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

          const response = await httpClient.post<{
            token: string
            refreshToken?: string
            expiresAt: number
          }>('/api/auth/refresh', {
            refreshToken: session.refreshToken
          })

          if (!response.success || !response.data) {
            throw new Error('Token refresh failed')
          }

          const { token, refreshToken, expiresAt } = response.data

          // Mettre à jour la session
          const updatedSession: UserSession = {
            ...session,
            refreshToken: refreshToken || session.refreshToken,
            expiresAt: new Date(expiresAt)
          }

          // Stocker les nouvelles données
          await Promise.all([
            storageManager.set(STORAGE_KEYS.SESSION, updatedSession, { type: 'secure' }),
            storageManager.set(STORAGE_KEYS.TOKEN, token, { type: 'secure' })
          ])

          // Configurer le nouveau token
          await httpClient.setAuthToken(token, updatedSession.refreshToken, expiresAt)

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
          storageManager.set(STORAGE_KEYS.SESSION, session, { type: 'secure' }).catch((error: any) => {
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

          // Charger les données persistées
          const [session, token, user, lastActivity] = await Promise.all([
            storageManager.get<UserSession>(STORAGE_KEYS.SESSION, { type: 'secure' }),
            storageManager.get<string>(STORAGE_KEYS.TOKEN, { type: 'secure' }),
            storageManager.get<User>(STORAGE_KEYS.USER),
            storageManager.get<string>(STORAGE_KEYS.LAST_ACTIVITY)
          ])

          if (session && token && user) {
            // Vérifier si la session est encore valide
            const isExpired = session.expiresAt ? Date.now() > session.expiresAt.getTime() : false

            if (!isExpired) {
              // Configurer le token HTTP
              await httpClient.setAuthToken(token, session.refreshToken, session.expiresAt.getTime())

              // Restaurer l'état
              set((state) => {
                state.isAuthenticated = true
                state.user = user
                state.session = session
                state.token = token
                state.lastActivity = lastActivity ? new Date(lastActivity) : null
                state.permissions = session.permissions || []
                state.roles = session.roles || []
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