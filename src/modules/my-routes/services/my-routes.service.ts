/**
 * Servico para gerenciamento de rotas mobile (Minhas Rotas)
 */

import { supabase, IS_TEST, type MasterFleetVehicle, type MasterPersonDriver } from '../../../lib/supabase'
import type {
  MyRouteListItem,
  MyRouteDetail,
  MyRoutesParams,
  MyRoutesResult,
  RouteDestination,
  RouteMobileStatus,
  RouteStatusInfo,
} from '../types/my-routes.types'

type DbId = string | number

interface StatusReference {
  id: DbId
  code: string | null
  name: string | null
  description?: string | null
}

interface RouteWithRelations {
  id: DbId
  route_code: string | null
  area: string | null
  departure_date: string | null
  departure_time?: string | null
  id_route_status: DbId | null
  id_route_delivery_status: DbId | null
  id_vehicle: DbId | null
  id_driver: DbId | null
  id_route_responsible: number | null
  responsible: string | null
  assistant: string[] | string | null
  starts_at: string | null
  ends_at: string | null
  created_at: string
  updated_at?: string | null
  observation: string | null
}

interface RouteInvoiceRelation {
  id_route: DbId
  id_fiscal_invoice: DbId
}

interface InvoiceDestination {
  id: DbId
  invoice_number: string | null
  id_customer_company: DbId | null
}

interface CompanyDestination {
  id: DbId
  trade_name: string | null
  legal_name: string | null
}

interface CompanyAddress {
  id_company: DbId
  street: string | null
  street_number: string | null
  district: string | null
  city: string | null
  state: string | null
}

interface StatusMapping {
  [key: string]: RouteMobileStatus
}

const STATUS_MAPPING: StatusMapping = {
  Pendente: 'available',
  pending: 'available',
  available: 'available',
  'Em Andamento': 'in_progress',
  in_progress: 'in_progress',
  started: 'in_progress',
  Finalizada: 'completed',
  Concluida: 'completed',
  'Concluída': 'completed',
  completed: 'completed',
  finished: 'completed',
}

const toStringId = (id: DbId | null | undefined): string => {
  if (id === null || id === undefined) return ''
  return String(id)
}

const toQueryId = (id: string): string | number => {
  return /^\d+$/.test(id) ? Number(id) : id
}

const getIsTest = (): boolean => IS_TEST

const NORMALIZED_STATUS_MAPPING: StatusMapping = {
  pending: 'available',
  pendente: 'available',
  available: 'available',
  aberto: 'available',
  aberta: 'available',
  rota_ainda_nao_iniciada: 'available',
  in_progress: 'in_progress',
  em_andamento: 'in_progress',
  em_rota: 'in_progress',
  em_rota_de_entrega: 'in_progress',
  started: 'in_progress',
  finalizada: 'completed',
  finalizado: 'completed',
  concluida: 'completed',
  concluido: 'completed',
  completed: 'completed',
  finished: 'completed',
}

function normalizeStatusToken(value?: string | null): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function getMobileStatus(status?: StatusReference | string | null): RouteMobileStatus {
  if (!status) return 'available'

  if (typeof status === 'string') {
    return STATUS_MAPPING[status] || NORMALIZED_STATUS_MAPPING[normalizeStatusToken(status)] || 'available'
  }

  for (const candidate of [status.code, status.name, status.description]) {
    const mappedStatus = STATUS_MAPPING[candidate || ''] || NORMALIZED_STATUS_MAPPING[normalizeStatusToken(candidate)]
    if (mappedStatus) return mappedStatus
  }

  return 'available'
}

function toStatusInfo(status?: StatusReference | null): RouteStatusInfo | undefined {
  if (!status) return undefined

  return {
    id: toStringId(status.id),
    code: status.code || '',
    name: status.name || status.code || '',
    description: status.description || undefined,
  }
}

function normalizeNames(value: string[] | string | null | undefined): string[] {
  if (!value) return []

  if (Array.isArray(value)) {
    return value.map(String).map(name => name.trim()).filter(Boolean)
  }

  const trimmed = value.trim()
  if (!trimmed) return []

  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) {
      return parsed.map(String).map(name => name.trim()).filter(Boolean)
    }
  } catch {
    // The database may store assistant as plain text instead of JSON.
  }

  return trimmed.split(',').map(name => name.trim()).filter(Boolean)
}

function buildAddress(address?: CompanyAddress): string | undefined {
  if (!address) return undefined

  return [
    address.street,
    address.street_number,
    address.district,
    address.city,
    address.state,
  ].filter(Boolean).join(', ') || undefined
}

async function getDeliveryStatusByName(name: string): Promise<StatusReference> {
  const normalizedName = normalizeStatusToken(name)
  const byName = await supabase
    .from('ref_route_delivery_status')
    .select('id, code, name, description')
    .eq('name', name)
    .eq('is_active', true)
    .maybeSingle()

  if (byName.error) {
    throw new MyRoutesServiceError(
      byName.error.message,
      'NETWORK_ERROR',
      { originalError: byName.error, statusName: name }
    )
  }

  if (byName.data) {
    return byName.data as StatusReference
  }

  const byCode = await supabase
    .from('ref_route_delivery_status')
    .select('id, code, name, description')
    .in('code', [name, normalizedName, normalizedName.toUpperCase()])
    .eq('is_active', true)
    .limit(1)

  if (byCode.error) {
    throw new MyRoutesServiceError(
      byCode.error.message,
      'NETWORK_ERROR',
      { originalError: byCode.error, statusName: name }
    )
  }

  const codeMatch = Array.isArray(byCode.data) ? byCode.data[0] : byCode.data

  if (!codeMatch) {
    throw new MyRoutesServiceError(
      `Status de entrega nao encontrado: ${name}`,
      'VALIDATION_ERROR',
      { statusName: name }
    )
  }

  return codeMatch as StatusReference
}

async function insertRouteHistory(
  routeId: string,
  description: string,
  eventAt: string,
  isTest: boolean
): Promise<void> {
  const { error } = await supabase
    .from('trx_route_history')
    .insert({
      id_route: toQueryId(routeId),
      id_history_type: 3,
      event_at: eventAt,
      description,
      is_test: isTest,
    })

  if (error) {
    console.warn('[myRoutesService] Could not insert route history:', error)
  }
}

export class MyRoutesServiceError extends Error {
  constructor(
    message: string,
    public code: 'NETWORK_ERROR' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'RPC_ERROR' | 'UNKNOWN',
    public context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'MyRoutesServiceError'
  }
}

export const myRoutesService = {
  async list(params?: MyRoutesParams): Promise<MyRoutesResult> {
    const isTest = getIsTest()
    const { page = 1, limit = 100, driverId } = params || {}

    const from = (page - 1) * limit
    const to = from + limit - 1

    if (!driverId) {
      throw new MyRoutesServiceError('Motorista nao informado para carregar rotas', 'VALIDATION_ERROR')
    }

    try {
      const routesQuery = supabase
        .from('trx_route')
        .select('*', { count: 'exact' })
        .eq('id_driver', toQueryId(driverId))
        .eq('is_test', isTest)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .range(from, to)

      const [
        routesResult,
        deliveryStatusResult,
      ] = await Promise.all([
        routesQuery,
        supabase
          .from('ref_route_delivery_status')
          .select('id, code, name, description'),
      ])

      if (routesResult.error) {
        throw new MyRoutesServiceError(
          routesResult.error.message,
          'NETWORK_ERROR',
          { originalError: routesResult.error }
        )
      }

      const routes = (routesResult.data || []) as RouteWithRelations[]
      if (routes.length === 0) {
        return { data: [], total: routesResult.count || 0 }
      }

      const deliveryStatusMap = new Map<string, StatusReference>()
      deliveryStatusResult.data?.forEach((s: StatusReference) => {
        deliveryStatusMap.set(toStringId(s.id), s)
      })

      const vehicleIds = [...new Set(routes.map(r => r.id_vehicle).filter(Boolean).map(toStringId))]
      const driverIds = [...new Set(routes.map(r => r.id_driver).filter(Boolean).map(toStringId))]
      const routeIds = routes.map(r => toStringId(r.id))

      const [vehiclesResult, driversResult, routeInvoicesResult] = await Promise.all([
        vehicleIds.length > 0
          ? supabase.from('master_fleet_vehicle').select('id, plate, name').in('id', vehicleIds.map(toQueryId)).eq('is_test', isTest)
          : Promise.resolve({ data: [], error: null }),
        driverIds.length > 0
          ? supabase.from('master_person_driver').select('id, name').in('id', driverIds.map(toQueryId)).eq('is_test', isTest)
          : Promise.resolve({ data: [], error: null }),
        routeIds.length > 0
          ? supabase.from('rel_route_invoice').select('id_route').in('id_route', routeIds.map(toQueryId)).eq('is_test', isTest).eq('is_active', true)
          : Promise.resolve({ data: [], error: null }),
      ])

      const vehicleMap = new Map<string, MasterFleetVehicle | undefined>(
        vehiclesResult.data?.map((v: MasterFleetVehicle) => [toStringId(v.id), v]) || []
      )

      const driverMap = new Map<string, string>(
        driversResult.data?.map((d: { id: DbId; name: string | null }) => [toStringId(d.id), d.name || '']) || []
      )

      const destinationCount: Record<string, number> = {}
      routeInvoicesResult.data?.forEach((ri: { id_route: DbId }) => {
        const routeId = toStringId(ri.id_route)
        destinationCount[routeId] = (destinationCount[routeId] || 0) + 1
      })

      const result: MyRouteListItem[] = routes.map(route => {
        const routeId = toStringId(route.id)
        const deliveryStatus = route.id_route_delivery_status
          ? deliveryStatusMap.get(toStringId(route.id_route_delivery_status)) || null
          : null

        const mobileStatus = getMobileStatus(deliveryStatus)

        return {
          id: routeId,
          route_code: route.route_code || '',
          area_description: route.area || '',
          departure_date: route.departure_date || '',
          departure_time: route.departure_time || '',
          status: mobileStatus,
          vehicle_plate: route.id_vehicle ? vehicleMap.get(toStringId(route.id_vehicle))?.plate || undefined : undefined,
          driver_name: route.id_driver ? driverMap.get(toStringId(route.id_driver)) : undefined,
          responsible_name: route.responsible || undefined,
          assistant_name: normalizeNames(route.assistant)[0],
          destinations_count: destinationCount[routeId] || 0,
          starts_at: route.starts_at || undefined,
          ends_at: route.ends_at || undefined,
        }
      })

      return { data: result, total: routesResult.count || 0 }
    } catch (err) {
      if (err instanceof MyRoutesServiceError) {
        throw err
      }
      throw new MyRoutesServiceError(
        err instanceof Error ? err.message : 'Erro desconhecido',
        'UNKNOWN',
        { originalError: err }
      )
    }
  },

  async getById(routeId: string, driverId?: string | null): Promise<MyRouteDetail> {
    const isTest = getIsTest()

    if (!routeId) {
      throw new MyRoutesServiceError('ID da rota nao informado', 'VALIDATION_ERROR')
    }

    try {
      let routeQuery = supabase
        .from('trx_route')
        .select('*')
        .eq('id', toQueryId(routeId))
        .eq('is_test', isTest)
        .eq('is_active', true)

      if (driverId) {
        routeQuery = routeQuery.eq('id_driver', toQueryId(driverId))
      }

      const { data: route, error: routeError } = await routeQuery.maybeSingle()

      if (routeError) {
        throw new MyRoutesServiceError(
          routeError.message,
          'NETWORK_ERROR',
          { originalError: routeError, routeId }
        )
      }

      if (!route) {
        throw new MyRoutesServiceError('Rota nao encontrada', 'NOT_FOUND', { routeId })
      }

      const routeData = route as RouteWithRelations
      const [
        statusResult,
        deliveryStatusResult,
        vehicleResult,
        driverResult,
        routeInvoicesResult,
        responsibleRefResult,
      ] = await Promise.all([
        routeData.id_route_status
          ? supabase.from('ref_route_status').select('id, code, name, description').eq('id', routeData.id_route_status).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        routeData.id_route_delivery_status
          ? supabase.from('ref_route_delivery_status').select('id, code, name, description').eq('id', routeData.id_route_delivery_status).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        routeData.id_vehicle
          ? supabase.from('master_fleet_vehicle').select('*').eq('id', routeData.id_vehicle).eq('is_test', isTest).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        routeData.id_driver
          ? supabase.from('master_person_driver').select('*').eq('id', routeData.id_driver).eq('is_test', isTest).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from('rel_route_invoice')
          .select('id_route, id_fiscal_invoice')
          .eq('id_route', toQueryId(routeId))
          .eq('is_test', isTest)
          .eq('is_active', true),
        routeData.id_route_responsible
          ? supabase.from('ref_route_responsible').select('id, name').eq('id', routeData.id_route_responsible).eq('is_active', true).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ])

      if (routeInvoicesResult.error) {
        throw new MyRoutesServiceError(
          routeInvoicesResult.error.message,
          'NETWORK_ERROR',
          { originalError: routeInvoicesResult.error, routeId }
        )
      }

      const destinations = await this.getRouteDestinations(
        (routeInvoicesResult.data || []) as RouteInvoiceRelation[],
        isTest
      )

      const statusInfo = toStatusInfo(statusResult.data as StatusReference | null)
      const deliveryStatusInfo = toStatusInfo(deliveryStatusResult.data as StatusReference | null)

      return {
        id: toStringId(routeData.id),
        route_code: routeData.route_code || '',
        area_description: routeData.area || '',
        departure_date: routeData.departure_date || '',
        departure_time: routeData.departure_time || '',
        status: getMobileStatus(deliveryStatusResult.data as StatusReference | null),
        status_info: statusInfo,
        delivery_status: deliveryStatusInfo,
        vehicle: (vehicleResult.data as MasterFleetVehicle | null) || undefined,
        drivers: driverResult.data ? [driverResult.data as MasterPersonDriver] : [],
        helpers: normalizeNames(routeData.assistant).map((name, index) => ({ id: String(index), name })),
        responsibles: (() => {
          const fromText = normalizeNames(routeData.responsible)
          if (fromText.length > 0) return fromText.map((name, index) => ({ id: String(index), name }))
          const refName = (responsibleRefResult.data as { id: number; name: string } | null)?.name
          return refName ? [{ id: String(routeData.id_route_responsible || 0), name: refName }] : []
        })(),
        destinations,
        starts_at: routeData.starts_at || undefined,
        ends_at: routeData.ends_at || undefined,
        created_at: routeData.created_at,
        observation: routeData.observation || undefined,
      }
    } catch (err) {
      if (err instanceof MyRoutesServiceError) {
        throw err
      }

      throw new MyRoutesServiceError(
        err instanceof Error ? err.message : 'Erro ao carregar detalhes da rota',
        'UNKNOWN',
        { originalError: err, routeId }
      )
    }
  },

  async getRouteDestinations(
    routeInvoices: RouteInvoiceRelation[],
    isTest: boolean
  ): Promise<RouteDestination[]> {
    const invoiceIds = [...new Set(routeInvoices.map(ri => ri.id_fiscal_invoice).filter(Boolean).map(toStringId))]

    if (invoiceIds.length === 0) {
      return []
    }

    const { data: invoices, error: invoicesError } = await supabase
      .from('trx_fiscal_invoice')
      .select('id, invoice_number, id_customer_company')
      .in('id', invoiceIds.map(toQueryId))
      .eq('is_test', isTest)

    if (invoicesError) {
      throw new MyRoutesServiceError(
        invoicesError.message,
        'NETWORK_ERROR',
        { originalError: invoicesError }
      )
    }

    const companyIds = [...new Set(
      ((invoices || []) as InvoiceDestination[])
        .map(invoice => invoice.id_customer_company)
        .filter(Boolean)
        .map(toStringId)
    )]

    if (companyIds.length === 0) {
      return []
    }

    const [companiesResult, addressesResult] = await Promise.all([
      supabase
        .from('master_person_company')
        .select('id, trade_name, legal_name')
        .in('id', companyIds.map(toQueryId))
        .eq('is_test', isTest),
      supabase
        .from('master_person_company_address')
        .select('id_company, street, street_number, district, city, state')
        .in('id_company', companyIds.map(toQueryId))
        .eq('is_test', isTest)
        .eq('is_active', true),
    ])

    if (companiesResult.error) {
      throw new MyRoutesServiceError(
        companiesResult.error.message,
        'NETWORK_ERROR',
        { originalError: companiesResult.error }
      )
    }

    const companies = (companiesResult.data || []) as CompanyDestination[]
    const addresses = (addressesResult.data || []) as CompanyAddress[]

    const companyMap = new Map(companies.map(company => [toStringId(company.id), company]))
    const addressMap = new Map(addresses.map(address => [toStringId(address.id_company), address]))
    const destinationMap = new Map<string, RouteDestination>()

    ;((invoices || []) as InvoiceDestination[]).forEach(invoice => {
      const companyId = toStringId(invoice.id_customer_company)
      if (!companyId || destinationMap.has(companyId)) return

      const company = companyMap.get(companyId)
      destinationMap.set(companyId, {
        id: companyId,
        company_name: company?.trade_name || company?.legal_name || `Empresa ${companyId}`,
        address: buildAddress(addressMap.get(companyId)),
      })
    })

    return Array.from(destinationMap.values())
  },

  async startRoute(routeId: string): Promise<void> {
    const isTest = getIsTest()
    const now = new Date().toISOString()

    const emAndamento = await getDeliveryStatusByName('Em Andamento')

    const { error } = await supabase
      .from('trx_route')
      .update({
        starts_at: now,
        id_route_delivery_status: emAndamento.id,
      })
      .eq('id', toQueryId(routeId))
      .eq('is_test', isTest)

    if (error) {
      throw new MyRoutesServiceError(
        error.message,
        'NETWORK_ERROR',
        { originalError: error, routeId }
      )
    }
  },

  async completeRoute(routeId: string): Promise<void> {
    const isTest = getIsTest()

    const { error: rpcError } = await supabase.rpc('complete_route', {
      p_route_id: toQueryId(routeId),
      p_user_id: null,
      p_is_test: isTest,
    })

    if (rpcError) {
      console.error('[completeRoute] RPC error:', rpcError)
      throw new MyRoutesServiceError(
        rpcError.message,
        'RPC_ERROR',
        { originalError: rpcError, routeId }
      )
    }
  },
}
