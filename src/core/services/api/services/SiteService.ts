/**
 * Site Service - Service de gestion des sites
 * Centralise toutes les requêtes liées aux sites
 */

import { httpClient } from '../HttpClient'
import { API_ENDPOINTS } from '../endpoints'
import type { Site } from '@/core/types'
import { apiLog } from '@/core/utils/logger'

// ==================== TYPES ====================

export interface CreateSiteData {
  name: string
  description?: string
  latitude: number
  longitude: number
  address?: string
  country?: string
  region?: string
  city?: string
  postalCode?: string
}

export type UpdateSiteData = Partial<CreateSiteData>

export interface ShareSiteData {
  userId: number
  permissions?: ('read' | 'write' | 'admin')[]
}

export interface SiteWithMachines extends Site {
  activeMachines: Array<{
    id: number
    name: string
    macAddress: string
    status: string
    installedAt: string
  }>
}

// Extended site with optional fields from backend
export interface SiteExtended extends Site {
  country?: string
  region?: string
  city?: string
  latitude?: number
  longitude?: number
}

// ==================== SITE SERVICE ====================

export class SiteService {
  /**
   * Créer un nouveau site
   */
  static async create(data: CreateSiteData): Promise<Site> {
    const response = await httpClient.post<Site>(
      API_ENDPOINTS.sites.create,
      data
    )

    if (!response.data) {
      throw new Error('No data in create site response')
    }

    return response.data
  }

  /**
   * Lister tous les sites de l'utilisateur connecté
   */
  static async list(): Promise<Site[]> {
    const response = await httpClient.get<Site[]>(
      API_ENDPOINTS.sites.list
    )

    if (!response.data) {
      throw new Error('No data in sites list response')
    }

    return response.data
  }

  /**
   * Récupérer un site spécifique
   */
  static async getOne(id: number): Promise<Site> {
    const response = await httpClient.get<Site>(
      API_ENDPOINTS.sites.getOne(id)
    )

    if (!response.data) {
      throw new Error('No data in get site response')
    }

    return response.data
  }

  /**
   * Mettre à jour un site
   */
  static async update(id: number, data: UpdateSiteData): Promise<Site> {
    const response = await httpClient.patch<Site>(
      API_ENDPOINTS.sites.update(id),
      data
    )

    if (!response.data) {
      throw new Error('No data in update site response')
    }

    return response.data
  }

  /**
   * Supprimer un site
   */
  static async delete(id: number): Promise<{ success: boolean; message: string }> {
    const response = await httpClient.delete<{ success: boolean; message: string }>(
      API_ENDPOINTS.sites.delete(id)
    )

    if (!response.data) {
      throw new Error('No data in delete site response')
    }

    return response.data
  }

  /**
   * Partager un site avec un utilisateur
   */
  static async share(id: number, data: ShareSiteData): Promise<{
    success: boolean
    message: string
    share: {
      siteId: number
      userId: number
      permissions: string[]
      sharedAt: string
    }
  }> {
    const response = await httpClient.post<{
      success: boolean
      message: string
      share: {
        siteId: number
        userId: number
        permissions: string[]
        sharedAt: string
      }
    }>(API_ENDPOINTS.sites.share(id), data)

    if (!response.data) {
      throw new Error('No data in share site response')
    }

    return response.data
  }

  /**
   * Arrêter le partage d'un site avec un utilisateur
   */
  static async unshare(id: number, userId: number): Promise<{
    success: boolean
    message: string
  }> {
    const response = await httpClient.delete<{
      success: boolean
      message: string
    }>(API_ENDPOINTS.sites.unshare(id, userId))

    if (!response.data) {
      throw new Error('No data in unshare site response')
    }

    return response.data
  }

  /**
   * Lister les machines actives sur un site
   */
  static async listActiveMachines(id: number): Promise<SiteWithMachines['activeMachines']> {
    const response = await httpClient.get<SiteWithMachines['activeMachines']>(
      API_ENDPOINTS.sites.listActiveMachines(id)
    )

    if (!response.data) {
      throw new Error('No data in site active machines response')
    }

    return response.data
  }

  /**
   * Obtenir un site avec ses machines actives
   */
  static async getWithActiveMachines(id: number): Promise<SiteWithMachines> {
    const [site, activeMachines] = await Promise.all([
      this.getOne(id),
      this.listActiveMachines(id)
    ])

    return {
      ...site,
      activeMachines
    }
  }

  /**
   * Rechercher des sites avec filtres
   */
  static async search(filters: {
    name?: string
    country?: string
    region?: string
    city?: string
    radius?: number // rayon de recherche en km
    centerLat?: number
    centerLng?: number
  }): Promise<Site[]> {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString())
      }
    })

    // Pour l'instant, on récupère tous les sites et on filtre côté client
    // Une optimisation serait d'avoir un endpoint de recherche côté backend
    const sites = await this.list()

    return sites.filter(site => {
      const extendedSite = site as SiteExtended

      if (filters.name && !site.name.toLowerCase().includes(filters.name.toLowerCase())) {
        return false
      }
      if (filters.country && extendedSite.country !== filters.country) {
        return false
      }
      if (filters.region && extendedSite.region !== filters.region) {
        return false
      }
      if (filters.city && extendedSite.city !== filters.city) {
        return false
      }

      // Filtre par rayon géographique
      if (filters.radius && filters.centerLat && filters.centerLng) {
        const distance = this.calculateDistance(
          filters.centerLat,
          filters.centerLng,
          extendedSite.latitude ?? site.lat ?? 0,
          extendedSite.longitude ?? site.lng ?? 0
        )
        if (distance > filters.radius) {
          return false
        }
      }

      return true
    })
  }

  /**
   * Calculer la distance entre deux points GPS (formule Haversine)
   */
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371 // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  /**
   * Obtenir les statistiques des sites
   */
  static async getStatistics(): Promise<{
    total: number
    byCountry: Record<string, number>
    byRegion: Record<string, number>
    withActiveMachines: number
    averageMachinesPerSite: number
  }> {
    const sites = await this.list()
    const stats = {
      total: sites.length,
      byCountry: {} as Record<string, number>,
      byRegion: {} as Record<string, number>,
      withActiveMachines: 0,
      averageMachinesPerSite: 0
    }

    let totalMachines = 0

    for (const site of sites) {
      const extendedSite = site as SiteExtended

      // Statistiques par pays et région
      if (extendedSite.country) {
        const country = extendedSite.country
        stats.byCountry[country] = (stats.byCountry[country] || 0) + 1
      }
      if (extendedSite.region) {
        const region = extendedSite.region
        stats.byRegion[region] = (stats.byRegion[region] || 0) + 1
      }

      // Compter les machines actives
      try {
        const activeMachines = await this.listActiveMachines(site.id)
        if (activeMachines.length > 0) {
          stats.withActiveMachines++
          totalMachines += activeMachines.length
        }
      } catch (error) {
        // Ignorer les erreurs pour continuer le calcul des stats
        apiLog.warn('Failed to get machines for site', { siteId: site.id, error })
      }
    }

    stats.averageMachinesPerSite = sites.length > 0 ? totalMachines / sites.length : 0

    return stats
  }
}

// ==================== EXPORT ====================

export default SiteService
