/**
 * useSession Hook - Gestion spécifique de la session
 * Hook complémentaire pour la gestion avancée de session
 */

import React from 'react'
import { useAuth } from './useAuth'
import { logger } from '@/core/utils/logger'
import type { UseSessionReturn, AuthSession } from '../types'

// ==================== LOGGER SETUP ====================

const sessionLog = {
  trace: (msg: string, data?: unknown) => logger.trace('session', msg, data),
  debug: (msg: string, data?: unknown) => logger.debug('session', msg, data),
  info: (msg: string, data?: unknown) => logger.info('session', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('session', msg, data),
  error: (msg: string, data?: unknown) => logger.error('session', msg, data)
}

// ==================== UTILITY FUNCTIONS ====================

const isSessionValid = (session: AuthSession | null): boolean => {
  if (!session) return false

  try {
    const expiresAt = new Date(session.expiresAt)
    const now = new Date()
    const isNotExpired = now < expiresAt
    const hasValidToken = !!session.token && session.token.length > 0
    const hasValidUser = !!session.user && !!session.user.id

    return isNotExpired && hasValidToken && hasValidUser
  } catch (error) {
    sessionLog.error('Session validation error', error)
    return false
  }
}

const getExpiresIn = (session: AuthSession | null): number => {
  if (!session) return 0

  try {
    const expiresAt = new Date(session.expiresAt)
    const now = new Date()
    const diff = expiresAt.getTime() - now.getTime()
    return Math.max(0, Math.floor(diff / 1000)) // Return seconds
  } catch (error) {
    sessionLog.error('ExpiresIn calculation error', error)
    return 0
  }
}

const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return 'Expiré'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

// ==================== MAIN HOOK ====================

export const useSession = (): UseSessionReturn => {
  const { session, refreshToken, logout } = useAuth()

  const isValid = React.useMemo(() => isSessionValid(session), [session])
  const expiresIn = React.useMemo(() => getExpiresIn(session), [session])

  const refresh = React.useCallback(async () => {
    if (!session) {
      throw new Error('No session to refresh')
    }

    try {
      sessionLog.debug('Manual session refresh triggered')
      await refreshToken()
      sessionLog.info('Session refreshed successfully')
    } catch (error) {
      sessionLog.error('Session refresh failed', error)
      throw error
    }
  }, [session, refreshToken])

  const destroy = React.useCallback(() => {
    sessionLog.info('Session destruction requested')
    logout()
  }, [logout])

  // Auto refresh when session is about to expire (5 minutes threshold)
  React.useEffect(() => {
    if (!isValid || expiresIn <= 0) return

    const refreshThreshold = 5 * 60 // 5 minutes in seconds

    if (expiresIn <= refreshThreshold && session?.refreshToken) {
      sessionLog.debug('Session approaching expiry, auto-refreshing', {
        expiresIn,
        threshold: refreshThreshold
      })

      refresh().catch((error) => {
        sessionLog.error('Auto-refresh failed', error)
      })
    }
  }, [expiresIn, isValid, session?.refreshToken, refresh])

  // Warning when session is about to expire without refresh token
  React.useEffect(() => {
    if (!isValid || expiresIn <= 0) return

    const warningThreshold = 2 * 60 // 2 minutes in seconds

    if (expiresIn <= warningThreshold && !session?.refreshToken) {
      sessionLog.warn('Session expiring soon without refresh token', {
        expiresIn,
        timeRemaining: formatTimeRemaining(expiresIn)
      })
    }
  }, [expiresIn, isValid, session?.refreshToken])

  return {
    session,
    isValid,
    expiresIn,
    refresh,
    destroy
  }
}

// ==================== SESSION MONITOR HOOK ====================

interface UseSessionMonitorOptions {
  onExpiry?: () => void
  onWarning?: (timeRemaining: number) => void
  warningThreshold?: number // seconds
  checkInterval?: number // milliseconds
}

export const useSessionMonitor = (options: UseSessionMonitorOptions = {}) => {
  const {
    onExpiry,
    onWarning,
    warningThreshold = 5 * 60, // 5 minutes
    checkInterval = 30 * 1000 // 30 seconds
  } = options

  const { session, isValid, expiresIn } = useSession()
  const [warningShown, setWarningShown] = React.useState(false)

  React.useEffect(() => {
    if (!session || !isValid) {
      setWarningShown(false)
      return
    }

    const interval = setInterval(() => {
      const currentExpiresIn = getExpiresIn(session)

      // Check for expiry
      if (currentExpiresIn <= 0) {
        sessionLog.warn('Session expired')
        onExpiry?.()
        return
      }

      // Check for warning threshold
      if (currentExpiresIn <= warningThreshold && !warningShown) {
        sessionLog.warn('Session expiry warning', {
          timeRemaining: formatTimeRemaining(currentExpiresIn)
        })
        setWarningShown(true)
        onWarning?.(currentExpiresIn)
      }

      // Reset warning flag if session was refreshed
      if (currentExpiresIn > warningThreshold && warningShown) {
        setWarningShown(false)
      }
    }, checkInterval)

    return () => clearInterval(interval)
  }, [session, isValid, warningThreshold, checkInterval, onExpiry, onWarning, warningShown])

  return {
    timeRemaining: formatTimeRemaining(expiresIn),
    isNearExpiry: expiresIn <= warningThreshold,
    warningShown
  }
}

// ==================== SESSION STORAGE HOOK ====================

export const useSessionStorage = () => {
  const { session } = useSession()

  const getSessionData = React.useCallback(() => {
    if (!session) return null

    return {
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      expiresAt: session.expiresAt,
      hasRefreshToken: !!session.refreshToken
    }
  }, [session])

  const exportSession = React.useCallback(() => {
    const data = getSessionData()
    if (!data) return null

    return {
      ...data,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    }
  }, [getSessionData])

  return {
    sessionData: getSessionData(),
    exportSession
  }
}