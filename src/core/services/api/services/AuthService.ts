/**
 * Auth Service - Service d'authentification
 * Centralise toutes les requêtes d'authentification
 */

import { httpClient } from '../HttpClient'
import { API_ENDPOINTS } from '../endpoints'
import { appConfig } from '@/core/utils/env'
import type {
  User,
  LoginCredentials,
  RegisterData,
  LoginResponse
} from '@/features/auth/types'

// ==================== TYPES ====================

// LoginResponse is imported from @/features/auth/types

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

export interface UserHydrationData {
  machines: any[]
  sites: any[]
  installations: any[]
}

// ==================== AUTH SERVICE ====================

export class AuthService {
  // Stockage temporaire des données de login pour l'hydratation
  private static lastLoginData: any = null

  /**
   * Connexion utilisateur
   */
  static async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const endpoint = API_ENDPOINTS.auth.login('/api/auth/signin')
    const response = await httpClient.post<any>(endpoint, credentials)

    if (!response.data) {
      throw new Error('No data in login response')
    }

    // Stocker les données brutes pour l'hydratation
    this.lastLoginData = response.data

    // Transform backend response to frontend expected format
    const backendData = response.data

    // Backend returns user data directly with roles array, transform to expected format
    const user: User = {
      id: backendData.id,
      email: backendData.email,
      firstName: backendData.firstName || undefined,
      lastName: backendData.lastName || undefined,
      name: backendData.name || `${backendData.firstName || ''} ${backendData.lastName || ''}`.trim() || undefined,
      role: this.mapBackendRoleToFrontend(backendData.roles),
      createdAt: backendData.createdAt || new Date().toISOString(),
      updatedAt: backendData.updatedAt || new Date().toISOString()
    }

    // Create expected LoginResponse format
    const loginResponse: LoginResponse = {
      success: true,
      token: backendData.token,
      user,
      expiresAt: backendData.expiresAt || this.calculateTokenExpiry(backendData.token),
      refreshToken: backendData.refreshToken
    }

    return loginResponse
  }

  /**
   * Récupère les données de login pour l'hydratation
   */
  static getLastLoginData(): any {
    return this.lastLoginData
  }

  /**
   * Map backend roles array to frontend role string
   */
  private static mapBackendRoleToFrontend(roles: string[]): User['role'] {
    if (!roles || !Array.isArray(roles)) return 'user'

    // Check roles in order of precedence
    if (roles.includes('ROLE_ADMIN')) return 'admin'
    if (roles.includes('ROLE_MODERATOR')) return 'admin' // Map moderator to admin for now
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
    } catch (error) {
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
      console.warn('Logout API call failed:', error)
    }
  }

  /**
   * Connexion machine
   */
  static async machineLogin(credentials: MachineLoginCredentials): Promise<MachineLoginResponse> {
    const endpoint = API_ENDPOINTS.auth.machineLogin(
      '/api/auth/machine-signin'
    )

    const response = await httpClient.post<MachineLoginResponse>(endpoint, credentials)

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
   * Hydratation des données utilisateur depuis la réponse de login
   * Le backend retourne déjà toutes les données nécessaires lors du login
   */
  static async hydrate(): Promise<UserHydrationData> {
    // Note: Cette méthode sera appelée après login avec les données déjà disponibles
    // Pour l'instant, on utilise une approche de re-login pour récupérer les données
    throw new Error('Hydrate should be called with login data, not as separate API call')
  }

  /**
   * Extrait les données d'hydratation depuis la réponse de login du backend
   * Version améliorée avec déduplication et mapping correct
   */
  static extractHydrationData(backendLoginData: any): UserHydrationData {
    console.log('🔄 Extracting hydration data...', {
      machinesCount: backendLoginData.machines?.length || 0,
      sitesOwned: backendLoginData.sites?.owned?.length || 0,
      sitesSharedViewer: backendLoginData.sites?.shared?.viewer?.length || 0,
      sitesSharedEditor: backendLoginData.sites?.shared?.editor?.length || 0
    })

    // ==================== MACHINES ====================
    const machines = (backendLoginData.machines || []).map((machine: any) => ({
      id: machine.id,
      name: machine.name || `Machine ${machine.macD}`,
      macAddress: machine.macD, // Backend utilise "macD"
      model: machine.model || 'TrackBee',
      description: machine.description || '',
      type: machine.type || 'trackbee',
      isActive: machine.status === true,
      lastConnectionState: machine.status ? 'connected' : 'disconnected',
      lastSeenAt: machine.lastSeenAt || new Date().toISOString(),
      createdAt: machine.createdAt || new Date().toISOString(),
      updatedAt: machine.updatedAt || new Date().toISOString()
    }))

    // ==================== SITES AVEC DÉDUPLICATION ====================
    const sitesMap = new Map() // Pour éviter les doublons

    // Ajouter les sites owned
    if (backendLoginData.sites?.owned) {
      backendLoginData.sites.owned.forEach((site: any) => {
        sitesMap.set(site.id, {
          id: site.id,
          name: site.name,
          description: site.description || '',
          address: site.address || '',
          lat: site.lat ? parseFloat(site.lat) : undefined,
          lng: site.lon ? parseFloat(site.lon) : undefined, // Backend utilise "lon"
          altitude: site.altitude ? parseFloat(site.altitude) : undefined,
          isActive: true,
          ownership: 'owned', // Marquer le type de propriété
          createdAt: site.createdAt || new Date().toISOString(),
          updatedAt: site.updatedAt || new Date().toISOString()
        })
      })
    }

    // Ajouter les sites shared (sans doublons)
    ['viewer', 'editor'].forEach(role => {
      if (backendLoginData.sites?.shared?.[role]) {
        backendLoginData.sites.shared[role].forEach((site: any) => {
          if (!sitesMap.has(site.id)) { // Éviter doublons
            sitesMap.set(site.id, {
              id: site.id,
              name: site.name,
              description: site.description || '',
              address: site.address || '',
              lat: site.lat ? parseFloat(site.lat) : undefined,
              lng: site.lon ? parseFloat(site.lon) : undefined,
              altitude: site.altitude ? parseFloat(site.altitude) : undefined,
              isActive: true,
              ownership: `shared_${role}`, // Marquer le type de partage
              ownerId: site.owner?.id,
              ownerEmail: site.owner?.email,
              createdAt: site.createdAt || new Date().toISOString(),
              updatedAt: site.updatedAt || new Date().toISOString()
            })
          }
        })
      }
    })

    const sites = Array.from(sitesMap.values())

    // ==================== INSTALLATIONS AVEC DÉDUPLICATION ====================
    const installationsMap = new Map()

    // Installations depuis les machines
    machines.forEach((machine: any, originalIndex: number) => {
      const originalMachine = backendLoginData.machines[originalIndex]
      if (originalMachine.installation) {
        const inst = originalMachine.installation
        installationsMap.set(inst.id, {
          id: inst.id,
          machineId: machine.id,
          siteId: inst.siteId,
          installationRef: inst.installationRef || '',
          positionIndex: inst.positionIndex || 1,
          installedAt: inst.installedAt || new Date().toISOString(),
          uninstalledAt: inst.uninstalledAt || null,
          isActive: !inst.uninstalledAt,
          source: 'machine', // Pour debug
          createdAt: inst.createdAt || inst.installedAt || new Date().toISOString(),
          updatedAt: inst.updatedAt || new Date().toISOString()
        })
      }
    })

    // Installations depuis les sites (sans doublons)
    ;[...(backendLoginData.sites?.owned || []), ...(backendLoginData.sites?.shared?.viewer || []), ...(backendLoginData.sites?.shared?.editor || [])].forEach((site: any) => {
      if (site.installations) {
        site.installations.forEach((inst: any) => {
          if (!installationsMap.has(inst.id)) { // Éviter doublons
            installationsMap.set(inst.id, {
              id: inst.id,
              machineId: inst.machineId,
              siteId: inst.siteId,
              installationRef: inst.installationRef || '',
              positionIndex: inst.positionIndex || 1,
              installedAt: inst.installedAt || new Date().toISOString(),
              uninstalledAt: inst.uninstalledAt || null,
              isActive: !inst.uninstalledAt,
              source: 'site', // Pour debug
              createdAt: inst.createdAt || inst.installedAt || new Date().toISOString(),
              updatedAt: inst.updatedAt || new Date().toISOString()
            })
          }
        })
      }
    })

    const installations = Array.from(installationsMap.values())

    console.log('✅ Hydration data extracted:', {
      machines: machines.length,
      sites: sites.length,
      installations: installations.length,
      sitesBreakdown: {
        owned: sites.filter(s => s.ownership === 'owned').length,
        sharedViewer: sites.filter(s => s.ownership === 'shared_viewer').length,
        sharedEditor: sites.filter(s => s.ownership === 'shared_editor').length
      }
    })

    return {
      machines,
      sites,
      installations
    }
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