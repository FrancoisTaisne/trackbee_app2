/**
 * Outil de diagnostic complet pour l'authentification
 * À exécuter dans la console pour identifier le problème
 */

function diagnoseAuthState() {
  console.log('🔍 DIAGNOSTIC COMPLET DE L\'AUTHENTIFICATION')
  console.log('================================================')

  // 1. Vérifier localStorage
  console.log('\n📦 LOCAL STORAGE:')
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
    console.log(`  ${key}:`, value ? JSON.parse(value) : 'undefined')
  })

  // Chercher clés Zustand
  console.log('\n📦 ZUSTAND KEYS:')
  Object.keys(localStorage).forEach(key => {
    if (key.includes('trackbee') || key.includes('auth')) {
      console.log(`  ${key}:`, JSON.parse(localStorage.getItem(key) || 'null'))
    }
  })

  // 2. Vérifier IndexedDB
  console.log('\n💾 INDEXEDDB CHECK:')
  const request = indexedDB.open('trackbeeDB')
  request.onsuccess = (event) => {
    const db = event.target.result
    console.log('  trackbeeDB version:', db.version)
    console.log('  Tables disponibles:', Array.from(db.objectStoreNames))

    if (db.objectStoreNames.contains('users')) {
      const transaction = db.transaction(['users'], 'readonly')
      const store = transaction.objectStore('users')
      const getAllRequest = store.getAll()

      getAllRequest.onsuccess = () => {
        console.log('  Users dans DB:', getAllRequest.result)
      }
    }
    db.close()
  }
  request.onerror = () => {
    console.log('  trackbeeDB: Erreur d\'ouverture ou n\'existe pas')
  }

  // 3. Vérifier l'état du store Zustand si accessible
  console.log('\n🗄️  ZUSTAND STORE STATE:')
  try {
    // Essayer d'accéder au store depuis window si exposé
    if (window.__ZUSTAND_STORES__) {
      console.log('  Stores Zustand:', window.__ZUSTAND_STORES__)
    } else {
      console.log('  Stores Zustand: Non exposés dans window')
    }
  } catch (e) {
    console.log('  Erreur accès stores:', e.message)
  }

  // 4. Vérifier les cookies
  console.log('\n🍪 COOKIES:')
  document.cookie.split(';').forEach(cookie => {
    const [name, value] = cookie.split('=')
    if (name.trim().toLowerCase().includes('auth') || name.trim().toLowerCase().includes('token')) {
      console.log(`  ${name.trim()}: ${value}`)
    }
  })

  // 5. Vérifier sessionStorage
  console.log('\n📋 SESSION STORAGE:')
  Object.keys(sessionStorage).forEach(key => {
    if (key.includes('auth') || key.includes('token') || key.includes('user')) {
      console.log(`  ${key}:`, JSON.parse(sessionStorage.getItem(key) || 'null'))
    }
  })

  console.log('\n📊 RÉSUMÉ:')
  console.log('- Regardez les valeurs ci-dessus')
  console.log('- Y a-t-il des données utilisateur complètes quelque part ?')
  console.log('- Les tokens sont-ils présents et valides ?')
  console.log('- L\'état est-il synchronisé entre localStorage et IndexedDB ?')
}

// Exécuter le diagnostic
diagnoseAuthState()

// Helper pour tester manuellement
window.authDiag = diagnoseAuthState