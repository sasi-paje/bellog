// Feature Routes - API Service
// Este arquivo contém a lógica de acesso a dados de rotas
// Usado por admin e mobile

import { supabase, getEnvironment, TrxRoute, RefRouteStatus, RefRouteDeliveryStatus, RefRouteType, MasterRouteArea, MasterFleetVehicle, MasterPersonDriver, MasterPersonHelper, MasterPersonResponsible } from '../../../lib/supabase'

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

// Fields that cannot be edited according to business rules
export const READONLY_ROUTE_FIELDS = ['id_route_area', 'route_code']

// Route Service
export const routeService = {
  // List routes with pagination and filters
  async list(params?: {
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
  }): Promise<{ data: RouteListItem[]; total: number }> {
    const { search, isActive, page = 1, limit = 20, dataInicio, dataFim, status, statusEntrega, motorist, area, veiculo, ordenar = 'recentes', rotaInicio, rotaFim, responsavel } = params || {}
    const isTest = getEnvironment() !== 'production'

    // Look up filter IDs from reference tables in parallel
    const [statusData, deliveryData, driverData, vehicleData] = await Promise.all([
      status && status.length > 0
        ? supabase.from('ref_route_status').select('id').in('name', status).eq('is_active', true)
        : Promise.resolve({ data: [], error: null }),
      statusEntrega && statusEntrega.length > 0
        ? supabase.from('ref_route_delivery_status').select('id').in('name', statusEntrega).eq('is_active', true)
        : Promise.resolve({ data: [], error: null }),
      motorist && motorist.length > 0
        ? supabase.from('master_person_driver').select('id').in('name', motorist).eq('is_test', isTest)
        : Promise.resolve({ data: [], error: null }),
      veiculo && veiculo.length > 0
        ? supabase.from('master_fleet_vehicle').select('id').in('plate', veiculo).eq('is_test', isTest)
        : Promise.resolve({ data: [], error: null }),
    ])

    const idRouteStatus = statusData?.data?.map((s: any) => s.id) || []
    const idDeliveryStatus = deliveryData?.data?.map((d: any) => d.id) || []
    const idDriver = driverData?.data?.map((d: any) => d.id) || []
    const idVehicle = vehicleData?.data?.map((v: any) => v.id) || []

    let query = supabase
      .from('trx_route')
      .select('*', { count: 'exact' })
      .eq('is_test', isTest)

    if (isActive !== undefined) {
      query = query.eq('is_active', isActive)
    }

    if (search) {
      // Check if search is a range (e.g., "01,100" or "1,100")
      if (search.includes(',')) {
        const parts = search.split(',').map(p => p.trim())
        if (parts.length === 2 && parts[0] && parts[1]) {
          // Use gte/lte for range filtering
          query = query.gte('route_code', parts[0])
          query = query.lte('route_code', parts[1])
        } else {
          query = query.or(`route_code.ilike.%${search}%`)
        }
      } else {
        // Regular partial search
        query = query.or(`route_code.ilike.%${search}%`)
      }
    }

    // Filter by route number range
    if (rotaInicio) {
      query = query.gte('route_code', rotaInicio)
    }
    if (rotaFim) {
      query = query.lte('route_code', rotaFim)
    }

    const addOneDayToDateString = (dateStr: string): string => {
      const [year, month, day] = dateStr.split('-').map(Number)
      const nextDay = day + 1
      const lastDayOfMonth = new Date(year, month, 0).getDate()
      if (nextDay > lastDayOfMonth) {
        const nextMonth = month + 1
        if (nextMonth > 12) {
          return `${year + 1}-01-01`
        }
        return `${year}-${String(nextMonth).padStart(2, '0')}-01`
      }
      return `${year}-${String(month).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`
    }

    if (dataInicio && dataFim) {
      const startDate = dataInicio.trim()
      const endDateStr = dataFim.trim()
      if (startDate && endDateStr) {
        const resultDateStr = addOneDayToDateString(endDateStr)
        console.log('[routeService.list] date range:', startDate, 'to', resultDateStr, '(inclusive end date)')
        console.log('[routeService.list] gte departure_date >=', startDate)
        console.log('[routeService.list] lt departure_date <', resultDateStr)
        query = query.gte('departure_date', startDate)
        query = query.lt('departure_date', resultDateStr)
      }
    } else if (dataInicio) {
      const startDate = dataInicio.trim()
      if (startDate) {
        console.log('[routeService.list] dataInicio only:', startDate)
        query = query.gte('departure_date', startDate)
      }
    } else if (dataFim) {
      const endDateStr = dataFim.trim()
      if (endDateStr) {
        const resultDateStr = addOneDayToDateString(endDateStr)
        console.log('[routeService.list] dataFim only:', resultDateStr)
        query = query.lt('departure_date', resultDateStr)
      }
    }
    if (area) {
      query = query.ilike('area', `%${area}%`)
    }
    if (responsavel) {
      query = query.eq('responsible', responsavel)
    }
    if (idRouteStatus.length > 0) {
      query = query.in('id_route_status', idRouteStatus)
    }
    if (idDeliveryStatus.length > 0) {
      query = query.in('id_route_delivery_status', idDeliveryStatus)
    }
    if (idDriver.length > 0) {
      query = query.in('id_driver', idDriver)
    }
    if (idVehicle.length > 0) {
      query = query.in('id_vehicle', idVehicle)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to).order('created_at', { ascending: ordenar === 'antigos' })

    const { data: routes, error, count } = await query

    if (error) throw new Error(error.message)
    if (!routes || routes.length === 0) {
      return { data: [], total: count || 0 }
    }

    const routeIds = routes.map(r => r.id)
    const isTestFilter = isTest

    const statusIds = [...new Set(routes.map(r => r.id_route_status).filter(Boolean))]
    const deliveryStatusIds = [...new Set(routes.map(r => r.id_route_delivery_status).filter(Boolean))]
    const vehicleIds = [...new Set(routes.map(r => r.id_vehicle).filter(Boolean))]
    const driverIds = [...new Set(routes.map(r => r.id_driver).filter(Boolean))]

    const responsibleIds = [...new Set(routes.map(r => r.id_route_responsible).filter(Boolean))]

    const [statusesResult, deliveryStatusesResult, vehiclesResult, driversResult, routeInvoicesResult, responsiblesResult] = await Promise.all([
      statusIds.length > 0
        ? supabase.from('ref_route_status').select('id, code, name').in('id', statusIds)
        : Promise.resolve({ data: [], error: null }),
      deliveryStatusIds.length > 0
        ? supabase.from('ref_route_delivery_status').select('id, code, name').in('id', deliveryStatusIds)
        : Promise.resolve({ data: [], error: null }),
      vehicleIds.length > 0
        ? supabase.from('master_fleet_vehicle').select('*').in('id', vehicleIds).eq('is_test', isTestFilter)
        : Promise.resolve({ data: [], error: null }),
      driverIds.length > 0
        ? supabase.from('master_person_driver').select('id, name').in('id', driverIds).eq('is_test', isTestFilter)
        : Promise.resolve({ data: [], error: null }),
      routeIds.length > 0
        ? supabase.from('rel_route_invoice').select('id_route, id_fiscal_invoice').in('id_route', routeIds).eq('is_test', isTestFilter).eq('is_active', true)
        : Promise.resolve({ data: [], error: null }),
      responsibleIds.length > 0
        ? supabase.from('ref_route_responsible').select('id, name').in('id', responsibleIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    const statuses = statusesResult.data
    const deliveryStatuses = deliveryStatusesResult.data
    const vehicles = vehiclesResult.data
    const drivers = driversResult.data
    const routeInvoices = routeInvoicesResult.data
    const responsibles = responsiblesResult.data
    const responsibleMap = new Map(responsibles?.map((r: any) => [r.id, r.name]) || [])

    const invoiceIds = [...new Set(routeInvoices?.map(ri => ri.id_fiscal_invoice).filter(Boolean) || [])]

    const invoicesResult = invoiceIds.length > 0
      ? await supabase.from('trx_fiscal_invoice').select('id, id_customer_company, net_weight, gross_weight').in('id', invoiceIds).eq('is_test', isTestFilter)
      : { data: [], error: null }

    const invoices = invoicesResult.data
    const companyIds = [...new Set(invoices?.map(i => i.id_customer_company).filter(Boolean) || [])]

    const companiesResult = companyIds.length > 0
      ? await supabase.from('master_person_company').select('id, trade_name').in('id', companyIds).eq('is_test', isTestFilter)
      : { data: [], error: null }

    const companies = companiesResult.data

    const invoiceWeightMap = new Map<string, number>()
    invoices?.forEach(inv => {
      const weight = Number(inv.net_weight) || Number(inv.gross_weight) || 0
      routeInvoices?.forEach(ri => {
        if (ri.id_fiscal_invoice === inv.id) {
          const currentWeight = invoiceWeightMap.get(ri.id_route) || 0
          invoiceWeightMap.set(ri.id_route, currentWeight + weight)
        }
      })
    })

    const driverMap = new Map(drivers?.map(d => [d.id, d.name]) || [])
    const companyMap = new Map(companies?.map(c => [c.id, c.trade_name]) || [])
    const routeInvoiceMap = new Map<string, string[]>()

    routeInvoices?.forEach(ri => {
      const invoice = invoices?.find(i => i.id === ri.id_fiscal_invoice)
      if (invoice?.id_customer_company) {
        const companyName = companyMap.get(invoice.id_customer_company) || ''
        const existing = routeInvoiceMap.get(ri.id_route) || []
        if (!existing.includes(companyName)) {
          routeInvoiceMap.set(ri.id_route, [...existing, companyName])
        }
      }
    })

    const result: RouteListItem[] = routes.map(route => {
      const status = statuses?.find(s => s.id === route.id_route_status)
      const deliveryStatus = deliveryStatuses?.find(ds => ds.id === route.id_route_delivery_status)
      const vehicle = vehicles?.find(v => v.id === route.id_vehicle)

      const vehicleMaxCapacity = vehicle?.nominal_capacity || 0
      // Usar current_load da rota se existir, senão calcular do peso das notas
      const calculatedLoad = invoiceWeightMap.get(route.id) || 0
      const driverNames: string[] = route.id_driver && driverMap.has(route.id_driver) ? [driverMap.get(route.id_driver)!] : []
      const responsibleNames: string[] =
        route.id_route_responsible && responsibleMap.has(route.id_route_responsible)
          ? [responsibleMap.get(route.id_route_responsible)!]
          : route.responsible ? [route.responsible] : []
      const destinationNames: string[] = routeInvoiceMap.get(route.id) || []

      const statusName = status?.name || ''
      const deliveryStatusName = deliveryStatus?.name || ''

      return {
        id: route.id,
        route_code: route.route_code || '',
        area_description: route.area || '',
        departure_date: route.departure_date || '',
        departure_time: route.departure_time || '',
        arrival_date: route.arrival_date || '',
        arrival_time: route.arrival_time || '',
        starts_at: route.starts_at || '',
        ends_at: route.ends_at || '',
        status: route.id_route_status || '',
        status_description: statusName,
        delivery_status: route.id_route_delivery_status || '',
        delivery_status_description: deliveryStatusName,
        vehicle_plate: vehicle?.plate,
        vehicle_max_capacity: vehicleMaxCapacity,
        current_load: route.current_load || calculatedLoad,
        driver_names: driverNames,
        responsible_names: responsibleNames,
        destinations: destinationNames,
        is_active: route.is_active,
      }
    })

    return { data: result, total: count || 0 }
  },

  // Get route by ID with all details
  async getById(id: string): Promise<RouteWithDetails | null> {
    const isTest = getEnvironment() !== 'production'

    try {
      const { data: route, error } = await supabase
        .from('trx_route')
        .select('*')
        .eq('id', id)
        .eq('is_test', isTest)
        .single()

      if (error) throw new Error(error.message)
      if (!route) return null

      let status = null
      if (route.id_route_status) {
        try {
          const { data: statusData } = await supabase
            .from('ref_route_status')
            .select('*')
            .eq('id', route.id_route_status)
            .eq('is_active', true)
            .limit(1)
            .single()
          status = statusData
        } catch (e) {
          console.warn('[getById] Could not fetch status:', e)
        }
      }

      let deliveryStatus = null
      if (route.id_route_delivery_status) {
        try {
          const { data: deliveryStatusData } = await supabase
            .from('ref_route_delivery_status')
            .select('*')
            .eq('id', route.id_route_delivery_status)
            .eq('is_active', true)
            .limit(1)
            .single()
          deliveryStatus = deliveryStatusData
        } catch (e) {
          console.warn('[getById] Could not fetch delivery status:', e)
        }
      }

      let routeType = null
      if (route.id_route_type) {
        try {
          const { data: routeTypeData } = await supabase
            .from('ref_route_type')
            .select('*')
            .eq('id', route.id_route_type)
            .eq('is_active', true)
            .limit(1)
            .single()
          routeType = routeTypeData
        } catch (e) {
          console.warn('[getById] Could not fetch route type:', e)
        }
      }

      let routeArea = null
      if (route.id_route_area) {
        try {
          const { data: routeAreaData } = await supabase
            .from('master_route_area')
            .select('*')
            .eq('id', route.id_route_area)
            .eq('is_active', true)
            .limit(1)
            .single()
          routeArea = routeAreaData
        } catch (e) {
          console.warn('[getById] Could not fetch route area:', e)
        }
      }

      let vehicle = null
      if (route.id_vehicle) {
        try {
          const { data: vehicleData } = await supabase
            .from('master_fleet_vehicle')
            .select('*')
            .eq('id', route.id_vehicle)
            .eq('is_test', isTest)
            .limit(1)
            .single()
          vehicle = vehicleData
        } catch (e) {
          console.warn('[getById] Could not fetch vehicle:', e)
        }
      }

      let drivers: MasterPersonDriver[] = []
      try {
        if (route.id_driver) {
          const { data: driverData } = await supabase
            .from('master_person_driver')
            .select('*')
            .eq('id', route.id_driver)
            .eq('is_test', isTest)
            .maybeSingle()
          if (driverData) {
            drivers = [driverData]
          }
        }
      } catch (e) {
        console.warn('[getById] Could not fetch driver:', e)
      }

      let destinations: { id: string; company_name: string; invoice_number: string }[] = []
      try {
        const { data: routeInvoices } = await supabase
          .from('rel_route_invoice')
          .select('id_fiscal_invoice')
          .eq('id_route', id)
          .eq('is_test', isTest)
          .eq('is_active', true)

        if (routeInvoices && routeInvoices.length > 0) {
          const invoiceIds = routeInvoices.map(ri => ri.id_fiscal_invoice)
          const { data: invoices } = await supabase
            .from('trx_fiscal_invoice')
            .select('id, invoice_number, id_customer_company')
            .in('id', invoiceIds)
            .eq('is_test', isTest)

          const companyIds = [...new Set(invoices?.map(i => i.id_customer_company).filter(Boolean) || [])]
          let companies: any[] = []
          if (companyIds.length > 0) {
            const { data: companiesData } = await supabase
              .from('master_person_company')
              .select('id, trade_name')
              .in('id', companyIds)
              .eq('is_test', isTest)
            companies = companiesData || []
          }

          const companyMap = new Map(companies.map(c => [c.id, c.trade_name || '']))

          destinations = (invoices || []).map(inv => ({
            id: String(inv.id),
            company_name: companyMap.get(inv.id_customer_company) || '',
            invoice_number: inv.invoice_number || ''
          }))
        }
      } catch (e) {
        console.warn('[getById] rel_route_invoice table not found:', e)
      }

      const helpers = route.assistant ? route.assistant.map((name: string) => ({ id: '', name })) : []

      let responsible: { id: string; name: string }[] = []
      if (route.id_route_responsible) {
        try {
          const { data: responsibleData } = await supabase
            .from('ref_route_responsible')
            .select('id, name')
            .eq('id', route.id_route_responsible)
            .maybeSingle()
          if (responsibleData) {
            responsible = [{ id: String(responsibleData.id), name: responsibleData.name }]
          }
        } catch (e) {
          console.warn('[getById] Could not fetch responsible:', e)
        }
      }
      if (responsible.length === 0 && route.responsible) {
        responsible = [{ id: '', name: route.responsible }]
      }

      return {
        ...route,
        status,
        delivery_status: deliveryStatus,
        route_type: routeType,
        route_area: routeArea,
        vehicle,
        drivers,
        helpers,
        responsible,
        destinations,
      }
    } catch (err) {
      console.error('[getById] Error:', err)
      return null
    }
  },

  // Create route
  async create(dto: CreateRouteDTO): Promise<TrxRoute> {
    const isTest = getEnvironment() !== 'production'

    const insertData: any = {
      ...dto,
      is_test: isTest,
      is_active: true
    }

    const { data, error } = await supabase
      .from('trx_route')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      throw new Error(error.message || JSON.stringify(error))
    }

    if (data) {
      try {
        await supabase
          .from('trx_route_history')
          .insert({
            id_route: data.id,
            id_history_type: 2,
            event_at: data.created_at || new Date().toISOString(),
            description: `Rota ${data.route_code} criada no sistema`,
            is_test: isTest,
          })
      } catch (historyError) {
        console.error('[routeService.create] Error creating history entry:', historyError)
      }
    }

    return data
  },

  // Update route
  async update(id: string, dto: UpdateRouteDTO): Promise<TrxRoute> {
    const isTest = getEnvironment() !== 'production'

    const { data: currentRoute } = await supabase
      .from('trx_route')
      .select('*')
      .eq('id', id)
      .single()

    const filteredDTO = { ...dto }
    READONLY_ROUTE_FIELDS.forEach(field => {
      delete (filteredDTO as any)[field]
    })

    console.log('[routeService.update] DTO to save:', JSON.stringify(filteredDTO, null, 2))

    const { data, error } = await supabase
      .from('trx_route')
      .update({
        ...filteredDTO,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('is_test', isTest)
      .select()
      .single()

    if (error) throw new Error(error.message)

    if (data && dto.id_route_status && currentRoute && currentRoute.id_route_status !== dto.id_route_status) {
      try {
        const { data: statusData } = await supabase
          .from('ref_route_status')
          .select('name')
          .eq('id', dto.id_route_status)
          .single()

        const statusName = statusData?.name || 'Status atualizado'

        await supabase
          .from('trx_route_history')
          .insert({
            id_route: id,
            id_history_type: 3,
            event_at: new Date().toISOString(),
            description: `Status alterado para: ${statusName}`,
            is_test: isTest,
          })
      } catch (historyError) {
        console.error('[routeService.update] Error creating history entry:', historyError)
      }
    }

    return data
  },

  // Check if route code already exists (for validation)
  async checkRouteCodeExists(routeCode: string, excludeId?: string): Promise<boolean> {
    if (!routeCode) return false

    const isTest = getEnvironment() !== 'production'
    const normalizedCode = routeCode.trim()

    let query = supabase
      .from('trx_route')
      .select('id, route_code')
      .eq('is_active', true)
      .eq('is_test', isTest)
      .or(`route_code.eq.${normalizedCode},route_code.eq.${parseInt(normalizedCode, 10) || 0}`)

    const { data: routes, error } = await query

    if (error) {
      console.error('[checkRouteCodeExists] Error:', error)
      return false
    }

    const otherRoutes = routes?.filter(r => r.id !== excludeId) || []
    return otherRoutes.length > 0
  },

  // Delete (soft) route
  async delete(id: string): Promise<void> {
    const isTest = getEnvironment() !== 'production'

    const { error } = await supabase
      .from('trx_route')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('is_test', isTest)

    if (error) throw new Error(error.message)
  },

  // Get reference data for dropdowns
  async getReferenceData() {
    const isTest = getEnvironment() !== 'production'

    const [statuses, deliveryStatuses, routeTypes, routeAreas, vehicles] = await Promise.all([
      supabase.from('ref_route_status').select('*').eq('is_active', true).order('name'),
      supabase.from('ref_route_delivery_status').select('*').eq('is_active', true).order('name'),
      supabase.from('ref_route_type').select('*').eq('is_active', true).order('description'),
      supabase.from('master_route_area').select('*').eq('is_test', isTest).eq('is_active', true).order('description'),
      supabase.from('master_fleet_vehicle').select('*').eq('is_test', isTest).eq('is_active', true).order('plate'),
    ])

    console.log('[routeService.getReferenceData] statuses:', statuses.data)
    console.log('[routeService.getReferenceData] deliveryStatuses:', deliveryStatuses.data)

    return {
      statuses: statuses.data || [],
      deliveryStatuses: deliveryStatuses.data || [],
      routeTypes: routeTypes.data || [],
      routeAreas: routeAreas.data || [],
      vehicles: vehicles.data || [],
    }
  },

  async getDrivers(): Promise<MasterPersonDriver[]> {
    const isTest = getEnvironment() !== 'production'

    const { data, error } = await supabase
      .from('master_person_driver')
      .select('*')
      .eq('is_test', isTest)
      .eq('is_active', true)
      .order('name')

    if (error) throw new Error(error.message)
    return data || []
  },

  async getHelpers(): Promise<MasterPersonHelper[]> {
    const isTest = getEnvironment() !== 'production'

    const { data, error } = await supabase
      .from('master_person_helper')
      .select('*')
      .eq('is_test', isTest)
      .eq('is_active', true)
      .order('name')

    if (error) throw new Error(error.message)
    return data || []
  },

  async getResponsibles(): Promise<MasterPersonResponsible[]> {
    const isTest = getEnvironment() !== 'production'

    const { data, error } = await supabase
      .from('master_person_responsible')
      .select('*')
      .eq('is_test', isTest)
      .eq('is_active', true)
      .order('name')

    if (error) throw new Error(error.message)
    return data || []
  },

  async getCompanies(): Promise<{ id: string; trade_name: string }[]> {
    const isTest = getEnvironment() !== 'production'

    const { data, error } = await supabase
      .from('master_person_company')
      .select('id, trade_name')
      .eq('is_test', isTest)
      .eq('is_active', true)
      .order('trade_name')

    if (error) throw new Error(error.message)
    return data || []
  },

  // Assign driver to route
  async assignDriver(routeId: string, driverId: string): Promise<void> {
    const isTest = getEnvironment() !== 'production'

    const { error } = await supabase
      .from('rel_route_driver')
      .insert({
        id_route: routeId,
        id_driver: driverId,
        is_test: isTest,
        is_active: true,
      })

    if (error) throw new Error(error.message)
  },

  // Remove driver from route
  async removeDriver(routeId: string, driverId: string): Promise<void> {
    const isTest = getEnvironment() !== 'production'

    const { error } = await supabase
      .from('rel_route_driver')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id_route', routeId)
      .eq('id_driver', driverId)
      .eq('is_test', isTest)

    if (error) throw new Error(error.message)
  },

  // Get route history/timeline
  async getHistory(routeId: string): Promise<RouteHistoryItem[]> {
    const isTest = getEnvironment() !== 'production'

    try {
      const { data: route, error: routeError } = await supabase
        .from('trx_route')
        .select('*')
        .eq('id', routeId)
        .eq('is_test', isTest)
        .single()

      if (routeError || !route) {
        return []
      }

      let statusName = ''
      let deliveryStatusName = ''

      if (route.id_route_status) {
        const { data: statusData } = await supabase
          .from('ref_route_status')
          .select('name')
          .eq('id', route.id_route_status)
          .single()
        statusName = statusData?.name || ''
      }

      if (route.id_route_delivery_status) {
        const { data: deliveryStatusData } = await supabase
          .from('ref_route_delivery_status')
          .select('name')
          .eq('id', route.id_route_delivery_status)
          .single()
        deliveryStatusName = deliveryStatusData?.name || ''
      }

      const history: RouteHistoryItem[] = []

      if (route.created_at) {
        history.push({
          id: `${routeId}-created`,
          event_type: 'CREATED',
          event_label: 'Rota Criada',
          event_description: `A rota ${route.route_code} foi criada no sistema`,
          event_at: route.created_at,
          metadata: null,
        })
      }

      if (route.updated_at && route.updated_at !== route.created_at) {
        history.push({
          id: `${routeId}-status-${route.id_route_status}`,
          event_type: 'STATUS_CHANGE',
          event_label: statusName || 'Status Atualizado',
          event_description: `Status da rota alterado para: ${statusName}`,
          event_at: route.updated_at,
          metadata: { status: route.id_route_status },
        })
      }

      if (route.updated_at) {
        history.push({
          id: `${routeId}-delivery-${route.id_route_delivery_status}`,
          event_type: 'DELIVERY_STATUS',
          event_label: deliveryStatusName || 'Status de Entrega',
          event_description: `Status de entrega: ${deliveryStatusName}`,
          event_at: route.updated_at,
          metadata: { delivery_status: route.id_route_delivery_status },
        })
      }

      if (route.starts_at) {
        history.push({
          id: `${routeId}-started`,
          event_type: 'ROUTE_STARTED',
          event_label: 'Rota Iniciada',
          event_description: 'A rota foi iniciada para distribuição',
          event_at: route.starts_at,
          metadata: null,
        })
      }

      if (route.ends_at) {
        history.push({
          id: `${routeId}-ended`,
          event_type: 'ROUTE_ENDED',
          event_label: 'Rota Finalizada',
          event_description: 'A rota foi finalizada',
          event_at: route.ends_at,
          metadata: null,
        })
      }

      history.sort((a, b) => new Date(a.event_at).getTime() - new Date(b.event_at).getTime())

      return history
    } catch (err) {
      console.error('[routeService.getHistory] Error:', err)
      return []
    }
  },
}

// History item type
export interface RouteHistoryItem {
  id: string
  event_type: string
  event_label: string
  event_description: string
  event_at: string
  metadata: Record<string, any> | null
}