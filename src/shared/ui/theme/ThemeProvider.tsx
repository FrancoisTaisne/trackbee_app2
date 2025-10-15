/**
 * Theme Provider - Gestion du thème et mode sombre
 * Provider pour la gestion centralisée du thème avec persistance
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useUIStore } from '@/core/state/stores/ui.store'
import { detectPlatform } from '@/core/utils/env'
import { stateLog } from '@/core/utils/logger'

// ==================== TYPES ====================

type Theme = 'light' | 'dark' | 'auto'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  isSystemDark: boolean
}

// ==================== CONTEXT ====================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

// ==================== HOOKS ====================

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// ==================== PROVIDER ====================

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: Theme
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'auto',
  enableSystem = true,
  disableTransitionOnChange = false
}) => {
  const uiStore = useUIStore()
  const theme = uiStore.theme
  const setTheme = uiStore.setTheme
  const toggleTheme = uiStore.toggleTheme

  const [isSystemDark, setIsSystemDark] = useState(false)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  // ==================== SYSTEM THEME DETECTION ====================

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleSystemThemeChange = (event: { matches: boolean }) => {
      const systemIsDark = event.matches
      setIsSystemDark(systemIsDark)

      stateLog.debug('System theme changed', {
        systemIsDark,
        currentTheme: theme
      })
    }

    setIsSystemDark(mediaQuery.matches)

    if (enableSystem) {
      mediaQuery.addEventListener('change', handleSystemThemeChange)
    }

    return () => {
      if (enableSystem) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange)
      }
    }
  }, [theme, enableSystem])

  // ==================== THEME RESOLUTION ====================

  useEffect(() => {
    const resolveTheme = (): 'light' | 'dark' => {
      switch (theme) {
        case 'dark':
          return 'dark'
        case 'light':
          return 'light'
        case 'auto':
        default:
          return isSystemDark ? 'dark' : 'light'
      }
    }

    const newResolvedTheme = resolveTheme()

    if (newResolvedTheme !== resolvedTheme) {
      setResolvedTheme(newResolvedTheme)

      stateLog.debug('Theme resolved', {
        theme,
        resolvedTheme: newResolvedTheme,
        isSystemDark
      })
    }
  }, [theme, isSystemDark, resolvedTheme])

  // ==================== MOBILE STATUS BAR ====================

  const updateStatusBarColor = useCallback((nextTheme: 'light' | 'dark'): void => {
    const platform = detectPlatform()

    if (platform.isCapacitor && typeof document !== 'undefined') {
      // Mettre à jour la couleur de la barre de statut sur mobile
      const metaThemeColor = document.querySelector('meta[name="theme-color"]')
      const metaStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')

      const colors = {
        light: '#ffffff',
        dark: '#111827'
      }

      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', colors[nextTheme])
      }

      if (metaStatusBar) {
        metaStatusBar.setAttribute('content', nextTheme === 'dark' ? 'black-translucent' : 'default')
      }

      stateLog.debug('Mobile status bar updated', { theme: nextTheme, color: colors[nextTheme] })
    }
  }, [])

  // ==================== DOM APPLICATION ====================

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const root = document.documentElement

    // Désactiver temporairement les transitions si demandé
    if (disableTransitionOnChange) {
      root.style.setProperty('transition', 'none')
    }

    // Appliquer le thème
    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)

    // Mettre à jour l'attribut data-theme pour les styles personnalisés
    root.setAttribute('data-theme', resolvedTheme)

    // Mettre à jour la couleur de la barre de statut mobile
    updateStatusBarColor(resolvedTheme)

    // Rétablir les transitions après un délai
    if (disableTransitionOnChange) {
      const timeoutId = globalThis.setTimeout(() => {
        root.style.removeProperty('transition')
      }, 1)

      return () => globalThis.clearTimeout(timeoutId)
    }

    // Return vide pour les cas où disableTransitionOnChange est false
    return () => {}
  }, [resolvedTheme, disableTransitionOnChange, updateStatusBarColor])

  // ==================== INITIALIZATION ====================

  useEffect(() => {
    stateLog.debug('🎨 ThemeProvider initialized', {
      defaultTheme,
      enableSystem,
      initialTheme: theme,
      isSystemDark
    })

    // S'assurer que le thème par défaut est appliqué si aucun thème n'est stocké
    if (!theme) {
      setTheme(defaultTheme)
    }
  }, [defaultTheme, enableSystem, theme, setTheme, isSystemDark])

  // ==================== CONTEXT VALUE ====================

  const contextValue = useMemo<ThemeContextType>(() => ({
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isSystemDark
  }), [theme, resolvedTheme, setTheme, toggleTheme, isSystemDark])

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

// ==================== THEME UTILITIES ====================

/**
 * Hook pour obtenir les classes CSS basées sur le thème
 */
export const useThemeClasses = () => {
  const { resolvedTheme } = useTheme()

  return {
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',

    // Classes de base
    bg: resolvedTheme === 'dark' ? 'bg-gray-900' : 'bg-white',
    text: resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900',
    border: resolvedTheme === 'dark' ? 'border-gray-700' : 'border-gray-200',

    // Classes pour les cartes
    cardBg: resolvedTheme === 'dark' ? 'bg-gray-800' : 'bg-white',
    cardBorder: resolvedTheme === 'dark' ? 'border-gray-700' : 'border-gray-200',

    // Classes pour les inputs
    inputBg: resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-white',
    inputBorder: resolvedTheme === 'dark' ? 'border-gray-600' : 'border-gray-300',
    inputText: resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900',

    // Classes pour les boutons secondaires
    buttonSecondaryBg: resolvedTheme === 'dark' ? 'bg-gray-700' : 'bg-gray-100',
    buttonSecondaryText: resolvedTheme === 'dark' ? 'text-gray-100' : 'text-gray-900',
    buttonSecondaryHover: resolvedTheme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-200',
  }
}

/**
 * Hook pour les couleurs adaptées au thème
 */
export const useThemeColors = () => {
  const { resolvedTheme } = useTheme()

  const colors = {
    light: {
      background: '#ffffff',
      foreground: '#111827',
      muted: '#f9fafb',
      mutedForeground: '#6b7280',
      border: '#e5e7eb',
      input: '#e5e7eb',
      ring: '#0ea5e9',
      primary: '#0ea5e9',
      primaryForeground: '#ffffff',
      secondary: '#f3f4f6',
      secondaryForeground: '#111827',
      accent: '#f3f4f6',
      accentForeground: '#111827',
      destructive: '#ef4444',
      destructiveForeground: '#ffffff',
    },
    dark: {
      background: '#111827',
      foreground: '#f9fafb',
      muted: '#1f2937',
      mutedForeground: '#9ca3af',
      border: '#374151',
      input: '#374151',
      ring: '#38bdf8',
      primary: '#38bdf8',
      primaryForeground: '#111827',
      secondary: '#374151',
      secondaryForeground: '#f9fafb',
      accent: '#374151',
      accentForeground: '#f9fafb',
      destructive: '#dc2626',
      destructiveForeground: '#f9fafb',
    }
  }

  return colors[resolvedTheme]
}

/**
 * Utilitaire pour obtenir la classe CSS basée sur le thème
 */
export const getThemeClass = (
  lightClass: string,
  darkClass: string,
  theme?: 'light' | 'dark'
): string => {
  // Si le thème n'est pas fourni, utiliser le thème résolu du contexte
  if (!theme) {
    // Cette fonction ne peut pas utiliser useTheme car elle peut être appelée hors composant
    // On va donc supposer le thème depuis le DOM
    if (typeof document !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark')
      theme = isDark ? 'dark' : 'light'
    } else {
      theme = 'light'
    }
  }

  return theme === 'dark' ? darkClass : lightClass
}

// ==================== THEME DETECTOR ====================

/**
 * Hook pour détecter le thème système
 */
export const useSystemTheme = (): 'light' | 'dark' => {
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const updateSystemTheme = () => {
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light')
    }

    updateSystemTheme()
    mediaQuery.addEventListener('change', updateSystemTheme)

    return () => {
      mediaQuery.removeEventListener('change', updateSystemTheme)
    }
  }, [])

  return systemTheme
}

// Types exportés
export type { Theme, ThemeContextType }
