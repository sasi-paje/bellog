/**
 * Tipos para a feature Minhas Rotas (Mobile)
 */

import type { MasterFleetVehicle, MasterPersonDriver } from '../../../lib/supabase'

export type RouteMobileStatus = 'available' | 'in_progress' | 'completed'

export interface RouteStatusInfo {
  id: string
  code: string
  name: string
  description?: string
}

export interface MyRouteListItem {
  id: string
  route_code: string
  area_description: string
  departure_date: string
  departure_time: string
  status: RouteMobileStatus
  vehicle_plate?: string
  driver_name?: string
  responsible_name?: string
  assistant_name?: string
  destinations_count: number
  starts_at?: string
  ends_at?: string
}

export interface RouteDestination {
  id: string
  company_name: string
  address?: string
}

export interface RouteHelper {
  id: string
  name: string
}

export interface RouteResponsible {
  id: string
  name: string
}

export interface MyRouteDetail {
  id: string
  route_code: string
  area_description: string
  departure_date: string
  departure_time: string
  status: RouteMobileStatus
  status_info?: RouteStatusInfo
  delivery_status?: RouteStatusInfo

  vehicle?: MasterFleetVehicle

  drivers: MasterPersonDriver[]

  helpers: RouteHelper[]

  responsibles: RouteResponsible[]

  destinations: RouteDestination[]

  starts_at?: string
  ends_at?: string
  created_at: string

  observation?: string
}

export interface MyRoutesParams {
  driverId?: string
  status?: RouteMobileStatus
  page?: number
  limit?: number
}

export interface MyRoutesResult {
  data: MyRouteListItem[]
  total: number
}

export type MyRoutesTab = 'available' | 'completed'

export interface StartRouteConfirmData {
  route_id: string
  route_code: string
  area_description: string
}
