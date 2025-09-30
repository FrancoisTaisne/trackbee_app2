/**
 * OpenAPI Discovery Service - Découverte automatique des routes API
 * Récupère et analyse le schéma OpenAPI du backend pour découvrir les endpoints disponibles
 */

import type { HttpClient } from './HttpClient'
import { httpClient } from './HttpClient'
import { apiLog, logger } from '@/core/utils/logger'
import { appConfig } from '@/core/utils/env'
import type { ApiResponse } from '@/core/types/transport'

// ==================== TYPES ====================

export interface OpenApiSpec {
  openapi: string
  info: {
    title: string
    version: string
    description: string
    contact?: {
      name: string
      email: string
    }
  }
  servers: Array<{
    url: string
    description: string
  }>
  paths: Record<string, Record<string, OpenApiOperation>>
  components: {
    schemas: Record<string, OpenApiSchema>
    securitySchemes: Record<string, OpenApiSecurityScheme>
  }
  security?: Array<Record<string, string[]>>
}

export interface OpenApiOperation {
  summary: string
  tags: string[]
  parameters?: OpenApiParameter[]
  requestBody?: OpenApiRequestBody
  responses: Record<string, OpenApiResponse>
  security?: Array<Record<string, string[]>>
}

export interface OpenApiParameter {
  name: string
  in: 'path' | 'query' | 'header'
  required?: boolean
  schema: OpenApiSchema
  description?: string
  example?: any
}

export interface OpenApiRequestBody {
  required?: boolean
  content: Record<string, {
    schema: OpenApiSchema
  }>
}

export interface OpenApiResponse {
  description: string
  content?: Record<string, {
    schema: OpenApiSchema
  }>
}

export interface OpenApiSchema {
  type: string
  properties?: Record<string, OpenApiSchema>
  items?: OpenApiSchema
  required?: string[]
  example?: any
  description?: string
  format?: string
  enum?: any[]
  pattern?: string
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  $ref?: string
}

export interface OpenApiSecurityScheme {
  type: 'http' | 'apiKey' | 'oauth2' | 'openIdConnect'
  scheme?: string
  bearerFormat?: string
  in?: 'header' | 'query' | 'cookie'
  name?: string
}

export interface DiscoveredEndpoint {
  path: string
  method: string
  summary: string
  tags: string[]
  parameters: OpenApiParameter[]
  requiresAuth: boolean
  requestBodyRequired: boolean
  expectedResponses: string[]
}

export interface ApiInfo {
  title: string
  version: string
  description: string
  openapi_version: string
  endpoints_count: number
  schemas_count: number
  tags: string[]
  documentation_url: string
  schema_url: string
  servers: Array<{ url: string; description: string }>
  generated_at: string
}

export interface DiscoveryResult {
  success: boolean
  apiInfo: ApiInfo | null
  endpoints: DiscoveredEndpoint[]
  schemas: Record<string, OpenApiSchema>
  lastDiscoveryTime: Date
  errors: string[]
}

// ==================== DISCOVERY SERVICE ====================

export class OpenApiDiscoveryService {
  private client: HttpClient
  private cachedResult: DiscoveryResult | null = null
  private discoveryPromise: Promise<DiscoveryResult> | null = null
  private lastDiscoveryTime: Date | null = null

  constructor(client: HttpClient = httpClient) {
    this.client = client
  }

  /**
   * Découverte automatique des routes avec cache
   */
  async discoverApi(options: {
    forceRefresh?: boolean
    timeout?: number
  } = {}): Promise<DiscoveryResult> {
    const { forceRefresh = false, timeout = 10000 } = options

    // Retourner le cache si disponible et pas de force refresh
    if (!forceRefresh && this.cachedResult && this.isResultValid()) {
      apiLog.debug('✨ Using cached API discovery result')
      return this.cachedResult
    }

    // Si une découverte est déjà en cours, attendre le résultat
    if (this.discoveryPromise) {
      apiLog.debug('⏳ Discovery already in progress, waiting...')
      return this.discoveryPromise
    }

    // Démarrer une nouvelle découverte
    this.discoveryPromise = this.performDiscovery(timeout)

    try {
      const result = await this.discoveryPromise
      this.cachedResult = result
      this.lastDiscoveryTime = new Date()

      apiLog.info('🎯 API Discovery completed', {
        endpoints: result.endpoints.length,
        schemas: Object.keys(result.schemas).length,
        success: result.success
      })

      return result
    } finally {
      this.discoveryPromise = null
    }
  }

  /**
   * Obtenir uniquement les informations de base de l'API
   */
  async getApiInfo(): Promise<ApiInfo | null> {
    try {
      apiLog.debug('📊 Fetching API info...')

      const response = await this.client.get<ApiInfo>('/api/openapi/info', {
        skipAuth: true,
        customTimeout: 5000,
        skipRetry: true
      })

      if (response.success && response.data) {
        apiLog.debug('✅ API info retrieved successfully')
        return response.data
      } else {
        apiLog.warn('⚠️ Failed to get API info')
        return null
      }
    } catch (error) {
      apiLog.error('❌ Error fetching API info', { error })
      return null
    }
  }

  /**
   * Obtenir la liste des endpoints avec filtres
   */
  async getEndpoints(filters: {
    tag?: string
    method?: string
  } = {}): Promise<DiscoveredEndpoint[]> {
    try {
      const queryParams = new URLSearchParams()
      if (filters.tag) queryParams.append('tag', filters.tag)
      if (filters.method) queryParams.append('method', filters.method)

      const url = `/api/openapi/endpoints${queryParams.toString() ? `?${queryParams.toString()}` : ''}`

      const response = await this.client.get<{
        total: number
        endpoints: Array<{
          path: string
          method: string
          summary: string
          tags: string[]
          security_required: boolean
          parameters_count: number
          request_body_required: boolean
          responses: string[]
        }>
      }>(url, {
        skipAuth: true,
        customTimeout: 5000
      })

      if (response.success && response.data) {
        return response.data.endpoints.map(endpoint => ({
          path: endpoint.path,
          method: endpoint.method,
          summary: endpoint.summary,
          tags: endpoint.tags,
          parameters: [], // Sera rempli par la découverte complète
          requiresAuth: endpoint.security_required,
          requestBodyRequired: endpoint.request_body_required,
          expectedResponses: endpoint.responses
        }))
      }

      return []
    } catch (error) {
      apiLog.error('❌ Error fetching endpoints', { error })
      return []
    }
  }

  /**
   * Obtenir les schémas de données
   */
  async getSchemas(): Promise<Record<string, OpenApiSchema>> {
    try {
      const response = await this.client.get<{
        total: number
        schemas: Array<{
          name: string
          type: string
          properties_count: number
          properties: string[]
          required: string[]
          description?: string
        }>
      }>('/api/openapi/schemas', {
        skipAuth: true,
        customTimeout: 5000
      })

      if (response.success && response.data) {
        const schemas: Record<string, OpenApiSchema> = {}

        response.data.schemas.forEach(schema => {
          schemas[schema.name] = {
            type: schema.type,
            properties: schema.properties.reduce((props, prop) => {
              props[prop] = { type: 'string' } // Simplifié, la découverte complète donnera plus de détails
              return props
            }, {} as Record<string, OpenApiSchema>),
            required: schema.required,
            description: schema.description
          }
        })

        return schemas
      }

      return {}
    } catch (error) {
      apiLog.error('❌ Error fetching schemas', { error })
      return {}
    }
  }

  /**
   * Vérifier la santé du service OpenAPI
   */
  async checkApiHealth(): Promise<{
    healthy: boolean
    service: string
    version: string
    endpoints_documented: number
  } | null> {
    try {
      const response = await this.client.get<{
        status: string
        service: string
        api_version: string
        endpoints_documented: number
      }>('/api/openapi/health', {
        skipAuth: true,
        customTimeout: 3000,
        skipRetry: true
      })

      if (response.success && response.data) {
        return {
          healthy: response.data.status === 'healthy',
          service: response.data.service,
          version: response.data.api_version,
          endpoints_documented: response.data.endpoints_documented
        }
      }

      return null
    } catch (error) {
      apiLog.debug('API health check failed', { error })
      return null
    }
  }

  /**
   * Découverte complète avec schéma OpenAPI
   */
  private async performDiscovery(timeout: number): Promise<DiscoveryResult> {
    const timer = logger.time('api', 'OpenAPI Discovery')
    const result: DiscoveryResult = {
      success: false,
      apiInfo: null,
      endpoints: [],
      schemas: {},
      lastDiscoveryTime: new Date(),
      errors: []
    }

    try {
      apiLog.info('🔍 Starting API discovery...')

      // 1. Récupérer les informations de base
      const apiInfo = await this.getApiInfo()
      if (apiInfo) {
        result.apiInfo = apiInfo
        apiLog.debug('📊 API Info retrieved', {
          title: apiInfo.title,
          version: apiInfo.version,
          endpoints: apiInfo.endpoints_count
        })
      } else {
        result.errors.push('Failed to retrieve API info')
      }

      // 2. Récupérer le schéma OpenAPI complet
      try {
        const schemaResponse = await this.client.get<OpenApiSpec>('/api-docs.json', {
          skipAuth: true,
          customTimeout: timeout,
          skipRetry: true
        })

        if (schemaResponse.success && schemaResponse.data) {
          const spec = schemaResponse.data

          // Analyser les endpoints
          result.endpoints = this.parseEndpoints(spec)

          // Récupérer les schémas
          result.schemas = spec.components?.schemas || {}

          result.success = true

          apiLog.debug('📋 OpenAPI schema parsed', {
            endpoints: result.endpoints.length,
            schemas: Object.keys(result.schemas).length
          })
        } else {
          result.errors.push('Failed to fetch OpenAPI schema')
        }
      } catch (schemaError) {
        apiLog.warn('⚠️ Failed to fetch full OpenAPI schema, using simplified discovery', { schemaError })

        // Fallback: utiliser les endpoints simplifiés
        result.endpoints = await this.getEndpoints()
        result.schemas = await this.getSchemas()
        result.success = result.endpoints.length > 0

        if (!result.success) {
          result.errors.push('Failed to discover endpoints via fallback method')
        }
      }

      // 3. Vérifier la santé du service
      const health = await this.checkApiHealth()
      if (health && !health.healthy) {
        result.errors.push('OpenAPI service reports unhealthy status')
      }

    } catch (error) {
      result.errors.push(`Discovery failed: ${error instanceof Error ? error.message : String(error)}`)
      apiLog.error('❌ API Discovery failed', { error })
    }

    timer.end({ success: result.success, endpoints: result.endpoints.length })

    return result
  }

  /**
   * Analyser les endpoints depuis le schéma OpenAPI
   */
  private parseEndpoints(spec: OpenApiSpec): DiscoveredEndpoint[] {
    const endpoints: DiscoveredEndpoint[] = []

    Object.entries(spec.paths).forEach(([path, pathMethods]) => {
      Object.entries(pathMethods).forEach(([method, operation]) => {
        endpoints.push({
          path,
          method: method.toUpperCase(),
          summary: operation.summary || 'No summary',
          tags: operation.tags || [],
          parameters: operation.parameters || [],
          requiresAuth: !!(operation.security && operation.security.length > 0),
          requestBodyRequired: !!(operation.requestBody && operation.requestBody.required),
          expectedResponses: Object.keys(operation.responses)
        })
      })
    })

    return endpoints.sort((a, b) => a.path.localeCompare(b.path))
  }

  /**
   * Vérifier si le résultat en cache est encore valide
   */
  private isResultValid(): boolean {
    if (!this.lastDiscoveryTime) return false

    const maxAge = 5 * 60 * 1000 // 5 minutes par défaut
    return Date.now() - this.lastDiscoveryTime.getTime() < maxAge
  }

  /**
   * Effacer le cache
   */
  clearCache(): void {
    this.cachedResult = null
    this.lastDiscoveryTime = null
    this.discoveryPromise = null
    apiLog.debug('🗑️ Discovery cache cleared')
  }

  /**
   * Obtenir le résultat en cache
   */
  getCachedResult(): DiscoveryResult | null {
    return this.cachedResult
  }
}

// ==================== SINGLETON & FACTORY ====================

// Instance par défaut
export const openApiDiscovery = new OpenApiDiscoveryService()

// Factory pour créer des instances personnalisées
export function createOpenApiDiscovery(client?: HttpClient): OpenApiDiscoveryService {
  return new OpenApiDiscoveryService(client)
}

// Hook React pour utiliser la découverte (à créer si nécessaire)
// export function useApiDiscovery() { ... }

export default openApiDiscovery