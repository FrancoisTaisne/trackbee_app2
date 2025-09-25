/**
 * Main Entry Point - Point d'entrée principal de l'application
 * Bootstrap de React et configuration initiale
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Styles globaux
import './index-minimal.css'

// Configuration et utilitaires
import { appConfig } from '@/core/utils/env'
import { stateLog } from '@/core/utils/logger'

// ==================== ENVIRONMENT SETUP ====================

// Configuration du titre de la page
document.title = 'TrackBee - Géolocalisation IoT Professionnelle'

// Configuration meta viewport pour mobile
const metaViewport = document.querySelector('meta[name="viewport"]')
if (metaViewport) {
  metaViewport.setAttribute(
    'content',
    'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no'
  )
}

// Configuration des meta tags pour PWA
const metaThemeColor = document.querySelector('meta[name="theme-color"]')
if (metaThemeColor) {
  metaThemeColor.setAttribute('content', '#0ea5e9')
}

// ==================== ERROR HANDLING ====================

// Gestion globale des erreurs non capturées
window.addEventListener('error', (event) => {
  stateLog.error('Uncaught error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  })
})

// Gestion des rejets de Promise non capturés
window.addEventListener('unhandledrejection', (event) => {
  stateLog.error('Unhandled promise rejection', {
    reason: event.reason,
    promise: event.promise
  })
})

// ==================== PERFORMANCE MONITORING ====================

// Observer des Web Vitals en mode développement
if (appConfig.isDev) {
  // Performance observer pour les métriques
  const perfObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'navigation') {
        const navEntry = entry as PerformanceNavigationTiming
        stateLog.info('Navigation timing', {
          domContentLoaded: navEntry.domContentLoadedEventEnd - (navEntry as any).navigationStart,
          loadComplete: navEntry.loadEventEnd - (navEntry as any).navigationStart,
          firstPaint: navEntry.responseEnd - navEntry.requestStart
        })
      }

      if (entry.entryType === 'paint') {
        stateLog.info('Paint timing', {
          name: entry.name,
          startTime: entry.startTime
        })
      }
    }
  })

  // Observer les métriques si supportées
  try {
    perfObserver.observe({ entryTypes: ['navigation', 'paint'] })
  } catch (error) {
    console.warn('Performance observer not supported:', error)
  }
}

// ==================== CAPACITOR SETUP ====================

// Configuration spécifique Capacitor
import { Capacitor } from '@capacitor/core'

if (Capacitor.isNativePlatform()) {
  stateLog.info('Running on native platform', {
    platform: Capacitor.getPlatform(),
    isNative: true
  })

  // Configuration supplémentaire pour mobile
  document.addEventListener('deviceready', () => {
    stateLog.info('Capacitor device ready')
  })

  // Gestion du back button sur Android
  if (Capacitor.getPlatform() === 'android') {
    import('@capacitor/app').then(({ App }) => {
      App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back()
        } else {
          App.exitApp()
        }
      })
    })
  }

  // Configuration de la barre de statut
  import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
    StatusBar.setStyle({ style: Style.Default })
    StatusBar.setBackgroundColor({ color: '#ffffff' })
  }).catch(error => {
    stateLog.warn('StatusBar plugin not available', { error })
  })

  // Configuration splashscreen
  import('@capacitor/splash-screen').then(({ SplashScreen }) => {
    // Cacher le splashscreen après l'initialisation de React
    setTimeout(() => {
      SplashScreen.hide()
    }, 1000)
  }).catch(error => {
    stateLog.warn('SplashScreen plugin not available', { error })
  })
}

// ==================== DEVELOPMENT TOOLS ====================

// Configuration développement
if (appConfig.isDev) {
  // Activer React DevTools
  if (typeof window !== 'undefined') {
    const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__
    if (hook) {
      hook.onCommitFiberRoot = (id: any, root: any) => {
        const { current } = root
        if (current.stateNode && current.stateNode.isDehydrated) {
          stateLog.debug('React hydration detected')
        }
      }
    }
  }

  // Logs d'information développement
  stateLog.info('🚀 TrackBee App v2 starting in development mode', {
    react: React.version,
    env: 'development',
    debug: appConfig.debug,
    apiUrl: appConfig.api.currentUrl
  })

  // Console ASCII art pour l'équipe de dev
  console.log(`
%c╔══════════════════════════════════════╗
║           TrackBee App v2            ║
║      Géolocalisation IoT Pro         ║
║                                      ║
║  🔧 Development Mode                 ║
║  📱 React ${React.version.padEnd(24, ' ')} ║
║  🐛 Debug: ${String(appConfig.debug).padEnd(23, ' ')} ║
╚══════════════════════════════════════╝`,
    'color: #0ea5e9; font-family: monospace;'
  )
}

// ==================== REACT RENDER ====================

// Fonction de rendu avec gestion d'erreur
const renderApp = () => {
  const rootElement = document.getElementById('root')

  if (!rootElement) {
    throw new Error('Root element not found. Make sure you have <div id="root"></div> in your HTML.')
  }

  // Créer la racine React 18
  const root = ReactDOM.createRoot(rootElement)

  // Rendu de l'application
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )

  // Logger le succès du rendu
  stateLog.info('✅ React application rendered successfully')

  return root
}

// ==================== INITIALIZATION ====================

// Fonction d'initialisation principale
const initializeApp = async () => {
  const timer = stateLog.time('Application bootstrap')

  try {
    // Vérification des prérequis
    if (!document.getElementById('root')) {
      throw new Error('Root element not found')
    }

    // Rendu de l'application
    const root = renderApp()

    timer.end({ success: true })

    // En développement, exposer la racine pour debug
    if (appConfig.isDev) {
      (window as any).__REACT_ROOT__ = root
    }

  } catch (error) {
    timer.end({ error })
    stateLog.error('❌ Application bootstrap failed', { error })

    // Afficher une erreur de fallback
    const rootElement = document.getElementById('root')
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f9fafb;
        ">
          <div style="
            background: white;
            padding: 2rem;
            border-radius: 1rem;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            max-width: 400px;
            text-align: center;
          ">
            <div style="
              width: 4rem;
              height: 4rem;
              background: #fee2e2;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 1rem;
            ">
              <svg width="24" height="24" fill="#dc2626" viewBox="0 0 24 24">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                <path d="M12 8v4m0 4h.01"/>
              </svg>
            </div>
            <h1 style="margin: 0 0 0.5rem; color: #111827; font-size: 1.25rem; font-weight: 700;">
              Erreur de démarrage
            </h1>
            <p style="margin: 0 0 1.5rem; color: #6b7280; font-size: 0.875rem;">
              L'application n'a pas pu démarrer correctement.
            </p>
            <button onclick="window.location.reload()" style="
              background: #0ea5e9;
              color: white;
              border: none;
              padding: 0.75rem 1.5rem;
              border-radius: 0.5rem;
              font-size: 0.875rem;
              font-weight: 500;
              cursor: pointer;
            ">
              Recharger la page
            </button>
          </div>
        </div>
      `
    }

    // Rethrow pour le monitoring
    throw error
  }
}

// ==================== START APPLICATION ====================

// Démarrer l'application
initializeApp().catch((error) => {
  console.error('Critical startup error:', error)

  // En production, on pourrait envoyer l'erreur à un service de monitoring
  if (!appConfig.isDev) {
    // Sentry.captureException(error)
  }
})