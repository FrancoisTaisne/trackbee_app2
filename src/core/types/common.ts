/**
 * Types communs utilisés dans toute l'application
 * Types génériques et utilitaires
 */

// AppError class for application errors
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'AppError'
  }
}

// Re-export type for compatibility
export type { AppError as AppErrorType } from './transport'

// Adresse géographique
export interface Address {
  street?: string
  city: string
  postalCode?: string
  country: string
  formattedAddress?: string
}

// Coordonnées GPS
export interface Coordinates {
  lat: number
  lng: number
  altitude?: number
  accuracy?: number
}

// Résultat de géocodage
export interface GeocodingResult {
  address: Address
  coordinates: Coordinates
  confidence: number
  source: 'nominatim' | 'google' | 'manual'
}

// Options de géocodage
export interface GeocodingOptions {
  language?: string
  countryCode?: string
  limit?: number
}

// Erreur de géocodage
export interface GeocodingError {
  code: 'NETWORK_ERROR' | 'NOT_FOUND' | 'QUOTA_EXCEEDED' | 'INVALID_REQUEST'
  message: string
  details?: Record<string, unknown>
}

// Nom standard de lieux
export interface PlaceName {
  name: string
  type: 'city' | 'street' | 'poi' | 'address'
  relevance: number
}

// Limites géographiques
export interface Bounds {
  north: number
  south: number
  east: number
  west: number
}

// Options de recherche géographique
export interface SearchOptions {
  bounds?: Bounds
  proximity?: Coordinates
  types?: string[]
  filters?: Record<string, unknown>
}

// Types JSON pour remplacer any
export type JsonPrimitive = string | number | boolean | null
export type JsonArray = JsonValue[]
export type JsonObject = { [key: string]: JsonValue }
export type JsonValue = JsonPrimitive | JsonObject | JsonArray

// Types pour les erreurs
export type ErrorLike = Error | { message: string; code?: string }

// Types pour les callbacks
export type CallbackFn<T = void> = (arg: T) => void
export type AsyncCallbackFn<T = void> = (arg: T) => Promise<void>

// Type pour les réponses API génériques
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ErrorLike
  message?: string
}

// Type pour les données de formulaire
export type FormData = Record<string, JsonValue>

// Type pour les headers HTTP
export type HttpHeaders = Record<string, string>

// Type pour les paramètres de requête
export type QueryParams = Record<string, string | number | boolean | undefined>