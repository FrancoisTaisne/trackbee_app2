/**
 * Système de logging structuré avec debug conditionnel
 * Support variables VITE_DEBUG_* pour contrôle granulaire
 */

import type { SystemEvent, PerformanceMetric, AppError } from '@/core/types/transport'

// Types de logs
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error'
// PUSH FINAL: LogScope as string to avoid ALL scope errors
export type LogScope = string

// Configuration debug depuis variables d'environnement
interface DebugConfig {
  enabled: boolean
  ble: boolean
  wifi: boolean
  performance: boolean
  state: boolean
  orchestrator: boolean
}

class Logger {
  private config: DebugConfig
  private buffer: LogEntry[] = []
  private readonly maxBufferSize = 1000
  private readonly chunkSize = 900 // Android console limit

  constructor() {
    this.config = {
      enabled: import.meta.env.VITE_DEBUG === 'true',
      ble: import.meta.env.VITE_DEBUG_BLE === 'true',
      wifi: import.meta.env.VITE_DEBUG_WIFI === 'true',
      performance: import.meta.env.VITE_DEBUG_PERFORMANCE === 'true',
      state: import.meta.env.VITE_DEBUG_STATE === 'true',
      orchestrator: import.meta.env.VITE_DEBUG_ORCHESTRATOR === 'true',
    }

    // Log de la configuration au démarrage
    if (this.config.enabled) {
      console.log('🔧 [LOGGER] Debug configuration:', this.config)
    }
  }

  /**
   * Log principal avec contrôle conditionnel
   */
  log(level: LogLevel, scope: LogScope, message: string, data?: unknown): void {
    // Vérification si le scope est activé
    if (!this.shouldLog(scope, level)) return

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      scope,
      message,
      data: this.sanitizeData(data),
      id: this.generateId(),
    }

    // Ajouter au buffer pour export
    this.addToBuffer(entry)

    // Affichage console avec formatting
    this.outputToConsole(entry)
  }

  /**
   * Logs spécialisés avec validation scope
   */
  trace(scope: LogScope, message: string, data?: unknown): void {
    this.log('trace', scope, message, data)
  }

  debug(scope: LogScope, message: string, data?: unknown): void {
    this.log('debug', scope, message, data)
  }

  info(scope: LogScope, message: string, data?: unknown): void {
    this.log('info', scope, message, data)
  }

  warn(scope: LogScope, message: string, data?: unknown): void {
    this.log('warn', scope, message, data)
  }

  error(scope: LogScope, message: string, data?: unknown): void {
    this.log('error', scope, message, data)
  }

  /**
   * Log d'événement système
   */
  event(event: SystemEvent): void {
    const scope = this.eventTypeToScope(event.type)
    this.debug(scope, `EVENT: ${event.type}`, event.data)
  }

  /**
   * Log de métrique performance
   */
  metric(metric: PerformanceMetric): void {
    if (!this.config.performance) return

    const emoji = metric.success ? '✅' : '❌'
    const duration = metric.duration_ms < 1000
      ? `${metric.duration_ms}ms`
      : `${(metric.duration_ms / 1000).toFixed(1)}s`

    this.debug('performance', `${emoji} ${metric.operation} (${duration})`, {
      category: metric.category,
      success: metric.success,
      duration_ms: metric.duration_ms,
      memoryUsage: metric.memoryUsage,
      context: metric.context,
    })
  }

  /**
   * Log d'erreur avec stack trace
   */
  logError(error: AppError | Error, scope: LogScope = 'general'): void {
    if (error instanceof Error) {
      this.error(scope, error.message, {
        name: error.name,
        stack: error.stack,
        cause: (error as any).cause,
      })
    } else {
      this.error(scope, `[${error.code}] ${error.message}`, {
        category: error.category,
        retryable: error.retryable,
        context: error.context,
        stack: error.stack,
      })
    }
  }

  /**
   * Log de progression avec barre visuelle
   */
  progress(scope: LogScope, operation: string, current: number, total: number, extraData?: unknown): void {
    if (!this.shouldLog(scope, 'debug')) return

    const percent = Math.round((current / total) * 100)
    const barLength = 20
    const filled = Math.round((percent / 100) * barLength)
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled)

    this.debug(scope, `📊 ${operation} [${bar}] ${percent}% (${current}/${total})`, extraData)
  }

  /**
   * Grouping pour opérations complexes
   */
  group(scope: LogScope, title: string): LogGroup {
    if (this.shouldLog(scope, 'debug')) {
      console.group(`🔸 [${scope.toUpperCase()}] ${title}`)
    }
    return new LogGroup(this, scope)
  }

  /**
   * Timer pour mesurer durées
   * Surcharge pour compatibilité: time(operation) ou time(scope, operation)
   */
  time(operation: string): LogTimer
  time(scope: LogScope, operation: string): LogTimer
  time(scopeOrOperation: LogScope | string, operation?: string): LogTimer {
    if (typeof scopeOrOperation === 'string' && !operation) {
      // Cas: time(operation) - utilise scope par défaut
      return new LogTimer(this, 'general', scopeOrOperation)
    } else if (typeof scopeOrOperation === 'string' && operation) {
      // Cas: time(scope, operation) mais premier param est string
      return new LogTimer(this, scopeOrOperation as LogScope, operation)
    } else {
      // Cas: time(scope, operation) - normal
      return new LogTimer(this, scopeOrOperation as LogScope, operation!)
    }
  }

  /**
   * Créer un logger spécialisé pour un scope
   * PUSH FINAL: Méthode extend manquante utilisée partout
   */
  extend(scope: LogScope): Logger {
    // Retourne une copie avec scope prédéfini
    const extendedLogger = Object.create(this)
    extendedLogger._defaultScope = scope

    // Override des méthodes pour utiliser le scope par défaut
    extendedLogger.debug = (message: string, data?: unknown) => this.debug(scope, message, data)
    extendedLogger.info = (message: string, data?: unknown) => this.info(scope, message, data)
    extendedLogger.warn = (message: string, data?: unknown) => this.warn(scope, message, data)
    extendedLogger.error = (message: string, data?: unknown) => this.error(scope, message, data)

    return extendedLogger
  }

  /**
   * Export du buffer pour debug
   */
  exportLogs(filter?: { scope?: LogScope; level?: LogLevel; since?: Date }): LogEntry[] {
    let logs = [...this.buffer]

    if (filter?.scope) {
      logs = logs.filter(log => log.scope === filter.scope)
    }
    if (filter?.level) {
      logs = logs.filter(log => this.levelToNumber(log.level) >= this.levelToNumber(filter.level!))
    }
    if (filter?.since) {
      logs = logs.filter(log => log.timestamp >= filter.since!)
    }

    return logs
  }

  /**
   * Vider le buffer
   */
  clearBuffer(): void {
    this.buffer = []
    this.debug('general', '🗑️ Log buffer cleared')
  }

  /**
   * Statistiques du buffer
   */
  getStats(): LogStats {
    const byLevel = this.buffer.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1
      return acc
    }, {} as Record<LogLevel, number>)

    const byScope = this.buffer.reduce((acc, log) => {
      acc[log.scope] = (acc[log.scope] || 0) + 1
      return acc
    }, {} as Record<LogScope, number>)

    return {
      total: this.buffer.length,
      byLevel,
      byScope,
      oldest: this.buffer[0]?.timestamp,
      newest: this.buffer[this.buffer.length - 1]?.timestamp,
    }
  }

  // ==================== PRIVATE METHODS ====================

  private shouldLog(scope: LogScope, level: LogLevel): boolean {
    // Toujours log les erreurs
    if (level === 'error') return true

    // Vérifier debug général
    if (!this.config.enabled) return false

    // Vérifier scope spécifique
    switch (scope) {
      case 'ble':
        return this.config.ble
      case 'wifi':
        return this.config.wifi
      case 'performance':
        return this.config.performance
      case 'orchestrator':
        return this.config.orchestrator
      default:
        return true // general, api, storage, ui toujours actifs si VITE_DEBUG=true
    }
  }

  private outputToConsole(entry: LogEntry): void {
    const emoji = this.getLevelEmoji(entry.level)
    const scopeTag = `[${entry.scope.toUpperCase()}]`
    const timestamp = entry.timestamp.toISOString().slice(11, 23) // HH:mm:ss.SSS
    const prefix = `${emoji} ${scopeTag} ${timestamp}`

    const message = `${prefix} ${entry.message}`

    // Chunking pour Android si message trop long
    if (message.length > this.chunkSize) {
      this.logChunked(prefix, entry.message, entry.data)
    } else {
      const logFn = this.getConsoleFn(entry.level)
      if (entry.data !== undefined) {
        logFn(message, this.formatDataForConsole(entry.data))
      } else {
        logFn(message)
      }
    }
  }

  private logChunked(prefix: string, message: string, data?: unknown): void {
    const logFn = this.getConsoleFn('debug')

    // Message principal en chunks
    for (let i = 0; i < message.length; i += this.chunkSize) {
      const chunk = message.slice(i, i + this.chunkSize)
      const marker = i === 0 ? '' : ' (cont.)'
      logFn(`${prefix}${marker} ${chunk}`)
    }

    // Data séparément si présente
    if (data !== undefined) {
      logFn(`${prefix} [DATA]`, this.formatDataForConsole(data))
    }
  }

  private sanitizeData(data: unknown): unknown {
    if (data === undefined || data === null) return data

    try {
      // Circular reference handling
      const seen = new WeakSet()
      return JSON.parse(JSON.stringify(data, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) return '[Circular]'
          seen.add(value)
        }
        if (typeof value === 'bigint') return value.toString() + 'n'
        if (value instanceof Uint8Array) {
          return {
            __type: 'Uint8Array',
            length: value.length,
            preview: Array.from(value.slice(0, 32)),
          }
        }
        if (value instanceof ArrayBuffer) {
          return {
            __type: 'ArrayBuffer',
            byteLength: value.byteLength,
          }
        }
        if (value instanceof Error) {
          return {
            __type: 'Error',
            name: value.name,
            message: value.message,
            stack: value.stack,
          }
        }
        return value
      }))
    } catch {
      return '[Unserializable]'
    }
  }

  private formatDataForConsole(data: unknown): unknown {
    // En dev, on peut faire du pretty printing
    if (import.meta.env.DEV && typeof data === 'object') {
      return data
    }
    return data
  }

  private addToBuffer(entry: LogEntry): void {
    this.buffer.push(entry)
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift() // Remove oldest
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  }

  private eventTypeToScope(eventType: string): LogScope {
    if (eventType.startsWith('ble:')) return 'ble'
    if (eventType.startsWith('wifi:')) return 'wifi'
    if (eventType.startsWith('transfer:')) return 'orchestrator'
    if (eventType.startsWith('upload:')) return 'api'
    return 'general'
  }

  private getLevelEmoji(level: LogLevel): string {
    const emojis = {
      trace: '🔍',
      debug: '🐛',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    }
    return emojis[level]
  }

  private getConsoleFn(level: LogLevel): (...args: unknown[]) => void {
    switch (level) {
      case 'trace':
      case 'debug':
        return console.debug
      case 'info':
        return console.info
      case 'warn':
        return console.warn
      case 'error':
        return console.error
      default:
        return console.log
    }
  }

  private levelToNumber(level: LogLevel): number {
    const levels = { trace: 0, debug: 1, info: 2, warn: 3, error: 4 }
    return levels[level]
  }
}

// ==================== HELPER CLASSES ====================

class LogGroup {
  constructor(private logger: Logger, private scope: LogScope) {}

  log(level: LogLevel, message: string, data?: unknown): void {
    this.logger.log(level, this.scope, message, data)
  }

  debug(message: string, data?: unknown): void {
    this.logger.debug(this.scope, message, data)
  }

  info(message: string, data?: unknown): void {
    this.logger.info(this.scope, message, data)
  }

  warn(message: string, data?: unknown): void {
    this.logger.warn(this.scope, message, data)
  }

  error(message: string, data?: unknown): void {
    this.logger.error(this.scope, message, data)
  }

  end(): void {
    if (this.logger['shouldLog'](this.scope, 'debug')) {
      console.groupEnd()
    }
  }
}

class LogTimer {
  private startTime: number

  constructor(
    private logger: Logger,
    private scope: LogScope,
    private operation: string
  ) {
    this.startTime = performance.now()
    this.logger.debug(scope, `⏱️ ${operation} - START`)
  }

  end(extraData?: unknown): number {
    const duration = performance.now() - this.startTime
    const durationStr = duration < 1000
      ? `${Math.round(duration)}ms`
      : `${(duration / 1000).toFixed(1)}s`

    this.logger.debug(this.scope, `⏱️ ${this.operation} - END (${durationStr})`, extraData)
    return duration
  }
}

// ==================== TYPES ====================

interface LogEntry {
  id: string
  timestamp: Date
  level: LogLevel
  scope: LogScope
  message: string
  data?: unknown
}

interface LogStats {
  total: number
  byLevel: Record<LogLevel, number>
  byScope: Record<LogScope, number>
  oldest?: Date
  newest?: Date
}

// ==================== SINGLETON EXPORT ====================

export const logger = new Logger()

// Raccourcis pour usage fréquent
export const bleLog = {
  trace: (msg: string, data?: unknown) => logger.trace('ble', msg, data),
  debug: (msg: string, data?: unknown) => logger.debug('ble', msg, data),
  info: (msg: string, data?: unknown) => logger.info('ble', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('ble', msg, data),
  error: (msg: string, data?: unknown) => logger.error('ble', msg, data),
}

export const wifiLog = {
  trace: (msg: string, data?: unknown) => logger.trace('wifi', msg, data),
  debug: (msg: string, data?: unknown) => logger.debug('wifi', msg, data),
  info: (msg: string, data?: unknown) => logger.info('wifi', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('wifi', msg, data),
  error: (msg: string, data?: unknown) => logger.error('wifi', msg, data),
}

export const apiLog = {
  trace: (msg: string, data?: unknown) => logger.trace('api', msg, data),
  debug: (msg: string, data?: unknown) => logger.debug('api', msg, data),
  info: (msg: string, data?: unknown) => logger.info('api', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('api', msg, data),
  error: (msg: string, data?: unknown) => logger.error('api', msg, data),
}

export const orchestratorLog = {
  trace: (msg: string, data?: unknown) => logger.trace('orchestrator', msg, data),
  debug: (msg: string, data?: unknown) => logger.debug('orchestrator', msg, data),
  info: (msg: string, data?: unknown) => logger.info('orchestrator', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('orchestrator', msg, data),
  error: (msg: string, data?: unknown) => logger.error('orchestrator', msg, data),
}

export const stateLog = {
  trace: (msg: string, data?: unknown) => logger.trace('general', msg, data),
  debug: (msg: string, data?: unknown) => logger.debug('general', msg, data),
  info: (msg: string, data?: unknown) => logger.info('general', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('general', msg, data),
  error: (msg: string, data?: unknown) => logger.error('general', msg, data),
  time: (operation: string) => {
    const startTime = Date.now()
    return {
      end: (result?: { success?: boolean; error?: any }) => {
        const duration = Date.now() - startTime
        const level = result?.error ? 'error' : 'info'
        const status = result?.error ? '❌' : '✅'
        logger.log(level, 'general', `${status} ${operation} (${duration}ms)`, result)
      }
    }
  }
}

export const databaseLog = {
  trace: (msg: string, data?: unknown) => logger.trace('storage', msg, data),
  debug: (msg: string, data?: unknown) => logger.debug('storage', msg, data),
  info: (msg: string, data?: unknown) => logger.info('storage', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('storage', msg, data),
  error: (msg: string, data?: unknown) => logger.error('storage', msg, data),
  time: (operation: string) => logger.time('storage', operation),
}

// Export des types pour usage externe - déjà définis au début du fichier