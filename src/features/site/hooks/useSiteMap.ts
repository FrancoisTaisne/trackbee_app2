/**
 * useSiteMap - hook carte simplifié basé sur les nouveaux contrats
 */

import { useCallback, useMemo, useState } from 'react'
import { logger } from '@/core/utils/logger'
import { useSiteList } from './useSiteList'
import type {
  SiteBundle,
  SiteFilters,
  MapBounds,
  MapPosition,
  UseSiteMapReturn
} from '../types'

const siteMapLog = logger.extend('siteMap')

const DEFAULT_BOUNDS: MapBounds = {
  north: 51.1241999,
  south: 41.3253001,
  east: 9.6625,
  west: -5.1422,
  zoom: 5,
  center: {
    lat: 46.7111,
    lng: 1.7191,
    source: 'default'
  }
}

const calculateBoundsForSites = (sites: SiteBundle[]): MapBounds | null => {
  const positions = sites
    .map(bundle => {
      const { lat, lng } = bundle.site
      return typeof lat === 'number' && typeof lng === 'number'
        ? { lat, lng }
        : null
    })
    .filter(Boolean) as Array<{ lat: number; lng: number }>

  if (!positions.length) return null

  const lats = positions.map(p => p.lat)
  const lngs = positions.map(p => p.lng)

  const north = Math.max(...lats)
  const south = Math.min(...lats)
  const east = Math.max(...lngs)
  const west = Math.min(...lngs)

  return {
    north,
    south,
    east,
    west,
    center: {
      lat: (north + south) / 2,
      lng: (east + west) / 2,
      source: 'default'
    },
    zoom: 8
  }
}

const toMapPosition = (lat: number, lng: number): MapPosition => ({
  lat,
  lng,
  source: 'default'
})

export const useSiteMap = (
  initialFilters: SiteFilters = {},
  initialBounds?: MapBounds
): UseSiteMapReturn => {
  const [filters, setFilters] = useState<SiteFilters>(initialFilters)
  const [bounds, setBounds] = useState<MapBounds | null>(initialBounds ?? null)

  const { sites, isLoading, error } = useSiteList(filters)

  const sitesWithCoordinates = useMemo(
    () => sites.filter(site => typeof site.site.lat === 'number' && typeof site.site.lng === 'number'),
    [sites]
  )

  const computedBounds = useMemo(() => {
    if (bounds) return bounds
    return calculateBoundsForSites(sitesWithCoordinates) ?? DEFAULT_BOUNDS
  }, [bounds, sitesWithCoordinates])

  const setFiltersHandler = useCallback((nextFilters: SiteFilters) => {
    siteMapLog.debug('Updating map filters', { filters: nextFilters })
    setFilters(nextFilters)
  }, [])

  const setBoundsHandler = useCallback((nextBounds: MapBounds) => {
    siteMapLog.debug('Updating map bounds', { bounds: nextBounds })
    setBounds(nextBounds)
  }, [])

  const getCurrentPosition = useCallback(async (): Promise<MapPosition> => {
    siteMapLog.debug('Requesting current geolocation')

    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation non supportée par le navigateur'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const position = {
            lat: coords.latitude,
            lng: coords.longitude,
            accuracy: coords.accuracy,
            source: 'gps'
          } as MapPosition

          siteMapLog.info('Current position obtained', { position })
          resolve(position)
        },
        (geoError) => {
          siteMapLog.error('Geolocation failed', { error: geoError })
          reject(new Error(geoError.message))
        },
        {
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 300_000
        }
      )
    })
  }, [])

  const searchNearby = useCallback((position: MapPosition, radiusInMeters: number) => {
    const radius = radiusInMeters / 1000 // translate into km for coarse filtering

    const matches = sitesWithCoordinates.filter(bundle => {
      const { lat, lng } = bundle.site
      if (typeof lat !== 'number' || typeof lng !== 'number') return false

      const deltaLat = Math.abs(lat - position.lat)
      const deltaLng = Math.abs(lng - position.lng)

      // rough distance approximation ~111km per degree
      const distance = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng) * 111
      return distance <= radius
    })

    siteMapLog.debug('Nearby search executed', {
      origin: position,
      radiusInMeters,
      results: matches.length
    })

    return matches
  }, [sitesWithCoordinates])

  return {
    sites: sitesWithCoordinates,
    bounds: computedBounds,
    isLoading,
    error,
    setFilters: setFiltersHandler,
    setBounds: setBoundsHandler,
    getCurrentPosition,
    searchNearby
  }
}
