import { supabase, getEnvironment, TrxRoute, RefRouteStatus, RefRouteDeliveryStatus, RefRouteType, MasterRouteArea, MasterFleetVehicle, MasterPersonDriver, MasterPersonHelper, MasterPersonResponsible } from '../lib/supabase'

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
  status: string
  status_description: string
  delivery_status: string
  delivery_status_description: string
  vehicle_plate?: string
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
  assistant?: string
  ends_at?: string
}

export interface UpdateRouteDTO extends Partial<CreateRouteDTO> {
  id_status?: string
  id_delivery_status?: string
  id_vehicle?: string
  current_load?: number
  arrival_date?: string
  arrival_time?: string
}

// Fields that cannot be edited according to business rules
export const READONLY_ROUTE_FIELDS = ['id_route_area', 'route_code', 'departure_date']

// Route Service
export const routeService = {
  // List routes with pagination and filters
  async list(params?: {
    search?: string
    isActive?: boolean
    page?: number
    limit?: number
  }): Promise<{ data: RouteListItem[]; total: number }> {
    const { search, isActive, page = 1, limit = 20 } = params || {}
    const isTest = getEnvironment() !== 'production'

    // First, get the base routes
    let query = supabase
      .from('trx_route')
      .select('*', { count: 'exact' })
      .eq('is_test', isTest)

    if (isActive !== undefined) {
      query = query.eq('is_active', isActive)
    }

    if (search) {
      query = query.or(`route_code.ilike.%${search}%`)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to).order('created_at', { ascending: false })

    const { data: routes, error, count } = await query

    if (error) throw new Error(error.message)
    if (!routes || routes.length === 0) {
      return { data: [], total: count || 0 }
    }

    // Get related data for each route
    const routeIds = routes.map(r => r.id)
    const isTestFilter = isTest

    // Fetch status
    const statusIds = [...new Set(routes.map(r => r.id_route_status).filter(Boolean))]
    const { data: statuses } = await supabase
      .from('ref_route_status')
      .select('*')
      .in('id', statusIds)
      .eq('is_test', isTestFilter)

    // Fetch delivery statuses
    const deliveryStatusIds = [...new Set(routes.map(r => r.id_route_delivery_status).filter(Boolean))]
    const { data: deliveryStatuses } = await supabase
      .from('ref_route_delivery_status')
      .select('*')
      .in('id', deliveryStatusIds)
      .eq('is_test', isTestFilter)

    // Fetch vehicles
    const vehicleIds = [...new Set(routes.map(r => r.id_vehicle).filter(Boolean))]
    const { data: vehicles } = await supabase
      .from('master_fleet_vehicle')
      .select('*')
      .in('id', vehicleIds)
      .eq('is_test', isTestFilter)

    // Fetch drivers
    const driverIds = [...new Set(routes.map(r => r.id_driver).filter(Boolean))]
    const { data: drivers } = await supabase
      .from('master_person_driver')
      .select('id, name')
      .in('id', driverIds)
      .eq('is_test', isTestFilter)

    // Fetch route invoices for destinations
    const { data: routeInvoices } = await supabase
      .from('rel_route_invoice')
      .select('id_route, id_fiscal_invoice')
      .in('id_route', routeIds)
      .eq('is_test', isTestFilter)
      .eq('is_active', true)

    // Get invoice data for destinations
    const invoiceIds = [...new Set(routeInvoices?.map(ri => ri.id_fiscal_invoice).filter(Boolean) || [])]
    const { data: invoices } = await supabase
      .from('trx_fiscal_invoice')
      .select('id, id_customer_company')
      .in('id', invoiceIds)
      .eq('is_test', isTestFilter)

    // Get company names (destinations)
    const companyIds = [...new Set(invoices?.map(i => i.id_customer_company).filter(Boolean) || [])]
    const { data: companies } = await supabase
      .from('master_person_company')
      .select('id, trade_name')
      .in('id', companyIds)
      .eq('is_test', isTestFilter)

    // Build maps for quick lookup
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

    // Note: rel_route_driver, rel_route_responsible, rel_route_destination tables don't exist
    // Driver data is available via trx_route.id_driver field
    // Helper and responsible come from trx_route.assistant and trx_route.responsible

    // Build the result
    const result: RouteListItem[] = routes.map(route => {
      const status = statuses?.find(s => s.id === route.id_route_status)
      const deliveryStatus = deliveryStatuses?.find(ds => ds.id === route.id_route_delivery_status)
      const vehicle = vehicles?.find(v => v.id === route.id_vehicle)

      // Driver names come from trx_route.id_driver (already in route data)
      const driverNames: string[] = route.id_driver && driverMap.has(route.id_driver) ? [driverMap.get(route.id_driver)!] : []
      const responsibleNames: string[] = route.responsible ? [route.responsible] : []
      const destinationNames: string[] = routeInvoiceMap.get(route.id) || []

      return {
        id: route.id,
        route_code: route.route_code || '',
        area_description: route.area || '',
        departure_date: route.departure_date || '',
        departure_time: '',
        status: route.id_route_status || '',
        status_description: status?.description || '',
        delivery_status: route.id_route_delivery_status || '',
        delivery_status_description: deliveryStatus?.description || '',
        vehicle_plate: vehicle?.plate,
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

      // Get status (only if id_route_status exists and is valid)
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

      // Get delivery status (only if exists)
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

      // Get route type
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

      // Get route area
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

      // Get vehicle
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

      // Get driver directly from route (id_driver field)
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

      // Get destinations (notas vinculadas à rota) - return invoice data for edit form
      // Note: rel_route_invoice may not exist, handle gracefully
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

          // Get company names for each invoice
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

      // Helper and responsible from trx_route fields (assistant, responsible)
      const helpers = route.assistant ? [{ id: '', name: route.assistant }] : []
      const responsible = route.responsible ? [{ id: '', name: route.responsible }] : []

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

    console.log('[routeService.create] dto received:', dto)
    console.log('[routeService.create] id_route_status:', dto.id_route_status)
    console.log('[routeService.create] id_route_delivery_status:', dto.id_route_delivery_status)

    // Directly use the IDs received from frontend - no more description lookup
    const insertData: any = {
      ...dto,
      is_test: isTest,
      is_active: true
    }

    // Log the final insert data
    console.log('[routeService.create] insertData:', insertData)

    const { data, error } = await supabase
      .from('trx_route')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('[routeService.create] Full error object:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      })
      throw new Error(error.message || JSON.stringify(error))
    }
    return data
  },

  // Update route
  async update(id: string, dto: UpdateRouteDTO): Promise<TrxRoute> {
    const isTest = getEnvironment() !== 'production'

    // Remove readonly fields
    const filteredDTO = { ...dto }
    READONLY_ROUTE_FIELDS.forEach(field => {
      delete (filteredDTO as any)[field]
    })

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
    return data
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
    console.log('[getReferenceData] isTest:', isTest, 'environment:', getEnvironment())

    const [statuses, deliveryStatuses, routeTypes, routeAreas, vehicles] = await Promise.all([
      supabase.from('ref_route_status').select('*').eq('is_active', true).order('name'),
      supabase.from('ref_route_delivery_status').select('*').eq('is_active', true).order('name'),
      supabase.from('ref_route_type').select('*').eq('is_active', true).order('description'),
      supabase.from('master_route_area').select('*').eq('is_test', isTest).eq('is_active', true).order('description'),
      supabase.from('master_fleet_vehicle').select('*').eq('is_test', isTest).eq('is_active', true).order('plate'),
    ])

    console.log('[getReferenceData] statuses:', statuses.data)
    console.log('[getReferenceData] routeTypes:', routeTypes.data)
    console.log('[getReferenceData] routeTypes error:', routeTypes.error)

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

  // Similar methods for helpers and responsibles can be added
}