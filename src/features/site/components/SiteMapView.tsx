/**
 * SiteMapView Component - Vue cartographique des sites
 * Interface interactive pour visualiser et sélectionner des sites sur carte
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  MapPin,
  Navigation,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Crosshair,
  Search
} from 'lucide-react'
import {
  Button,
  Badge,
  Card,
  CardContent,
  Input
} from '@/shared/ui/components'
import { logger } from '@/core/utils/logger'
import { cn } from '@/core/utils/cn'
import type {
  SiteMapProps,
  SiteBundle,
  MapPosition,
  MapBounds
} from '../types'

// ==================== LOGGER SETUP ====================

const siteMapLog = {
  debug: (msg: string, data?: unknown) => logger.debug('siteMap', msg, data),
  info: (msg: string, data?: unknown) => logger.info('siteMap', msg, data),
  warn: (msg: string, data?: unknown) => logger.warn('siteMap', msg, data),
  error: (msg: string, data?: unknown) => logger.error('siteMap', msg, data)
}

// ==================== TYPES ====================

interface MapControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onRecenter: () => void
  onToggleLayers: () => void
  onCenterOnUser: () => void
  showControls?: boolean
}

interface SiteMarkerProps {
  site: SiteBundle
  isSelected?: boolean
  onClick: () => void
  onDoubleClick?: () => void
}

// ==================== MAP CONTROLS COMPONENT ====================

const MapControls: React.FC<MapControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onRecenter,
  onToggleLayers,
  onCenterOnUser,
  showControls = true
}) => {
  if (!showControls) return null

  return (
    <div className="absolute top-4 right-4 z-10 space-y-2">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomIn}
          className="w-10 h-10 p-0 rounded-none border-b border-gray-200"
          title="Zoomer"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onZoomOut}
          className="w-10 h-10 p-0 rounded-none border-b border-gray-200"
          title="Dézoomer"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onRecenter}
          className="w-10 h-10 p-0 rounded-none border-b border-gray-200"
          title="Recentrer"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleLayers}
          className="w-10 h-10 p-0 rounded-none border-b border-gray-200"
          title="Couches"
        >
          <Layers className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onCenterOnUser}
          className="w-10 h-10 p-0 rounded-none"
          title="Ma position"
        >
          <Navigation className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

// ==================== SITE MARKER COMPONENT ====================

const SiteMarker: React.FC<SiteMarkerProps> = ({
  site,
  isSelected = false,
  onClick,
  onDoubleClick
}) => {
  const { statistics } = site

  const getMarkerColor = () => {
    if (isSelected) return 'bg-primary-600 border-primary-700'
    if (statistics.connectedMachines > 0) return 'bg-success-500 border-success-600'
    if (statistics.totalInstallations > 0) return 'bg-warning-500 border-warning-600'
    return 'bg-gray-400 border-gray-500'
  }

  const getMarkerSize = () => {
    if (statistics.totalInstallations === 0) return 'w-3 h-3'
    if (statistics.totalInstallations <= 2) return 'w-4 h-4'
    if (statistics.totalInstallations <= 5) return 'w-5 h-5'
    return 'w-6 h-6'
  }

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
      style={{
        left: `${site.site.lng}%`, // Placeholder pour positionnement réel
        top: `${site.site.lat}%`   // À remplacer par une vraie carte
      }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {/* Marker Pin */}
      <div className={cn(
        'rounded-full border-2 transition-all duration-200 group-hover:scale-110',
        getMarkerColor(),
        getMarkerSize()
      )}>
        {statistics.totalInstallations > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-white border border-gray-300 rounded-full flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-700">
              {statistics.totalInstallations}
            </span>
          </div>
        )}
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-20">
        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
          <div className="font-semibold">{site.site.name}</div>
          <div className="text-gray-300">
            {statistics.totalInstallations} installation(s)
          </div>
          {statistics.connectedMachines > 0 && (
            <div className="text-success-400">
              {statistics.connectedMachines} connecté(s)
            </div>
          )}

          {/* Arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    </div>
  )
}

// ==================== MAIN COMPONENT ====================

export const SiteMapView: React.FC<SiteMapProps> = ({
  sites,
  selectedSite,
  onSiteSelect,
  onPositionSelect,
  showControls = true,
  height = '400px'
}) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showLayerSelector, setShowLayerSelector] = useState(false)
  const [currentLayer, setCurrentLayer] = useState<'map' | 'satellite'>('map')
  const [mapCenter, setMapCenter] = useState<MapPosition>({ lat: 46.2276, lng: 2.2137, source: 'default' })
  const [zoom, setZoom] = useState(6)

  // Filtrer les sites par recherche
  const filteredSites = React.useMemo(() => {
    if (!searchQuery) return sites

    const query = searchQuery.toLowerCase()
    return sites.filter(site =>
      site.site.name.toLowerCase().includes(query) ||
      site.site.description?.toLowerCase().includes(query) ||
      site.site.address?.toLowerCase().includes(query)
    )
  }, [sites, searchQuery])

  // ==================== HANDLERS ====================

  const handleSiteClick = useCallback((site: SiteBundle) => {
    siteMapLog.debug('Site marker clicked', { siteId: site.site.id })
    onSiteSelect?.(site)
  }, [onSiteSelect])

  const handleSiteDoubleClick = useCallback((site: SiteBundle) => {
    siteMapLog.debug('Site marker double-clicked', { siteId: site.site.id })

    if (site.site.lat && site.site.lng) {
      setMapCenter({ lat: site.site.lat, lng: site.site.lng, source: 'user' })
      setZoom(Math.max(zoom, 12))
    }
  }, [zoom])

  const handleMapClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (onPositionSelect && mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top

      // Placeholder conversion pixel → lat/lng (nécessiterait une vraie API de carte)
      const position: MapPosition = {
        lat: mapCenter.lat + (0.5 - y / rect.height) * 0.1, // Approximation
        lng: mapCenter.lng + (x / rect.width - 0.5) * 0.1,   // Approximation
        source: 'user'
      }

      siteMapLog.debug('Map clicked', { position })
      onPositionSelect(position)
    }
  }, [onPositionSelect, mapCenter])

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 1, 18))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 1, 1))
  }, [])

  const handleRecenter = useCallback(() => {
    // Recentrer sur tous les sites
    if (filteredSites.length === 0) {
      setMapCenter({ lat: 46.2276, lng: 2.2137, source: 'default' })
      setZoom(6)
      return
    }

    const sitesWithPosition = filteredSites.filter(s => s.site.lat && s.site.lng)
    if (sitesWithPosition.length === 0) return

    // Calculer le centre
    const avgLat = sitesWithPosition.reduce((sum, s) => sum + s.site.lat!, 0) / sitesWithPosition.length
    const avgLng = sitesWithPosition.reduce((sum, s) => sum + s.site.lng!, 0) / sitesWithPosition.length

    setMapCenter({ lat: avgLat, lng: avgLng, source: 'user' })
    setZoom(sitesWithPosition.length === 1 ? 14 : 10)

    siteMapLog.info('Map recentered', { center: { lat: avgLat, lng: avgLng }, siteCount: sitesWithPosition.length })
  }, [filteredSites])

  const handleToggleLayers = useCallback(() => {
    setShowLayerSelector(prev => !prev)
  }, [])

  const handleCenterOnUser = useCallback(async () => {
    siteMapLog.debug('Centering on user position')

    try {
      if (!navigator.geolocation) {
        throw new Error('Géolocalisation non supportée')
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPosition: MapPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            source: 'gps'
          }

          setMapCenter(userPosition)
          setZoom(14)

          siteMapLog.info('Centered on user position', { position: userPosition })
        },
        (error) => {
          siteMapLog.error('Geolocation failed', error)
        }
      )
    } catch (error) {
      siteMapLog.error('Failed to get user position', error)
    }
  }, [])

  // ==================== EFFECTS ====================

  useEffect(() => {
    // Auto-recenter quand les sites changent
    if (sites.length > 0 && zoom === 6) { // Zoom par défaut = pas encore centré
      handleRecenter()
    }
  }, [sites.length, handleRecenter, zoom])

  // ==================== RENDER ====================

  return (
    <div className="relative">
      {/* Search Bar */}
      <div className="absolute top-4 left-4 z-10">
        <Input
          placeholder="Rechercher un site..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
          className="w-64 bg-white shadow-lg"
        />
      </div>

      {/* Map Container */}
      <div
        ref={mapRef}
        className="relative bg-gray-100 border border-gray-300 rounded-lg overflow-hidden cursor-crosshair"
        style={{ height }}
        onClick={handleMapClick}
      >
        {/* Placeholder Map Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-green-50 to-yellow-50">
          {/* Grid pattern to simulate map */}
          <div className="absolute inset-0 opacity-10">
            <div className="grid grid-cols-20 grid-rows-20 h-full w-full">
              {Array.from({ length: 400 }).map((_, i) => (
                <div key={i} className="border border-gray-400"></div>
              ))}
            </div>
          </div>

          {/* Map Info Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white/80 rounded-lg p-4 text-center">
              <MapPin className="w-8 h-8 text-primary-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">
                Carte interactive des sites
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {filteredSites.length} site(s) affiché(s)
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Zoom: {zoom} | Centre: {mapCenter.lat.toFixed(3)}, {mapCenter.lng.toFixed(3)}
              </p>
            </div>
          </div>
        </div>

        {/* Site Markers */}
        {filteredSites.map((site) => (
          site.site.lat && site.site.lng && (
            <SiteMarker
              key={site.site.id}
              site={site}
              isSelected={selectedSite?.site.id === site.site.id}
              onClick={() => handleSiteClick(site)}
              onDoubleClick={() => handleSiteDoubleClick(site)}
            />
          )
        ))}

        {/* Selected Site Highlight */}
        {selectedSite && selectedSite.site.lat && selectedSite.site.lng && (
          <div
            className="absolute w-8 h-8 border-2 border-primary-500 rounded-full bg-primary-100/50 transform -translate-x-1/2 -translate-y-1/2 animate-pulse pointer-events-none"
            style={{
              left: `${selectedSite.site.lng}%`,
              top: `${selectedSite.site.lat}%`
            }}
          />
        )}
      </div>

      {/* Map Controls */}
      <MapControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onRecenter={handleRecenter}
        onToggleLayers={handleToggleLayers}
        onCenterOnUser={handleCenterOnUser}
        showControls={showControls}
      />

      {/* Layer Selector */}
      {showLayerSelector && (
        <div className="absolute top-16 right-4 z-10">
          <Card>
            <CardContent className="p-3 space-y-2 min-w-[120px]">
              <button
                className={cn(
                  'w-full text-left p-2 rounded text-sm transition-colors',
                  currentLayer === 'map'
                    ? 'bg-primary-100 text-primary-700'
                    : 'hover:bg-gray-50'
                )}
                onClick={() => {
                  setCurrentLayer('map')
                  setShowLayerSelector(false)
                }}
              >
                Carte
              </button>
              <button
                className={cn(
                  'w-full text-left p-2 rounded text-sm transition-colors',
                  currentLayer === 'satellite'
                    ? 'bg-primary-100 text-primary-700'
                    : 'hover:bg-gray-50'
                )}
                onClick={() => {
                  setCurrentLayer('satellite')
                  setShowLayerSelector(false)
                }}
              >
                Satellite
              </button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Site Count Badge */}
      <div className="absolute bottom-4 left-4 z-10">
        <Badge variant="secondary" className="bg-white/90 shadow-lg">
          {filteredSites.length} site{filteredSites.length > 1 ? 's' : ''}
          {searchQuery && ` (filtré${filteredSites.length > 1 ? 's' : ''})`}
        </Badge>
      </div>

      {/* Coordinates Display */}
      <div className="absolute bottom-4 right-4 z-10">
        <div className="bg-white/90 text-xs text-gray-600 px-2 py-1 rounded shadow-lg font-mono">
          {mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)}
        </div>
      </div>
    </div>
  )
}

// ==================== DISPLAY NAME ====================

SiteMapView.displayName = 'SiteMapView'

// ==================== EXAMPLES ====================

/**
 * Exemples d'utilisation:
 *
 * // Carte simple
 * <SiteMapView
 *   sites={sites}
 *   onSiteSelect={(site) => console.log('Site selected:', site)}
 * />
 *
 * // Carte avec sélection et positionnement
 * <SiteMapView
 *   sites={sites}
 *   selectedSite={selectedSite}
 *   onSiteSelect={setSelectedSite}
 *   onPositionSelect={(pos) => setNewSitePosition(pos)}
 *   showControls={true}
 *   height="600px"
 * />
 *
 * // Carte intégrée dans une page
 * <Section title="Carte des sites">
 *   <SiteMapView
 *     sites={sites}
 *     selectedSite={selectedSite}
 *     onSiteSelect={handleSiteSelect}
 *     height="400px"
 *   />
 * </Section>
 */