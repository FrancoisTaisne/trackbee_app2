/**
 * Script complet pour nettoyer TOUT le stockage d'authentification
 * À exécuter dans la console du navigateur
 */

async function clearCompleteAuthStorage() {
  console.log('🧹 Nettoyage complet du stockage d\'authentification...')

  // 1. Nettoyer localStorage
  const localStorageKeys = [
    'CapacitorStorage.secure_auth_token',
    'CapacitorStorage.secure_user_session',
    'auth_token',
    'user_data',
    'last_activity',
    'token_expiry',
    'app:last_initialized'
  ]

  localStorageKeys.forEach(key => {
    localStorage.removeItem(key)
    console.log(`✓ Supprimé: ${key}`)
  })

  // Nettoyer les clés Zustand
  Object.keys(localStorage).forEach(key => {
    if (key.includes('trackbee-auth') || key.includes('auth-store')) {
      localStorage.removeItem(key)
      console.log(`✓ Supprimé: ${key}`)
    }
  })

  // 2. Nettoyer IndexedDB (trackbeeDB)
  try {
    // Ouvrir la base de données
    const deleteRequest = indexedDB.deleteDatabase('trackbeeDB')

    deleteRequest.onsuccess = () => {
      console.log('✓ Base de données IndexedDB supprimée: trackbeeDB')
      console.log('🎉 Nettoyage complet terminé!')
      console.log('🔄 Rechargement de la page...')
      setTimeout(() => window.location.reload(), 1000)
    }

    deleteRequest.onerror = () => {
      console.warn('⚠️ Impossible de supprimer la base de données, mais localStorage nettoyé')
      setTimeout(() => window.location.reload(), 1000)
    }

    deleteRequest.onblocked = () => {
      console.warn('⚠️ Suppression bloquée (fermer autres onglets), mais localStorage nettoyé')
      setTimeout(() => window.location.reload(), 1000)
    }

  } catch (error) {
    console.error('Erreur lors de la suppression de la DB:', error)
    console.log('🔄 Rechargement malgré l\'erreur...')
    setTimeout(() => window.location.reload(), 1000)
  }
}

// Exécuter le nettoyage
clearCompleteAuthStorage()