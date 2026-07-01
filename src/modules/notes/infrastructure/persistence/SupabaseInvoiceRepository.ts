import { supabase, IS_TEST } from '../../../../lib/supabase'
import { IInvoiceRepository, FindInvoicesParams, FindResult } from '../../../domain/repositories/IInvoiceRepository'
import { InvoiceViewModel } from '../../../domain/entities/Invoice'
import { CreateInvoiceInput, UpdateInvoiceInput } from '../../schemas/invoice.validation'

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

function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

function sortObject(obj: Record<string, any>): Record<string, any> {
  return Object.keys(obj)
    .sort()
    .reduce((result, key) => {
      const value = obj[key]
      if (value !== undefined && value !== null) {
        result[key] = typeof value === 'object' && !Array.isArray(value) ? sortObject(value) : value
      }
      return result
    }, {} as Record<string, any>)
}

export class SupabaseInvoiceRepository implements IInvoiceRepository {
  private readonly isTest: boolean

  constructor() {
    this.isTest = IS_TEST
  }

  async findWithRelations(params: FindInvoicesParams): Promise<FindResult<InvoiceViewModel>> {
    const startTime = performance.now()
    const page = params.pagination.page
    const limit = params.pagination.limit
    const offset = (page - 1) * limit

    let matchingImportIds: number[] = []
    if (params.filters.search) {
      const { data: matchingImports } = await supabase
        .from('trx_fiscal_invoice_import')
        .select('id')
        .ilike('trip_number', `%${params.filters.search}%`)
        .eq('is_test', this.isTest)

      matchingImportIds = (matchingImports || []).map((item) => item.id)
    }

    let query = supabase
      .from('trx_fiscal_invoice')
      .select(INVOICE_SELECT_WITH_IMPORT, { count: 'exact' })
      .eq('is_test', this.isTest)

    if (!params.filters.includeCancelled) {
      query = query.eq('is_active', true)
    }

    if (params.filters.search) {
      const importFilter = matchingImportIds.length > 0
        ? `,id_fiscal_invoice_import.in.(${matchingImportIds.join(',')})`
        : ''
      query = query.or(`invoice_number.ilike.%${params.filters.search}%,invoice_series.ilike.%${params.filters.search}%${importFilter}`)
    }

    if (params.filters.status) {
      if (params.filters.status === 'CANCELLED') {
        query = query.eq('is_active', false)
      } else if (params.filters.status === 'PENDING') {
        query = query.eq('is_active', true)
      }
    }

    if (params.filters.dateFrom) {
      query = query.gte('invoice_issue_date', params.filters.dateFrom)
    }
    if (params.filters.dateTo) {
      query = query.lte('invoice_issue_date', params.filters.dateTo)
    }

    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false })

    const { data: invoices, error, count } = await query

    if (error) throw new Error(error.message)
    if (!invoices || invoices.length === 0) {
      return { data: [], total: count || 0, cached: false, queryTimeMs: performance.now() - startTime }
    }

    const invoiceIds = invoices.map(i => i.id)

    const invoiceRouteMap = await this.loadRouteRelations(invoiceIds)
    const supplierMap = await this.loadCompanies(
      invoices.map(i => i.id_supplier_company).filter(Boolean) as string[]
    )
    const destinationMap = await this.loadCompanies(
      invoices.map(i => i.id_customer_company).filter(Boolean) as string[]
    )

    const result: InvoiceViewModel[] = invoices.map(invoice => this.mapToViewModel(invoice, {
      route: invoiceRouteMap.get(invoice.id),
      supplier: supplierMap.get(invoice.id_supplier_company),
      destination: destinationMap.get(invoice.id_customer_company),
    }))

    return {
      data: result,
      total: count || 0,
      cached: false,
      queryTimeMs: performance.now() - startTime,
    }
  }

  async findById(id: string): Promise<InvoiceViewModel | null> {
    const { data, error } = await supabase
      .from('trx_fiscal_invoice')
      .select(INVOICE_SELECT_WITH_IMPORT)
      .eq('id', id)
      .eq('is_test', this.isTest)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw new Error(error.message)
    }

    const [routeData, supplierData, destinationData] = await Promise.all([
      this.loadRouteRelations([id]),
      data.id_supplier_company ? this.loadCompanies([data.id_supplier_company]) : Promise.resolve(new Map()),
      data.id_customer_company ? this.loadCompanies([data.id_customer_company]) : Promise.resolve(new Map()),
    ])

    return this.mapToViewModel(data, {
      route: routeData.get(id),
      supplier: supplierData.get(data.id_supplier_company),
      destination: destinationMap.get(data.id_customer_company),
    })
  }

  async create(data: CreateInvoiceInput): Promise<InvoiceViewModel> {
    const { data: created, error } = await supabase
      .from('trx_fiscal_invoice')
      .insert({
        invoice_number: data.invoice_number,
        invoice_series: data.serie,
        id_supplier_company: data.id_supplier_company,
        id_customer_company: data.id_customer_company,
        box_quantity: data.box_quantity,
        net_weight: data.net_weight,
        gross_weight: data.gross_weight,
        invoice_amount: data.invoice_amount,
        invoice_issue_date: data.invoice_issue_date,
        attempt_number: data.attempt_number ?? 0,
        is_test: this.isTest,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    return this.mapToViewModel(created, {})
  }

  async update(id: string, data: UpdateInvoiceInput): Promise<InvoiceViewModel> {
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (data.invoice_number !== undefined) updateData.invoice_number = data.invoice_number
    if (data.box_quantity !== undefined) updateData.box_quantity = data.box_quantity
    if (data.net_weight !== undefined) updateData.net_weight = data.net_weight
    if (data.gross_weight !== undefined) updateData.gross_weight = data.gross_weight
    if (data.attempt_number !== undefined) updateData.attempt_number = data.attempt_number

    const { data: updated, error } = await supabase
      .from('trx_fiscal_invoice')
      .update(updateData)
      .eq('id', id)
      .eq('is_test', this.isTest)
      .select()
      .single()

    if (error) throw new Error(error.message)

    return this.mapToViewModel(updated, {})
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('trx_fiscal_invoice')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('is_test', this.isTest)

    if (error) throw new Error(error.message)
  }

  async assignToRoute(invoiceId: string, routeId: string, assignedBy: string): Promise<void> {
    const { error } = await supabase
      .from('rel_route_invoice')
      .insert({
        id_fiscal_invoice: invoiceId,
        id_route: routeId,
        assigned_by: assignedBy,
        assigned_at: new Date().toISOString(),
        is_active: true,
        is_test: this.isTest,
      })

    if (error) throw new Error(error.message)
  }

  async unassignFromRoute(invoiceId: string, unassignedBy: string): Promise<void> {
    const { error } = await supabase
      .from('rel_route_invoice')
      .update({
        is_active: false,
        unassigned_by: unassignedBy,
        unassigned_at: new Date().toISOString(),
      })
      .eq('id_fiscal_invoice', invoiceId)
      .eq('is_active', true)
      .eq('is_test', this.isTest)

    if (error) throw new Error(error.message)
  }

  private async loadRouteRelations(invoiceIds: string[]): Promise<Map<string, any>> {
    if (invoiceIds.length === 0) return new Map()

    const { data: routeRelations } = await supabase
      .from('rel_route_invoice')
      .select('id_fiscal_invoice, id_route')
      .in('id_fiscal_invoice', invoiceIds)
      .eq('is_active', true)

    if (!routeRelations || routeRelations.length === 0) return new Map()

    const routeIds = [...new Set(routeRelations.map(r => r.id_route))]

    const [routes, deliveries] = await Promise.all([
      supabase.from('trx_route').select('id, route_code, id_vehicle, id_driver').in('id', routeIds),
      supabase.from('trx_route_invoice_delivery').select('id_fiscal_invoice, id_reason, receipt_image_path, nfd_image_path, nfd_number, delivered_at, id_delivery_type').in('id_fiscal_invoice', invoiceIds).eq('is_active', true),
    ])

    const vehicleIds = [...new Set(routes.data?.map(r => r.id_vehicle).filter(Boolean) || [])]
    const driverIds = [...new Set(routes.data?.map(r => r.id_driver).filter(Boolean) || [])]

    const [vehicles, drivers] = await Promise.all([
      vehicleIds.length > 0 ? supabase.from('master_fleet_vehicle').select('id, plate').in('id', vehicleIds) : { data: [] },
      driverIds.length > 0 ? supabase.from('master_person_driver').select('id, name').in('id', driverIds) : { data: [] },
    ])

    const vehicleMap = new Map(vehicles.data?.map(v => [v.id, v.plate]) || [])
    const driverMap = new Map(drivers.data?.map(d => [d.id, d.name]) || [])

    const deliveryMap = new Map<string, any>()
    deliveries.data?.forEach(d => {
      if (!deliveryMap.has(d.id_fiscal_invoice)) {
        deliveryMap.set(d.id_fiscal_invoice, d)
      }
    })

    const routeMap = new Map<string, any>()
    routes.data?.forEach(r => {
      routeMap.set(r.id, {
        route_id: r.id,
        route_code: r.route_code || '',
        vehicle_plate: vehicleMap.get(r.id_vehicle) || '',
        driver_name: driverMap.get(r.id_driver) || '',
      })
    })

    const result = new Map<string, any>()
    for (const rel of routeRelations) {
      const routeInfo = routeMap.get(rel.id_route)
      const delivery = deliveryMap.get(rel.id_fiscal_invoice)
      result.set(rel.id_fiscal_invoice, {
        ...routeInfo,
        delivery_id: delivery?.id,
        delivery_status: delivery?.id_delivery_type,
        delivery_reason: delivery?.id_reason,
        receipt_image_path: delivery?.receipt_image_path,
        nfd_image_path: delivery?.nfd_image_path,
        delivered_at: delivery?.delivered_at,
      })
    }

    return result
  }

  private async loadCompanies(companyIds: string[]): Promise<Map<string, any>> {
    if (companyIds.length === 0) return new Map()

    const { data: companies } = await supabase
      .from('master_person_company')
      .select('id, trade_name, legal_name, cnpj')
      .in('id', companyIds)

    return new Map(companies?.map(c => [c.id, {
      supplier_name: c.trade_name || c.legal_name || '-',
      supplier_cnpj: c.cnpj,
    }]) || [])
  }

  private mapToViewModel(invoice: any, related: { route?: any; supplier?: any; destination?: any }): InvoiceViewModel {
    const isActive = invoice.is_active ?? true
    const hasRoute = !!related.route?.route_id
    const hasDelivery = !!related.route?.delivery_id

    let computedStatus: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' = 'PENDING'
    if (!isActive) computedStatus = 'CANCELLED'
    else if (hasDelivery) computedStatus = 'DELIVERED'
    else if (hasRoute) computedStatus = 'IN_TRANSIT'

    return {
      id: String(invoice.id),
      invoice_number: invoice.invoice_number || '',
      invoice_series: invoice.invoice_series || null,
      tripNumber: getFiscalInvoiceImport(invoice)?.trip_number ?? '-',
      invoice_issue_date: invoice.invoice_issue_date || null,
      box_quantity: invoice.box_quantity || 0,
      gross_weight: invoice.gross_weight || 0,
      net_weight: invoice.net_weight || 0,
      invoice_amount: invoice.invoice_amount || 0,
      attempt_number: invoice.attempt_number || 0,
      is_active: isActive,
      created_at: invoice.created_at,
      updated_at: invoice.updated_at || null,

      supplier_id: invoice.id_supplier_company || null,
      supplier_trade_name: related.supplier?.supplier_name || null,
      supplier_legal_name: null,
      supplier_cnpj: related.supplier?.supplier_cnpj || null,

      destination_id: invoice.id_customer_company || null,
      destination_trade_name: related.destination?.destination_name || related.supplier?.supplier_name || null,
      destination_legal_name: null,
      destination_cnpj: related.destination?.destination_cnpj || null,

      route_id: related.route?.route_id || null,
      route_code: related.route?.route_code || null,
      departure_date: null,
      vehicle_plate: related.route?.vehicle_plate || null,
      driver_name: related.route?.driver_name || null,

      delivery_id: related.route?.delivery_id || null,
      delivery_status: related.route?.delivery_status || null,
      delivery_type: null,
      delivery_reason: related.route?.delivery_reason || null,
      receipt_image_path: related.route?.receipt_image_path || null,
      nfd_image_path: related.route?.nfd_image_path || null,
      nfd_number: related.route?.nfd_number || null,
      delivered_at: related.route?.delivered_at || null,

      invoice_status_id: null,
      invoice_status_code: null,
      invoice_status_description: null,

      has_route: hasRoute,
      can_edit: isActive && !hasRoute,
      computed_status: computedStatus,
    }
  }
}
