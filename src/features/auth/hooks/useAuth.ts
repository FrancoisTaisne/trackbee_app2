/**
 * useAuth Hook - Hook principal pour l'authentification
 * Gestion complète de l'état d'authentification avec Zustand
 */

import React from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { storageManager } from '@/core/services/storage/StorageManager'
import { httpClient } from '@/core/services/api/HttpClient'
import { logger } from '@/core/utils/logger'
import { AuthService } from '@/core/services/api/services'
import type {
  User,
  AuthSession,
  AuthState,
  LoginCredentials,
  RegisterData,
  UseAuthReturn,
  AuthError,
  LoginResponse,
  RegisterResponse
} from '../types'

// ==================== LOGGER SETUP ====================

const authLog = {
  trace: (msg: string, data?: unknown) => logger.trace('auth', msg, data),
  debug: (msg: string, data?: unknown) => logger.debug('auth', msg, data),
  info: (msg: string, data?: unknown) => logger.info('auth', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('auth', msg, data),
  error: (msg: string, data?: unknown) => logger.error('auth', msg, data)
}

// ==================== AUTH STORE ====================

interface AuthStore extends AuthState {
  // Actions
  setUser: (user: User | null) => void
  setSession: (session: AuthSession | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  reset: () => void
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  session: null
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) => {
        authLog.debug('Setting user', { userId: user?.id, email: user?.email })
        set({
          user,
          isAuthenticated: !!user
        })
      },

      setSession: (session) => {
        authLog.debug('Setting session', {
          hasSession: !!session,
          expiresAt: session?.expiresAt
        })
        set({
          session,
          user: session?.user || null,
          isAuthenticated: !!session?.user
        })
      },

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => {
        authLog.warn('Auth error set', error)
        set({ error })
      },

      clearError: () => set({ error: null }),

      reset: () => {
        authLog.info('Resetting auth state')
        set(initialState)
      }
    }),
    {
      name: 'trackbee-auth',
      storage: createJSONStorage(() => ({
        getItem: async (name: string) => {
          try {
            const value = await storageManager.get(name)
            return value ? JSON.stringify(value) : null
          } catch (error) {
            authLog.error('Storage getItem failed', { name, error })
            return null
          }
        },
        setItem: async (name: string, value: string) => {
          try {
            await storageManager.set(name, JSON.parse(value))
          } catch (error) {
            authLog.error('Storage setItem failed', { name, error })
          }
        },
        removeItem: async (name: string) => {
          try {
            await storageManager.remove(name)
          } catch (error) {
            authLog.error('Storage removeItem failed', { name, error })
          }
        }
      })),
      partialize: (state) => ({
        session: state.session,
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

// ==================== AUTH API FUNCTIONS ====================

const authAPI = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    authLog.info('Login attempt', { email: credentials.email })
    const response = await AuthService.login(credentials)
    authLog.info('Login successful', { userId: response.user.id })
    return response
  },

  async register(data: RegisterData): Promise<RegisterResponse> {
    authLog.info('Register attempt', { email: data.email })
    const response = await AuthService.register(data)
    authLog.info('Register successful', { userId: response.user.id })
    return response
  },

  async logout(): Promise<void> {
    authLog.info('Logout request')
    await AuthService.logout()
  },

  async refreshToken(refreshToken: string): Promise<{ token: string; expiresAt: string }> {
    authLog.debug('Refreshing token')
    const response = await AuthService.refreshToken(refreshToken)
    authLog.debug('Token refreshed successfully')
    return response
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    authLog.info('Update profile', { fields: Object.keys(data) })
    const response = await AuthService.updateProfile(data)
    authLog.info('Profile updated successfully')
    return response
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    authLog.info('Change password request')
    await AuthService.changePassword(oldPassword, newPassword)
    authLog.info('Password changed successfully')
  }
}

// ==================== UTILITY FUNCTIONS ====================

const createAuthError = (error: unknown, fallbackMessage = 'Une erreur est survenue'): AuthError => {
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    return error as AuthError
  }

  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || fallbackMessage
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: fallbackMessage
  }
}

const isTokenExpired = (session: AuthSession | null): boolean => {
  if (!session) return true
  const expiresAt = new Date(session.expiresAt)
  const now = new Date()
  return now >= expiresAt
}

const shouldRefreshToken = (session: AuthSession | null): boolean => {
  if (!session) return false
  const expiresAt = new Date(session.expiresAt)
  const now = new Date()
  const thirtyMinutes = 30 * 60 * 1000
  return (expiresAt.getTime() - now.getTime()) < thirtyMinutes
}

// ==================== MAIN HOOK ====================

export const useAuth = (): UseAuthReturn => {
  const store = useAuthStore()

  const login = async (credentials: LoginCredentials): Promise<AuthSession> => {
    store.setLoading(true)
    store.clearError()

    try {
      const response = await authAPI.login(credentials)
      const session: AuthSession = {
        token: response.token,
        user: response.user,
        expiresAt: response.expiresAt,
        refreshToken: response.refreshToken
      }

      store.setSession(session)

      // Configure HTTP client with new token
      httpClient.setAuthToken(session.token)

      authLog.info('Login completed successfully')
      return session
    } catch (error) {
      const authError = createAuthError(error, 'Erreur de connexion')
      store.setError(authError.message)
      authLog.error('Login failed', authError)
      throw authError
    } finally {
      store.setLoading(false)
    }
  }

  const register = async (data: RegisterData): Promise<AuthSession> => {
    store.setLoading(true)
    store.clearError()

    try {
      const response = await authAPI.register(data)
      const session: AuthSession = {
        token: response.token,
        user: response.user,
        expiresAt: response.expiresAt,
        refreshToken: response.refreshToken
      }

      store.setSession(session)

      // Configure HTTP client with new token
      httpClient.setAuthToken(session.token)

      authLog.info('Registration completed successfully')
      return session
    } catch (error) {
      const authError = createAuthError(error, 'Erreur lors de la création du compte')
      store.setError(authError.message)
      authLog.error('Registration failed', authError)
      throw authError
    } finally {
      store.setLoading(false)
    }
  }

  const logout = async (): Promise<void> => {
    store.setLoading(true)

    try {
      await authAPI.logout()
    } catch (error) {
      authLog.warn('Logout API failed, continuing with local logout', error)
    }

    // Clear local state regardless of API response
    store.reset()
    httpClient.clearAuthToken()

    // Clear sensitive data from storage
    await storageManager.clear()

    authLog.info('Logout completed')
    store.setLoading(false)
  }

  const refreshToken = async (): Promise<string> => {
    const { session } = store
    if (!session?.refreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      const response = await authAPI.refreshToken(session.refreshToken)
      const updatedSession: AuthSession = {
        ...session,
        token: response.token,
        expiresAt: response.expiresAt
      }

      store.setSession(updatedSession)
      httpClient.setAuthToken(response.token)

      authLog.debug('Token refresh successful')
      return response.token
    } catch (error) {
      authLog.error('Token refresh failed', error)
      // Force logout on refresh failure
      await logout()
      throw error
    }
  }

  const updateProfile = async (data: Partial<User>): Promise<User> => {
    store.setLoading(true)
    store.clearError()

    try {
      const updatedUser = await authAPI.updateProfile(data)

      // Update user in session
      if (store.session) {
        const updatedSession: AuthSession = {
          ...store.session,
          user: updatedUser
        }
        store.setSession(updatedSession)
      }

      return updatedUser
    } catch (error) {
      const authError = createAuthError(error, 'Erreur lors de la mise à jour du profil')
      store.setError(authError.message)
      throw authError
    } finally {
      store.setLoading(false)
    }
  }

  const changePassword = async (oldPassword: string, newPassword: string): Promise<void> => {
    store.setLoading(true)
    store.clearError()

    try {
      await authAPI.changePassword(oldPassword, newPassword)
      authLog.info('Password change successful')
    } catch (error) {
      const authError = createAuthError(error, 'Erreur lors du changement de mot de passe')
      store.setError(authError.message)
      throw authError
    } finally {
      store.setLoading(false)
    }
  }

  const hasRole = (role: User['role']): boolean => {
    return store.user?.role === role
  }

  return {
    // State
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    session: store.session,

    // Actions
    login,
    register,
    logout,
    refreshToken,
    updateProfile,
    changePassword,

    // Utilities
    clearError: store.clearError,
    isTokenExpired: () => isTokenExpired(store.session),
    hasRole
  }
}

// ==================== AUTO REFRESH HOOK ====================

export const useAuthTokenRefresh = () => {
  const { session, refreshToken, logout } = useAuth()

  React.useEffect(() => {
    if (!session) return

    const checkAndRefreshToken = async () => {
      if (shouldRefreshToken(session)) {
        try {
          await refreshToken()
        } catch (error) {
          authLog.error('Auto refresh failed, logging out', error)
          await logout()
        }
      }
    }

    // Check immediately
    checkAndRefreshToken()

    // Set up interval to check every 5 minutes
    const interval = setInterval(checkAndRefreshToken, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [session, refreshToken, logout])
}

// ==================== INITIALIZATION HOOK ====================

export const useAuthInit = () => {
  const { session, logout } = useAuth()

  React.useEffect(() => {
    // Initialize HTTP client with stored token
    if (session?.token) {
      httpClient.setAuthToken(session.token)

      // Check if token is expired on app start
      if (isTokenExpired(session)) {
        authLog.warn('Stored token is expired, logging out')
        logout()
      }
    }
  }, [session, logout])
}