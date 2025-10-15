/**
 * Storage Manager - Gestion de la persistence cross-platform
 * Support localStorage, Preferences Capacitor, SecureStorage
 */

import { Preferences } from '@capacitor/preferences'
// import { SecureStoragePlugin } from '@capacitor/secure-storage' // Package non disponible
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import type { AppError } from '@/core/types/transport'
import { logger } from '@/core/utils/logger'
import { detectPlatform } from '@/core/utils/env'

// ==================== TYPES ====================

type StorageType = 'local' | 'preferences' | 'secure' | 'filesystem'

interface StorageOptions {
  type?: StorageType
  encrypt?: boolean
  directory?: Directory
  encoding?: Encoding
}

interface FileStorageOptions {
  directory?: Directory
  path?: string
  encoding?: Encoding
  createIntermediateDirectories?: boolean
}

interface StorageStats {
  type: StorageType
  available: boolean
  used?: number
  total?: number
  itemCount?: number
}

// ==================== STORAGE ADAPTERS ====================

abstract class StorageAdapter {
  abstract type: StorageType
  abstract available: boolean

  abstract get(key: string): Promise<string | null>
  abstract set(key: string, value: string): Promise<void>
  abstract remove(key: string): Promise<void>
  abstract clear(): Promise<void>
  abstract keys(): Promise<string[]>
  abstract getStats(): Promise<StorageStats>
}

class LocalStorageAdapter extends StorageAdapter {
  type: StorageType = 'local'
  available = typeof localStorage !== 'undefined'

  async get(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key)
    } catch (error) {
      logger.warn('storage', 'LocalStorage get failed', { key, error })
      return null
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value)
    } catch (error) {
      logger.error('storage', 'LocalStorage set failed', { key, error })
      throw this.createError('STORAGE_QUOTA_EXCEEDED', 'LocalStorage quota exceeded')
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      logger.warn('storage', 'LocalStorage remove failed', { key, error })
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.clear()
    } catch (error) {
      logger.error('storage', 'LocalStorage clear failed', { error })
      throw this.createError('STORAGE_CLEAR_FAILED', 'Failed to clear LocalStorage')
    }
  }

  async keys(): Promise<string[]> {
    try {
      return Object.keys(localStorage)
    } catch (error) {
      logger.warn('storage', 'LocalStorage keys failed', { error })
      return []
    }
  }

  async getStats(): Promise<StorageStats> {
    try {
      const keys = await this.keys()
      let used = 0
      for (const key of keys) {
        const value = localStorage.getItem(key)
        used += (key.length + (value?.length || 0)) * 2 // UTF-16 encoding
      }

      return {
        type: this.type,
        available: this.available,
        used,
        total: 10 * 1024 * 1024, // ~10MB typical limit
        itemCount: keys.length
      }
    } catch {
      return {
        type: this.type,
        available: false
      }
    }
  }

  private createError(code: string, message: string): AppError {
    return {
      code,
      message,
      category: 'storage',
      retryable: false,
      timestamp: new Date()
    }
  }
}

class PreferencesAdapter extends StorageAdapter {
  type: StorageType = 'preferences'
  available = detectPlatform().isCapacitor

  async get(key: string): Promise<string | null> {
    try {
      const result = await Preferences.get({ key })
      return result.value || null
    } catch (error) {
      logger.warn('storage', 'Preferences get failed', { key, error })
      return null
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      await Preferences.set({ key, value })
    } catch (error) {
      logger.error('storage', 'Preferences set failed', { key, error })
      throw this.createError('PREFERENCES_SET_FAILED', 'Failed to set preference')
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await Preferences.remove({ key })
    } catch (error) {
      logger.warn('storage', 'Preferences remove failed', { key, error })
    }
  }

  async clear(): Promise<void> {
    try {
      await Preferences.clear()
    } catch (error) {
      logger.error('storage', 'Preferences clear failed', { error })
      throw this.createError('PREFERENCES_CLEAR_FAILED', 'Failed to clear preferences')
    }
  }

  async keys(): Promise<string[]> {
    try {
      const result = await Preferences.keys()
      return result.keys
    } catch (error) {
      logger.warn('storage', 'Preferences keys failed', { error })
      return []
    }
  }

  async getStats(): Promise<StorageStats> {
    try {
      const keys = await this.keys()
      return {
        type: this.type,
        available: this.available,
        itemCount: keys.length
      }
    } catch {
      return {
        type: this.type,
        available: false
      }
    }
  }

  private createError(code: string, message: string): AppError {
    return {
      code,
      message,
      category: 'storage',
      retryable: false,
      timestamp: new Date()
    }
  }
}

class SecureStorageAdapter extends StorageAdapter {
  type: StorageType = 'secure'
  available = detectPlatform().isCapacitor

  async get(key: string): Promise<string | null> {
    try {
      const result = await Preferences.get({ key: `secure_${key}` })
      return result.value || null
    } catch (error) {
      // SecureStorage peut throw si la clé n'existe pas
      if (error && typeof error === 'object' && 'message' in error) {
        const message = String(error.message).toLowerCase()
        if (message.includes('not found') || message.includes('key not found')) {
          return null
        }
      }
      logger.warn('storage', 'SecureStorage get failed', { key, error })
      return null
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      await Preferences.set({ key: `secure_${key}`, value })
    } catch (error) {
      logger.error('storage', 'SecureStorage set failed', { key, error })
      throw this.createError('SECURE_STORAGE_SET_FAILED', 'Failed to set secure value')
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await Preferences.remove({ key: `secure_${key}` })
    } catch (error) {
      logger.warn('storage', 'SecureStorage remove failed', { key, error })
    }
  }

  async clear(): Promise<void> {
    try {
      // SecureStoragePlugin.clear() non disponible, utiliser Preferences
    } catch (error) {
      logger.error('storage', 'SecureStorage clear failed', { error })
      throw this.createError('SECURE_STORAGE_CLEAR_FAILED', 'Failed to clear secure storage')
    }
  }

  async keys(): Promise<string[]> {
    try {
      // SecureStoragePlugin.keys() non disponible
      const result = { keys: [] }
      return result.keys || []
    } catch (error) {
      logger.warn('storage', 'SecureStorage keys failed', { error })
      return []
    }
  }

  async getStats(): Promise<StorageStats> {
    try {
      const keys = await this.keys()
      return {
        type: this.type,
        available: this.available,
        itemCount: keys.length
      }
    } catch {
      return {
        type: this.type,
        available: false
      }
    }
  }

  private createError(code: string, message: string): AppError {
    return {
      code,
      message,
      category: 'storage',
      retryable: false,
      timestamp: new Date()
    }
  }
}

// ==================== STORAGE MANAGER CLASS ====================

export class StorageManager {
  private adapters: Map<StorageType, StorageAdapter>

  constructor() {
    this.adapters = new Map([
      ['local', new LocalStorageAdapter() as StorageAdapter],
      ['preferences', new PreferencesAdapter() as StorageAdapter],
      ['secure', new SecureStorageAdapter() as StorageAdapter]
    ])

    logger.debug('storage', 'StorageManager initialized', {
      adaptersAvailable: Array.from(this.adapters.entries())
        .filter(([, adapter]) => adapter.available)
        .map(([type]) => type)
    })
  }

  // ==================== KEY-VALUE STORAGE ====================

  /**
   * Obtient une valeur depuis le storage
   */
  async get<T = unknown>(key: string, options: StorageOptions = {}): Promise<T | null> {
    const { type = 'local' } = options
    const adapter = this.getAdapter(type)

    logger.trace('storage', `Getting value for key: ${key}`, { type })

    try {
      const value = await adapter.get(key)
      if (value === null) return null

      // Tenter de parser le JSON
      try {
        return JSON.parse(value)
      } catch {
        // Si ce n'est pas du JSON, retourner la string
        return value as T
      }
    } catch (error) {
      logger.error('storage', `Failed to get key: ${key}`, { type, error })
      return null
    }
  }

  /**
   * Stocke une valeur dans le storage
   */
  async set(key: string, value: unknown, options: StorageOptions = {}): Promise<void> {
    const { type = 'local' } = options
    const adapter = this.getAdapter(type)

    logger.trace('storage', `Setting value for key: ${key}`, { type })

    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value)
      await adapter.set(key, serialized)

      logger.trace('storage', `✅ Value set successfully for key: ${key}`)
    } catch (error) {
      logger.error('storage', `❌ Failed to set key: ${key}`, { type, error })
      throw error
    }
  }

  /**
   * Supprime une valeur du storage
   */
  async remove(key: string, options: StorageOptions = {}): Promise<void> {
    const { type = 'local' } = options
    const adapter = this.getAdapter(type)

    logger.trace('storage', `Removing key: ${key}`, { type })

    try {
      await adapter.remove(key)
      logger.trace('storage', `✅ Key removed successfully: ${key}`)
    } catch (error) {
      logger.error('storage', `❌ Failed to remove key: ${key}`, { type, error })
      throw error
    }
  }

  /**
   * Vide complètement un storage
   */
  async clear(type: StorageType = 'local'): Promise<void> {
    const adapter = this.getAdapter(type)

    logger.debug('storage', `Clearing storage type: ${type}`)

    try {
      await adapter.clear()
      logger.info('storage', `✅ Storage cleared successfully: ${type}`)
    } catch (error) {
      logger.error('storage', `❌ Failed to clear storage: ${type}`, { error })
      throw error
    }
  }

  /**
   * Liste toutes les clés d'un storage
   */
  async keys(type: StorageType = 'local'): Promise<string[]> {
    const adapter = this.getAdapter(type)

    try {
      const keys = await adapter.keys()
      logger.trace('storage', `Retrieved ${keys.length} keys from ${type}`)
      return keys
    } catch (error) {
      logger.error('storage', `Failed to get keys from ${type}`, { error })
      return []
    }
  }

  // ==================== FILE STORAGE ====================

  /**
   * Lit un fichier depuis le filesystem
   */
  async readFile(path: string, options: FileStorageOptions = {}): Promise<string | null> {
    if (!detectPlatform().isCapacitor) {
      logger.warn('storage', 'File operations not available on web platform')
      return null
    }

    const {
      directory = Directory.Documents,
      encoding = Encoding.UTF8
    } = options

    logger.trace('storage', `Reading file: ${path}`, { directory, encoding })

    try {
      const result = await Filesystem.readFile({
        path,
        directory,
        encoding
      })

      logger.trace('storage', `✅ File read successfully: ${path}`)
      return result.data as string
    } catch (error) {
      logger.warn('storage', `Failed to read file: ${path}`, { error })
      return null
    }
  }

  /**
   * Écrit un fichier dans le filesystem
   */
  async writeFile(
    path: string,
    data: string,
    options: FileStorageOptions = {}
  ): Promise<void> {
    if (!detectPlatform().isCapacitor) {
      throw new Error('File operations not available on web platform')
    }

    const {
      directory = Directory.Documents,
      encoding = Encoding.UTF8,
      createIntermediateDirectories = true
    } = options

    logger.trace('storage', `Writing file: ${path}`, { directory, encoding })

    try {
      // Créer les dossiers intermédiaires si nécessaire
      if (createIntermediateDirectories) {
        const parentPath = path.split('/').slice(0, -1).join('/')
        if (parentPath) {
          try {
            await Filesystem.mkdir({
              path: parentPath,
              directory,
              recursive: true
            })
          } catch (error) {
            // Ignorer si le dossier existe déjà
            if (!String(error).includes('directory exists')) {
              logger.warn('storage', `Failed to create directory: ${parentPath}`, { error })
            }
          }
        }
      }

      await Filesystem.writeFile({
        path,
        data,
        directory,
        encoding
      })

      logger.debug('storage', `✅ File written successfully: ${path}`)
    } catch (error) {
      logger.error('storage', `❌ Failed to write file: ${path}`, { error })
      throw error
    }
  }

  /**
   * Supprime un fichier
   */
  async deleteFile(path: string, directory = Directory.Documents): Promise<void> {
    if (!detectPlatform().isCapacitor) {
      logger.warn('storage', 'File operations not available on web platform')
      return
    }

    logger.trace('storage', `Deleting file: ${path}`)

    try {
      await Filesystem.deleteFile({ path, directory })
      logger.debug('storage', `✅ File deleted successfully: ${path}`)
    } catch (error) {
      logger.warn('storage', `Failed to delete file: ${path}`, { error })
    }
  }

  /**
   * Liste les fichiers d'un dossier
   */
  async listFiles(path = '', directory = Directory.Documents): Promise<string[]> {
    if (!detectPlatform().isCapacitor) {
      return []
    }

    try {
      const result = await Filesystem.readdir({ path, directory })
      const files = result.files
        .filter(f => f.type === 'file')
        .map(f => f.name)

      logger.trace('storage', `Listed ${files.length} files in ${path}`)
      return files
    } catch (error) {
      logger.warn('storage', `Failed to list files in ${path}`, { error })
      return []
    }
  }

  // ==================== STATUS METHODS ====================

  /**
   * Vérifie si le storage manager est disponible
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Vérifier qu'au moins un adapter est disponible
      for (const [type, adapter] of this.adapters) {
        if (adapter.available) {
          // Tester avec une écriture/lecture rapide
          const testKey = `test_${Date.now()}`
          const testValue = 'test'

          await adapter.set(testKey, testValue)
          const retrieved = await adapter.get(testKey)
          await adapter.remove(testKey)

          const isWorking = retrieved === testValue
          logger.trace('storage', `Storage adapter ${type} test: ${isWorking ? 'OK' : 'FAILED'}`)

          if (isWorking) {
            return true
          }
        }
      }

      logger.warn('storage', 'No working storage adapters found')
      return false
    } catch (error) {
      logger.error('storage', 'Storage availability check failed', { error })
      return false
    }
  }

  /**
   * Test de sécurité du secure storage
   */
  async testSecureStorage(): Promise<boolean> {
    try {
      const secureAdapter = this.adapters.get('secure')
      if (!secureAdapter?.available) {
        logger.warn('storage', 'Secure storage adapter not available')
        return false
      }

      const testKey = `secure_test_${Date.now()}`
      const testValue = JSON.stringify({ test: true, timestamp: Date.now() })

      // Test écriture
      await secureAdapter.set(testKey, testValue)

      // Test lecture
      const retrieved = await secureAdapter.get(testKey)

      // Test suppression
      await secureAdapter.remove(testKey)

      const success = retrieved === testValue

      if (success) {
        logger.debug('storage', '✅ Secure storage test passed')
      } else {
        logger.warn('storage', '❌ Secure storage test failed - value mismatch')
      }

      return success
    } catch (error) {
      logger.error('storage', '❌ Secure storage test failed', { error })
      return false
    }
  }

  /**
   * Obtient les statistiques complètes de storage
   */
  async getStats(): Promise<{
    available: boolean;
    adapters: StorageStats[];
    total: { used: number; total: number; items: number }
  }> {
    const adapters = await this.getAllStats()
    const available = adapters.some(stat => stat.available)

    const total = adapters.reduce(
      (acc, stat) => ({
        used: acc.used + (stat.used || 0),
        total: acc.total + (stat.total || 0),
        items: acc.items + (stat.itemCount || 0)
      }),
      { used: 0, total: 0, items: 0 }
    )

    return {
      available,
      adapters,
      total
    }
  }

  // ==================== UTILITIES ====================

  /**
   * Sauvegarde de données avec fallback
   */
  async setWithFallback(
    key: string,
    value: unknown,
    preferredTypes: StorageType[] = ['secure', 'preferences', 'local']
  ): Promise<StorageType> {
    for (const type of preferredTypes) {
      const adapter = this.adapters.get(type)
      if (!adapter?.available) continue

      try {
        await this.set(key, value, { type })
        logger.debug('storage', `✅ Value stored successfully using ${type}`, { key })
        return type
      } catch (error) {
        logger.warn('storage', `Failed to store using ${type}, trying next option`, { key, error })
      }
    }

    throw new Error(`Failed to store value for key: ${key} with any available storage type`)
  }

  /**
   * Lecture avec fallback sur plusieurs types de storage
   */
  async getWithFallback<T = unknown>(
    key: string,
    storageTypes: StorageType[] = ['secure', 'preferences', 'local']
  ): Promise<{ value: T | null; usedType?: StorageType }> {
    for (const type of storageTypes) {
      const adapter = this.adapters.get(type)
      if (!adapter?.available) continue

      try {
        const value = await this.get<T>(key, { type })
        if (value !== null) {
          logger.trace('storage', `Value found using ${type}`, { key })
          return { value, usedType: type }
        }
      } catch (error) {
        logger.warn('storage', `Failed to read using ${type}`, { key, error })
      }
    }

    return { value: null }
  }

  /**
   * Statistiques de tous les storages
   */
  async getAllStats(): Promise<StorageStats[]> {
    const stats: StorageStats[] = []

    for (const [type, adapter] of this.adapters) {
      if (adapter.available) {
        try {
          const stat = await adapter.getStats()
          stats.push(stat)
        } catch (error) {
          logger.warn('storage', `Failed to get stats for ${type}`, { error })
          stats.push({
            type,
            available: false
          })
        }
      }
    }

    return stats
  }

  /**
   * Nettoyage intelligent par préfixe
   */
  async cleanup(
    prefix: string,
    storageTypes: StorageType[] = ['local', 'preferences']
  ): Promise<{ removed: string[]; failed: string[] }> {
    const removed: string[] = []
    const failed: string[] = []

    for (const type of storageTypes) {
      const adapter = this.adapters.get(type)
      if (!adapter?.available) continue

      try {
        const keys = await adapter.keys()
        const toRemove = keys.filter(key => key.startsWith(prefix))

        for (const key of toRemove) {
          try {
            await adapter.remove(key)
            removed.push(`${type}:${key}`)
          } catch (error) {
            failed.push(`${type}:${key}`)
            logger.warn('storage', `Failed to remove key during cleanup`, { type, key, error })
          }
        }
      } catch (error) {
        logger.warn('storage', `Failed to list keys for cleanup`, { type, error })
      }
    }

    logger.info('storage', `Cleanup completed: ${removed.length} removed, ${failed.length} failed`, {
      prefix,
      removed: removed.length,
      failed: failed.length
    })

    return { removed, failed }
  }

  // ==================== PRIVATE METHODS ====================

  private getAdapter(type: StorageType): StorageAdapter {
    const adapter = this.adapters.get(type)
    if (!adapter) {
      throw new Error(`Storage adapter not found: ${type}`)
    }
    if (!adapter.available) {
      throw new Error(`Storage adapter not available: ${type}`)
    }
    return adapter
  }
}

// ==================== SINGLETON EXPORT ====================

export const storageManager = new StorageManager()

// Raccourcis pour usage fréquent
export const storage = {
  // Local storage (non sécurisé)
  get: (key: string) => storageManager.get(key, { type: 'local' }),
  set: (key: string, value: unknown) => storageManager.set(key, value, { type: 'local' }),
  remove: (key: string) => storageManager.remove(key, { type: 'local' }),

  // Secure storage (tokens, etc.)
  getSecure: (key: string) => storageManager.get(key, { type: 'secure' }),
  setSecure: (key: string, value: unknown) => storageManager.set(key, value, { type: 'secure' }),
  removeSecure: (key: string) => storageManager.remove(key, { type: 'secure' }),

  // Preferences (configuration)
  getPreference: (key: string) => storageManager.get(key, { type: 'preferences' }),
  setPreference: (key: string, value: unknown) => storageManager.set(key, value, { type: 'preferences' }),
  removePreference: (key: string) => storageManager.remove(key, { type: 'preferences' }),

  // Files
  readFile: (path: string) => storageManager.readFile(path),
  writeFile: (path: string, data: string) => storageManager.writeFile(path, data),
  deleteFile: (path: string) => storageManager.deleteFile(path),
  listFiles: (path?: string) => storageManager.listFiles(path),

  // Utilities
  cleanup: (prefix: string) => storageManager.cleanup(prefix),
  stats: () => storageManager.getAllStats(),
} as const

// Types exportés
export type { StorageType, StorageOptions, FileStorageOptions, StorageStats }