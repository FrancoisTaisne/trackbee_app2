/**
 * Analyseur complet de l'hydratation
 * Outil avancé pour analyser l'état complet d'hydratation
 * localhost + IndexedDB + StorageManager + Zustand
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/core/state/stores/auth.store'
import { authStorageFix } from '@/core/state/stores/auth.store.fix'
import { storageManager } from '@/core/services/storage/StorageManager'
import { database } from '@/core/database/schema'

interface HydrationAnalysis {
  timestamp: string
  localStorage: {
    count: number
    keys: string[]
    authKeys: Record<string, any>
    capacitorKeys: Record<string, any>
    zustandKeys: Record<string, any>
  }
  storageManager: {
    secureCount: number
    regularCount: number
    authData: Record<string, any>
  }
  indexedDB: {
    exists: boolean
    version: number
    stores: string[]
    users: any[]
    machines: any[]
    sites: any[]
    installations: any[]
    appState: Record<string, any>
  }
  zustandState: {
    isAuthenticated: boolean
    isLoading: boolean
    isInitialized: boolean
    user: any
    session: any
    token: boolean
  }
  consistency: {
    score: number
    issues: string[]
    recommendations: string[]
  }
}

export const ComprehensiveHydrationAnalyzer: React.FC = () => {
  const authState = useAuthStore()
  const [analysis, setAnalysis] = useState<HydrationAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const performCompleteAnalysis = useCallback(async (): Promise<HydrationAnalysis> => {
    const timestamp = new Date().toISOString()

    // 1. Analyser localStorage
    const localStorageAnalysis = {
      count: localStorage.length,
      keys: Object.keys(localStorage),
      authKeys: {} as Record<string, any>,
      capacitorKeys: {} as Record<string, any>,
      zustandKeys: {} as Record<string, any>
    }

    // Analyser les clés d'authentification
    const authKeyPatterns = [
      'auth_token', 'user_data', 'last_activity', 'token_expiry',
      'user_session', 'app:last_initialized'
    ]

    for (const key of authKeyPatterns) {
      const value = localStorage.getItem(key)
      if (value) {
        try {
          localStorageAnalysis.authKeys[key] = JSON.parse(value)
        } catch {
          localStorageAnalysis.authKeys[key] = value
        }
      }
    }

    // Analyser les clés Capacitor
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('CapacitorStorage.')) {
        const value = localStorage.getItem(key)
        if (value) {
          try {
            localStorageAnalysis.capacitorKeys[key] = JSON.parse(value)
          } catch {
            localStorageAnalysis.capacitorKeys[key] = value
          }
        }
      }
    })

    // Analyser les clés Zustand
    Object.keys(localStorage).forEach(key => {
      if (key.includes('zustand') || key.includes('store') || key.includes('trackbee')) {
        const value = localStorage.getItem(key)
        if (value) {
          try {
            localStorageAnalysis.zustandKeys[key] = JSON.parse(value)
          } catch {
            localStorageAnalysis.zustandKeys[key] = value
          }
        }
      }
    })

    // 2. Analyser StorageManager
    const storageManagerAnalysis = {
      secureCount: 0,
      regularCount: 0,
      authData: {} as Record<string, any>
    }

    try {
      const authKeys = ['auth_token', 'user_session', 'user_data', 'last_activity']
      for (const key of authKeys) {
        // Test secure
        try {
          const secureValue = await storageManager.get(key, { type: 'secure' })
          if (secureValue) {
            storageManagerAnalysis.authData[`${key}_secure`] = secureValue
            storageManagerAnalysis.secureCount++
          }
        } catch {}

        // Test regular
        try {
          const regularValue = await storageManager.get(key)
          if (regularValue) {
            storageManagerAnalysis.authData[`${key}_regular`] = regularValue
            storageManagerAnalysis.regularCount++
          }
        } catch {}
      }
    } catch (error) {
      console.warn('StorageManager analysis failed:', error)
    }

    // 3. Analyser IndexedDB
    const indexedDBAnalysis = {
      exists: false,
      version: 0,
      stores: [] as string[],
      users: [] as any[],
      machines: [] as any[],
      sites: [] as any[],
      installations: [] as any[],
      appState: {} as Record<string, any>
    }

    try {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('trackbeeDB')
        request.onsuccess = () => {
          indexedDBAnalysis.exists = true
          resolve(request.result)
        }
        request.onerror = () => reject(request.error)
      })

      indexedDBAnalysis.version = db.version
      indexedDBAnalysis.stores = Array.from(db.objectStoreNames)

      // Analyser chaque store
      if (db.objectStoreNames.contains('users')) {
        const tx = db.transaction(['users'], 'readonly')
        const store = tx.objectStore('users')
        indexedDBAnalysis.users = await new Promise(resolve => {
          const req = store.getAll()
          req.onsuccess = () => resolve(req.result)
        })
      }

      if (db.objectStoreNames.contains('machines')) {
        const tx = db.transaction(['machines'], 'readonly')
        const store = tx.objectStore('machines')
        indexedDBAnalysis.machines = await new Promise(resolve => {
          const req = store.getAll()
          req.onsuccess = () => resolve(req.result)
        })
      }

      if (db.objectStoreNames.contains('sites')) {
        const tx = db.transaction(['sites'], 'readonly')
        const store = tx.objectStore('sites')
        indexedDBAnalysis.sites = await new Promise(resolve => {
          const req = store.getAll()
          req.onsuccess = () => resolve(req.result)
        })
      }

      if (db.objectStoreNames.contains('installations')) {
        const tx = db.transaction(['installations'], 'readonly')
        const store = tx.objectStore('installations')
        indexedDBAnalysis.installations = await new Promise(resolve => {
          const req = store.getAll()
          req.onsuccess = () => resolve(req.result)
        })
      }

      if (db.objectStoreNames.contains('appState')) {
        const tx = db.transaction(['appState'], 'readonly')
        const store = tx.objectStore('appState')
        const allAppState = await new Promise<any[]>(resolve => {
          const req = store.getAll()
          req.onsuccess = () => resolve(req.result)
        })
        allAppState.forEach(item => {
          indexedDBAnalysis.appState[item.key] = item.value
        })
      }

      db.close()
    } catch (error) {
      console.warn('IndexedDB analysis failed:', error)
    }

    // 4. Analyser l'état Zustand
    const zustandAnalysis = {
      isAuthenticated: authState.isAuthenticated,
      isLoading: authState.isLoading,
      isInitialized: authState.isInitialized,
      user: authState.user,
      session: authState.session,
      token: !!authState.token
    }

    // 5. Analyser la cohérence
    const consistencyAnalysis = {
      score: 0,
      issues: [] as string[],
      recommendations: [] as string[]
    }

    let maxScore = 0
    let currentScore = 0

    // Vérifier la cohérence token
    maxScore += 10
    const hasLocalToken = !!(localStorageAnalysis.authKeys.auth_token ||
                           localStorageAnalysis.capacitorKeys['CapacitorStorage.secure_auth_token'])
    const hasStorageToken = !!(storageManagerAnalysis.authData.auth_token_secure ||
                             storageManagerAnalysis.authData.auth_token_regular)
    const hasZustandToken = zustandAnalysis.token

    if (hasLocalToken && hasStorageToken && hasZustandToken) {
      currentScore += 10
    } else {
      if (!hasLocalToken) consistencyAnalysis.issues.push('Token manquant en localStorage')
      if (!hasStorageToken) consistencyAnalysis.issues.push('Token manquant en StorageManager')
      if (!hasZustandToken) consistencyAnalysis.issues.push('Token manquant en Zustand')
    }

    // Vérifier la cohérence utilisateur
    maxScore += 10
    const hasLocalUser = !!localStorageAnalysis.authKeys.user_data
    const hasStorageUser = !!(storageManagerAnalysis.authData.user_data_secure ||
                            storageManagerAnalysis.authData.user_data_regular)
    const hasZustandUser = !!zustandAnalysis.user

    if (hasLocalUser && hasStorageUser && hasZustandUser) {
      currentScore += 10
    } else {
      if (!hasLocalUser) consistencyAnalysis.issues.push('Données utilisateur manquantes en localStorage')
      if (!hasStorageUser) consistencyAnalysis.issues.push('Données utilisateur manquantes en StorageManager')
      if (!hasZustandUser) consistencyAnalysis.issues.push('Données utilisateur manquantes en Zustand')
    }

    // Vérifier la cohérence session
    maxScore += 10
    const hasLocalSession = !!(localStorageAnalysis.authKeys.user_session ||
                             localStorageAnalysis.capacitorKeys['CapacitorStorage.secure_user_session'])
    const hasStorageSession = !!(storageManagerAnalysis.authData.user_session_secure ||
                               storageManagerAnalysis.authData.user_session_regular)
    const hasZustandSession = !!zustandAnalysis.session

    if (hasLocalSession && hasStorageSession && hasZustandSession) {
      currentScore += 10
    } else {
      if (!hasLocalSession) consistencyAnalysis.issues.push('Session manquante en localStorage')
      if (!hasStorageSession) consistencyAnalysis.issues.push('Session manquante en StorageManager')
      if (!hasZustandSession) consistencyAnalysis.issues.push('Session manquante en Zustand')
    }

    // Vérifier IndexedDB
    maxScore += 10
    if (indexedDBAnalysis.exists) {
      currentScore += 5
      if (indexedDBAnalysis.machines.length > 0 ||
          indexedDBAnalysis.sites.length > 0 ||
          indexedDBAnalysis.installations.length > 0) {
        currentScore += 5
      } else {
        consistencyAnalysis.issues.push('IndexedDB existe mais est vide')
      }
    } else {
      consistencyAnalysis.issues.push('IndexedDB n\'existe pas')
    }

    // Vérifier l'état d'initialisation
    maxScore += 10
    if (zustandAnalysis.isInitialized && !zustandAnalysis.isLoading) {
      currentScore += 10
    } else {
      if (!zustandAnalysis.isInitialized) consistencyAnalysis.issues.push('Store pas encore initialisé')
      if (zustandAnalysis.isLoading) consistencyAnalysis.issues.push('Store en cours de chargement')
    }

    consistencyAnalysis.score = Math.round((currentScore / maxScore) * 100)

    // Générer des recommandations
    if (consistencyAnalysis.score < 50) {
      consistencyAnalysis.recommendations.push('Nettoyer complètement le storage et reconnecter')
    } else if (consistencyAnalysis.score < 80) {
      consistencyAnalysis.recommendations.push('Synchroniser les données entre les storages')
      consistencyAnalysis.recommendations.push('Vérifier la validité des tokens et sessions')
    } else if (consistencyAnalysis.score < 100) {
      consistencyAnalysis.recommendations.push('Corriger les incohérences mineures détectées')
    } else {
      consistencyAnalysis.recommendations.push('État d\'hydratation optimal')
    }

    return {
      timestamp,
      localStorage: localStorageAnalysis,
      storageManager: storageManagerAnalysis,
      indexedDB: indexedDBAnalysis,
      zustandState: zustandAnalysis,
      consistency: consistencyAnalysis
    }
  }, [authState])

  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true)
    try {
      const result = await performCompleteAnalysis()
      setAnalysis(result)
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }, [performCompleteAnalysis])

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(runAnalysis, 3000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, runAnalysis])

  // Initial analysis
  useEffect(() => {
    runAnalysis()
  }, [runAnalysis])

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400'
    if (score >= 70) return 'text-yellow-400'
    if (score >= 50) return 'text-orange-400'
    return 'text-red-400'
  }

  if (!isExpanded) {
    return (
      <div
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg cursor-pointer z-50 shadow-lg"
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">🔬</span>
          <div className="text-sm">
            <div>Hydration Analyzer</div>
            {analysis && (
              <div className={`font-bold ${getScoreColor(analysis.consistency.score)}`}>
                Score: {analysis.consistency.score}%
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 overflow-auto">
      <div className="container mx-auto p-4 text-white font-mono text-sm">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-blue-400">🔬 Comprehensive Hydration Analyzer</h1>
            {analysis && (
              <div className={`text-lg font-bold ${getScoreColor(analysis.consistency.score)}`}>
                Score: {analysis.consistency.score}%
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <span>Auto-refresh</span>
            </label>
            <button
              onClick={runAnalysis}
              disabled={isAnalyzing}
              className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded disabled:opacity-50"
            >
              {isAnalyzing ? '⏳ Analyzing...' : '🔄 Refresh'}
            </button>
            <button
              onClick={() => setIsExpanded(false)}
              className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* localStorage Analysis */}
            <div className="bg-gray-800 p-4 rounded">
              <h3 className="text-yellow-400 mb-2">📦 localStorage ({analysis.localStorage.count} keys)</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <strong>Auth Keys ({Object.keys(analysis.localStorage.authKeys).length}):</strong>
                  {Object.entries(analysis.localStorage.authKeys).map(([key, value]) => (
                    <div key={key} className="ml-2">
                      <span className="text-blue-300">{key}:</span>
                      <span className={typeof value === 'object' ? 'text-green-300' : 'text-yellow-300'}>
                        {' ' + (typeof value === 'object' ? 'Object' : String(value).substring(0, 30) + '...')}
                      </span>
                    </div>
                  ))}
                </div>
                <div>
                  <strong>Capacitor Keys ({Object.keys(analysis.localStorage.capacitorKeys).length}):</strong>
                  {Object.entries(analysis.localStorage.capacitorKeys).map(([key, value]) => (
                    <div key={key} className="ml-2">
                      <span className="text-blue-300">{key.replace('CapacitorStorage.', '')}:</span>
                      <span className={typeof value === 'object' ? 'text-green-300' : 'text-yellow-300'}>
                        {' ' + (typeof value === 'object' ? 'Object' : String(value).substring(0, 30) + '...')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* StorageManager Analysis */}
            <div className="bg-gray-800 p-4 rounded">
              <h3 className="text-yellow-400 mb-2">🗄️ StorageManager (S:{analysis.storageManager.secureCount} R:{analysis.storageManager.regularCount})</h3>
              <div className="space-y-1 text-xs">
                {Object.entries(analysis.storageManager.authData).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-blue-300">{key}:</span>
                    <span className={typeof value === 'object' ? 'text-green-300' : 'text-yellow-300'}>
                      {' ' + (typeof value === 'object' ? 'Object' : String(value).substring(0, 30) + '...')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* IndexedDB Analysis */}
            <div className="bg-gray-800 p-4 rounded">
              <h3 className="text-yellow-400 mb-2">
                💾 IndexedDB ({analysis.indexedDB.exists ? `v${analysis.indexedDB.version}` : 'N/A'})
              </h3>
              <div className="space-y-1 text-xs">
                <div>Exists: <span className={analysis.indexedDB.exists ? 'text-green-300' : 'text-red-300'}>
                  {String(analysis.indexedDB.exists)}
                </span></div>
                {analysis.indexedDB.exists && (
                  <>
                    <div>Stores: {analysis.indexedDB.stores.join(', ')}</div>
                    <div>Users: <span className="text-green-300">{analysis.indexedDB.users.length}</span></div>
                    <div>Machines: <span className="text-green-300">{analysis.indexedDB.machines.length}</span></div>
                    <div>Sites: <span className="text-green-300">{analysis.indexedDB.sites.length}</span></div>
                    <div>Installations: <span className="text-green-300">{analysis.indexedDB.installations.length}</span></div>
                    <div>AppState: <span className="text-green-300">{Object.keys(analysis.indexedDB.appState).length} keys</span></div>
                  </>
                )}
              </div>
            </div>

            {/* Zustand State Analysis */}
            <div className="bg-gray-800 p-4 rounded">
              <h3 className="text-yellow-400 mb-2">🗄️ Zustand State</h3>
              <div className="space-y-1 text-xs">
                <div>isAuthenticated: <span className={analysis.zustandState.isAuthenticated ? 'text-green-300' : 'text-red-300'}>
                  {String(analysis.zustandState.isAuthenticated)}
                </span></div>
                <div>isInitialized: <span className={analysis.zustandState.isInitialized ? 'text-green-300' : 'text-red-300'}>
                  {String(analysis.zustandState.isInitialized)}
                </span></div>
                <div>isLoading: <span className={analysis.zustandState.isLoading ? 'text-yellow-300' : 'text-green-300'}>
                  {String(analysis.zustandState.isLoading)}
                </span></div>
                <div>hasUser: <span className={analysis.zustandState.user ? 'text-green-300' : 'text-red-300'}>
                  {String(!!analysis.zustandState.user)}
                </span></div>
                <div>hasSession: <span className={analysis.zustandState.session ? 'text-green-300' : 'text-red-300'}>
                  {String(!!analysis.zustandState.session)}
                </span></div>
                <div>hasToken: <span className={analysis.zustandState.token ? 'text-green-300' : 'text-red-300'}>
                  {String(analysis.zustandState.token)}
                </span></div>
              </div>
            </div>

            {/* Consistency Analysis */}
            <div className="bg-gray-800 p-4 rounded lg:col-span-2">
              <h3 className="text-yellow-400 mb-2">📊 Consistency Analysis</h3>
              <div className="space-y-2">
                <div className={`text-lg font-bold ${getScoreColor(analysis.consistency.score)}`}>
                  Overall Score: {analysis.consistency.score}%
                </div>

                {analysis.consistency.issues.length > 0 && (
                  <div>
                    <strong className="text-red-400">Issues:</strong>
                    <ul className="ml-4 text-xs">
                      {analysis.consistency.issues.map((issue, index) => (
                        <li key={index} className="text-red-300">• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <strong className="text-blue-400">Recommendations:</strong>
                  <ul className="ml-4 text-xs">
                    {analysis.consistency.recommendations.map((rec, index) => (
                      <li key={index} className="text-blue-300">• {rec}</li>
                    ))}
                  </ul>
                </div>

                <div className="text-xs text-gray-400 mt-4">
                  Last Analysis: {new Date(analysis.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => authStorageFix.validateAndSyncAuthState()}
            className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-xs"
          >
            🔍 Validate Auth
          </button>
          <button
            onClick={() => authStorageFix.forceSyncAuthData()}
            className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs"
          >
            🔄 Sync Data
          </button>
          <button
            onClick={() => authStorageFix.clearAllAuthStorage()}
            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs"
          >
            🧹 Clear Storage
          </button>
          <button
            onClick={() => console.log('Full Analysis:', analysis)}
            className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-xs"
          >
            📋 Log Analysis
          </button>
        </div>
      </div>
    </div>
  )
}

export default ComprehensiveHydrationAnalyzer