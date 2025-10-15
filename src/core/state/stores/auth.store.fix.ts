/**
 * Fix pour l'état d'authentification
 * Correction des problèmes d'hydratation et de synchronisation
 */

import { storageManager } from '@/core/services/storage/StorageManager'
import { stateLog } from '@/core/utils/logger'

// ==================== STORAGE SYNC FIX ====================

export const authStorageFix = {
  /**
   * Valider et synchroniser l'état d'authentification
   * Cette fonction nettoie les états incohérents et re-synchronise
   */
  async validateAndSyncAuthState(): Promise<{
    isValid: boolean
    issues: string[]
    fixed: boolean
    recommendation: string
  }> {
    const issues: string[] = []
    let fixed = false

    try {
      stateLog.debug('🔍 Validating auth state...')

      // 1. Vérifier les clés de storage
      const [
        tokenRes,
        sessionRes,
        userData,
        lastActivity
      ] = await Promise.all([
        storageManager.getWithFallback('auth_token'),
        storageManager.getWithFallback('user_session'),
        storageManager.get('user_data'),
        storageManager.get('last_activity')
      ])

      const secureToken = tokenRes?.value
      const secureSession = sessionRes?.value

      // 2. Vérifier aussi les clés Capacitor
      const [
        capacitorToken,
        capacitorSession
      ] = await Promise.all([
        storageManager.get('CapacitorStorage.secure_auth_token'),
        storageManager.get('CapacitorStorage.secure_user_session')
      ])

      stateLog.debug('📦 Storage analysis:', {
        secureToken: !!secureToken,
        secureSession: !!secureSession,
        userData: !!userData,
        lastActivity: !!lastActivity,
        capacitorToken: !!capacitorToken,
        capacitorSession: !!capacitorSession
      })

      // 3. Détecter les incohérences
      const hasToken = secureToken || capacitorToken
      const hasSession = secureSession || capacitorSession
      const hasUser = userData

      if (hasToken && !hasSession) {
        issues.push('Token présent mais session manquante')
      }

      if (hasSession && !hasToken) {
        issues.push('Session présente mais token manquant')
      }

      if ((hasToken || hasSession) && !hasUser) {
        issues.push('Données d\'authentification présentes mais utilisateur manquant')
      }

      if (hasUser && !hasToken && !hasSession) {
        issues.push('Utilisateur présent mais authentification manquante')
      }

      // 4. Vérifier la validité des sessions
      if (hasSession) {
        const session = secureSession || capacitorSession
        if (session && typeof session === 'object' && 'expiresAt' in session) {
          const expiration = (session as { expiresAt?: string | number | Date }).expiresAt
          if (expiration) {
            const expirationDate = new Date(expiration)
            if (!Number.isNaN(expirationDate.getTime()) && expirationDate.getTime() < Date.now()) {
              issues.push('Session expirée')
            }
          }
        }
      }

      // 5. Tentative de correction automatique
      if (issues.length > 0) {
        stateLog.warn('⚠️ Issues detected, attempting automatic fix...', { issues })

        // Si tout est corrompu, nettoyer complètement
        if (issues.length >= 3) {
          await this.clearAllAuthStorage()
          fixed = true
          stateLog.info('🧹 Cleared corrupted auth storage')
        }
        // Si seule une partie est corrompue, essayer de réparer
        else if (hasUser && hasToken && !hasSession) {
          // Recréer une session basique
          const basicSession = {
            refreshToken: '',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
            permissions: ['read'],
            roles: ['user']
          }
          await storageManager.setWithFallback('user_session', basicSession)
          fixed = true
          stateLog.info('🔧 Recreated basic session')
        }
      }

      const isValid = issues.length === 0
      let recommendation = 'État d\'authentification valide'

      if (!isValid && !fixed) {
        recommendation = 'Nettoyer le storage et reconnecter l\'utilisateur'
      } else if (fixed) {
        recommendation = 'Corrections appliquées, recharger la page recommandé'
      }

      return {
        isValid,
        issues,
        fixed,
        recommendation
      }

    } catch (error) {
      stateLog.error('❌ Auth state validation failed', { error })
      return {
        isValid: false,
        issues: [`Erreur de validation: ${error}`],
        fixed: false,
        recommendation: 'Nettoyer le storage manuellement'
      }
    }
  },

  /**
   * Nettoyer complètement le storage d'authentification
   */
  async clearAllAuthStorage(): Promise<void> {
    const keys = [
      // Clés standards
      'auth_token',
      'user_session',
      'user_data',
      'last_activity',
      // Clés Capacitor
      'CapacitorStorage.secure_auth_token',
      'CapacitorStorage.secure_user_session',
      // Clés Zustand éventuelles
      'trackbee-auth-store',
      'auth-store'
    ]

    await Promise.all([
      // Clear storage manager (multi-backend)
      ...keys.flatMap(key => (
        ['secure','preferences','local'].map(type => {
          try {
            // @ts-expect-error: type narrowed
            return storageManager.remove(key, { type }).catch(() => {})
          } catch {
            // Silently ignore
            return Promise.resolve()
          }
        })
      )),
      // Clear localStorage directement
      ...keys.map(key => {
        try { localStorage.removeItem(key) } catch { /* Silently ignore */ }
      })
    ])

    stateLog.info('🧹 All auth storage cleared')
  },

  /**
   * Diagnostiquer l'état complet du storage
   */
  async diagnosePersistentState(): Promise<{
    localStorage: Record<string, unknown>
    storageManager: Record<string, unknown>
    recommendations: string[]
  }> {
    const diagnosis = {
      localStorage: {} as Record<string, unknown>,
      storageManager: {} as Record<string, unknown>,
      recommendations: [] as string[]
    }

    // Analyser localStorage
    const authKeys = [
      'CapacitorStorage.secure_auth_token',
      'CapacitorStorage.secure_user_session',
      'auth_token',
      'user_data',
      'last_activity',
      'token_expiry',
      'app:last_initialized'
    ]

    for (const key of authKeys) {
      try {
        const value = localStorage.getItem(key)
        if (value) {
          diagnosis.localStorage[key] = JSON.parse(value)
        }
      } catch {
        const value = localStorage.getItem(key)
        if (value) {
          diagnosis.localStorage[key] = value
        }
      }
    }

    // Analyser via StorageManager
    for (const key of authKeys) {
      try {
        const value = await storageManager.get(key)
        if (value) {
          diagnosis.storageManager[key] = value
        }
      } catch (error) {
        diagnosis.storageManager[key] = `Error: ${error}`
      }
    }

    // Générer recommendations
    const localStorageCount = Object.keys(diagnosis.localStorage).length
    const storageManagerCount = Object.keys(diagnosis.storageManager).length

    if (localStorageCount === 0 && storageManagerCount === 0) {
      diagnosis.recommendations.push('Aucune donnée d\'authentification trouvée - utilisateur non connecté')
    } else if (localStorageCount > storageManagerCount) {
      diagnosis.recommendations.push('Plus de données en localStorage qu\'en StorageManager - possible incohérence')
    } else if (storageManagerCount > localStorageCount) {
      diagnosis.recommendations.push('Plus de données en StorageManager qu\'en localStorage - vérifier la synchronisation')
    }

    if (diagnosis.localStorage['CapacitorStorage.secure_auth_token'] && !diagnosis.localStorage['CapacitorStorage.secure_user_session']) {
      diagnosis.recommendations.push('Token présent mais session manquante - possible corruption')
    }

    return diagnosis
  },

  /**
   * Forcer la synchronisation des données d'authentification
   */
  async forceSyncAuthData(): Promise<boolean> {
    try {
      // Essayer de récupérer les données depuis différentes sources
      const [tokenRes2, sessionRes2, userData, capacitorToken, capacitorSession] = await Promise.all([
        storageManager.getWithFallback('auth_token'),
        storageManager.getWithFallback('user_session'),
        storageManager.get('user_data'),
        storageManager.get('CapacitorStorage.secure_auth_token'),
        storageManager.get('CapacitorStorage.secure_user_session')
      ])

      const secureToken = tokenRes2?.value
      const secureSession = sessionRes2?.value

      // Utiliser la meilleure source disponible
      const bestToken = secureToken || capacitorToken
      const bestSession = secureSession || capacitorSession

      if (bestToken && bestSession && userData) {
        // Re-sauvegarder dans le format standard
        await Promise.all([
          storageManager.setWithFallback('auth_token', bestToken),
          storageManager.setWithFallback('user_session', bestSession),
          storageManager.set('user_data', userData),
          storageManager.set('last_activity', new Date().toISOString())
        ])

        stateLog.info('✅ Auth data synchronized successfully')
        return true
      }

      return false
    } catch (error) {
      stateLog.error('❌ Failed to sync auth data', { error })
      return false
    }
  }
}

// Exposer les utilitaires en développement
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  Object.assign(window, {
    TrackBeeAuthFix: authStorageFix
  })
}
