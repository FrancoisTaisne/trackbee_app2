/**
 * HTTP Client - Service de communication API REST
 * Gestion centralisée des requêtes avec auth, retry, cache
 */

import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios'
import { CapacitorHttp } from '@capacitor/core'
import type { SystemEvent, ApiResponse, AppError } from '@/core/types/transport'
import { apiLog, logger } from '@/core/utils/logger'
import { withTimeout, withRetry, sleep } from '@/core/utils/time'
import { appConfig, detectPlatform } from '@/core/utils/env'
import { idUtils } from '@/core/utils/ids'

// ==================== TYPES ====================

interface RequestOptions extends AxiosRequestConfig {
  useCapacitor?: boolean
  skipAuth?: boolean
  skipRetry?: boolean
  customTimeout?: number
  retryAttempts?: number
  requestId?: string
}

interface HttpClientConfig {
  baseURL: string
  timeout: number
  useCapacitor: boolean
  retryAttempts: number
  retryDelay: number
}

interface RequestMetrics {
  requestId: string
  url: string
  method: string
  startTime: number
  endTime?: number
  duration?: number
  status?: number
  success?: boolean
  error?: string
  retryCount?: number
}

// ==================== TOKEN MANAGEMENT ====================

class TokenManager {
  private static readonly TOKEN_KEY = 'auth_token'
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token'
  private static readonly TOKEN_EXPIRY_KEY = 'token_expiry'

  private refreshPromise: Promise<string> | null = null

  async getToken(): Promise<string | null> {
    try {
      // Vérifier si on a un token et s'il n'est pas expiré
      const token = localStorage.getItem(TokenManager.TOKEN_KEY)
      if (!token) return null

      const expiry = localStorage.getItem(TokenManager.TOKEN_EXPIRY_KEY)
      if (expiry && Date.now() > Number(expiry) - appConfig.security.tokenRefreshThreshold) {
        apiLog.debug('Token expiring soon, refreshing...')
        return this.refreshToken()
      }

      return token
    } catch (error) {
      apiLog.error('Failed to get token', { error })
      return null
    }
  }

  async setToken(token: string, refreshToken?: string, expiresAt?: number): Promise<void> {
    try {
      localStorage.setItem(TokenManager.TOKEN_KEY, token)

      if (refreshToken) {
        localStorage.setItem(TokenManager.REFRESH_TOKEN_KEY, refreshToken)
      }

      if (expiresAt) {
        localStorage.setItem(TokenManager.TOKEN_EXPIRY_KEY, String(expiresAt))
      }

      apiLog.debug('Token stored successfully')
    } catch (error) {
      apiLog.error('Failed to store token', { error })
      throw error
    }
  }

  async clearTokens(): Promise<void> {
    try {
      localStorage.removeItem(TokenManager.TOKEN_KEY)
      localStorage.removeItem(TokenManager.REFRESH_TOKEN_KEY)
      localStorage.removeItem(TokenManager.TOKEN_EXPIRY_KEY)

      // Annuler le refresh en cours si il y en a un
      this.refreshPromise = null

      apiLog.debug('Tokens cleared')
    } catch (error) {
      apiLog.error('Failed to clear tokens', { error })
    }
  }

  private async refreshToken(): Promise<string> {
    // Si un refresh est déjà en cours, attendre le résultat
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = this.performRefresh()

    try {
      return await this.refreshPromise
    } finally {
      this.refreshPromise = null
    }
  }

  private async performRefresh(): Promise<string> {
    const refreshToken = localStorage.getItem(TokenManager.REFRESH_TOKEN_KEY)
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      const response = await axios.post(`${appConfig.api.currentUrl}/api/auth/refresh`, {
        refreshToken
      })

      const { token, refreshToken: newRefreshToken, expiresAt } = response.data

      await this.setToken(token, newRefreshToken, expiresAt)

      apiLog.info('✅ Token refreshed successfully')
      return token
    } catch (error) {
      apiLog.error('❌ Token refresh failed', { error })
      await this.clearTokens()
      throw new Error('Token refresh failed')
    }
  }
}

// ==================== HTTP CLIENT CLASS ====================

export class HttpClient {
  private axiosInstance: AxiosInstance
  private tokenManager = new TokenManager()
  private eventListeners = new Set<(event: SystemEvent) => void>()
  private activeRequests = new Map<string, RequestMetrics>()
  private requestCounter = 0

  constructor(config: HttpClientConfig) {
    this.axiosInstance = this.createAxiosInstance(config)
    this.setupInterceptors()

    apiLog.debug('HttpClient initialized', {
      baseURL: config.baseURL,
      timeout: config.timeout,
      useCapacitor: config.useCapacitor
    })
  }

  // ==================== PUBLIC API ====================

  /**
   * GET request
   */
  async get<T = any>(url: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>({ ...options, method: 'GET', url })
  }

  /**
   * GET request returning meta (status, headers) alongside data.
   * Useful for cache negotiation (e.g., ETag/If-None-Match).
   */
  async getWithMeta<T = any>(url: string, options: RequestOptions = {}): Promise<{ data: T; status: number; headers: Record<string, string> }> {
    const { useCapacitor = detectPlatform().isCapacitor, skipAuth = false, customTimeout = 10000, ...axiosOptions } = options

    if (!skipAuth) {
      const token = await this.tokenManager.getToken()
      if (token) {
        axiosOptions.headers = { ...(axiosOptions.headers || {}), 'x-access-token': token }
      }
    }

    axiosOptions.timeout = customTimeout

    const resp = useCapacitor
      ? await this.capacitorRequest({ ...axiosOptions, method: 'GET', url })
      : await this.axiosInstance.request({ ...axiosOptions, method: 'GET', url })

    const headers: Record<string, string> = {}
    Object.entries(resp.headers || {}).forEach(([k, v]) => { headers[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : String(v) })

    return { data: resp.data as T, status: resp.status, headers }
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>({ ...options, method: 'POST', url, data })
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>({ ...options, method: 'PUT', url, data })
  }

  /**
   * PATCH request
   */
  async patch<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>({ ...options, method: 'PATCH', url, data })
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    return this.request<T>({ ...options, method: 'DELETE', url })
  }

  /**
   * Upload de fichier
   */
  async uploadFile(
    url: string,
    file: File | Blob,
    options: RequestOptions & {
      fieldName?: string
      additionalData?: Record<string, any>
      onProgress?: (percent: number) => void
    } = {}
  ): Promise<ApiResponse> {
    const {
      fieldName = 'file',
      additionalData = {},
      onProgress,
      ...requestOptions
    } = options

    const formData = new FormData()
    formData.append(fieldName, file)

    // Ajouter données supplémentaires
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, String(value))
    })

    return this.request({
      ...requestOptions,
      method: 'POST',
      url,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...requestOptions.headers
      },
      onUploadProgress: onProgress ? (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percent)
        }
      } : undefined
    })
  }

  /**
   * Health check
   */
  async ping(options: { timeoutMs?: number } = {}): Promise<{ ok: boolean; status?: number }> {
    const { timeoutMs = 5000 } = options

    try {
      const response = await this.request({
        method: 'HEAD',
        url: '/api/health',
        skipAuth: true,
        skipRetry: true,
        customTimeout: timeoutMs
      })

      return {
        ok: response.success,
        status: 200
      }
    } catch (error) {
      apiLog.debug('Ping failed', { error })
      return {
        ok: false,
        status: error instanceof Error && 'status' in error ? (error as any).status : undefined
      }
    }
  }

  /**
   * Request principal avec retry et métriques
   */
  private async request<T = any>(options: RequestOptions): Promise<ApiResponse<T>> {
    const {
      useCapacitor = detectPlatform().isCapacitor,
      skipAuth = false,
      skipRetry = false,
      customTimeout = 10000, // appConfig.api.timeout n'existe pas
      retryAttempts = skipRetry ? 0 : 3,
      requestId = idUtils.generateUnique('req'),
      ...axiosOptions
    } = options

    // Métriques de request
    const metrics: RequestMetrics = {
      requestId,
      url: axiosOptions.url || '',
      method: (axiosOptions.method || 'GET').toUpperCase(),
      startTime: Date.now()
    }

    this.activeRequests.set(requestId, metrics)

    const timer = logger.time('api', `HTTP ${metrics.method} ${metrics.url}`)

    try {
      apiLog.debug('📤 HTTP Request', {
        requestId,
        method: metrics.method,
        url: metrics.url,
        useCapacitor,
        timeout: customTimeout
      })

      // Ajouter l'auth si nécessaire
      if (!skipAuth) {
        const token = await this.tokenManager.getToken()
        if (token) {
          axiosOptions.headers = {
            ...axiosOptions.headers,
            'x-access-token': token
          }
        }
      }

      // Ajouter timeout
      axiosOptions.timeout = customTimeout

      let response: AxiosResponse

      if (useCapacitor && ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(metrics.method)) {
        // Utiliser CapacitorHttp pour les requêtes mobiles
        response = await this.capacitorRequest(axiosOptions)
      } else {
        // Utiliser axios standard
        response = await this.axiosInstance.request(axiosOptions)
      }

      // Métriques de succès
      metrics.endTime = Date.now()
      metrics.duration = metrics.endTime - metrics.startTime
      metrics.status = response.status
      metrics.success = true

      const apiResponse: ApiResponse<T> = {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      }

      apiLog.debug('✅ HTTP Response', {
        requestId,
        status: response.status,
        duration: metrics.duration
      })

      timer.end({ status: response.status })
      return apiResponse

    } catch (error) {
      // Métriques d'erreur
      metrics.endTime = Date.now()
      metrics.duration = metrics.endTime - metrics.startTime
      metrics.success = false
      metrics.error = error instanceof Error ? error.message : String(error)

      timer.end({ error: metrics.error })

      const appError = this.handleRequestError(error, requestId)

      // Retry si applicable
      if (!skipRetry && retryAttempts > 0 && this.shouldRetry(appError)) {
        apiLog.warn(`Retrying request (${retryAttempts} attempts left)`, {
          requestId,
          error: appError.message
        })

        await sleep(1000) // Délai avant retry

        return this.request({
          ...options,
          retryAttempts: retryAttempts - 1,
          requestId: `${requestId}-retry`
        })
      }

      apiLog.error('❌ HTTP Request failed', {
        requestId,
        error: appError.message,
        category: appError.category
      })

      throw appError

    } finally {
      this.activeRequests.delete(requestId)
    }
  }

  /**
   * Gestion des tokens d'authentification
   */
  async setAuthToken(token: string, refreshToken?: string, expiresAt?: number): Promise<void> {
    await this.tokenManager.setToken(token, refreshToken, expiresAt)
  }

  async clearAuth(): Promise<void> {
    await this.tokenManager.clearTokens()
  }

  /**
   * Alias pour clearAuth() - compatibilité
   */
  async clearAuthToken(): Promise<void> {
    await this.clearAuth()
  }

  /**
   * Subscribe aux événements
   */
  onEvent(listener: (event: SystemEvent) => void): () => void {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  /**
   * Statistiques des requêtes
   */
  getStats(): {
    activeRequests: number
    totalRequests: number
    averageResponseTime: number
    errorRate: number
  } {
    const active = this.activeRequests.size
    // Pour les stats complètes, on pourrait maintenir un historique
    return {
      activeRequests: active,
      totalRequests: this.requestCounter,
      averageResponseTime: 0, // À implémenter si nécessaire
      errorRate: 0 // À implémenter si nécessaire
    }
  }

  // ==================== PRIVATE METHODS ====================

  private createAxiosInstance(config: HttpClientConfig): AxiosInstance {
    return axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        this.requestCounter++

        apiLog.trace('Request interceptor', {
          url: config.url,
          method: config.method?.toUpperCase(),
          headers: config.headers
        })

        return config
      },
      (error) => {
        apiLog.error('Request interceptor error', { error })
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        apiLog.trace('Response interceptor', {
          status: response.status,
          url: response.config.url
        })
        return response
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

        // Retry automatique sur 401 (unauthorized)
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            const newToken = await this.tokenManager.getToken()
            if (newToken && originalRequest.headers) {
              originalRequest.headers['x-access-token'] = newToken
            }
            return this.axiosInstance.request(originalRequest)
          } catch (refreshError) {
            apiLog.error('Token refresh failed in interceptor', { refreshError })
            await this.tokenManager.clearTokens()
            // Ici on pourrait émettre un événement de déconnexion
          }
        }

        return Promise.reject(error)
      }
    )
  }

  private async capacitorRequest(options: AxiosRequestConfig): Promise<AxiosResponse> {
    const url = `${this.axiosInstance.defaults.baseURL}${options.url}`

    try {
      const response = await CapacitorHttp.request({
        url,
        method: options.method?.toUpperCase() as any,
        headers: options.headers as Record<string, string>,
        data: options.data,
        connectTimeout: options.timeout,
        readTimeout: options.timeout
      })

      // Convertir la réponse CapacitorHttp en format Axios
      return {
        data: response.data,
        status: response.status,
        statusText: '',
        headers: response.headers,
        config: options,
        request: {}
      } as AxiosResponse
    } catch (error) {
      // Convertir l'erreur CapacitorHttp en format Axios
      throw {
        ...(error as Record<string, any>),
        config: options,
        isAxiosError: true
      }
    }
  }

  private handleRequestError(error: unknown, requestId: string): AppError {
    let code = 'REQUEST_FAILED'
    let message = 'HTTP request failed'
    let retryable = false

    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      message = error.message

      if (status) {
        if (status >= 500) {
          code = 'SERVER_ERROR'
          retryable = true
        } else if (status === 404) {
          code = 'NOT_FOUND'
          retryable = false
        } else if (status === 401) {
          code = 'UNAUTHORIZED'
          retryable = false
        } else if (status === 403) {
          code = 'FORBIDDEN'
          retryable = false
        } else if (status === 429) {
          code = 'RATE_LIMITED'
          retryable = true
        } else if (status >= 400) {
          code = 'CLIENT_ERROR'
          retryable = false
        }
      } else if (error.code === 'ECONNABORTED') {
        code = 'TIMEOUT'
        retryable = true
      } else if (error.code === 'NETWORK_ERROR') {
        code = 'NETWORK_ERROR'
        retryable = true
      }
    }

    return {
      code,
      message,
      category: 'api',
      retryable,
      context: {
        requestId,
        status: axios.isAxiosError(error) ? error.response?.status : undefined,
        url: axios.isAxiosError(error) ? error.config?.url : undefined
      },
      timestamp: new Date()
    }
  }

  private shouldRetry(error: AppError): boolean {
    return error.retryable && error.category === 'api'
  }
}

// ==================== FACTORY & SINGLETON ====================

export function createHttpClient(config?: Partial<HttpClientConfig>): HttpClient {
  const defaultConfig: HttpClientConfig = {
    baseURL: appConfig.api.currentUrl,
    timeout: 10000,
    useCapacitor: detectPlatform().isCapacitor,
    retryAttempts: 3,
    retryDelay: 1000
  }

  return new HttpClient({ ...defaultConfig, ...config })
}

// Instance par défaut
export const httpClient = createHttpClient()

// Types exportés
export type { RequestOptions, HttpClientConfig, RequestMetrics }
