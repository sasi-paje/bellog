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

export interface RouteArrivalView {
  id_route_stop: number | null
  id_route: number
  id_company: number
  arrived_at: string | null
  arrival_photo_path: string | null
  arrival_photo_url: string | null
  already_registered: boolean
}

interface GetRouteArrivalResponse {
  success: boolean
  data?: RouteArrivalView
  error?: string
}

interface RegisterRouteArrivalResponse {
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
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

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

const parseFunctionResponse = (responseText: string): RegisterRouteArrivalResponse | null => {
  if (!responseText) return null

  try {
    return JSON.parse(responseText) as RegisterRouteArrivalResponse
  } catch {
    return null
  }
}

const invokeGetRouteArrival = async (payload: {
  token: string
  routeId: string
  companyId: string
}): Promise<GetRouteArrivalResponse> => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Configuracao do Supabase nao encontrada.')
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/get-route-arrival`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const responseText = await response.text()
  let responseBody: GetRouteArrivalResponse | null = null
  try {
    responseBody = responseText ? (JSON.parse(responseText) as GetRouteArrivalResponse) : null
  } catch {
    responseBody = null
  }

  if (!response.ok) {
    console.error('[ArrivalClientService] get-route-arrival failed:', {
      status: response.status,
      body: responseBody || responseText,
    })
    throw new Error(responseBody?.error || 'Nao foi possivel consultar a chegada.')
  }

  if (!responseBody) {
    console.error('[ArrivalClientService] get-route-arrival returned invalid JSON:', responseText)
    throw new Error('Nao foi possivel consultar a chegada.')
  }

  return responseBody
}

const invokeRegisterRouteArrival = async (formData: FormData): Promise<RegisterRouteArrivalResponse> => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Configuracao do Supabase nao encontrada.')
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/register-route-arrival`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: formData,
  })

  const responseText = await response.text()
  const responseBody = parseFunctionResponse(responseText)

  if (!response.ok) {
    console.error('[ArrivalClientService] register-route-arrival failed:', {
      status: response.status,
      body: responseBody || responseText,
    })

    throw new Error(responseBody?.error || 'Nao foi possivel registrar a chegada.')
  }

  if (!responseBody) {
    console.error('[ArrivalClientService] register-route-arrival returned invalid JSON:', responseText)
    throw new Error('Nao foi possivel registrar a chegada.')
  }

  return responseBody
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

  // Le a chegada ja registrada para a combinacao rota + cliente + motorista (token SASI).
  // A validacao de acesso do motorista a rota e feita server-side pela Edge Function,
  // garantindo que o retorno nunca exponha dados de outras rotas/motoristas.
  async getRouteArrival(companyId: number, routeId: string): Promise<RouteArrivalView | null> {
    if (!routeId) {
      throw new Error('Rota da chegada nao identificada.')
    }

    const token = getSasiTokenFromUrl()
    if (!token) {
      throw new Error('Token de acesso nao encontrado.')
    }

    const response = await invokeGetRouteArrival({
      token,
      routeId,
      companyId: String(companyId),
    })

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Nao foi possivel consultar a chegada.')
    }

    if (!response.data.already_registered) {
      return null
    }

    return response.data
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

    const data = await invokeRegisterRouteArrival(formData)

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
