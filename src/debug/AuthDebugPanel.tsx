/**
 * Composant de debug pour l'authentification
 * À ajouter temporairement dans le Header pour diagnostiquer
 */

import React from 'react'
import { useAuth } from '@/core/state/stores/auth.store'

export const AuthDebugPanel: React.FC = () => {
  const authState = useAuth()

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      background: 'rgba(0,0,0,0.9)',
      color: 'white',
      padding: '10px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '400px',
      maxHeight: '300px',
      overflow: 'auto'
    }}>
      <h3 style={{ color: '#00ff00', marginBottom: '10px' }}>🔍 AUTH DEBUG</h3>

      <div style={{ marginBottom: '8px' }}>
        <strong>isAuthenticated:</strong>
        <span style={{ color: authState.isAuthenticated ? '#00ff00' : '#ff0000' }}>
          {String(authState.isAuthenticated)}
        </span>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>isLoading:</strong>
        <span style={{ color: authState.isLoading ? '#ffaa00' : '#888' }}>
          {String(authState.isLoading)}
        </span>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>user:</strong>
        <pre style={{ fontSize: '10px', color: '#ccc', margin: '2px 0' }}>
          {JSON.stringify(authState.user, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>session:</strong>
        <pre style={{ fontSize: '10px', color: '#ccc', margin: '2px 0' }}>
          {JSON.stringify(authState.session, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>token:</strong>
        <span style={{ fontSize: '10px', color: authState.token ? '#00ff00' : '#ff0000' }}>
          {authState.token ? `${authState.token.substring(0, 20)}...` : 'null'}
        </span>
      </div>

      <button
        onClick={() => console.log('Full Auth State:', authState)}
        style={{ background: '#333', color: 'white', border: '1px solid #666', padding: '4px 8px', fontSize: '10px' }}
      >
        Log Full State
      </button>
    </div>
  )
}

export default AuthDebugPanel