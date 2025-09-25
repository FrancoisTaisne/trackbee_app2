/**
 * Utilitaires pour manipulation des identifiants et adresses MAC
 * Logique compatible avec l'ESP32 et la base de données
 */

import type { CampaignId, MachineId, FileMeta } from '@/core/types/domain'
import { logger } from './logger'

// ==================== MAC ADDRESS UTILITIES ====================

/**
 * Normalise une adresse MAC en supprimant les séparateurs
 * @param mac - Adresse MAC avec ou sans séparateurs
 * @returns MAC address en lowercase sans séparateurs
 */
export function normalizeMac(mac: string | null | undefined): string {
  if (!mac) return ''
  return String(mac).replace(/[^0-9a-fA-F]/g, '').toLowerCase()
}

/**
 * Inverse les bytes d'une adresse MAC (ESP32 little-endian ↔ DB big-endian)
 * @param macHex - MAC address en hexadécimal (12 caractères)
 * @returns MAC address avec bytes inversés ou null si invalide
 */
export function reverseMacBytes(macHex: string | null | undefined): string | null {
  const clean = normalizeMac(macHex)
  if (clean.length !== 12) {
    logger.warn('general', `Invalid MAC length: ${clean} (expected 12 chars)`)
    return null
  }

  try {
    // Découper en bytes et inverser
    const bytes = clean.match(/.{2}/g)
    if (!bytes || bytes.length !== 6) {
      logger.warn('general', `Failed to parse MAC bytes: ${clean}`)
      return null
    }

    const reversed = bytes.reverse().join('').toLowerCase()
    logger.trace('general', `MAC byte reversal: ${clean} → ${reversed}`)
    return reversed
  } catch (error) {
    logger.error('general', `MAC reversal error: ${error}`, { macHex })
    return null
  }
}

/**
 * Formate une adresse MAC avec séparateurs
 * @param mac - MAC address normalisée
 * @param separator - Séparateur à utiliser (par défaut ':')
 * @returns MAC formatée ou chaîne vide si invalide
 */
export function formatMac(mac: string | null | undefined, separator = ':'): string {
  const clean = normalizeMac(mac)
  if (clean.length !== 12) return ''

  return clean.match(/.{2}/g)?.join(separator) || ''
}

/**
 * Vérifie si une adresse MAC est valide
 * @param mac - Adresse MAC à vérifier
 * @returns true si valide
 */
export function isValidMac(mac: string | null | undefined): boolean {
  const clean = normalizeMac(mac)
  return clean.length === 12 && /^[0-9a-f]{12}$/.test(clean)
}

// ==================== DEVICE NAME UTILITIES ====================

/**
 * Génère le nom BLE d'un device TrackBee à partir de sa MAC
 * @param mac - Adresse MAC du device
 * @returns Nom BLE au format "TRB{mac_uppercase}"
 */
export function generateBleName(mac: string): string {
  const clean = normalizeMac(mac)
  if (!isValidMac(clean)) {
    logger.warn('general', `Cannot generate BLE name from invalid MAC: ${mac}`)
    return ''
  }
  return `TRB${clean.toUpperCase()}`
}

/**
 * Extrait l'adresse MAC d'un nom BLE TrackBee
 * @param bleName - Nom BLE du device
 * @returns Adresse MAC normalisée ou null si format invalide
 */
export function extractMacFromBleName(bleName: string): string | null {
  const match = bleName.match(/^TRB([0-9A-Fa-f]{12})$/)
  if (!match) {
    logger.trace('general', `BLE name doesn't match TrackBee pattern: ${bleName}`)
    return null
  }
  return normalizeMac(match[1])
}

// ==================== FILE NAME UTILITIES ====================

/**
 * Extrait les métadonnées d'un nom de fichier TrackBee
 * Format attendu: {campaignId}_{YYYYMMDD}_{HHMMSS}.ubx
 * @param filename - Nom du fichier
 * @returns Métadonnées extraites ou null si format invalide
 */
export function parseTrackBeeFilename(filename: string): FileMeta | null {
  const match = filename.match(/^(\d+)_(\d{8})_(\d{6})\.ubx$/)
  if (!match) {
    logger.trace('general', `Filename doesn't match TrackBee pattern: ${filename}`)
    return null
  }

  const [, campaignIdStr, dateStr, timeStr] = match
  const campaignId = Number(campaignIdStr)

  if (!dateStr || !timeStr) {
    return null
  }

  // Parse date/time
  const year = Number(dateStr.slice(0, 4))
  const month = Number(dateStr.slice(4, 6))
  const day = Number(dateStr.slice(6, 8))
  const hour = Number(timeStr.slice(0, 2))
  const minute = Number(timeStr.slice(2, 4))
  const second = Number(timeStr.slice(4, 6))

  try {
    const recordedAt = new Date(year, month - 1, day, hour, minute, second)

    const meta: FileMeta = {
      name: filename,
      campaignId: campaignId as CampaignId,
      recordedAt,
    }

    logger.trace('general', `Parsed filename metadata:`, meta)
    return meta
  } catch (error) {
    logger.warn('general', `Failed to parse date from filename: ${filename}`, { error })
    return { name: filename, campaignId: campaignId as CampaignId }
  }
}

/**
 * Génère un nom de fichier TrackBee
 * @param campaignId - ID de la campagne
 * @param recordedAt - Date d'enregistrement (par défaut maintenant)
 * @returns Nom de fichier formaté
 */
export function generateTrackBeeFilename(
  campaignId: CampaignId,
  recordedAt = new Date()
): string {
  const year = recordedAt.getFullYear()
  const month = String(recordedAt.getMonth() + 1).padStart(2, '0')
  const day = String(recordedAt.getDate()).padStart(2, '0')
  const hour = String(recordedAt.getHours()).padStart(2, '0')
  const minute = String(recordedAt.getMinutes()).padStart(2, '0')
  const second = String(recordedAt.getSeconds()).padStart(2, '0')

  const filename = `${campaignId}_${year}${month}${day}_${hour}${minute}${second}.ubx`
  logger.trace('general', `Generated filename: ${filename}`)
  return filename
}

/**
 * Extrait tous les campaign IDs uniques d'une liste de fichiers
 * @param files - Liste de fichiers
 * @returns Campaign IDs triés par ordre décroissant
 */
export function extractCampaignIds(files: FileMeta[]): CampaignId[] {
  const campaignIds = new Set<CampaignId>()

  for (const file of files) {
    if (file.campaignId) {
      campaignIds.add(file.campaignId)
    } else {
      // Tenter d'extraire depuis le nom
      const parsed = parseTrackBeeFilename(file.name)
      if (parsed?.campaignId) {
        campaignIds.add(parsed.campaignId)
      }
    }
  }

  const sorted = Array.from(campaignIds).sort((a, b) => b - a)
  logger.debug('general', `Extracted campaign IDs from ${files.length} files:`, sorted)
  return sorted
}

// ==================== VALIDATION UTILITIES ====================

/**
 * Valide un ID numérique
 * @param id - ID à valider
 * @param type - Type d'ID pour logs
 * @returns true si valide
 */
export function isValidId(id: unknown, type = 'ID'): id is number {
  const valid = typeof id === 'number' && Number.isFinite(id) && id > 0
  if (!valid) {
    logger.trace('general', `Invalid ${type}: ${id}`)
  }
  return valid
}

/**
 * Valide et cast un ID en number
 * @param id - ID à valider (number ou string)
 * @param type - Type d'ID pour logs
 * @returns ID valide ou null
 */
export function validateAndCastId(id: unknown, type = 'ID'): number | null {
  if (typeof id === 'number' && isValidId(id, type)) {
    return id
  }

  if (typeof id === 'string') {
    const parsed = Number(id)
    if (isValidId(parsed, type)) {
      return parsed
    }
  }

  logger.warn('general', `Failed to validate ${type}: ${id}`)
  return null
}

// ==================== DEVICE ID UTILITIES ====================

/**
 * Génère un ID unique pour une session de transfert
 * @param machineId - ID de la machine
 * @param campaignId - ID de la campagne
 * @returns Transfer ID unique
 */
export function generateTransferId(machineId: MachineId, campaignId: CampaignId): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 7)
  const transferId = `${machineId}-${campaignId}-${timestamp}-${random}`

  logger.trace('general', `Generated transfer ID: ${transferId}`)
  return transferId
}

/**
 * Génère un ID unique simple
 * @param prefix - Préfixe optionnel
 * @returns ID unique
 */
export function generateUniqueId(prefix = ''): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 7)
  const id = prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`

  logger.trace('general', `Generated unique ID: ${id}`)
  return id
}

/**
 * Compare deux adresses MAC en tenant compte du byte reversal
 * @param mac1 - Première adresse MAC
 * @param mac2 - Deuxième adresse MAC
 * @returns true si identiques (en tenant compte du reversal)
 */
export function compareMacs(mac1: string | null | undefined, mac2: string | null | undefined): boolean {
  const clean1 = normalizeMac(mac1)
  const clean2 = normalizeMac(mac2)

  if (!clean1 || !clean2) return false
  if (clean1 === clean2) return true

  // Vérifier avec byte reversal
  const reversed1 = reverseMacBytes(clean1)
  const reversed2 = reverseMacBytes(clean2)

  const match = (reversed1 === clean2) || (clean1 === reversed2)

  if (match) {
    logger.trace('general', `MAC match with byte reversal: ${clean1} ↔ ${clean2}`)
  }

  return match
}

// ==================== EXPORT HELPERS ====================

/**
 * Collection d'utilitaires MAC pour usage simple
 */
export const macUtils = {
  normalize: normalizeMac,
  reverse: reverseMacBytes,
  format: formatMac,
  isValid: isValidMac,
  compare: compareMacs,
  generateBleName,
  extractFromBleName: extractMacFromBleName,
} as const

/**
 * Collection d'utilitaires fichiers pour usage simple
 */
export const fileUtils = {
  parse: parseTrackBeeFilename,
  generate: generateTrackBeeFilename,
  extractCampaignIds,
} as const

/**
 * Collection d'utilitaires IDs pour usage simple
 */
export const idUtils = {
  isValid: isValidId,
  validateAndCast: validateAndCastId,
  generateTransfer: generateTransferId,
  generateUnique: generateUniqueId,
} as const