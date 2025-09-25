/**
 * Types communs utilisés dans toute l'application
 * Types génériques et utilitaires
 */

// Re-export d'AppError pour compatibilité
export type { AppError } from './transport'

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
  details?: any
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
  filters?: Record<string, any>
}