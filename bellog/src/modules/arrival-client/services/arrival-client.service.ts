import { supabase, getEnvironment } from '../../../lib/supabase'
import { myRoutesService } from '../../my-routes/services/my-routes.service'
import type { RouteDestination } from '../../my-routes/types/my-routes.types'
import { deliveryService } from '../../delivery/services/delivery.service'
import { getSasiTokenFromUrl } from '../../../apps/mobile/services'

export interface ArrivalClientDestination {
  id: string
  company_id: number
  company_name: string
  route_id: string
  route_code?: string
}

export interface ArrivalClientRecord {
  id: number
  company_id: number
  company_name: string
  route_id: string
  arrived_at: string
  departed_at: string | null
  arrival_photo_path: string
  arrival_observation: string | null
  updated_at: string
}

export interface SaveArrivalInput {
  destination: ArrivalClientDestination
  arrivalTime: string
  photo: File
  justification?: string
}

const toQueryId = (id: string): string | number => (/^\d+$/.test(id) ? Number(id) : id)

const toArrivalDateTime = (arrivalTime: string): string => {
  const [hours, minutes] = arrivalTime.split(':').map(Number)
  const arrivedAt = new Date()
  arrivedAt.setHours(hours, minutes, 0, 0)
  return arrivedAt.toISOString()
}

const getFunctionErrorMessage = async (error: unknown): Promise<string> => {
  const context = (error as { context?: unknown })?.context

  if (context instanceof Response) {
    try {
      const body = await context.clone().json()
      if (typeof body?.error === 'string') {
        return body.error
      }
    } catch {
      // Keep the generic fallback below.
    }
  }

  return error instanceof Error && error.message
    ? error.message
    : 'Não foi possível registrar a chegada.'
}

const mapRouteDestination = (
  destination: RouteDestination,
  routeId: string,
  routeCode?: string
): ArrivalClientDestination => ({
  id: `${routeId}-${destination.id}`,
  company_id: Number(destination.id),
  company_name: destination.company_name,
  route_id: routeId,
  route_code: routeCode,
})

export const arrivalClientService = {
  async getDestinations(routeId?: string): Promise<ArrivalClientDestination[]> {
    if (routeId) {
      const route = await myRoutesService.getById(routeId)
      return route.destinations.map(destination =>
        mapRouteDestination(destination, route.id, route.route_code)
      )
    }

    const { destinations } = await deliveryService.getDestinations()
    const map = new Map<string, ArrivalClientDestination>()
    destinations.forEach(destination => {
      const destinationId = `${destination.route_id}-${destination.company_id}`
      if (!map.has(destinationId)) {
        map.set(destinationId, {
          id: destinationId,
          company_id: destination.company_id,
          company_name: destination.company_name,
          route_id: destination.route_id,
          route_code: destination.route_code,
        })
      }
    })
    return Array.from(map.values())
  },

  async getExistingRecord(companyId: number, routeId?: string): Promise<ArrivalClientRecord | null> {
    const isTest = getEnvironment() !== 'production'

    let query = supabase
      .from('trx_route_stop')
      .select('*')
      .eq('id_company', companyId)
      .eq('is_test', isTest)
      .not('arrived_at', 'is', null)
      .order('arrived_at', { ascending: false })
      .limit(1)

    if (routeId) {
      query = query.eq('id_route', toQueryId(routeId))
    }

    const { data, error } = await query

    if (error) {
      console.error('[ArrivalClientService] Error fetching existing record:', error)
      return null
    }

    if (!data || data.length === 0) return null

    const record = data[0]
    return {
      id: record.id,
      company_id: record.id_company,
      company_name: '',
      route_id: String(record.id_route),
      arrived_at: record.arrived_at || '',
      departed_at: record.departed_at || null,
      arrival_photo_path: record.arrival_photo_path || '',
      arrival_observation: record.arrival_observation || null,
      updated_at: record.updated_at || '',
    }
  },

  async save(input: SaveArrivalInput): Promise<ArrivalClientRecord> {
    if (!input.destination.route_id) {
      throw new Error('Rota da chegada nao identificada.')
    }

    const token = getSasiTokenFromUrl()
    if (!token) {
      throw new Error('Token de acesso nao encontrado.')
    }

    const formData = new FormData()
    formData.set('token', token)
    formData.set('routeId', input.destination.route_id)
    formData.set('companyId', String(input.destination.company_id))
    formData.set('arrivedAt', toArrivalDateTime(input.arrivalTime))
    formData.set('file', input.photo)

    const justification = input.justification?.trim()
    if (justification) {
      formData.set('justification', justification)
    }

    const { data, error } = await supabase.functions.invoke<{
      success: boolean
      data?: {
        id_route_stop: number
        arrival_photo_path: string
        arrived_at: string
      }
      id_route_stop: number
      arrival_photo_path: string
      arrived_at: string
      error?: string
    }>('register-route-arrival', {
      body: formData,
    })

    if (error) {
      throw new Error(await getFunctionErrorMessage(error))
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Nao foi possivel registrar a chegada.')
    }

    const arrivalData = data.data || data

    return {
      id: arrivalData.id_route_stop,
      company_id: input.destination.company_id,
      company_name: input.destination.company_name,
      route_id: input.destination.route_id,
      arrived_at: arrivalData.arrived_at,
      departed_at: null,
      arrival_photo_path: arrivalData.arrival_photo_path,
      arrival_observation: justification || null,
      updated_at: new Date().toISOString(),
    }
  },
}
