/**
 * Correctif complet pour les problèmes d'authentification
 * Résout les problèmes de synchronisation entre ProfileButton et auth.store
 */

import { stateLog } from '@/core/utils/logger'
import { storageManager } from '@/core/services/storage/StorageManager'
import { database } from '@/core/database/schema'
import { AuthService } from '@/core/services/api/services/AuthService'

export class AuthComprehensiveFix {
  /**
   * Forcer une synchronisation complète de l'authentification
   */
  static async forceFullSync(): Promise<{
    success: boolean
    issues: string[]
    actions: string[]
  }> {
    const issues: string[] = []
    const actions: string[] = []

    try {
      stateLog.info('🔄 Starting comprehensive auth sync...')

      // 1. Vérifier l'état actuel
      const currentState = await this.getCurrentAuthState()
      actions.push('Analyzed current auth state')

      // 2. Vérifier les données stockées
      const storageData = await this.analyzeStorageData()
      actions.push('Analyzed storage data')

      // 3. Forcer la re-synchronisation si nécessaire
      if (currentState.hasAuthData && !currentState.isUserLoaded) {
        stateLog.warn('🔧 User data missing but auth data exists - forcing reload')
        issues.push('User data missing despite auth data presence')

        try {
          // Importer dynamiquement le store pour éviter les dépendances circulaires
          const { useAuthStore } = await import('./auth.store')
          const authStore = useAuthStore.getState()

          // Force re-initialization
          await authStore.initialize()
          actions.push('Forced auth store re-initialization')

          // Force data hydration if authenticated
          if (authStore.isAuthenticated && authStore.user) {
            await authStore.hydrateUserData()
            actions.push('Forced user data hydration')
          }
        } catch (error) {
          issues.push(`Re-sync failed: ${error}`)
        }
      }

      // 4. Vérifier la cohérence des données
      const coherenceCheck = await this.checkDataCoherence()
      if (!coherenceCheck.isCoherent) {
        issues.push(...coherenceCheck.issues)
        actions.push('Detected data coherence issues')
      }

      // 5. Nettoyer les données corrompues si nécessaire
      if (issues.length > 2) {
        stateLog.warn('🧹 Too many issues detected - triggering cleanup')
        await this.cleanupCorruptedData()
        actions.push('Cleaned up corrupted data')
      }

      stateLog.info('✅ Comprehensive auth sync completed', {
        issues: issues.length,
        actions: actions.length
      })

      return {
        success: issues.length < 3, // Considéré comme succès si moins de 3 problèmes
        issues,
        actions
      }

    } catch (error) {
      stateLog.error('❌ Comprehensive auth sync failed', { error })
      issues.push(`Sync process failed: ${error}`)

      return {
        success: false,
        issues,
        actions
      }
    }
  }

  /**
   * Analyser l'état actuel de l'authentification
   */
  private static async getCurrentAuthState(): Promise<{
    hasAuthData: boolean
    isUserLoaded: boolean
    hasToken: boolean
    hasSession: boolean
  }> {
    try {
      // Importer dynamiquement pour éviter les dépendances circulaires
      const { useAuthStore } = await import('./auth.store')
      const authState = useAuthStore.getState()

      return {
        hasAuthData: authState.isAuthenticated || !!authState.token,
        isUserLoaded: !!authState.user && !!authState.user.email,
        hasToken: !!authState.token,
        hasSession: !!authState.session
      }
    } catch (error) {
      stateLog.error('Failed to get current auth state', { error })
      return {
        hasAuthData: false,
        isUserLoaded: false,
        hasToken: false,
        hasSession: false
      }
    }
  }

  /**
   * Analyser les données de stockage
   */
  private static async analyzeStorageData(): Promise<{
    localStorageKeys: number
    secureStorageKeys: number
    indexedDBRecords: number
  }> {
    try {
      // Vérifier localStorage
      const authKeys = [
        'CapacitorStorage.secure_auth_token',
        'CapacitorStorage.secure_user_session',
        'auth_token',
        'user_data',
        'last_activity'
      ]

      const localStorageKeys = authKeys.filter(key => localStorage.getItem(key) !== null).length

      // Vérifier secure storage
      const secureKeys = await Promise.all([
        storageManager.get('auth_token', { type: 'secure' }),
        storageManager.get('user_session', { type: 'secure' }),
        storageManager.get('user_data')
      ])

      const secureStorageKeys = secureKeys.filter(key => key !== null).length

      // Vérifier IndexedDB
      let indexedDBRecords = 0
      try {
        const users = await database.users.count()
        const sites = await database.sites.count()
        const machines = await database.machines.count()
        indexedDBRecords = users + sites + machines
      } catch (error) {
        stateLog.warn('IndexedDB analysis failed', { error })
      }

      return {
        localStorageKeys,
        secureStorageKeys,
        indexedDBRecords
      }
    } catch (error) {
      stateLog.error('Storage analysis failed', { error })
      return {
        localStorageKeys: 0,
        secureStorageKeys: 0,
        indexedDBRecords: 0
      }
    }
  }

  /**
   * Vérifier la cohérence des données
   */
  private static async checkDataCoherence(): Promise<{
    isCoherent: boolean
    issues: string[]
  }> {
    const issues: string[] = []

    try {
      // Vérifier la cohérence token/session/user
      const [token, session, user] = await Promise.all([
        storageManager.get('auth_token', { type: 'secure' }),
        storageManager.get('user_session', { type: 'secure' }),
        storageManager.get('user_data')
      ])

      if (token && !session) {
        issues.push('Token exists but session is missing')
      }

      if (session && !token) {
        issues.push('Session exists but token is missing')
      }

      if ((token || session) && !user) {
        issues.push('Auth data exists but user data is missing')
      }

      if (user && !token && !session) {
        issues.push('User data exists but auth data is missing')
      }

      // Vérifier l'expiration de session
      if (session && typeof session === 'object' && session.expiresAt) {
        const expirationDate = new Date(session.expiresAt)
        if (expirationDate.getTime() < Date.now()) {
          issues.push('Session has expired')
        }
      }

      return {
        isCoherent: issues.length === 0,
        issues
      }
    } catch (error) {
      issues.push(`Coherence check failed: ${error}`)
      return {
        isCoherent: false,
        issues
      }
    }
  }

  /**
   * Nettoyer les données corrompues
   */
  private static async cleanupCorruptedData(): Promise<void> {
    try {
      stateLog.info('🧹 Cleaning up corrupted auth data...')

      // Nettoyer le storage
      const authKeys = [
        'auth_token',
        'user_session',
        'user_data',
        'last_activity',
        'CapacitorStorage.secure_auth_token',
        'CapacitorStorage.secure_user_session'
      ]

      await Promise.all([
        ...authKeys.map(key => storageManager.remove(key, { type: 'secure' }).catch(() => {})),
        ...authKeys.map(key => storageManager.remove(key).catch(() => {})),
        ...authKeys.map(key => {
          try {
            localStorage.removeItem(key)
          } catch {}
        })
      ])

      // Réinitialiser le store auth
      const { useAuthStore } = await import('./auth.store')
      const authStore = useAuthStore.getState()
      authStore.cleanup()

      stateLog.info('✅ Corrupted data cleanup completed')
    } catch (error) {
      stateLog.error('❌ Cleanup failed', { error })
    }
  }

  /**
   * Diagnostique rapide pour debug
   */
  static async quickDiagnostic(): Promise<{
    summary: string
    details: Record<string, any>
    recommendations: string[]
  }> {
    try {
      const authState = await this.getCurrentAuthState()
      const storageData = await this.analyzeStorageData()
      const coherence = await this.checkDataCoherence()

      const details = {
        authState,
        storageData,
        coherence,
        timestamp: new Date().toISOString()
      }

      const recommendations: string[] = []

      if (!authState.hasAuthData && storageData.localStorageKeys === 0) {
        recommendations.push('User appears to be logged out - no issues detected')
      } else if (authState.hasAuthData && !authState.isUserLoaded) {
        recommendations.push('Force reload auth state - user data missing')
      } else if (!coherence.isCoherent) {
        recommendations.push('Clean up inconsistent auth data')
      } else {
        recommendations.push('Auth state appears healthy')
      }

      const summary = recommendations[0] || 'Unknown state'

      return {
        summary,
        details,
        recommendations
      }
    } catch (error) {
      return {
        summary: 'Diagnostic failed',
        details: { error: String(error) },
        recommendations: ['Check console for errors']
      }
    }
  }
}

// Exposer en dev
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  Object.assign(window, {
    TrackBeeAuthFix: AuthComprehensiveFix
  })
}