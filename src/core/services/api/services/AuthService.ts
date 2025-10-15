/**
 * Auth Service - Service d'authentification
 * Centralise toutes les requêtes d'authentification
 */

import { httpClient } from '../HttpClient'
import { API_ENDPOINTS } from '../endpoints'
import { HydrationService, type HydrationData } from '@/core/services/hydration/HydrationService'
import { openApiDiscovery } from '../OpenApiDiscovery'
import { apiLog } from '@/core/utils/logger'
import type {
  User,
  LoginCredentials,
  RegisterData,
  LoginResponse
} from '@/features/auth/types'

// ==================== TYPES ====================

// LoginResponse is imported from @/features/auth/types

interface BackendLoginResponse {
  token?: string
  refreshToken?: string
  expiresAt?: string
  id?: number
  email?: string
  firstName?: string
  lastName?: string
  name?: string
  roles?: string[]
  createdAt?: string
  updatedAt?: string
  user?: Partial<User> & {
    id?: number
    email?: string
    roles?: string[]
    createdAt?: string
    updatedAt?: string
  }
}

export interface RegisterResponse {
  success: boolean
  token: string
  user: User
  expiresAt: string
  refreshToken?: string
  message?: string
}

export interface RefreshResponse {
  success: boolean
  token: string
  expiresAt: string
}

export interface MachineLoginCredentials {
  machineId: string
  apiKey: string
}

export interface MachineLoginResponse {
  success: boolean
  token: string
  machine: {
    id: number
    name: string
    macAddress: string
  }
  expiresAt: string
}

export type UserHydrationData = HydrationData

// ==================== AUTH SERVICE ====================

export class AuthService {
  // Stockage temporaire des données de login pour l'hydratation
  private static lastLoginData: LoginResponse | null = null
  private static discoveredLoginEndpoint: string | null = null

  /**
   * Découvrir le endpoint de login depuis OpenAPI
   */
  private static async discoverLoginEndpoint(): Promise<string> {
    // Si déjà découvert, retourner le cache
    if (this.discoveredLoginEndpoint) {
      return this.discoveredLoginEndpoint
    }

    try {
      apiLog.debug('🔍 Discovering login endpoint from OpenAPI...')

      // Récupérer tous les endpoints avec le tag "Authentication"
      const authEndpoints = await openApiDiscovery.getEndpoints({
        tag: 'Authentication',
        method: 'POST'
      })

      // Chercher l'endpoint de signin/login
      const loginEndpoint = authEndpoints.find(ep =>
        ep.path.includes('signin') ||
        ep.path.includes('login') ||
        (ep.summary && (ep.summary.toLowerCase().includes('connexion') || ep.summary.toLowerCase().includes('login')))
      )

      if (loginEndpoint) {
        this.discoveredLoginEndpoint = loginEndpoint.path
        apiLog.info('✅ Login endpoint discovered', { endpoint: loginEndpoint.path })
        return loginEndpoint.path
      }

      // Fallback sur l'endpoint par défaut
      apiLog.warn('⚠️ No login endpoint found in OpenAPI, using default')
      return API_ENDPOINTS.auth.login

    } catch (error) {
      apiLog.warn('⚠️ Failed to discover login endpoint, using default', { error })
      return API_ENDPOINTS.auth.login
    }
  }

  /**
   * Connexion utilisateur - Production version with auto-discovery
   */
  static async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // 🔍 DEBUG: Afficher les credentials (masquer le mot de passe)
    const passwordPreview = credentials.password
      ? `${credentials.password.slice(0, 2)}${'*'.repeat(credentials.password.length - 2)}`
      : 'undefined'

    apiLog.info('🔐 AuthService.login attempt', {
      email: credentials.email,
      password_preview: passwordPreview,
      password_length: credentials.password?.length || 0,
      timestamp: new Date().toISOString()
    })

    // Activer les cookies pour les sessions basées cookies
    // httpClient.setWithCredentials(true) // ⚠️ TEMPORAIREMENT DÉSACTIVÉ pour debug

    try {
      // Découvrir le bon endpoint depuis OpenAPI
      const loginEndpoint = await this.discoverLoginEndpoint()

      const payload = {
        email: credentials.email,
        password: credentials.password
      }

      apiLog.debug('📡 Sending login request', {
        endpoint: loginEndpoint,
        payload: {
          email: credentials.email,
          password: passwordPreview
        }
      })

      const response = await httpClient.post<BackendLoginResponse>(
        loginEndpoint,
        payload,
        { skipAuth: true }
      )

      if (!response?.data) {
        throw new Error('No data in login response')
      }

      apiLog.info('AuthService.login success', {
        userId: response.data?.user?.id ?? response.data?.id,
        hasToken: !!response.data?.token
      })

      const backendData = response.data
      const rawUser = backendData.user ?? backendData
      const roles = Array.isArray(rawUser?.roles) ? (rawUser.roles as string[]) : []

      const user: User = {
        id: rawUser?.id ?? 0,
        email: rawUser?.email ?? credentials.email,
        firstName: rawUser?.firstName,
        lastName: rawUser?.lastName,
        name: rawUser?.name ?? `${rawUser?.firstName || ''} ${rawUser?.lastName || ''}`.trim(),
        role: this.mapBackendRoleToFrontend(roles),
        createdAt: rawUser?.createdAt ?? new Date().toISOString(),
        updatedAt: rawUser?.updatedAt ?? new Date().toISOString()
      }

      const token = backendData.token ?? ''
      const refreshToken = backendData.refreshToken
      const expiresAt = backendData.expiresAt ?? this.calculateTokenExpiry(token)

      const loginResponse: LoginResponse = {
        success: true,
        token,
        user,
        expiresAt,
        refreshToken
      }

      this.lastLoginData = loginResponse

      return loginResponse

    } catch (error) {
      apiLog.error('AuthService.login failed', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      throw error
    }
  }

  /**
   * Récupère les données de login pour l'hydratation
   */
  static getLastLoginData(): LoginResponse | null {
    return this.lastLoginData
  }

  /**
   * Map backend roles array to frontend role string
   */
  private static mapBackendRoleToFrontend(roles: string[]): User['role'] {
    if (!roles || !Array.isArray(roles)) return 'user'

    // Check roles in order of precedence
    if (roles.includes('ROLE_ADMIN')) return 'admin'
    if (roles.includes('ROLE_MODERATOR')) return 'user'
    if (roles.includes('ROLE_VIEWER')) return 'viewer'
    return 'user'
  }

  /**
   * Calculate token expiry if not provided
   */
  private static calculateTokenExpiry(token: string): string {
    try {
      // Try to decode JWT payload to get exp claim
      if (token && token.includes('.')) {
        const payload = JSON.parse(atob(token.split('.')[1]!))
        if (payload.exp) {
          return new Date(payload.exp * 1000).toISOString()
        }
      }
    } catch {
      // If can't decode, default to 24 hours
    }

    // Default to 24 hours from now
    const expiryDate = new Date()
    expiryDate.setHours(expiryDate.getHours() + 24)
    return expiryDate.toISOString()
  }

  /**
   * Inscription utilisateur
   */
  static async register(data: RegisterData): Promise<RegisterResponse> {
    const response = await httpClient.post<RegisterResponse>(
      API_ENDPOINTS.auth.register,
      data
    )

    if (!response.data) {
      throw new Error('No data in register response')
    }

    return response.data
  }

  /**
   * Déconnexion utilisateur
   */
  static async logout(): Promise<void> {
    try {
      await httpClient.post(API_ENDPOINTS.auth.logout)
    } catch (error) {
      // Continue même si l'API échoue
      apiLog.warn('Logout API call failed', { error })
    }
  }

  /**
   * Connexion machine - Production version
   */
  static async machineLogin(credentials: MachineLoginCredentials): Promise<MachineLoginResponse> {
    const response = await httpClient.post<MachineLoginResponse>(
      API_ENDPOINTS.auth.machineLogin,
      credentials
    )

    if (!response.data) {
      throw new Error('No data in machine login response')
    }

    return response.data
  }

  /**
   * Rafraîchir le token
   */
  static async refreshToken(refreshToken: string): Promise<RefreshResponse> {
    const response = await httpClient.post<RefreshResponse>(
      '/api/auth/refresh', // Pas dans les routes analysées, mais utilisé dans le frontend
      { refreshToken }
    )

    if (!response.data) {
      throw new Error('No data in refresh token response')
    }

    return response.data
  }

  /**
   * Hydratation des données utilisateur depuis le backend
   * Utilise l'endpoint /api/me/hydrate pour récupérer toutes les données
   */
  static async hydrate(): Promise<UserHydrationData> {
    try {
      return await HydrationService.fetch()
    } catch (error) {
      apiLog.error('❌ Hydratation failed', { error })
      throw new Error(`Hydration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Extrait les données d'hydratation depuis la réponse de login du backend
   * Version améliorée avec déduplication et mapping correct
   */
  static extractHydrationData(backendLoginData: LoginResponse): UserHydrationData {
    return HydrationService.parse(backendLoginData)
  }

  /**
   * Vérification email (après inscription)
   */
  static async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    const response = await httpClient.get<{ success: boolean; message: string }>(
      `${API_ENDPOINTS.auth.verifyEmail}?token=${token}`
    )

    if (!response.data) {
      throw new Error('No data in email verification response')
    }

    return response.data
  }

  /**
   * Définir mot de passe (après vérification email)
   */
  static async setPassword(data: {
    token: string
    password: string
  }): Promise<{ success: boolean; message: string }> {
    const response = await httpClient.post<{ success: boolean; message: string }>(
      API_ENDPOINTS.auth.setPassword,
      data
    )

    if (!response.data) {
      throw new Error('No data in set password response')
    }

    return response.data
  }

  /**
   * Mettre à jour le profil utilisateur
   */
  static async updateProfile(data: Partial<User>): Promise<User> {
    const response = await httpClient.put<User>('/api/auth/profile', data)

    if (!response.data) {
      throw new Error('No data in update profile response')
    }

    return response.data
  }

  /**
   * Changer le mot de passe
   */
  static async changePassword(
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    await httpClient.put('/api/auth/change-password', {
      oldPassword,
      newPassword
    })
  }
}

// ==================== EXPORT ====================

export default AuthService


