/**
 * Diagnostic complet pour l'hydratation de l'authentification
 * Composant de debug pour identifier les problèmes d'état
 */

import React from 'react'
import { useAuthStore } from '@/core/state/stores/auth.store'
import { authStorageFix } from '@/core/state/stores/auth.store.fix'

interface StorageStatus {
  localStorage: Record<string, any>
  capacitorStorage: Record<string, any>
  indexedDB: any[]
}

export const AuthHydrationDiagnostic: React.FC = () => {
  const authState = useAuthStore()
  const [storageStatus, setStorageStatus] = React.useState<StorageStatus>({
    localStorage: {},
    capacitorStorage: {},
    indexedDB: []
  })
  const [hydrationLog, setHydrationLog] = React.useState<string[]>([])
  const [isExpanded, setIsExpanded] = React.useState(true)

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setHydrationLog(prev => [`${timestamp}: ${message}`, ...prev].slice(0, 50))
  }

  const scanStorage = React.useCallback(async () => {
    const results: StorageStatus = {
      localStorage: {},
      capacitorStorage: {},
      indexedDB: []
    }

    // Scan localStorage
    const authKeys = [
      'CapacitorStorage.secure_auth_token',
      'CapacitorStorage.secure_user_session',
      'auth_token',
      'user_data',
      'last_activity',
      'token_expiry',
      'app:last_initialized'
    ]

    authKeys.forEach(key => {
      const value = localStorage.getItem(key)
      if (value) {
        try {
          results.localStorage[key] = JSON.parse(value)
        } catch {
          results.localStorage[key] = value
        }
      }
    })

    // Scan Capacitor keys specifically
    Object.keys(localStorage).forEach(key => {
      if (key.includes('CapacitorStorage')) {
        const value = localStorage.getItem(key)
        if (value) {
          try {
            results.capacitorStorage[key] = JSON.parse(value)
          } catch {
            results.capacitorStorage[key] = value
          }
        }
      }
    })

    // Scan IndexedDB
    try {
      const request = indexedDB.open('trackbeeDB')
      request.onsuccess = (event) => {
        const db = (event.target as any).result
        if (db.objectStoreNames.contains('users')) {
          const transaction = db.transaction(['users'], 'readonly')
          const store = transaction.objectStore('users')
          const getAllRequest = store.getAll()

          getAllRequest.onsuccess = () => {
            results.indexedDB = getAllRequest.result || []
            setStorageStatus(results)
          }
        } else {
          setStorageStatus(results)
        }
        db.close()
      }
      request.onerror = () => {
        addLog('❌ IndexedDB access failed')
        setStorageStatus(results)
      }
    } catch (error) {
      addLog(`❌ IndexedDB error: ${error}`)
      setStorageStatus(results)
    }
  }, [])

  // Monitor auth state changes
  React.useEffect(() => {
    addLog('🔍 Starting authentication monitoring')
    scanStorage()

    const interval = setInterval(scanStorage, 2000)
    return () => clearInterval(interval)
  }, [scanStorage])

  // Monitor specific auth state changes
  React.useEffect(() => {
    addLog(`🔐 Auth state: authenticated=${authState.isAuthenticated}, loading=${authState.isLoading}, initialized=${authState.isInitialized}`)

    if (authState.user) {
      addLog(`👤 User: ${authState.user.email} (${authState.user.role})`)
    }

    if (authState.token) {
      addLog(`🎫 Token: ${authState.token.substring(0, 20)}...`)
    }

    if (authState.session) {
      const expiresAt = new Date(authState.session.expiresAt).toLocaleString()
      addLog(`⏰ Session expires: ${expiresAt}`)
    }
  }, [authState.isAuthenticated, authState.isLoading, authState.isInitialized, authState.user, authState.token, authState.session])

  const clearAllStorage = async () => {
    addLog('🧹 Clearing all storage using advanced fix...')
    try {
      await authStorageFix.clearAllAuthStorage()
      addLog('✅ Storage cleared successfully')

      // Clear IndexedDB
      const deleteReq = indexedDB.deleteDatabase('trackbeeDB')
      deleteReq.onsuccess = () => {
        addLog('✓ IndexedDB cleared')
        setTimeout(() => window.location.reload(), 1000)
      }
      deleteReq.onerror = () => {
        addLog('❌ IndexedDB clear failed')
        setTimeout(() => window.location.reload(), 1000)
      }
    } catch (error) {
      addLog(`❌ Storage clear error: ${error}`)
      setTimeout(() => window.location.reload(), 1000)
    }
  }

  const validateAuthState = async () => {
    addLog('🔍 Validating auth state...')
    try {
      const result = await authStorageFix.validateAndSyncAuthState()
      addLog(`📊 Validation result: ${result.isValid ? 'VALID' : 'INVALID'}`)

      if (result.issues.length > 0) {
        result.issues.forEach(issue => addLog(`⚠️ Issue: ${issue}`))
      }

      if (result.fixed) {
        addLog('✅ Issues automatically fixed')
      }

      addLog(`💡 Recommendation: ${result.recommendation}`)

      if (result.fixed) {
        setTimeout(() => window.location.reload(), 2000)
      }
    } catch (error) {
      addLog(`❌ Validation error: ${error}`)
    }
  }

  const syncAuthData = async () => {
    addLog('🔄 Syncing auth data...')
    try {
      const success = await authStorageFix.forceSyncAuthData()
      if (success) {
        addLog('✅ Auth data synchronized')
        authState.initialize()
      } else {
        addLog('❌ Sync failed - no valid data found')
      }
    } catch (error) {
      addLog(`❌ Sync error: ${error}`)
    }
  }

  const forceRehydrate = () => {
    addLog('🔄 Force rehydrating auth state...')
    authState.initialize()
  }

  if (!isExpanded) {
    return (
      <div
        onClick={() => setIsExpanded(true)}
        className="fixed top-0 right-0 bg-black text-white p-2 cursor-pointer z-50 text-xs"
      >
        🔍 Auth Debug
      </div>
    )
  }

  // Status indicators
  const getStatusColor = (condition: boolean) => condition ? '#00ff00' : '#ff0000'
  const isReallyAuthenticated = authState.isAuthenticated && authState.user && authState.user.email

  return (
    <div className="fixed top-0 left-0 bg-black bg-opacity-95 text-white p-4 z-50 max-w-2xl max-h-screen overflow-auto text-xs font-mono">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-green-400 font-bold">🔍 AUTH HYDRATION DIAGNOSTIC</h2>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Current Auth State */}
      <div className="mb-4 p-2 border border-gray-600 rounded">
        <h3 className="text-yellow-400 mb-2">📊 CURRENT STATE</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-400">isAuthenticated:</span>
            <span style={{ color: getStatusColor(authState.isAuthenticated) }}>
              {' ' + String(authState.isAuthenticated)}
            </span>
          </div>
          <div>
            <span className="text-gray-400">isLoading:</span>
            <span style={{ color: authState.isLoading ? '#ffaa00' : '#888' }}>
              {' ' + String(authState.isLoading)}
            </span>
          </div>
          <div>
            <span className="text-gray-400">isInitialized:</span>
            <span style={{ color: getStatusColor(authState.isInitialized) }}>
              {' ' + String(authState.isInitialized)}
            </span>
          </div>
          <div>
            <span className="text-gray-400">isReallyAuthenticated:</span>
            <span style={{ color: getStatusColor(isReallyAuthenticated) }}>
              {' ' + String(isReallyAuthenticated)}
            </span>
          </div>
        </div>
      </div>

      {/* Storage Analysis */}
      <div className="mb-4 p-2 border border-gray-600 rounded">
        <h3 className="text-yellow-400 mb-2">💾 STORAGE STATUS</h3>

        <div className="mb-2">
          <span className="text-blue-400">LocalStorage:</span>
          <div className="ml-2 text-xs">
            {Object.keys(storageStatus.localStorage).length === 0 ? (
              <span className="text-gray-500">No auth data found</span>
            ) : (
              Object.entries(storageStatus.localStorage).map(([key, value]) => (
                <div key={key} className="mb-1">
                  <span className="text-gray-400">{key}:</span>
                  <span className={typeof value === 'object' && value ? 'text-green-400' : 'text-red-400'}>
                    {' ' + (typeof value === 'object' ? JSON.stringify(value).substring(0, 50) + '...' : String(value))}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mb-2">
          <span className="text-blue-400">CapacitorStorage:</span>
          <div className="ml-2 text-xs">
            {Object.keys(storageStatus.capacitorStorage).length === 0 ? (
              <span className="text-gray-500">No capacitor data found</span>
            ) : (
              Object.entries(storageStatus.capacitorStorage).map(([key, value]) => (
                <div key={key} className="mb-1">
                  <span className="text-gray-400">{key.replace('CapacitorStorage.', '')}:</span>
                  <span className={typeof value === 'object' && value ? 'text-green-400' : 'text-red-400'}>
                    {' ' + (typeof value === 'object' ? JSON.stringify(value).substring(0, 50) + '...' : String(value))}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <span className="text-blue-400">IndexedDB:</span>
          <span className={storageStatus.indexedDB.length > 0 ? 'text-green-400' : 'text-red-400'}>
            {' ' + storageStatus.indexedDB.length + ' records'}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={validateAuthState}
          className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-xs"
        >
          🔍 Validate Auth
        </button>
        <button
          onClick={syncAuthData}
          className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs"
        >
          🔄 Sync Data
        </button>
        <button
          onClick={forceRehydrate}
          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs"
        >
          🔄 Force Rehydrate
        </button>
        <button
          onClick={async () => {
            addLog('🔧 Running comprehensive fix...')
            try {
              const { AuthComprehensiveFix } = await import('@/core/state/stores/auth.fix.comprehensive')
              const result = await AuthComprehensiveFix.forceFullSync()
              addLog(`✅ Comprehensive fix completed: ${result.success ? 'SUCCESS' : 'PARTIAL'}`)
              result.actions.forEach(action => addLog(`✓ ${action}`))
              result.issues.forEach(issue => addLog(`⚠️ ${issue}`))
              if (result.success) {
                setTimeout(() => window.location.reload(), 2000)
              }
            } catch (error) {
              addLog(`❌ Comprehensive fix failed: ${error}`)
            }
          }}
          className="bg-orange-600 hover:bg-orange-700 px-3 py-1 rounded text-xs"
        >
          🔧 Comprehensive Fix
        </button>
        <button
          onClick={clearAllStorage}
          className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs"
        >
          🧹 Clear All Storage
        </button>
        <button
          onClick={() => console.log('Current Auth State:', authState)}
          className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-xs"
        >
          📋 Log State
        </button>
      </div>

      {/* Hydration Log */}
      <div className="p-2 border border-gray-600 rounded">
        <h3 className="text-yellow-400 mb-2">📝 HYDRATION LOG</h3>
        <div className="max-h-40 overflow-y-auto text-xs">
          {hydrationLog.length === 0 ? (
            <span className="text-gray-500">No log entries yet...</span>
          ) : (
            hydrationLog.map((entry, index) => (
              <div key={index} className="mb-1 text-gray-300">
                {entry}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthHydrationDiagnostic