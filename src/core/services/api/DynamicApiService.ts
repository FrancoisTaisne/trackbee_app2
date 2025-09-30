/**
 * Dynamic API Service - Service API utilisant la découverte automatique des routes
 * Utilise OpenApiDiscovery pour découvrir dynamiquement les endpoints du backend
 */

import type { HttpClient } from './HttpClient'
import { httpClient } from './HttpClient'
import { openApiDiscovery, type DiscoveredEndpoint, type DiscoveryResult } from './OpenApiDiscovery'
import type { ApiResponse } from '@/core/types/transport'
import { apiLog, logger } from '@/core/utils/logger'

// ==================== TYPES ====================

export interface DynamicEndpoint {
  path: string
  method: string
  summary: string
  tags: string[]
  requiresAuth: boolean
  requestBodyRequired: boolean
}

export interface ApiOperation {
  endpoint: DynamicEndpoint
  call: <T = any>(params?: Record<string, any>, data?: any, options?: any) => Promise<ApiResponse<T>>
}

export interface DynamicApiServiceOptions {
  autoDiscover?: boolean
  cacheEndpoints?: boolean
  refreshInterval?: number
}

// ==================== DYNAMIC API SERVICE ====================

export class DynamicApiService {
  private client: HttpClient
  private discoveredEndpoints: Map<string, DiscoveredEndpoint> = new Map()
  private operationsCache: Map<string, ApiOperation> = new Map()
  private lastDiscoveryTime: Date | null = null
  private isDiscovering = false

  constructor(
    client: HttpClient = httpClient,
    private options: DynamicApiServiceOptions = {
      autoDiscover: true,
      cacheEndpoints: true,
      refreshInterval: 5 * 60 * 1000 // 5 minutes
    }
  ) {
    this.client = client

    // Auto-discover au démarrage si activé
    if (this.options.autoDiscover) {
      this.discoverEndpoints().catch(error => {
        apiLog.warn('Initial API discovery failed', { error })
      })
    }
  }

  // ==================== DISCOVERY METHODS ====================

  /**
   * Découvrir les endpoints disponibles
   */
  async discoverEndpoints(forceRefresh = false): Promise<void> {
    if (this.isDiscovering) {
      apiLog.debug('Discovery already in progress, skipping...')
      return
    }

    // Vérifier si cache encore valide
    if (!forceRefresh && this.isCacheValid()) {
      apiLog.debug('Endpoints cache still valid, skipping discovery')
      return
    }

    this.isDiscovering = true

    try {
      apiLog.info('🔍 Starting dynamic API discovery...')

      const result = await openApiDiscovery.discoverApi({ forceRefresh })

      if (result.success) {
        this.updateEndpointsCache(result)
        this.lastDiscoveryTime = new Date()

        apiLog.info('✅ Dynamic API discovery completed', {
          endpoints: this.discoveredEndpoints.size,
          operationsGenerated: this.operationsCache.size
        })
      } else {
        apiLog.warn('⚠️ API discovery completed with errors', {
          errors: result.errors
        })
      }
    } catch (error) {
      apiLog.error('❌ Dynamic API discovery failed', { error })
      throw error
    } finally {
      this.isDiscovering = false
    }
  }

  /**
   * Obtenir un endpoint par path et méthode
   */
  getEndpoint(path: string, method: string): DynamicEndpoint | null {
    const key = this.getEndpointKey(path, method)
    const discovered = this.discoveredEndpoints.get(key)

    if (!discovered) {
      return null
    }

    return {
      path: discovered.path,
      method: discovered.method,
      summary: discovered.summary,
      tags: discovered.tags,
      requiresAuth: discovered.requiresAuth,
      requestBodyRequired: discovered.requestBodyRequired
    }
  }

  /**
   * Obtenir tous les endpoints par tag
   */
  getEndpointsByTag(tag: string): DynamicEndpoint[] {
    return Array.from(this.discoveredEndpoints.values())
      .filter(endpoint => endpoint.tags.includes(tag))
      .map(endpoint => ({
        path: endpoint.path,
        method: endpoint.method,
        summary: endpoint.summary,
        tags: endpoint.tags,
        requiresAuth: endpoint.requiresAuth,
        requestBodyRequired: endpoint.requestBodyRequired
      }))
  }

  /**
   * Vérifier si un endpoint existe
   */
  hasEndpoint(path: string, method?: string): boolean {
    if (method) {
      const key = this.getEndpointKey(path, method)
      return this.discoveredEndpoints.has(key)
    }

    // Vérifier si le path existe pour n'importe quelle méthode
    return Array.from(this.discoveredEndpoints.values())
      .some(endpoint => endpoint.path === path)
  }

  // ==================== OPERATION GENERATION ====================

  /**
   * Générer une opération API dynamique
   */
  createOperation(path: string, method: string): ApiOperation | null {
    const endpoint = this.getEndpoint(path, method)
    if (!endpoint) {
      apiLog.warn('Endpoint not found for operation creation', { path, method })
      return null
    }

    const operationKey = this.getEndpointKey(path, method)

    // Vérifier le cache si activé
    if (this.options.cacheEndpoints && this.operationsCache.has(operationKey)) {
      return this.operationsCache.get(operationKey)!
    }

    const operation: ApiOperation = {
      endpoint,
      call: async <T = any>(params?: Record<string, any>, data?: any, options?: any): Promise<ApiResponse<T>> => {
        return this.executeOperation<T>(endpoint, params, data, options)
      }
    }

    // Mettre en cache si activé
    if (this.options.cacheEndpoints) {
      this.operationsCache.set(operationKey, operation)
    }

    return operation
  }

  /**
   * Exécuter une opération API
   */
  private async executeOperation<T = any>(
    endpoint: DynamicEndpoint,
    params?: Record<string, any>,
    data?: any,
    options?: any
  ): Promise<ApiResponse<T>> {
    let url = endpoint.path

    // Remplacer les paramètres de path (ex: /api/site/{id})
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url = url.replace(`{${key}}`, String(value))
        url = url.replace(`:${key}`, String(value))
      })
    }

    // Options de requête
    const requestOptions = {
      skipAuth: !endpoint.requiresAuth,
      ...options
    }

    apiLog.debug('🚀 Executing dynamic API operation', {
      method: endpoint.method,
      path: url,
      requiresAuth: endpoint.requiresAuth,
      hasData: !!data
    })

    // Exécuter la requête selon la méthode
    switch (endpoint.method.toUpperCase()) {
      case 'GET':
        return this.client.get<T>(url, requestOptions)
      case 'POST':
        return this.client.post<T>(url, data, requestOptions)
      case 'PUT':
        return this.client.put<T>(url, data, requestOptions)
      case 'PATCH':
        return this.client.patch<T>(url, data, requestOptions)
      case 'DELETE':
        return this.client.delete<T>(url, requestOptions)
      default:
        throw new Error(`Unsupported HTTP method: ${endpoint.method}`)
    }
  }

  // ==================== CONVENIENCE METHODS ====================

  /**
   * Méthodes de convenance pour les opérations courantes
   */

  // Authentication
  async login(credentials: { email: string; password: string }): Promise<ApiResponse> {
    const operation = this.createOperation('/api/auth/login', 'POST')
    if (!operation) {
      throw new Error('Login endpoint not found')
    }
    return operation.call(undefined, credentials)
  }

  async logout(): Promise<ApiResponse> {
    const operation = this.createOperation('/api/auth/logout', 'POST')
    if (!operation) {
      throw new Error('Logout endpoint not found')
    }
    return operation.call()
  }

  // Machines
  async getMachines(): Promise<ApiResponse> {
    const operation = this.createOperation('/api/machine/all', 'GET')
    if (!operation) {
      throw new Error('Get machines endpoint not found')
    }
    return operation.call()
  }

  async getMachine(idOrMac: string): Promise<ApiResponse> {
    const operation = this.createOperation('/api/machine/findByIdOrMac', 'GET')
    if (!operation) {
      throw new Error('Get machine endpoint not found')
    }
    return operation.call({ idOrMac })
  }

  // Sites
  async getSites(): Promise<ApiResponse> {
    const operation = this.createOperation('/api/site', 'GET')
    if (!operation) {
      throw new Error('Get sites endpoint not found')
    }
    return operation.call()
  }

  async createSite(siteData: any): Promise<ApiResponse> {
    const operation = this.createOperation('/api/site', 'POST')
    if (!operation) {
      throw new Error('Create site endpoint not found')
    }
    return operation.call(undefined, siteData)
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Obtenir les statistiques de découverte
   */
  getStats(): {
    endpointsDiscovered: number
    operationsCached: number
    lastDiscoveryTime: Date | null
    cacheValid: boolean
  } {
    return {
      endpointsDiscovered: this.discoveredEndpoints.size,
      operationsCached: this.operationsCache.size,
      lastDiscoveryTime: this.lastDiscoveryTime,
      cacheValid: this.isCacheValid()
    }
  }

  /**
   * Vider le cache
   */
  clearCache(): void {
    this.discoveredEndpoints.clear()
    this.operationsCache.clear()
    this.lastDiscoveryTime = null
    apiLog.debug('🗑️ Dynamic API cache cleared')
  }

  /**
   * Forcer une nouvelle découverte
   */
  async refresh(): Promise<void> {
    this.clearCache()
    await this.discoverEndpoints(true)
  }

  // ==================== PRIVATE METHODS ====================

  private getEndpointKey(path: string, method: string): string {
    return `${method.toUpperCase()}:${path}`
  }

  private isCacheValid(): boolean {
    if (!this.lastDiscoveryTime || !this.options.refreshInterval) {
      return false
    }

    const maxAge = this.options.refreshInterval
    return Date.now() - this.lastDiscoveryTime.getTime() < maxAge
  }

  private updateEndpointsCache(result: DiscoveryResult): void {
    this.discoveredEndpoints.clear()
    this.operationsCache.clear()

    result.endpoints.forEach(endpoint => {
      const key = this.getEndpointKey(endpoint.path, endpoint.method)
      this.discoveredEndpoints.set(key, endpoint)
    })

    apiLog.debug('📊 Endpoints cache updated', {
      endpoints: this.discoveredEndpoints.size
    })
  }
}

// ==================== SINGLETON & FACTORY ====================

// Instance par défaut
export const dynamicApiService = new DynamicApiService()

// Factory pour créer des instances personnalisées
export function createDynamicApiService(
  client?: HttpClient,
  options?: DynamicApiServiceOptions
): DynamicApiService {
  return new DynamicApiService(client, options)
}

// Hook React (à créer si nécessaire)
export function useDynamicApi() {
  return dynamicApiService
}

export default dynamicApiService