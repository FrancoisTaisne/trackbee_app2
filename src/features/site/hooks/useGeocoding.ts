/**
 * useGeocoding Hook - Service de géocodage d'adresses
 * Conversion d'adresses en coordonnées géographiques
 */

import { useCallback, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { httpClient } from '@/core/services/api/HttpClient'
import { logger } from '@/core/utils/logger'
import { AppError } from '@/core/types/common'
import type {
  GeocodeResult,
  GeocodeOptions,
  MapPosition
} from '../types'

// ==================== LOGGER SETUP ====================

const geocodingLog = {
  debug: (msg: string, data?: unknown) => logger.debug('geocoding', msg, data),
  info: (msg: string, data?: unknown) => logger.info('geocoding', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('geocoding', msg, data),
  error: (msg: string, data?: unknown) => logger.error('geocoding', msg, data)
}

// ==================== API FUNCTIONS ====================

/**
 * Géocode une adresse vers des coordonnées
 */
const geocodeAddress = async (options: GeocodeOptions): Promise<GeocodeResult[]> => {
  geocodingLog.debug('Geocoding address', options)

  if (!options.address.trim()) {
    return []
  }

  const params = new URLSearchParams({
    address: options.address.trim(),
    ...(options.language && { language: options.language }),
    ...(options.region && { region: options.region })
  })

  if (options.bounds) {
    params.append('bounds', `${options.bounds.south},${options.bounds.west},${options.bounds.north},${options.bounds.east}`)
  }

  try {
    const response = await httpClient.get<GeocodeResult[]>(`/api/geocode?${params}`)
    const results = response.data ?? []

    geocodingLog.info('Address geocoded successfully', {
      address: options.address,
      resultCount: results.length
    })

    return results
  } catch (error) {
    geocodingLog.error('Geocoding failed', { address: options.address, error })
    throw new AppError('Impossible de géocoder cette adresse', 'GEOCODING_FAILED')
  }
}

/**
 * Géocodage inverse : coordonnées vers adresse
 */
const reverseGeocode = async (position: MapPosition): Promise<GeocodeResult[]> => {
  geocodingLog.debug('Reverse geocoding position', position)

  try {
    const response = await httpClient.get<GeocodeResult[]>(
      `/api/reverse-geocode?lat=${position.lat}&lng=${position.lng}`
    )
    const results = response.data ?? []

    geocodingLog.info('Position reverse geocoded successfully', {
      position,
      resultCount: results.length
    })

    return results
  } catch (error) {
    geocodingLog.error('Reverse geocoding failed', { position, error })
    throw new AppError('Impossible de trouver l\'adresse de cette position', 'REVERSE_GEOCODING_FAILED')
  }
}

// ==================== HOOK ====================

export interface UseGeocodingReturn {
  geocodeAddress: (address: string, options?: Partial<GeocodeOptions>) => Promise<GeocodeResult[]>
  reverseGeocode: (position: MapPosition) => Promise<GeocodeResult[]>
  isGeocoding: boolean
  error: Error | null
  lastResults: GeocodeResult[]
  clearResults: () => void
}

/**
 * Hook pour les services de géocodage
 */
export const useGeocoding = (): UseGeocodingReturn => {
  const [lastResults, setLastResults] = useState<GeocodeResult[]>([])
  const [error, setError] = useState<Error | null>(null)

  // Mutation pour le géocodage
  const geocodeMutation = useMutation({
    mutationFn: geocodeAddress,
    onSuccess: (results) => {
      setLastResults(results)
      setError(null)
    },
    onError: (error) => {
      setError(error as Error)
      setLastResults([])
    }
  })

  // Mutation pour le géocodage inverse
  const reverseGeocodeMutation = useMutation({
    mutationFn: reverseGeocode,
    onSuccess: (results) => {
      setLastResults(results)
      setError(null)
    },
    onError: (error) => {
      setError(error as Error)
      setLastResults([])
    }
  })

  // Handlers
  const geocodeAddressHandler = useCallback(async (
    address: string,
    options: Partial<GeocodeOptions> = {}
  ): Promise<GeocodeResult[]> => {
    const fullOptions: GeocodeOptions = {
      address,
      language: 'fr',
      region: 'FR',
      ...options
    }

    return geocodeMutation.mutateAsync(fullOptions)
  }, [geocodeMutation])

  const reverseGeocodeHandler = useCallback(async (
    position: MapPosition
  ): Promise<GeocodeResult[]> => {
    return reverseGeocodeMutation.mutateAsync(position)
  }, [reverseGeocodeMutation])

  const clearResults = useCallback(() => {
    setLastResults([])
    setError(null)
  }, [])

  const isGeocoding = geocodeMutation.isPending || reverseGeocodeMutation.isPending

  return {
    geocodeAddress: geocodeAddressHandler,
    reverseGeocode: reverseGeocodeHandler,
    isGeocoding,
    error,
    lastResults,
    clearResults
  }
}

// ==================== HELPER HOOK ====================

export interface UseAddressLookupReturn {
  suggestions: GeocodeResult[]
  isLoading: boolean
  error: Error | null
  searchAddress: (query: string) => void
  selectAddress: (result: GeocodeResult) => void
  clearSuggestions: () => void
}

/**
 * Hook pour la recherche d'adresse avec suggestions
 */
export const useAddressLookup = (
  onAddressSelected?: (result: GeocodeResult) => void,
  options?: Partial<GeocodeOptions>
): UseAddressLookupReturn => {
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([])
  const [_currentQuery, setCurrentQuery] = useState('')

  const { geocodeAddress, isGeocoding, error } = useGeocoding()

  const searchAddress = useCallback(async (query: string) => {
    setCurrentQuery(query)

    if (!query.trim()) {
      setSuggestions([])
      return
    }

    try {
      const results = await geocodeAddress(query, options)
      // Limiter les suggestions pour l'UX
      setSuggestions(results.slice(0, 5))
    } catch {
      setSuggestions([])
    }
  }, [geocodeAddress, options])

  const selectAddress = useCallback((result: GeocodeResult) => {
    geocodingLog.info('Address selected from suggestions', {
      address: result.formattedAddress,
      position: result.position
    })

    setSuggestions([])
    onAddressSelected?.(result)
  }, [onAddressSelected])

  const clearSuggestions = useCallback(() => {
    setSuggestions([])
    setCurrentQuery('')
  }, [])

  return {
    suggestions,
    isLoading: isGeocoding,
    error,
    searchAddress,
    selectAddress,
    clearSuggestions
  }
}

// ==================== EXPORT ====================

export default useGeocoding
