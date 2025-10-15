/**
 * Script de test des endpoints API
 * Test de connexion avec les identifiants debug et validation des endpoints
 */

import axios, { AxiosInstance } from 'axios'
import { API_ENDPOINTS } from '@/core/services/api/endpoints'

// ==================== CONFIGURATION ====================

const API_BASE_URL = import.meta.env.VITE_SERVER_ADDRESS_LOCAL || 'http://localhost:3313'
const DEBUG_LOGIN = import.meta.env.VITE_DEBUG_MODERATOR_LOGIN || 'moderator1@test.com'
const DEBUG_PASSWORD = import.meta.env.VITE_DEBUG_MODERATOR_PASSWORD || 'test'

// Configuration du client HTTP pour les tests
const testClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// ==================== TYPES ====================

interface TestResult {
  endpoint: string
  method: string
  success: boolean
  status?: number
  data?: any
  error?: string
  duration: number
}

interface TestSummary {
  total: number
  success: number
  failed: number
  results: TestResult[]
  token?: string
}

// ==================== UTILITIES ====================

const logResult = (result: TestResult) => {
  const status = result.success ? '✅' : '❌'
  const duration = `${result.duration}ms`
  console.log(`${status} ${result.method} ${result.endpoint} - ${duration}`)

  if (!result.success && result.error) {
    console.log(`   Error: ${result.error}`)
  }
}

const testEndpoint = async (
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  endpoint: string,
  data?: unknown,
  token?: string
): Promise<TestResult> => {
  const startTime = Date.now()

  try {
    const config = {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    }

    let response
    switch (method) {
      case 'GET':
        response = await testClient.get(endpoint, config)
        break
      case 'POST':
        response = await testClient.post(endpoint, data, config)
        break
      case 'PUT':
        response = await testClient.put(endpoint, data, config)
        break
      case 'DELETE':
        response = await testClient.delete(endpoint, config)
        break
      case 'PATCH':
        response = await testClient.patch(endpoint, data, config)
        break
    }

    const duration = Date.now() - startTime
    return {
      endpoint,
      method,
      success: true,
      status: response.status,
      data: response.data,
      duration
    }
  } catch (error: Error | unknown) {
    const duration = Date.now() - startTime
    return {
      endpoint,
      method,
      success: false,
      status: error.response?.status,
      error: error.message,
      duration
    }
  }
}

// ==================== TESTS SUITE ====================

export class ApiEndpointTester {
  private token?: string
  private results: TestResult[] = []

  /**
   * Étape 1 : Connexion et récupération du token
   */
  async authenticate(): Promise<boolean> {
    console.log('🔐 Testing authentication...')
    console.log(`Login: ${DEBUG_LOGIN}`)
    console.log(`Server: ${API_BASE_URL}`)

    // Tester d'abord avec l'endpoint probable (basé sur l'analyse du backend)
    const loginEndpoints = [
      '/api/auth/signin',
      '/api/user/signin',
      '/api/login',
      '/signin'
    ]

    for (const endpoint of loginEndpoints) {
      const result = await testEndpoint('POST', endpoint, {
        email: DEBUG_LOGIN,
        password: DEBUG_PASSWORD
      })

      this.results.push(result)
      logResult(result)

      if (result.success && result.data?.token) {
        this.token = result.data.token
        console.log(`✅ Authentication successful! Token: ${(this.token || '').substring(0, 20)}...`)

        // Configurer le token pour les prochaines requêtes
        testClient.defaults.headers.common['Authorization'] = `Bearer ${this.token}`
        return true
      }
    }

    console.log('❌ Authentication failed on all endpoints')
    return false
  }

  /**
   * Étape 2 : Test du health check
   */
  async testHealthCheck(): Promise<void> {
    console.log('\n🏥 Testing health check...')

    const result = await testEndpoint('GET', '/api/health')
    this.results.push(result)
    logResult(result)
  }

  /**
   * Étape 3 : Test des endpoints machines (nécessite modérateur+)
   */
  async testMachineEndpoints(): Promise<void> {
    console.log('\n🤖 Testing machine endpoints...')

    const machineTests = [
      { method: 'GET' as const, endpoint: API_ENDPOINTS.machines.all },
      { method: 'GET' as const, endpoint: API_ENDPOINTS.machines.allByMod },
      { method: 'GET' as const, endpoint: `${API_ENDPOINTS.machines.findByIdOrMac}?id=1` }
    ]

    for (const test of machineTests) {
      const result = await testEndpoint(test.method, test.endpoint, undefined, this.token)
      this.results.push(result)
      logResult(result)
    }
  }

  /**
   * Étape 4 : Test des endpoints sites
   */
  async testSiteEndpoints(): Promise<void> {
    console.log('\n🏢 Testing site endpoints...')

    const siteTests = [
      { method: 'GET' as const, endpoint: API_ENDPOINTS.sites.list }
    ]

    for (const test of siteTests) {
      const result = await testEndpoint(test.method, test.endpoint, undefined, this.token)
      this.results.push(result)
      logResult(result)
    }
  }

  /**
   * Étape 5 : Test des endpoints utilisateur
   */
  async testUserEndpoints(): Promise<void> {
    console.log('\n👤 Testing user endpoints...')

    const userTests = [
      { method: 'GET' as const, endpoint: '/api/me/hydrate' },
      { method: 'GET' as const, endpoint: '/api/test/user' },
      { method: 'GET' as const, endpoint: '/api/test/mod' }
    ]

    for (const test of userTests) {
      const result = await testEndpoint(test.method, test.endpoint, undefined, this.token)
      this.results.push(result)
      logResult(result)
    }
  }

  /**
   * Étape 6 : Test des endpoints installations
   */
  async testInstallationEndpoints(): Promise<void> {
    console.log('\n🏗️ Testing installation endpoints...')

    const installationTests = [
      { method: 'GET' as const, endpoint: '/api/insta/nearest-base?lat=48.8566&lon=2.3522' }
    ]

    for (const test of installationTests) {
      const result = await testEndpoint(test.method, test.endpoint, undefined, this.token)
      this.results.push(result)
      logResult(result)
    }
  }

  /**
   * Exécuter tous les tests
   */
  async runAllTests(): Promise<TestSummary> {
    console.log('🚀 Starting API endpoints test suite...\n')

    // Étape 1 : Authentification
    const authSuccess = await this.authenticate()

    if (!authSuccess) {
      return this.getSummary()
    }

    // Étape 2 : Tests des endpoints
    await this.testHealthCheck()
    await this.testUserEndpoints()
    await this.testMachineEndpoints()
    await this.testSiteEndpoints()
    await this.testInstallationEndpoints()

    return this.getSummary()
  }

  /**
   * Générer le résumé des tests
   */
  private getSummary(): TestSummary {
    const success = this.results.filter(r => r.success).length
    const failed = this.results.length - success

    return {
      total: this.results.length,
      success,
      failed,
      results: this.results,
      token: this.token
    }
  }

  /**
   * Afficher le résumé final
   */
  printSummary(): void {
    const summary = this.getSummary()

    console.log('\n📊 Test Summary:')
    console.log(`Total endpoints tested: ${summary.total}`)
    console.log(`✅ Success: ${summary.success}`)
    console.log(`❌ Failed: ${summary.failed}`)
    console.log(`Success rate: ${((summary.success / summary.total) * 100).toFixed(1)}%`)

    if (summary.token) {
      console.log(`🔑 Token obtained: ${summary.token.substring(0, 30)}...`)
    }

    // Afficher les échecs pour debug
    const failures = summary.results.filter(r => !r.success)
    if (failures.length > 0) {
      console.log('\n❌ Failed requests:')
      failures.forEach(failure => {
        console.log(`   ${failure.method} ${failure.endpoint} - ${failure.error}`)
      })
    }
  }
}

// ==================== EXECUTION ====================

/**
 * Fonction principale pour exécuter les tests
 */
export async function testApiEndpoints(): Promise<void> {
  const tester = new ApiEndpointTester()

  try {
    await tester.runAllTests()
    tester.printSummary()
  } catch (error) {
    console.error('❌ Test suite failed:', error)
  }
}

// Export pour usage direct
export default testApiEndpoints
