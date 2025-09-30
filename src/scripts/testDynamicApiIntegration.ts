/**
 * Test de l'intégration API dynamique avec OpenAPI Discovery
 * Valide la découverte automatique des routes et leur utilisation
 */

import { createHttpClient } from '@/core/services/api/HttpClient'
import { createOpenApiDiscovery } from '@/core/services/api/OpenApiDiscovery'
import { createDynamicApiService } from '@/core/services/api/DynamicApiService'
import type { DiscoveryResult, DiscoveredEndpoint } from '@/core/services/api/OpenApiDiscovery'

// ==================== CONFIGURATION ====================

const API_BASE_URL = import.meta.env.VITE_SERVER_ADDRESS_LOCAL || 'http://localhost:3313'
const DEBUG_LOGIN = import.meta.env.VITE_DEBUG_MODERATOR_LOGIN || 'moderator1@test.com'
const DEBUG_PASSWORD = import.meta.env.VITE_DEBUG_MODERATOR_PASSWORD || 'test'

// ==================== TYPES ====================

interface TestResult {
  testName: string
  success: boolean
  data?: any
  error?: string
  duration: number
}

interface IntegrationTestSummary {
  discoveryResult: DiscoveryResult | null
  endpointsFound: number
  operationsExecuted: number
  testsResults: TestResult[]
  totalDuration: number
  successRate: number
}

// ==================== TEST UTILITIES ====================

class DynamicApiIntegrationTester {
  private httpClient = createHttpClient({ baseURL: API_BASE_URL })
  private discoveryService = createOpenApiDiscovery(this.httpClient)
  private dynamicApiService = createDynamicApiService(this.httpClient)
  private testResults: TestResult[] = []
  private authToken?: string

  /**
   * Exécuter un test avec mesure de performance
   */
  private async runTest<T>(
    testName: string,
    testFn: () => Promise<T>
  ): Promise<{ result: TestResult; data?: T }> {
    const startTime = Date.now()

    try {
      console.log(`🧪 Running: ${testName}`)

      const data = await testFn()
      const duration = Date.now() - startTime

      const result: TestResult = {
        testName,
        success: true,
        data,
        duration
      }

      this.testResults.push(result)
      console.log(`✅ ${testName} - ${duration}ms`)

      return { result, data }
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      const result: TestResult = {
        testName,
        success: false,
        error: errorMessage,
        duration
      }

      this.testResults.push(result)
      console.log(`❌ ${testName} - ${errorMessage} (${duration}ms)`)

      return { result }
    }
  }

  /**
   * Test 1: Connexion au backend et authentification
   */
  async testAuthentication(): Promise<void> {
    const { data } = await this.runTest('Backend Authentication', async () => {
      const response = await this.httpClient.post('/api/auth/signin', {
        email: DEBUG_LOGIN,
        password: DEBUG_PASSWORD
      })

      if (!response.success || !response.data) {
        throw new Error('Authentication failed - no data received')
      }

      const data = response.data as any
      if (!data.token) {
        throw new Error('Authentication failed - no token received')
      }

      this.authToken = data.token
      await this.httpClient.setAuthToken(this.authToken)

      return {
        token: this.authToken.substring(0, 20) + '...',
        user: data.user
      }
    })

    if (data?.token) {
      console.log(`🔑 Authentication successful, token: ${data.token}`)
    }
  }

  /**
   * Test 2: Vérification de la santé de l'API OpenAPI
   */
  async testOpenApiHealth(): Promise<void> {
    await this.runTest('OpenAPI Health Check', async () => {
      const health = await this.discoveryService.checkApiHealth()

      if (!health || !health.healthy) {
        throw new Error('OpenAPI service is not healthy')
      }

      return {
        service: health.service,
        version: health.version,
        endpoints: health.endpoints_documented
      }
    })
  }

  /**
   * Test 3: Récupération des informations API
   */
  async testApiInfo(): Promise<void> {
    await this.runTest('API Info Retrieval', async () => {
      const apiInfo = await this.discoveryService.getApiInfo()

      if (!apiInfo) {
        throw new Error('Failed to retrieve API info')
      }

      return {
        title: apiInfo.title,
        version: apiInfo.version,
        endpoints_count: apiInfo.endpoints_count,
        schemas_count: apiInfo.schemas_count,
        tags: apiInfo.tags
      }
    })
  }

  /**
   * Test 4: Découverte complète des endpoints
   */
  async testFullDiscovery(): Promise<DiscoveryResult> {
    const { data } = await this.runTest('Full API Discovery', async () => {
      const discovery = await this.discoveryService.discoverApi({ forceRefresh: true })

      if (!discovery.success) {
        throw new Error(`Discovery failed: ${discovery.errors.join(', ')}`)
      }

      return discovery
    })

    return data!
  }

  /**
   * Test 5: Découverte des endpoints par tag
   */
  async testEndpointsByTag(discovery: DiscoveryResult): Promise<void> {
    const tags = ['Authentication', 'Machines', 'Sites', 'Installations']

    for (const tag of tags) {
      await this.runTest(`Endpoints Discovery - ${tag}`, async () => {
        const endpoints = await this.discoveryService.getEndpoints({ tag })

        return {
          tag,
          count: endpoints.length,
          paths: endpoints.map(e => `${e.method} ${e.path}`)
        }
      })
    }
  }

  /**
   * Test 6: Service API dynamique - découverte
   */
  async testDynamicServiceDiscovery(): Promise<void> {
    await this.runTest('Dynamic API Service Discovery', async () => {
      await this.dynamicApiService.discoverEndpoints(true)

      const stats = this.dynamicApiService.getStats()

      if (stats.endpointsDiscovered === 0) {
        throw new Error('No endpoints discovered by dynamic service')
      }

      return stats
    })
  }

  /**
   * Test 7: Création et exécution d'opérations dynamiques
   */
  async testDynamicOperations(): Promise<void> {
    // Test GET /api/health
    await this.runTest('Dynamic Operation - Health Check', async () => {
      const operation = this.dynamicApiService.createOperation('/health', 'GET')

      if (!operation) {
        throw new Error('Failed to create health check operation')
      }

      const response = await operation.call()

      if (!response.success) {
        throw new Error('Health check operation failed')
      }

      return response.data
    })

    // Test GET /api/me/hydrate (avec auth)
    if (this.authToken) {
      await this.runTest('Dynamic Operation - User Hydrate', async () => {
        const operation = this.dynamicApiService.createOperation('/api/me/hydrate', 'GET')

        if (!operation) {
          throw new Error('Failed to create hydrate operation')
        }

        const response = await operation.call()

        if (!response.success) {
          throw new Error('User hydrate operation failed')
        }

        return {
          user: response.data?.user,
          authenticated: true
        }
      })
    }

    // Test GET /api/machine/all (avec auth)
    if (this.authToken) {
      await this.runTest('Dynamic Operation - Get Machines', async () => {
        const operation = this.dynamicApiService.createOperation('/api/machine/all', 'GET')

        if (!operation) {
          throw new Error('Failed to create machines operation')
        }

        const response = await operation.call()

        // Note: peut retourner une erreur d'autorisation selon le rôle
        return {
          success: response.success,
          machinesCount: Array.isArray(response.data) ? response.data.length : 0,
          status: response.success ? 'authorized' : 'unauthorized'
        }
      })
    }
  }

  /**
   * Test 8: Méthodes de convenance de l'API dynamique
   */
  async testConvenienceMethods(): Promise<void> {
    // Test login avec l'API dynamique
    await this.runTest('Dynamic API - Login Method', async () => {
      const response = await this.dynamicApiService.login({
        email: DEBUG_LOGIN,
        password: DEBUG_PASSWORD
      })

      if (!response.success) {
        throw new Error('Dynamic login failed')
      }

      return {
        tokenReceived: !!response.data?.token,
        user: response.data?.user?.email
      }
    })

    // Test getMachines
    await this.runTest('Dynamic API - Get Machines Method', async () => {
      const response = await this.dynamicApiService.getMachines()

      return {
        success: response.success,
        machinesCount: Array.isArray(response.data) ? response.data.length : 0
      }
    })

    // Test getSites
    await this.runTest('Dynamic API - Get Sites Method', async () => {
      const response = await this.dynamicApiService.getSites()

      return {
        success: response.success,
        sitesCount: Array.isArray(response.data) ? response.data.length : 0
      }
    })
  }

  /**
   * Test 9: Performance et cache
   */
  async testPerformanceAndCache(): Promise<void> {
    // Premier appel - cache miss
    await this.runTest('Discovery Performance - First Call', async () => {
      this.discoveryService.clearCache()
      const startTime = Date.now()

      const discovery = await this.discoveryService.discoverApi()
      const duration = Date.now() - startTime

      return {
        endpointsFound: discovery.endpoints.length,
        duration,
        fromCache: false
      }
    })

    // Deuxième appel - cache hit
    await this.runTest('Discovery Performance - Cached Call', async () => {
      const startTime = Date.now()

      const discovery = await this.discoveryService.discoverApi()
      const duration = Date.now() - startTime

      return {
        endpointsFound: discovery.endpoints.length,
        duration,
        fromCache: true
      }
    })
  }

  /**
   * Exécuter tous les tests
   */
  async runAllTests(): Promise<IntegrationTestSummary> {
    console.log('🚀 Starting Dynamic API Integration Tests')
    console.log(`📡 Backend URL: ${API_BASE_URL}`)
    console.log(`👤 Test User: ${DEBUG_LOGIN}\n`)

    const overallStartTime = Date.now()
    let discoveryResult: DiscoveryResult | null = null

    try {
      // Phase 1: Tests de connexion
      console.log('📡 Phase 1: Backend Connection')
      await this.testAuthentication()
      await this.testOpenApiHealth()
      await this.testApiInfo()

      // Phase 2: Tests de découverte
      console.log('\n🔍 Phase 2: API Discovery')
      discoveryResult = await this.testFullDiscovery()
      await this.testEndpointsByTag(discoveryResult)

      // Phase 3: Tests du service dynamique
      console.log('\n⚡ Phase 3: Dynamic API Service')
      await this.testDynamicServiceDiscovery()
      await this.testDynamicOperations()
      await this.testConvenienceMethods()

      // Phase 4: Tests de performance
      console.log('\n🏎️ Phase 4: Performance & Cache')
      await this.testPerformanceAndCache()

    } catch (error) {
      console.error('💥 Test suite failed:', error)
    }

    const totalDuration = Date.now() - overallStartTime
    const successCount = this.testResults.filter(r => r.success).length
    const successRate = (successCount / this.testResults.length) * 100

    return {
      discoveryResult,
      endpointsFound: discoveryResult?.endpoints.length || 0,
      operationsExecuted: this.testResults.length,
      testsResults: this.testResults,
      totalDuration,
      successRate
    }
  }

  /**
   * Afficher le résumé final
   */
  printSummary(summary: IntegrationTestSummary): void {
    console.log('\n' + '='.repeat(60))
    console.log('📊 DYNAMIC API INTEGRATION TEST SUMMARY')
    console.log('='.repeat(60))

    console.log(`🎯 Success Rate: ${summary.successRate.toFixed(1)}%`)
    console.log(`⏱️ Total Duration: ${summary.totalDuration}ms`)
    console.log(`🔍 Endpoints Discovered: ${summary.endpointsFound}`)
    console.log(`⚡ Operations Executed: ${summary.operationsExecuted}`)

    // Détails de la découverte
    if (summary.discoveryResult) {
      const discovery = summary.discoveryResult
      console.log('\n📋 Discovery Details:')
      console.log(`  • API Title: ${discovery.apiInfo?.title || 'Unknown'}`)
      console.log(`  • API Version: ${discovery.apiInfo?.version || 'Unknown'}`)
      console.log(`  • Total Endpoints: ${discovery.endpoints.length}`)
      console.log(`  • Total Schemas: ${Object.keys(discovery.schemas).length}`)

      // Tags découverts
      const tags = [...new Set(discovery.endpoints.flatMap(e => e.tags))]
      console.log(`  • Tags: ${tags.join(', ')}`)
    }

    // Résultats des tests
    const successful = summary.testsResults.filter(r => r.success)
    const failed = summary.testsResults.filter(r => !r.success)

    console.log(`\n✅ Successful Tests (${successful.length}):`)
    successful.forEach(test => {
      console.log(`  • ${test.testName} (${test.duration}ms)`)
    })

    if (failed.length > 0) {
      console.log(`\n❌ Failed Tests (${failed.length}):`)
      failed.forEach(test => {
        console.log(`  • ${test.testName}: ${test.error}`)
      })
    }

    // Recommandations
    console.log('\n💡 Recommendations:')
    if (summary.successRate >= 90) {
      console.log('  🎉 Excellent! The dynamic API integration is working perfectly.')
    } else if (summary.successRate >= 70) {
      console.log('  👍 Good! Most features are working, review failed tests.')
    } else {
      console.log('  ⚠️ Needs attention! Several integration issues detected.')
    }

    if (summary.endpointsFound === 0) {
      console.log('  🔧 Check backend OpenAPI service configuration')
    }

    console.log('\n' + '='.repeat(60))
  }
}

// ==================== EXECUTION FUNCTIONS ====================

/**
 * Fonction principale pour exécuter les tests d'intégration
 */
export async function testDynamicApiIntegration(): Promise<IntegrationTestSummary> {
  const tester = new DynamicApiIntegrationTester()

  try {
    const summary = await tester.runAllTests()
    tester.printSummary(summary)
    return summary
  } catch (error) {
    console.error('💥 Integration test suite failed:', error)
    throw error
  }
}

/**
 * Test rapide de vérification
 */
export async function quickDynamicApiTest(): Promise<boolean> {
  console.log('⚡ Quick Dynamic API Test')

  try {
    const httpClient = createHttpClient({ baseURL: API_BASE_URL })
    const discovery = createOpenApiDiscovery(httpClient)

    // Test simple de découverte
    const result = await discovery.discoverApi()

    if (result.success && result.endpoints.length > 0) {
      console.log(`✅ Quick test passed: ${result.endpoints.length} endpoints discovered`)
      return true
    } else {
      console.log('❌ Quick test failed: No endpoints discovered')
      return false
    }
  } catch (error) {
    console.log('❌ Quick test failed:', error)
    return false
  }
}

// Export par défaut
export default testDynamicApiIntegration