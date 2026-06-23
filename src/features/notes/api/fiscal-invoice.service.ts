// Feature Notes (Fiscal Invoice) - API Service
import { supabase, getEnvironment } from '../../../lib/supabase'

export interface InvoiceListItem {
  id: string
  invoice_number: string
  serie?: string
  tripNumber?: string
  value: number
  weight: number
  gross_weight?: number
  volume: number
  attempt_number?: number
  issue_date?: string
  status?: string
  status_description?: string
  route_number?: string
  route_code?: string
  supplier_name?: string
  destination_name?: string
  vehicle_plate?: string
  driver_name?: string
  delivery_status?: string
  delivery_status_description?: string
  is_active: boolean
  id_customer_company?: number
  id_supplier_company?: number
  // Campos de status da nota fiscal
  canhoto?: string
  canhoto_status?: string
  nfd_status?: string
  nfd_status_description?: string
  motivo?: string
  motivo_id?: string
  // Campos de arquivo
  receipt_image_path?: string | null
  nfd_image_path?: string | null
}

export interface CreateInvoiceFormData {
  invoice_number: string
  box_quantity?: number
  id_customer_company?: number | null
  id_supplier_company?: number | null
  attempt_number?: number
  net_weight?: number
  gross_weight?: number
  invoice_amount?: number
}

type CompanyRow = {
  id: number | string
  trade_name: string | null
  legal_name: string | null
}

const INVOICE_SELECT_WITH_IMPORT = `
  *,
  fiscal_invoice_import:trx_fiscal_invoice_import!fk_trx_fiscal_invoice_import (
    id,
    trip_number,
    bellog_arrival_date,
    id_supplier_company
  )
`

const getFiscalInvoiceImport = (invoice: any) => {
  const fiscalInvoiceImport = invoice?.fiscal_invoice_import
  if (Array.isArray(fiscalInvoiceImport)) return fiscalInvoiceImport[0] ?? null
  return fiscalInvoiceImport ?? null
}

const getTripNumber = (invoice: any, importMap?: Map<number, string>): string => {
  const embeddedTripNumber = getFiscalInvoiceImport(invoice)?.trip_number
  if (typeof embeddedTripNumber === 'string' && embeddedTripNumber.trim() !== '') {
    return embeddedTripNumber
  }

  const importId = invoice?.id_fiscal_invoice_import
  if (importId == null || !importMap) return '-'
  return importMap.get(Number(importId)) ?? '-'
}

const loadInvoiceImportTripNumbers = async (invoices: any[]): Promise<Map<number, string>> => {
  const importIds = [
    ...new Set(
      invoices
        .map((invoice) => invoice.id_fiscal_invoice_import)
        .filter((id): id is number => id !== null && id !== undefined)
    ),
  ]

  if (importIds.length === 0) return new Map()

  const { data } = await supabase
    .from('trx_fiscal_invoice_import')
    .select('id, trip_number')
    .in('id', importIds)

  return new Map((data || []).map((item) => [item.id, item.trip_number]))
}

export const fiscalInvoiceService = {
  async list(params?: {
    search?: string
    isActive?: boolean
    showInactive?: boolean
    showCancelled?: boolean
    page?: number
    limit?: number
    startDate?: string
    endDate?: string
    minWeight?: number
    maxWeight?: number
    destinationIds?: string[]
    supplierGroupIds?: string[]
    supplierIds?: string[]
    onlyWithRoute?: boolean
    // Filtros avançados da tela Notas
    invoiceNumberStart?: number
    invoiceNumberEnd?: number
    tripNumber?: string
    attemptMin?: number
    attemptMax?: number
    boxMin?: number
    boxMax?: number
    grossWeightMin?: number
    grossWeightMax?: number
  }): Promise<{ data: InvoiceListItem[]; total: number }> {
    const isTest = getEnvironment() !== 'production'
    const page = params?.page || 1
    const limit = params?.limit || 20

    const start = (page - 1) * limit
    const end = start + limit - 1

    let invoiceIdsWithRoute: number[] = []
    if (params?.onlyWithRoute) {
      try {
        const { data: routeInvoicesTest } = await supabase
          .from('rel_route_invoice')
          .select('id_fiscal_invoice')
          .eq('is_active', true)
          .eq('is_test', isTest)

        if (routeInvoicesTest && routeInvoicesTest.length > 0) {
          invoiceIdsWithRoute = routeInvoicesTest.map(r => r.id_fiscal_invoice)
        }
      } catch (e) {
        console.log('[fiscalInvoiceService.list] rel_route_invoice exception:', e)
      }
    }

    let matchingImportIds: number[] = []
    if (params?.search) {
      const { data: matchingImports } = await supabase
        .from('trx_fiscal_invoice_import')
        .select('id')
        .ilike('trip_number', `%${params.search}%`)
        .eq('is_test', isTest)

      matchingImportIds = (matchingImports || []).map((item) => item.id)
    }

    // Nº Viagem — busca o import_id correspondente ao trip_number exato
    let tripImportIds: number[] = []
    if (params?.tripNumber) {
      const { data: tripImports } = await supabase
        .from('trx_fiscal_invoice_import')
        .select('id')
        .eq('trip_number', params.tripNumber)
        .eq('is_test', isTest)
      if (!tripImports || tripImports.length === 0) return { data: [], total: 0 }
      tripImportIds = tripImports.map(i => i.id)
    }

    // Nº Tentativa — carrega MAX(attempt_number) por nota para filtrar corretamente
    let attemptInvoiceIds: string[] | null = null
    if (params?.attemptMin != null || params?.attemptMax != null) {
      const { data: allAttemptRows } = await supabase
        .from('rel_route_invoice')
        .select('id_fiscal_invoice, attempt_number')
        .eq('is_test', isTest)
      const maxMap = new Map<string, number>()
      for (const row of allAttemptRows || []) {
        const id = String(row.id_fiscal_invoice)
        maxMap.set(id, Math.max(maxMap.get(id) ?? 0, row.attempt_number ?? 0))
      }
      attemptInvoiceIds = [...maxMap.entries()]
        .filter(([, max]) => {
          if (params.attemptMin != null && max < params.attemptMin) return false
          if (params.attemptMax != null && max > params.attemptMax) return false
          return true
        })
        .map(([id]) => id)
      if (attemptInvoiceIds.length === 0) return { data: [], total: 0 }
    }

    let supplierCompanyIds: string[] = []
    if (params?.supplierGroupIds && params.supplierGroupIds.length > 0) {
      const supplierGroupIds = params.supplierGroupIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id))

      if (supplierGroupIds.length === 0) {
        return { data: [], total: 0 }
      }

      const { data: supplierRoleType, error: supplierRoleTypeError } = await supabase
        .from('ref_person_company_role_type')
        .select('id')
        .eq('code', 'SUPPLIER')
        .maybeSingle()

      if (supplierRoleTypeError) throw new Error(supplierRoleTypeError.message)
      if (!supplierRoleType) {
        return { data: [], total: 0 }
      }

      const { data: supplierRoleRelations, error: supplierRoleRelationsError } = await supabase
        .from('rel_person_company_role_type')
        .select('id_company')
        .eq('id_company_role_type', supplierRoleType.id)
        .eq('is_test', isTest)

      if (supplierRoleRelationsError) throw new Error(supplierRoleRelationsError.message)

      const roleSupplierIds = (supplierRoleRelations || []).map((relation) => relation.id_company)
      if (roleSupplierIds.length === 0) {
        return { data: [], total: 0 }
      }

      const { data: suppliersByGroup, error: suppliersByGroupError } = await supabase
        .from('master_person_company')
        .select('id')
        .in('id', roleSupplierIds)
        .in('id_company_group', supplierGroupIds)
        .eq('is_test', isTest)
        .eq('is_active', true)

      if (suppliersByGroupError) throw new Error(suppliersByGroupError.message)

      supplierCompanyIds = (suppliersByGroup || []).map((company) => String(company.id))
      if (supplierCompanyIds.length === 0) {
        return { data: [], total: 0 }
      }
    }

    const buildQuery = (select: string) => {
      let query = supabase
        .from('trx_fiscal_invoice')
        .select(select, { count: 'exact' })
        .eq('is_test', isTest)

      // Mostra inativos apenas quando explicitamente solicitado
      if (!params?.showInactive) {
        query = query.eq('is_active', true)
      }

      if (params?.onlyWithRoute && invoiceIdsWithRoute.length > 0) {
        query = query.in('id', invoiceIdsWithRoute)
      }

      if (params?.search) {
        const importFilter = matchingImportIds.length > 0
          ? `,id_fiscal_invoice_import.in.(${matchingImportIds.join(',')})`
          : ''
        query = query.or(`invoice_number.ilike.%${params.search}%,invoice_series.ilike.%${params.search}%${importFilter}`)
      }

      if (params?.startDate) {
        query = query.gte('invoice_issue_date', params.startDate)
      }
      if (params?.endDate) {
        query = query.lte('invoice_issue_date', params.endDate)
      }
      if (params?.destinationIds && params.destinationIds.length > 0) {
        query = query.in('id_customer_company', params.destinationIds)
      }
      if (supplierCompanyIds.length > 0) {
        query = query.in('id_supplier_company', supplierCompanyIds)
      }

      // Filtros avançados da tela Notas
      if (params?.invoiceNumberStart != null) {
        query = query.gte('invoice_number', String(params.invoiceNumberStart))
      }
      if (params?.invoiceNumberEnd != null) {
        query = query.lte('invoice_number', String(params.invoiceNumberEnd))
      }
      if (params?.supplierIds && params.supplierIds.length > 0) {
        query = query.in('id_supplier_company', params.supplierIds)
      }
      if (tripImportIds.length > 0) {
        query = query.in('id_fiscal_invoice_import', tripImportIds)
      }
      if (attemptInvoiceIds !== null && attemptInvoiceIds.length > 0) {
        query = query.in('id', attemptInvoiceIds)
      }
      if (params?.boxMin != null) {
        query = query.gte('box_quantity', params.boxMin)
      }
      if (params?.boxMax != null) {
        query = query.lte('box_quantity', params.boxMax)
      }
      if (params?.grossWeightMin != null) {
        query = query.gte('gross_weight', params.grossWeightMin)
      }
      if (params?.grossWeightMax != null) {
        query = query.lte('gross_weight', params.grossWeightMax)
      }

      return query.range(start, end)
    }

    let { data: invoices, error: invoiceError, count } = await buildQuery(INVOICE_SELECT_WITH_IMPORT)
    if (invoiceError) {
      console.warn('[fiscalInvoiceService.list] fiscal invoice import embed failed, falling back to direct lookup:', invoiceError.message)
      const fallbackResponse = await buildQuery('*')
      invoices = fallbackResponse.data
      invoiceError = fallbackResponse.error
      count = fallbackResponse.count
    }

    if (invoiceError) throw new Error(invoiceError.message)

    if (!invoices || invoices.length === 0) {
      return { data: [], total: count || 0 }
    }

    const invoiceIds = invoices.map(i => i.id)
    const importTripNumberMap = await loadInvoiceImportTripNumbers(invoices)

    // FIX: Use string keys since IDs are UUIDs, not numbers
    let invoiceRouteMap = new Map<string, any>()
    let maxAttemptMap = new Map<string, number>()
    try {
      const { data: routeRelations } = await supabase
        .from('rel_route_invoice')
        .select('id_fiscal_invoice, id_route, attempt_number')
        .in('id_fiscal_invoice', invoiceIds)
        .eq('is_active', true)
        .eq('is_test', isTest)

      if (routeRelations && routeRelations.length > 0) {
        const routeIds = routeRelations.map(r => r.id_route)

        // Buscar rotas com veículo, motorista e status de entrega
        const { data: routes } = await supabase
          .from('trx_route')
          .select('id, route_code, id_vehicle, id_driver, id_route_delivery_status')
          .in('id', routeIds)

        // Buscar veículos
        const vehicleIds = [...new Set(routes?.map(r => r.id_vehicle).filter(Boolean) || [])]
        const { data: vehicles } = vehicleIds.length > 0
          ? await supabase.from('master_fleet_vehicle').select('id, plate').in('id', vehicleIds)
          : { data: [] }

        // Buscar motoristas
        const driverIds = [...new Set(routes?.map(r => r.id_driver).filter(Boolean) || [])]
        const { data: drivers } = driverIds.length > 0
          ? await supabase.from('master_person_driver').select('id, name').in('id', driverIds)
          : { data: [] }

        // Buscar status de entrega
        const deliveryStatusIds = [...new Set(routes?.map(r => r.id_route_delivery_status).filter(Boolean) || [])]
        const { data: deliveryStatuses } = deliveryStatusIds.length > 0
          ? await supabase.from('ref_route_delivery_status').select('id, name').in('id', deliveryStatusIds)
          : { data: [] }

        // Buscar motivos das entregas das notas
        const { data: deliveries } = await supabase
          .from('trx_route_invoice_delivery')
          .select('id_fiscal_invoice, id_reason')
          .in('id_route', routeIds)
          .eq('is_active', true)

        // Buscar nomes dos motivos
        const reasonIds = [...new Set(deliveries?.map(d => d.id_reason).filter(Boolean) || [])]
        const { data: reasons } = reasonIds.length > 0
          ? await supabase.from('ref_delivery_reason').select('id, name').in('id', reasonIds)
          : { data: [] }

        const vehicleMap = new Map(vehicles?.map(v => [v.id, v.plate]) || [])
        const driverMap = new Map(drivers?.map(d => [d.id, d.name]) || [])
        const deliveryStatusMap = new Map(deliveryStatuses?.map(s => [s.id, s.name]) || [])
        const reasonMap = new Map(reasons?.map(r => [r.id, r.name]) || [])

        // Criar mapa de rota por ID
        const routeMap = new Map()
        if (routes) {
          for (const r of routes) {
            routeMap.set(r.id, {
              route_code: r.route_code || '',
              vehicle_plate: vehicleMap.get(r.id_vehicle) || '',
              driver_name: driverMap.get(r.id_driver) || '',
              delivery_status: deliveryStatusMap.get(r.id_route_delivery_status) || ''
            })
          }
        }

        // Criar mapa de motivo por nota fiscal
        // FIX: Use string keys since id_fiscal_invoice is UUID string
        const deliveryReasonMap = new Map<string, string>()
        deliveries?.forEach(d => {
          if (!deliveryReasonMap.has(d.id_fiscal_invoice)) {
            deliveryReasonMap.set(d.id_fiscal_invoice, reasonMap.get(d.id_reason) || '')
          }
        })

        for (const rel of routeRelations) {
          const routeInfo = routeMap.get(rel.id_route) || { route_code: '', vehicle_plate: '', driver_name: '', delivery_status: '' }
          invoiceRouteMap.set(rel.id_fiscal_invoice, {
            route_id: String(rel.id_route),
            route_code: routeInfo.route_code,
            vehicle_plate: routeInfo.vehicle_plate,
            driver_name: routeInfo.driver_name,
            delivery_status: routeInfo.delivery_status,
            motivo: deliveryReasonMap.get(rel.id_fiscal_invoice) || '',
            attempt_number: rel.attempt_number || 0,
          })
        }
      }
    } catch (e) {
      console.log('[fiscalInvoiceService.list] rel_route_invoice error:', e)
    }

    // MAX attempt_number across ALL rel_route_invoice rows (including released records)
    // so the Notes table shows the true highest attempt, not 0 for released notes.
    try {
      const { data: allAttempts } = await supabase
        .from('rel_route_invoice')
        .select('id_fiscal_invoice, attempt_number')
        .in('id_fiscal_invoice', invoiceIds)
        .eq('is_test', isTest)
      for (const row of allAttempts || []) {
        const cur = maxAttemptMap.get(row.id_fiscal_invoice) ?? 0
        if ((row.attempt_number ?? 0) > cur) maxAttemptMap.set(row.id_fiscal_invoice, row.attempt_number ?? 0)
      }
    } catch (_e) {
      // non-critical — falls back to invoiceRouteMap value
    }

    // FIX: IDs are UUIDs (strings), not numbers. Remove type guard that filters all UUIDs
    const supplierIds = [...new Set(invoices.map((i) => i.id_supplier_company).filter((id): id is string => id !== null && id !== undefined))]
    const destIds = [...new Set(invoices.map((i) => i.id_customer_company).filter((id): id is string => id !== null && id !== undefined))]

    let suppliers: CompanyRow[] = []
    if (supplierIds.length > 0) {
      const { data } = await supabase.from('master_person_company').select('id, trade_name, legal_name').in('id', supplierIds)
      suppliers = data || []
    }

    let destinations: CompanyRow[] = []
    if (destIds.length > 0) {
      const { data } = await supabase.from('master_person_company').select('id, trade_name, legal_name').in('id', destIds)
      destinations = data || []
    }

    // FIX: Use string keys (UUIDs) for maps, not String conversion
    const supplierMap = new Map<string, string>(suppliers.map((company) => [company.id, company.trade_name ?? company.legal_name ?? '-']))
    const destinationMap = new Map<string, string>(destinations.map((company) => [company.id, company.trade_name ?? company.legal_name ?? '-']))

    const result: InvoiceListItem[] = invoices.map((invoice) => ({
      id: String(invoice.id),
      invoice_number: invoice.invoice_number || '',
      serie: invoice.invoice_series || '',
      tripNumber: getTripNumber(invoice, importTripNumberMap),
      value: Number(invoice.invoice_amount) || 0,
      weight: Number(invoice.net_weight) || Number(invoice.gross_weight) || 0,
      gross_weight: Number(invoice.gross_weight) || 0,
      volume: invoice.box_quantity || 0,
      issue_date: invoice.invoice_issue_date || '',
      status: String(invoice.id_fiscal_invoice_status ?? ''),
      status_description: '',
      supplier_name: invoice.id_supplier_company ? (supplierMap.get(invoice.id_supplier_company) ?? '-') : '-',
      destination_name: invoice.id_customer_company ? (destinationMap.get(invoice.id_customer_company) ?? '-') : '-',
      is_active: invoice.is_active ?? true,
      attempt_number: maxAttemptMap.get(invoice.id) ?? invoiceRouteMap.get(invoice.id)?.attempt_number ?? 0,
      route_number: invoiceRouteMap.get(invoice.id)?.route_id || '',
      route_code: invoiceRouteMap.get(invoice.id)?.route_code || '',
      vehicle_plate: invoiceRouteMap.get(invoice.id)?.vehicle_plate || '',
      driver_name: invoiceRouteMap.get(invoice.id)?.driver_name || '',
      delivery_status_description: invoiceRouteMap.get(invoice.id)?.delivery_status || '',
      motivo: invoiceRouteMap.get(invoice.id)?.motivo || '',
      id_customer_company: invoice.id_customer_company || 0,
      id_supplier_company: invoice.id_supplier_company || 0,
    }))

    return { data: result, total: count || 0 }
  },

  async getById(id: string): Promise<InvoiceListItem | null> {
    const isTest = getEnvironment() !== 'production'

    let { data, error } = await supabase
      .from('trx_fiscal_invoice')
      .select(INVOICE_SELECT_WITH_IMPORT)
      .eq('id', id)
      .eq('is_test', isTest)
      .single()

    if (error) {
      const fallbackResponse = await supabase
        .from('trx_fiscal_invoice')
        .select('*')
        .eq('id', id)
        .eq('is_test', isTest)
        .single()

      data = fallbackResponse.data
      error = fallbackResponse.error
    }

    if (error || !data) return null
    const importTripNumberMap = await loadInvoiceImportTripNumbers([data])

    let supplierName = '-'
    let destName = '-'

    if (data.id_supplier_company != null) {
      const { data: supplier } = await supabase
        .from('master_person_company')
        .select('trade_name, legal_name')
        .eq('id', data.id_supplier_company)
        .single()

      if (supplier) {
        supplierName = supplier.trade_name ?? supplier.legal_name ?? '-'
      }
    }

    if (data.id_customer_company != null) {
      const { data: dest } = await supabase
        .from('master_person_company')
        .select('trade_name, legal_name')
        .eq('id', data.id_customer_company)
        .single()

      if (dest) {
        destName = dest.trade_name ?? dest.legal_name ?? '-'
      }
    }

    let attemptNumber = 0
    try {
      const { data: routeInvoices } = await supabase
        .from('rel_route_invoice')
        .select('attempt_number')
        .eq('id_fiscal_invoice', id)
        .eq('is_test', isTest)
        .order('attempt_number', { ascending: false })
        .limit(1)
      if (routeInvoices && routeInvoices.length > 0) {
        attemptNumber = routeInvoices[0].attempt_number || 0
      }
    } catch (e) {
      console.warn('[getById] Could not fetch attempt_number:', e)
    }

    return {
      id: String(data.id),
      invoice_number: data.invoice_number || '',
      serie: data.invoice_series || '',
      tripNumber: getTripNumber(data, importTripNumberMap),
      value: Number(data.invoice_amount) || 0,
      weight: Number(data.net_weight) || Number(data.gross_weight) || 0,
      gross_weight: Number(data.gross_weight) || 0,
      volume: data.box_quantity || 0,
      supplier_name: supplierName,
      destination_name: destName,
      is_active: data.is_active ?? true,
      attempt_number: attemptNumber,
      id_customer_company: data.id_customer_company || 0,
      id_supplier_company: data.id_supplier_company || 0,
    }
  },

  async createFromForm(data: CreateInvoiceFormData): Promise<void> {
    const isTest = getEnvironment() !== 'production'

    const { error } = await supabase
      .from('trx_fiscal_invoice')
      .insert({
        invoice_number: data.invoice_number,
        box_quantity: data.box_quantity,
        id_customer_company: data.id_customer_company ? String(data.id_customer_company) : null,
        id_supplier_company: data.id_supplier_company ? String(data.id_supplier_company) : null,
        net_weight: data.net_weight,
        gross_weight: data.gross_weight || data.net_weight,
        invoice_amount: data.invoice_amount,
        is_test: isTest,
        is_active: true,
      })

    if (error) {
      throw new Error(error.message)
    }
  },

  async getByRouteId(routeId: string): Promise<InvoiceListItem[]> {
    const isTest = getEnvironment() !== 'production'

    // Get invoice IDs from route
    const { data: routeInvoices, error: routeError } = await supabase
      .from('rel_route_invoice')
      .select('id_fiscal_invoice, attempt_number')
      .eq('id_route', routeId)
      .eq('is_active', true)
      .eq('is_test', isTest)

    if (routeError) {
      console.error('[fiscalInvoiceService.getByRouteId] Error:', routeError)
      throw new Error(routeError.message)
    }

    if (!routeInvoices || routeInvoices.length === 0) {
      return []
    }

    const invoiceIds = routeInvoices.map(r => r.id_fiscal_invoice)
    const routeAttemptMap = new Map<string, number>(
      routeInvoices.map(r => [String(r.id_fiscal_invoice), r.attempt_number || 0])
    )

    // Get invoice details
    const { data: invoices, error: invoicesError } = await supabase
      .from('trx_fiscal_invoice')
      .select('*')
      .in('id', invoiceIds)
      .eq('is_active', true)
      .eq('is_test', isTest)

    if (invoicesError) {
      console.error('[fiscalInvoiceService.getByRouteId] Error:', invoicesError)
      throw new Error(invoicesError.message)
    }

    if (!invoices || invoices.length === 0) {
      return []
    }

    // Get supplier and destination names
    const supplierIds = [...new Set(invoices.map((i) => i.id_supplier_company).filter((id): id is number => id !== null && id !== undefined))]
    const destIds = [...new Set(invoices.map((i) => i.id_customer_company).filter((id): id is number => id !== null && id !== undefined))]

    let suppliers: CompanyRow[] = []
    if (supplierIds.length > 0) {
      const { data } = await supabase.from('master_person_company').select('id, trade_name, legal_name').in('id', supplierIds)
      suppliers = data || []
    }

    let destinations: CompanyRow[] = []
    if (destIds.length > 0) {
      const { data } = await supabase.from('master_person_company').select('id, trade_name, legal_name').in('id', destIds)
      destinations = data || []
    }

    // Buscar entregas das notas fiscais na nova tabela
    console.log('[getByRouteId] routeId:', routeId)

    const { data: deliveries, error: deliveryError } = await supabase
      .from('trx_route_invoice_delivery')
      .select('*')
      .eq('id_route', routeId)
      .eq('is_active', true)
      .eq('is_test', isTest)

    console.log('[getByRouteId] deliveries:', deliveries, 'error:', deliveryError)

    // Buscar tipos de entrega (canhoto) - tabela ref_delivery_reason_type
    const deliveryTypeIds = [...new Set(deliveries?.map(d => d.id_delivery_type).filter(Boolean) || [])]
    console.log('[getByRouteId] deliveryTypeIds:', deliveryTypeIds)

    let deliveryTypes: { id: string; name: string }[] = []
    if (deliveryTypeIds.length > 0) {
      const { data } = await supabase.from('ref_delivery_reason_type').select('id, name').in('id', deliveryTypeIds)
      deliveryTypes = data || []
    }
    console.log('[getByRouteId] deliveryTypes:', deliveryTypes)
    const deliveryTypeMap = new Map(deliveryTypes.map(dt => [dt.id, dt.name]))

    // Buscar motivos - tabela ref_delivery_reason
    const reasonIds = [...new Set(deliveries?.map(d => d.id_reason).filter(Boolean) || [])]
    let reasons: { id: string; name: string }[] = []
    if (reasonIds.length > 0) {
      const { data } = await supabase.from('ref_delivery_reason').select('id, name').in('id', reasonIds)
      reasons = data || []
    }
    const reasonMap = new Map(reasons.map(r => [r.id, r.name]))

    // Criar mapa de entregas por id_fiscal_invoice
    const deliveryMap = new Map<string, any>()
    deliveries?.forEach(d => {
      const key = String(d.id_fiscal_invoice)
      if (!deliveryMap.has(key)) {
        deliveryMap.set(key, d)
      }
    })

    const supplierMap = new Map(suppliers.map((company) => [String(company.id), company.trade_name ?? company.legal_name ?? '-']))
    const destinationMap = new Map(destinations.map((company) => [String(company.id), company.trade_name ?? company.legal_name ?? '-']))

    const result: InvoiceListItem[] = invoices.map((invoice) => {
      const delivery = deliveryMap.get(String(invoice.id))

      return {
        id: String(invoice.id),
        invoice_number: invoice.invoice_number || '',
        serie: invoice.invoice_series || '',
        value: Number(invoice.invoice_amount) || 0,
        weight: Number(invoice.net_weight) || Number(invoice.gross_weight) || 0,
        gross_weight: Number(invoice.gross_weight) || 0,
        volume: Number(invoice.box_quantity) || 0,
        attempt_number: routeAttemptMap.get(String(invoice.id)) ?? 0,
        issue_date: invoice.invoice_issue_date || '',
        status: '',
        status_description: '',
        route_number: '',
        route_code: '',
        supplier_name: supplierMap.get(String(invoice.id_supplier_company)) ?? '-',
        destination_name: destinationMap.get(String(invoice.id_customer_company)) ?? '-',
        is_active: invoice.is_active ?? true,
        id_customer_company: invoice.id_customer_company || 0,
        id_supplier_company: invoice.id_supplier_company || 0,
        // Campos de status da nota fiscal vindos da tabela de entregas
        // Status: id_delivery_type
        status: delivery?.id_delivery_type ? (deliveryTypeMap.get(delivery.id_delivery_type) || '-') : 'Aguardando',
        status_description: delivery?.id_delivery_type || '',
        // Canhoto: receipt_image_path + id_delivery_type
        canhoto: (() => {
          if (delivery?.receipt_image_path) {
            const deliveryTypeName = delivery.id_delivery_type ? deliveryTypeMap.get(delivery.id_delivery_type) : ''
            if (deliveryTypeName?.toLowerCase().includes('total') || deliveryTypeName?.toLowerCase().includes('pendente')) {
              return 'Entregue'
            }
            return 'N/A'
          }
          if (delivery?.id_delivery_type) {
            const deliveryTypeName = deliveryTypeMap.get(delivery.id_delivery_type) || ''
            if (deliveryTypeName?.toLowerCase().includes('total') || deliveryTypeName?.toLowerCase().includes('pendente')) {
              return 'Pendente'
            }
            return '-'
          }
          return 'Aguardando'
        })(),
        canhoto_status: delivery?.id_delivery_type || '',
        // NFD: nfd_image_path + id_delivery_type
        nfd_status: (() => {
          if (delivery?.nfd_image_path) {
            const deliveryTypeName = delivery.id_delivery_type ? deliveryTypeMap.get(delivery.id_delivery_type) : ''
            if (deliveryTypeName?.toLowerCase().includes('pendente')) {
              return 'Entregue'
            }
            return 'N/A'
          }
          if (delivery?.id_delivery_type) {
            const deliveryTypeName = deliveryTypeMap.get(delivery.id_delivery_type) || ''
            if (deliveryTypeName?.toLowerCase().includes('pendente')) {
              return 'Pendente'
            }
            return '-'
          }
          return 'Aguardando'
        })(),
        nfd_status_description: delivery?.nfd_number || '',
        motivo: delivery?.id_reason ? (reasonMap.get(delivery.id_reason) || '-') : '-',
        motivo_id: delivery?.id_reason ? String(delivery.id_reason) : '',
        // Campos de arquivo
        receipt_image_path: delivery?.receipt_image_path || null,
        nfd_image_path: delivery?.nfd_image_path || null,
      }
    })

    return result
  },

  async update(id: string, data: {
    invoice_number?: string
    box_quantity?: number
    id_supplier_company?: number
    id_customer_company?: number
    invoice_amount?: number
    gross_weight?: number
    net_weight?: number
    attempt_number?: number
    id_route?: string
  }): Promise<void> {
    const isTest = getEnvironment() !== 'production'

    const { error } = await supabase
      .from('trx_fiscal_invoice')
      .update({ ...data, is_test: isTest })
      .eq('id', id)

    if (error) {
      throw new Error(error.message)
    }
  },
}
