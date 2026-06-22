// Route-related types shared across the application
import { TrxRoute, RefRouteStatus, RefRouteDeliveryStatus, RefRouteType, MasterRouteArea, MasterFleetVehicle, MasterPersonDriver, MasterPersonHelper, MasterPersonResponsible } from '../../lib/supabase'

// Extended route types with relations
export interface RouteWithDetails extends TrxRoute {
  status?: RefRouteStatus
  delivery_status?: RefRouteDeliveryStatus
  route_type?: RefRouteType
  route_area?: MasterRouteArea
  vehicle?: MasterFleetVehicle
  drivers?: MasterPersonDriver[]
  helpers?: MasterPersonHelper[]
  responsible?: MasterPersonResponsible[]
  destinations?: { id: string; company_name: string; invoice_number?: string }[]
}

export interface RouteListItem {
  id: string
  route_code: string
  area_description: string
  departure_date: string
  departure_time: string
  arrival_date?: string
  arrival_time?: string
  starts_at?: string
  ends_at?: string
  status: string
  status_description: string
  delivery_status: string
  delivery_status_description: string
  vehicle_plate?: string
  vehicle_max_capacity?: number
  current_load?: number
  driver_names: string[]
  responsible_names: string[]
  destinations: string[]
  is_active: boolean
}

export interface CreateRouteDTO {
  route_code: string
  departure_date: string
  id_route_status: string
  id_route_delivery_status: string
  id_vehicle: string
  id_route_type?: string
  id_driver?: string
  observation?: string
  area?: string
  responsible?: string
  assistant?: string[]
  ends_at?: string
}

export interface UpdateRouteDTO extends Partial<CreateRouteDTO> {
  id_route_status?: string
  id_route_delivery_status?: string
  id_vehicle?: string
  current_load?: number
  arrival_date?: string
  arrival_time?: string
}

export interface RouteHistoryItem {
  id: string
  event_type: string
  event_label: string
  event_description: string
  event_at: string
  metadata: Record<string, any> | null
}

export interface RouteFilters {
  search?: string
  isActive?: boolean
  page?: number
  limit?: number
  dataInicio?: string
  dataFim?: string
  status?: string[]
  statusEntrega?: string[]
  motorist?: string[]
  area?: string[]
  veiculo?: string[]
  ordenar?: string
  rotaInicio?: string
  rotaFim?: string
  responsavel?: string
}

export const READONLY_ROUTE_FIELDS = ['id_route_area', 'route_code'] as const