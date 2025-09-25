/**
 * Event Bus - Système d'événements centralisé
 * Communication découplée entre services et UI
 */

import type { SystemEvent } from '@/core/types/transport'
import { orchestratorLog, logger } from '@/core/utils/logger'
import { idUtils } from '@/core/utils/ids'

// ==================== TYPES ====================

type EventHandler<T = any> = (event: T) => void | Promise<void>
type EventFilter<T = any> = (event: T) => boolean

interface EventSubscription {
  id: string
  type: string | '*'
  handler: EventHandler
  filter?: EventFilter
  once?: boolean
  priority?: number
  createdAt: Date
  callCount: number
  lastCalled?: Date
}

interface EventStats {
  totalEvents: number
  totalSubscriptions: number
  eventsByType: Record<string, number>
  subscriptionsByType: Record<string, number>
  averageHandlers: number
  lastEventTime?: Date
}

interface EventHistory {
  id: string
  event: SystemEvent
  timestamp: Date
  handlersCount: number
  duration?: number
  errors?: string[]
}

// ==================== EVENT BUS CLASS ====================

export class EventBus {
  private subscriptions = new Map<string, EventSubscription[]>()
  private history: EventHistory[] = []
  private isEnabled = true
  private stats: EventStats = {
    totalEvents: 0,
    totalSubscriptions: 0,
    eventsByType: {},
    subscriptionsByType: {},
    averageHandlers: 0
  }

  private readonly maxHistorySize = 1000
  private readonly maxConcurrentEvents = 50

  constructor() {
    orchestratorLog.debug('EventBus initialized')
  }

  // ==================== SUBSCRIPTION ====================

  /**
   * Subscribe à un type d'événement
   */
  on<T extends SystemEvent>(
    type: T['type'] | '*',
    handler: EventHandler<T>,
    options: {
      filter?: EventFilter<T>
      once?: boolean
      priority?: number
    } = {}
  ): () => void {
    const { filter, once = false, priority = 0 } = options

    const subscription: EventSubscription = {
      id: idUtils.generateUnique('sub'),
      type,
      handler: handler as EventHandler,
      filter: filter as EventFilter,
      once,
      priority,
      createdAt: new Date(),
      callCount: 0
    }

    // Ajouter à la liste des subscriptions
    if (!this.subscriptions.has(type)) {
      this.subscriptions.set(type, [])
    }

    const typeSubscriptions = this.subscriptions.get(type)!
    typeSubscriptions.push(subscription)

    // Trier par priorité (plus élevée en premier)
    typeSubscriptions.sort((a, b) => (b.priority || 0) - (a.priority || 0))

    // Mettre à jour les stats
    this.stats.totalSubscriptions++
    this.stats.subscriptionsByType[type] = (this.stats.subscriptionsByType[type] || 0) + 1

    orchestratorLog.trace(`Event subscription added`, {
      subscriptionId: subscription.id,
      type,
      priority,
      once,
      hasFilter: !!filter
    })

    // Retourner fonction de désabonnement
    return () => this.unsubscribe(subscription.id)
  }

  /**
   * Subscribe à un événement une seule fois
   */
  once<T extends SystemEvent>(
    type: T['type'] | '*',
    handler: EventHandler<T>,
    options: { filter?: EventFilter<T>; priority?: number } = {}
  ): Promise<T> {
    return new Promise((resolve) => {
      this.on(
        type,
        (event: T) => {
          handler(event)
          resolve(event)
        },
        { ...options, once: true }
      )
    })
  }

  /**
   * Désabonnement par ID
   */
  private unsubscribe(subscriptionId: string): void {
    for (const [type, subscriptions] of this.subscriptions.entries()) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId)
      if (index !== -1) {
        subscriptions.splice(index, 1)
        this.stats.totalSubscriptions--
        this.stats.subscriptionsByType[type] = Math.max(0, (this.stats.subscriptionsByType[type] || 1) - 1)

        orchestratorLog.trace(`Event subscription removed`, { subscriptionId, type })

        // Nettoyer les types vides
        if (subscriptions.length === 0) {
          this.subscriptions.delete(type)
        }
        break
      }
    }
  }

  /**
   * Désabonnement par type
   */
  off(type: string | '*', handler?: EventHandler): void {
    const subscriptions = this.subscriptions.get(type)
    if (!subscriptions) return

    if (handler) {
      // Supprimer un handler spécifique
      const index = subscriptions.findIndex(sub => sub.handler === handler)
      if (index !== -1) {
        this.unsubscribe(subscriptions[index]!.id)
      }
    } else {
      // Supprimer tous les handlers pour ce type
      const toRemove = [...subscriptions]
      toRemove.forEach(sub => this.unsubscribe(sub.id))
    }
  }

  /**
   * Vider tous les subscriptions
   */
  clear(): void {
    const count = this.stats.totalSubscriptions
    this.subscriptions.clear()
    this.stats.totalSubscriptions = 0
    this.stats.subscriptionsByType = {}

    orchestratorLog.debug(`All event subscriptions cleared`, { removedCount: count })
  }

  // ==================== EMISSION ====================

  /**
   * Émet un événement
   */
  async emit(event: SystemEvent): Promise<void> {
    if (!this.isEnabled) {
      orchestratorLog.trace('EventBus disabled, ignoring event', { type: event.type })
      return
    }

    const eventId = idUtils.generateUnique('evt')
    const startTime = performance.now()

    orchestratorLog.trace(`📢 Emitting event`, {
      eventId,
      type: event.type,
      data: event.data
    })

    // Obtenir tous les handlers concernés
    const handlers = this.getHandlersForEvent(event)

    if (handlers.length === 0) {
      orchestratorLog.trace(`No handlers found for event type: ${event.type}`)
      this.updateStats(event, 0, 0)
      return
    }

    // Créer l'entrée d'historique
    const historyEntry: EventHistory = {
      id: eventId,
      event,
      timestamp: new Date(),
      handlersCount: handlers.length
    }

    const errors: string[] = []

    try {
      // Exécuter tous les handlers
      await Promise.allSettled(
        handlers.map(async (subscription) => {
          try {
            // Vérifier le filtre si présent
            if (subscription.filter && !subscription.filter(event)) {
              return
            }

            // Exécuter le handler
            await subscription.handler(event)

            // Mettre à jour les stats de subscription
            subscription.callCount++
            subscription.lastCalled = new Date()

            // Supprimer si c'était un "once"
            if (subscription.once) {
              this.unsubscribe(subscription.id)
            }

          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            errors.push(`${subscription.id}: ${errorMsg}`)

            orchestratorLog.error(`Event handler error`, {
              subscriptionId: subscription.id,
              eventType: event.type,
              error: errorMsg
            })
          }
        })
      )

      const duration = performance.now() - startTime
      historyEntry.duration = duration
      historyEntry.errors = errors.length > 0 ? errors : undefined

      orchestratorLog.debug(`✅ Event processed`, {
        eventId,
        type: event.type,
        handlersCount: handlers.length,
        duration: Math.round(duration),
        errorsCount: errors.length
      })

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      orchestratorLog.error(`Event emission failed`, {
        eventId,
        type: event.type,
        error: errorMsg
      })
      historyEntry.errors = [errorMsg]
    }

    // Ajouter à l'historique
    this.addToHistory(historyEntry)

    // Mettre à jour les stats
    this.updateStats(event, handlers.length, historyEntry.duration || 0)
  }

  /**
   * Émet un événement de façon synchrone (fire and forget)
   */
  emitSync(event: SystemEvent): void {
    // Exécution asynchrone sans attendre
    this.emit(event).catch(error => {
      orchestratorLog.error('Sync event emission error', {
        type: event.type,
        error: error instanceof Error ? error.message : String(error)
      })
    })
  }

  /**
   * Émet plusieurs événements en batch
   */
  async emitBatch(events: SystemEvent[]): Promise<void> {
    if (events.length === 0) return

    orchestratorLog.debug(`📢 Emitting event batch`, { count: events.length })

    const timer = logger.time('orchestrator', `Event batch (${events.length} events)`)

    try {
      // Limiter la concurrence pour éviter la surcharge
      const chunks = this.chunkArray(events, this.maxConcurrentEvents)

      for (const chunk of chunks) {
        await Promise.allSettled(chunk.map(event => this.emit(event)))
      }

      timer.end({ eventsCount: events.length })
    } catch (error) {
      timer.end({ error })
      throw error
    }
  }

  // ==================== UTILITAIRES ====================

  /**
   * Active/désactive l'EventBus
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
    orchestratorLog.debug(`EventBus ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * Vérifie si l'EventBus est actif
   */
  isEventBusEnabled(): boolean {
    return this.isEnabled
  }

  /**
   * Obtient les statistiques
   */
  getStats(): EventStats {
    // Calculer la moyenne de handlers par type
    const types = Object.keys(this.stats.subscriptionsByType)
    this.stats.averageHandlers = types.length > 0
      ? Object.values(this.stats.subscriptionsByType).reduce((sum, count) => sum + count, 0) / types.length
      : 0

    return { ...this.stats }
  }

  /**
   * Obtient l'historique des événements
   */
  getHistory(filter?: {
    type?: string
    since?: Date
    limit?: number
  }): EventHistory[] {
    let filtered = [...this.history]

    if (filter?.type) {
      filtered = filtered.filter(entry => entry.event.type === filter.type)
    }

    if (filter?.since) {
      filtered = filtered.filter(entry => entry.timestamp >= filter.since!)
    }

    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit)
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Vide l'historique
   */
  clearHistory(): void {
    const count = this.history.length
    this.history = []
    orchestratorLog.debug(`Event history cleared`, { clearedCount: count })
  }

  /**
   * Liste toutes les subscriptions actives
   */
  getSubscriptions(): Record<string, EventSubscription[]> {
    const result: Record<string, EventSubscription[]> = {}
    for (const [type, subscriptions] of this.subscriptions.entries()) {
      result[type] = [...subscriptions]
    }
    return result
  }

  /**
   * Compte les subscriptions par type
   */
  getSubscriptionCount(type?: string): number {
    if (type) {
      return this.subscriptions.get(type)?.length || 0
    }
    return this.stats.totalSubscriptions
  }

  /**
   * Debug - dump de l'état complet
   */
  dump(): {
    enabled: boolean
    stats: EventStats
    subscriptions: Record<string, number>
    recentHistory: EventHistory[]
  } {
    return {
      enabled: this.isEnabled,
      stats: this.getStats(),
      subscriptions: Object.fromEntries(
        Array.from(this.subscriptions.entries()).map(([type, subs]) => [type, subs.length])
      ),
      recentHistory: this.getHistory({ limit: 10 })
    }
  }

  // ==================== PRIVATE METHODS ====================

  private getHandlersForEvent(event: SystemEvent): EventSubscription[] {
    const handlers: EventSubscription[] = []

    // Handlers spécifiques au type
    const typeHandlers = this.subscriptions.get(event.type) || []
    handlers.push(...typeHandlers)

    // Handlers génériques (wildcard)
    const wildcardHandlers = this.subscriptions.get('*') || []
    handlers.push(...wildcardHandlers)

    // Trier par priorité
    return handlers.sort((a, b) => (b.priority || 0) - (a.priority || 0))
  }

  private addToHistory(entry: EventHistory): void {
    this.history.push(entry)

    // Limiter la taille de l'historique
    if (this.history.length > this.maxHistorySize) {
      this.history.shift()
    }
  }

  private updateStats(event: SystemEvent, handlersCount: number, duration: number): void {
    this.stats.totalEvents++
    this.stats.eventsByType[event.type] = (this.stats.eventsByType[event.type] || 0) + 1
    this.stats.lastEventTime = new Date()

    // Log des métriques de performance si activées
    if (duration > 10) { // Plus de 10ms
      orchestratorLog.warn(`Slow event processing`, {
        type: event.type,
        duration: Math.round(duration),
        handlersCount
      })
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }
}

// ==================== SINGLETON EXPORT ====================

export const eventBus = new EventBus()

// Raccourcis pour usage courant
export const events = {
  on: eventBus.on.bind(eventBus),
  once: eventBus.once.bind(eventBus),
  off: eventBus.off.bind(eventBus),
  emit: eventBus.emit.bind(eventBus),
  emitSync: eventBus.emitSync.bind(eventBus),
} as const

// Types exportés
export type { EventHandler, EventFilter, EventSubscription, EventStats, EventHistory }

// PUSH FINAL: Hook React manquant pour EventBus
export function useEventBus() {
  return {
    eventBus,
    on: eventBus.on.bind(eventBus),
    once: eventBus.once.bind(eventBus),
    off: eventBus.off.bind(eventBus),
    emit: eventBus.emit.bind(eventBus),
    emitSync: eventBus.emitSync.bind(eventBus),
  }
}