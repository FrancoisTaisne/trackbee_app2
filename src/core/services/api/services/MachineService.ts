/**
 * Machine Service - Service de gestion des machines
 * Centralise toutes les requêtes liées aux machines
 */

import { httpClient } from '../HttpClient'
import { API_ENDPOINTS } from '../endpoints'
import type { Machine } from '@/core/types'

// ==================== TYPES ====================

export interface CreateMachineData {
  name: string
  macAddress: string
  model?: string
  serialNumber?: string
  description?: string
}

export interface UpdateMachineData extends Partial<CreateMachineData> {
  id: number
}

export interface AssignMachineData {
  machineId: number
  userId: number
}

export interface MachineSearchQuery {
  id?: number
  macAddress?: string
}

// ==================== MACHINE SERVICE ====================

export class MachineService {
  /**
   * Récupérer toutes les machines (Admin uniquement)
   */
  static async getAll(): Promise<Machine[]> {
    const response = await httpClient.get<Machine[]>(
      API_ENDPOINTS.machines.all
    )

    if (!response.data) {
      throw new Error('No data in machines list response')
    }

    return response.data
  }

  /**
   * Récupérer les machines par modérateur (Modérateur+)
   */
  static async getAllByModerator(): Promise<Machine[]> {
    const response = await httpClient.get<Machine[]>(
      API_ENDPOINTS.machines.allByMod
    )

    if (!response.data) {
      throw new Error('No data in machines list response')
    }

    return response.data
  }

  /**
   * Récupérer toutes les machines selon le rôle de l'utilisateur
   */
  static async list(): Promise<Machine[]> {
    try {
      // Essayer d'abord avec l'endpoint modérateur (plus permissif)
      return await MachineService.getAllByModerator()
    } catch (error) {
      // Si ça échoue, essayer avec l'endpoint admin
      return await MachineService.getAll()
    }
  }

  /**
   * Trouver une machine par ID ou MAC address (Modérateur+)
   */
  static async findByIdOrMac(query: MachineSearchQuery): Promise<Machine> {
    const params = new URLSearchParams()
    if (query.id) params.append('id', query.id.toString())
    if (query.macAddress) params.append('macAddress', query.macAddress)

    const response = await httpClient.get<Machine>(
      `${API_ENDPOINTS.machines.findByIdOrMac}?${params.toString()}`
    )

    if (!response.data) {
      throw new Error('No data in find machine response')
    }

    return response.data
  }

  /**
   * Créer une nouvelle machine (Admin uniquement)
   */
  static async create(data: CreateMachineData): Promise<Machine> {
    const response = await httpClient.post<Machine>(
      API_ENDPOINTS.machines.create,
      data
    )

    if (!response.data) {
      throw new Error('No data in create machine response')
    }

    return response.data
  }

  /**
   * Mettre à jour une machine (Admin uniquement)
   */
  static async update(id: number, data: Partial<UpdateMachineData>): Promise<Machine> {
    const response = await httpClient.put<Machine>(
      API_ENDPOINTS.machines.update(id),
      data
    )

    if (!response.data) {
      throw new Error('No data in update machine response')
    }

    return response.data
  }

  /**
   * Assigner une machine à un utilisateur (Modérateur+ ou Admin)
   */
  static async assign(data: AssignMachineData): Promise<{
    success: boolean
    message: string
    assignment: {
      machineId: number
      userId: number
      assignedAt: string
    }
  }> {
    const response = await httpClient.post<{
      success: boolean
      message: string
      assignment: {
        machineId: number
        userId: number
        assignedAt: string
      }
    }>(API_ENDPOINTS.machines.assign, data)

    if (!response.data) {
      throw new Error('No data in assign machine response')
    }

    return response.data
  }

  /**
   * Récupérer toutes les machines d'un modérateur
   */
  static async getAllByModerator(): Promise<Machine[]> {
    const response = await httpClient.get<Machine[]>(
      API_ENDPOINTS.machines.allByMod
    )

    if (!response.data) {
      throw new Error('No data in moderator machines response')
    }

    return response.data
  }

  /**
   * Vérifier la santé du système (Health check)
   */
  static async healthCheck(): Promise<{
    status: string
    time: string
    uptime: number
    version: string
  }> {
    const response = await httpClient.get<{
      status: string
      time: string
      uptime: number
      version: string
    }>(API_ENDPOINTS.machines.health)

    if (!response.data) {
      throw new Error('No data in health check response')
    }

    return response.data
  }

  /**
   * Rechercher des machines avec filtres
   */
  static async search(filters: {
    name?: string
    macAddress?: string
    model?: string
    userId?: number
  }): Promise<Machine[]> {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString())
      }
    })

    // Utilise l'endpoint findByIdOrMac avec des paramètres étendus
    const response = await httpClient.get<Machine[]>(
      `${API_ENDPOINTS.machines.findByIdOrMac}?${params.toString()}`
    )

    if (!response.data) {
      throw new Error('No data in machine search response')
    }

    // Si c'est un seul résultat, le convertir en array
    return Array.isArray(response.data) ? response.data : [response.data]
  }

  /**
   * Obtenir les statistiques des machines
   */
  static async getStatistics(): Promise<{
    total: number
    active: number
    inactive: number
    byModel: Record<string, number>
    byUser: Record<string, number>
  }> {
    // Cette fonctionnalité pourrait nécessiter un endpoint dédié côté backend
    const machines = await this.getAll()

    const stats = {
      total: machines.length,
      active: machines.filter(m => m.status === 'active').length,
      inactive: machines.filter(m => m.status !== 'active').length,
      byModel: {} as Record<string, number>,
      byUser: {} as Record<string, number>
    }

    // Calcul des statistiques par modèle et par utilisateur
    machines.forEach(machine => {
      if (machine.model) {
        stats.byModel[machine.model] = (stats.byModel[machine.model] || 0) + 1
      }
      if (machine.assignedUserId) {
        const userId = machine.assignedUserId.toString()
        stats.byUser[userId] = (stats.byUser[userId] || 0) + 1
      }
    })

    return stats
  }
}

// ==================== EXPORT ====================

export default MachineService