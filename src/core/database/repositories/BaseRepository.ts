/**
 * Base Repository - Classe de base pour repositories Dexie
 * Op+®rations CRUD communes avec cache et synchronisation
 */

import type { Table } from 'dexie'
import type { TrackBeeDatabase } from '@/core/database/schema'
import { databaseLog } from '@/core/utils/logger'
import { idUtils } from '@/core/utils/ids'

// ==================== TYPES ====================

export interface BaseEntity {
  id: string
  createdAt?: Date
  updatedAt?: Date
  syncedAt?: Date
}

export interface RepositoryOptions {
  enableCache?: boolean
  cacheTimeout?: number // minutes
  enableSync?: boolean
}

export interface QueryOptions {
  limit?: number
  offset?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
  useCache?: boolean
}

export interface SyncOptions {
  force?: boolean
  conflictResolution?: 'server' | 'local' | 'merge'
}

// ==================== BASE REPOSITORY ====================

export abstract class BaseRepository<T extends BaseEntity> {
  protected table: Table<T, string>
  protected db: TrackBeeDatabase
  protected tableName: string
  protected cache = new Map<string, { data: T; timestamp: Date }>()

  protected options: RepositoryOptions = {
    enableCache: true,
    cacheTimeout: 5, // 5 minutes
    enableSync: true
  }

  constructor(
    db: TrackBeeDatabase,
    table: Table<T, string>,
    tableName: string,
    options?: Partial<RepositoryOptions>
  ) {
    this.db = db
    this.table = table
    this.tableName = tableName
    this.options = { ...this.options, ...options }

    databaseLog.debug(`Repository initialized: ${tableName}`, {
      enableCache: this.options.enableCache,
      enableSync: this.options.enableSync
    })
  }

  // ==================== CRUD OPERATIONS ====================

  /**
   * Cr+®er un nouvel enregistrement
   */
  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const timer = databaseLog.time(`Create ${this.tableName}`)

    try {
      const id = idUtils.generateUnique(this.tableName)
      const now = new Date()

      const entity: T = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now
      } as T

      await this.table.add(entity)

      // Mettre en cache
      this.setCacheItem(id, entity)

      // Logger pour sync
      if (this.options.enableSync) {
        await this.db.logSyncOperation(this.tableName, 'create', id, true)
      }

      timer.end({ success: true, id })
      databaseLog.debug(`${this.tableName} created`, { id })

      return entity

    } catch (error) {
      timer.end({ error })
      databaseLog.error(`Failed to create ${this.tableName}`, { error })
      throw error
    }
  }

  /**
   * Lire un enregistrement par ID
   */
  async findById(id: string, options?: { useCache?: boolean }): Promise<T | null> {
    const { useCache = this.options.enableCache } = options || {}

    try {
      // V+®rifier le cache d'abord
      if (useCache) {
        const cached = this.getCacheItem(id)
        if (cached) {
          databaseLog.trace(`${this.tableName} found in cache`, { id })
          return cached
        }
      }

      // R+®cup+®rer depuis la DB
      const entity = await this.table.get(id)

      if (entity && useCache) {
        this.setCacheItem(id, entity)
      }

      databaseLog.trace(`${this.tableName} found in DB`, { id, found: !!entity })
      return entity || null

    } catch (error) {
      databaseLog.error(`Failed to find ${this.tableName} by ID`, { id, error })
      return null
    }
  }

  /**
   * Lister les enregistrements avec pagination
   */
  async findAll(options: QueryOptions = {}): Promise<{
    data: T[]
    total: number
    hasMore: boolean
  }> {
    const timer = databaseLog.time(`Find all ${this.tableName}`)
    const {
      limit = 50,
      offset = 0,
      orderBy = 'createdAt',
      orderDirection = 'desc'
    } = options

    try {
      let query = this.table.orderBy(orderBy)

      if (orderDirection === 'desc') {
        query = query.reverse()
      }

      // Appliquer pagination
      const data = await query.offset(offset).limit(limit).toArray()

      // Compter le total
      const total = await this.table.count()

      const hasMore = offset + limit < total

      // Mettre en cache les r+®sultats
      if (this.options.enableCache) {
        data.forEach(item => this.setCacheItem(item.id, item))
      }

      timer.end({ success: true, count: data.length, total })
      databaseLog.debug(`${this.tableName} list retrieved`, {
        count: data.length,
        total,
        hasMore
      })

      return { data, total, hasMore }

    } catch (error) {
      timer.end({ error })
      databaseLog.error(`Failed to find all ${this.tableName}`, { error })
      throw error
    }
  }

  /**
   * Mettre +á jour un enregistrement
   */
  async update(id: string, updates: Partial<Omit<T, 'id' | 'createdAt'>>): Promise<T | null> {
    const timer = databaseLog.time(`Update ${this.tableName}`)

    try {
      const now = new Date()
      const updateData: any = {
        ...updates,
        updatedAt: now
      }
      // Marquer comme non-synchronis+® en supprimant syncedAt
      if ('syncedAt' in updateData || updates.syncedAt !== undefined) {
        delete updateData.syncedAt
      }

      const updatedCount = await this.table.update(id, updateData)

      if (updatedCount === 0) {
        databaseLog.warn(`${this.tableName} not found for update`, { id })
        return null
      }

      // R+®cup+®rer l'enregistrement mis +á jour
      const entity = await this.table.get(id)

      if (entity) {
        // Mettre en cache
        this.setCacheItem(id, entity)

        // Logger pour sync
        if (this.options.enableSync) {
          await this.db.logSyncOperation(this.tableName, 'update', id, true)
        }
      }

      timer.end({ success: true, id })
      databaseLog.debug(`${this.tableName} updated`, { id })

      return entity || null

    } catch (error) {
      timer.end({ error })
      databaseLog.error(`Failed to update ${this.tableName}`, { id, error })
      throw error
    }
  }

  /**
   * Supprimer un enregistrement
   */
  async delete(id: string): Promise<boolean> {
    const timer = databaseLog.time(`Delete ${this.tableName}`)

    try {
      await this.table.delete(id)

      // Supprimer du cache
      this.cache.delete(id)

      // Logger pour sync
      if (this.options.enableSync) {
        await this.db.logSyncOperation(this.tableName, 'delete', id, true)
      }

      timer.end({ success: true, id })
      databaseLog.debug(`${this.tableName} deleted`, { id })

      return true

    } catch (error) {
      timer.end({ error })
      databaseLog.error(`Failed to delete ${this.tableName}`, { id, error })
      return false
    }
  }

  /**
   * Compter les enregistrements
   */
  async count(filter?: (item: T) => boolean): Promise<number> {
    try {
      if (filter) {
        return await this.table.filter(filter).count()
      }
      return await this.table.count()
    } catch (error) {
      databaseLog.error(`Failed to count ${this.tableName}`, { error })
      return 0
    }
  }

  // ==================== BATCH OPERATIONS ====================

  /**
   * Cr+®er plusieurs enregistrements
   */
  async createMany(items: Omit<T, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<T[]> {
    const timer = databaseLog.time(`Create many ${this.tableName}`)

    try {
      const now = new Date()
      const entities: T[] = items.map(item => ({
        ...item,
        id: idUtils.generateUnique(this.tableName),
        createdAt: now,
        updatedAt: now
      })) as T[]

      await this.table.bulkAdd(entities)

      // Mettre en cache
      if (this.options.enableCache) {
        entities.forEach(entity => this.setCacheItem(entity.id, entity))
      }

      timer.end({ success: true, count: entities.length })
      databaseLog.debug(`${this.tableName} bulk created`, { count: entities.length })

      return entities

    } catch (error) {
      timer.end({ error })
      databaseLog.error(`Failed to create many ${this.tableName}`, { error })
      throw error
    }
  }

  /**
   * Upsert (cr+®er ou mettre +á jour)
   */
  async upsert(data: Omit<T, 'createdAt' | 'updatedAt'> & { id: string }): Promise<T> {
    const timer = databaseLog.time(`Upsert ${this.tableName}`)

    try {
      const existing = await this.findById(data.id, { useCache: false })
      const now = new Date()

      let entity: T

      if (existing) {
        // Mettre +á jour
        const updateData: any = {
          ...data,
          updatedAt: now
        }
        // Marquer comme non-synchronis+®
        delete updateData.syncedAt
        await this.table.update(data.id, updateData)
        entity = { ...existing, ...updateData } as T
      } else {
        // Cr+®er
        entity = {
          ...data,
          createdAt: now,
          updatedAt: now
        } as T
        await this.table.add(entity)
      }

      // Mettre en cache
      this.setCacheItem(entity.id, entity)

      timer.end({ success: true, id: entity.id, operation: existing ? 'update' : 'create' })
      databaseLog.debug(`${this.tableName} upserted`, {
        id: entity.id,
        operation: existing ? 'update' : 'create'
      })

      return entity

    } catch (error) {
      timer.end({ error })
      databaseLog.error(`Failed to upsert ${this.tableName}`, { id: data.id, error })
      throw error
    }
  }

  // ==================== SYNCHRONIZATION ====================

  /**
   * Obtenir les enregistrements non synchronis+®s
   */
  async getUnsyncedItems(): Promise<T[]> {
    try {
      const items = await this.table
        .where('syncedAt')
        .equals(null as any)
        .toArray()

      databaseLog.debug(`${this.tableName} unsynced items`, { count: items.length })
      return items

    } catch (error) {
      databaseLog.error(`Failed to get unsynced ${this.tableName}`, { error })
      return []
    }
  }

  /**
   * Marquer un enregistrement comme synchronis+®
   */
  async markAsSynced(id: string): Promise<void> {
    try {
      await this.table.update(id, { syncedAt: new Date() } as any)

      // Mettre +á jour le cache
      const cached = this.cache.get(id)
      if (cached) {
        cached.data.syncedAt = new Date()
      }

      databaseLog.debug(`${this.tableName} marked as synced`, { id })

    } catch (error) {
      databaseLog.error(`Failed to mark ${this.tableName} as synced`, { id, error })
    }
  }

  // ==================== CACHE MANAGEMENT ====================

  /**
   * Mettre un +®l+®ment en cache
   */
  protected setCacheItem(id: string, data: T): void {
    if (!this.options.enableCache) return

    this.cache.set(id, {
      data,
      timestamp: new Date()
    })

    // Nettoyer le cache si trop volumineux
    if (this.cache.size > 1000) {
      this.cleanCache()
    }
  }

  /**
   * R+®cup+®rer un +®l+®ment du cache
   */
  protected getCacheItem(id: string): T | null {
    if (!this.options.enableCache) return null

    const cached = this.cache.get(id)
    if (!cached) return null

    // V+®rifier expiration
    const ageInMinutes = (Date.now() - cached.timestamp.getTime()) / (1000 * 60)
    if (ageInMinutes > (this.options.cacheTimeout || 5)) {
      this.cache.delete(id)
      return null
    }

    return cached.data
  }

  /**
   * Nettoyer le cache expir+®
   */
  protected cleanCache(): void {
    const timeoutMs = (this.options.cacheTimeout || 5) * 60 * 1000
    const cutoff = Date.now() - timeoutMs

    let cleanedCount = 0
    for (const [id, cached] of this.cache.entries()) {
      if (cached.timestamp.getTime() < cutoff) {
        this.cache.delete(id)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      databaseLog.debug(`${this.tableName} cache cleaned`, { cleanedCount })
    }
  }

  /**
   * Vider le cache
   */
  clearCache(): void {
    const size = this.cache.size
    this.cache.clear()
    databaseLog.debug(`${this.tableName} cache cleared`, { clearedCount: size })
  }

  // ==================== STATISTICS ====================

  /**
   * Obtenir les statistiques du repository
   */
  async getStats(): Promise<{
    totalCount: number
    unsyncedCount: number
    cacheSize: number
    cacheHitRate?: number
  }> {
    const [totalCount, unsyncedCount] = await Promise.all([
      this.table.count(),
      this.table.where('syncedAt').equals(null as any).count()
    ])

    return {
      totalCount,
      unsyncedCount,
      cacheSize: this.cache.size
    }
  }
}

// ==================== SEARCH MIXIN ====================

/**
 * Mixin pour ajouter des capacit+®s de recherche
 */
type BaseRepositoryConstructor<T extends BaseEntity> = new (...args: any[]) => BaseRepository<T>

export function WithSearch<T extends BaseEntity, Ctor extends BaseRepositoryConstructor<T>>(Base: Ctor) {
  return class extends Base {
    constructor(...args: any[]) {
      super(...args)
    }
    async search(
      query: string,
      searchFields: (keyof T)[],
      options: QueryOptions = {}
    ): Promise<{ data: T[]; total: number }> {
      const timer = databaseLog.time(`Search ${this.tableName}`)

      try {
        const queryLower = query.toLowerCase()

        const data = await this.table
          .filter(item => {
            return searchFields.some(field => {
              const value = item[field]
              return value &&
                     typeof value === 'string' &&
                     value.toLowerCase().includes(queryLower)
            })
          })
          .limit(options.limit || 50)
          .toArray()

        timer.end({ success: true, count: data.length, query })
        databaseLog.debug(`${this.tableName} search completed`, {
          query,
          count: data.length
        })

        return { data, total: data.length }

      } catch (error) {
        timer.end({ error })
        databaseLog.error(`Failed to search ${this.tableName}`, { query, error })
        throw error
      }
    }
  }
}

// Types already exported with export interface above
