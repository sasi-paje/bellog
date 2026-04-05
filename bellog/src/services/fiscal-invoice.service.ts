import { supabase, getEnvironment } from '../lib/supabase'

export interface InvoiceListItem {
  id: string
  invoice_number: string
  serie?: string
  value: number
  weight: number
  volume: number
  issue_date?: string
  status?: string
  status_description?: string
  route_number?: string
  supplier_name?: string
  destination_name?: string
  is_active: boolean
}

export interface CreateInvoiceFormData {
  invoice_number: string
  quantity: number
  delivery_location: string
  supplier: string
  net_weight: number
  gross_weight: number
}

type CompanyRow = {
  id: number | string
  trade_name: string | null
  legal_name: string | null
}

export const fiscalInvoiceService = {
  async list(params?: {
    search?: string
    isActive?: boolean
    showCancelled?: boolean
    page?: number
    limit?: number
    startDate?: string
    endDate?: string
    minWeight?: number
    maxWeight?: number
    destinationIds?: string[]
  }): Promise<{ data: InvoiceListItem[]; total: number }> {
    const isTest = getEnvironment() !== 'production'
    const page = params?.page || 1
    const limit = params?.limit || 20

    console.log('[fiscalInvoiceService.list] isTest:', isTest)

    const start = (page - 1) * limit
    const end = start + limit - 1

    let query = supabase
      .from('trx_fiscal_invoice')
      .select('*', { count: 'exact' })
      .range(start, end)
      .eq('is_test', isTest)
      .eq('is_active', true)

    // Apply filters
    if (params?.search) {
      query = query.or(`invoice_number.ilike.%${params.search}%,serie.ilike.%${params.search}%`)
    }
    if (params?.startDate) {
      query = query.gte('issue_date', params.startDate)
    }
    if (params?.endDate) {
      query = query.lte('issue_date', params.endDate)
    }
    if (params?.minWeight) {
      query = query.gte('weight', params.minWeight)
    }
    if (params?.maxWeight) {
      query = query.lte('weight', params.maxWeight)
    }
    if (params?.destinationIds && params.destinationIds.length > 0) {
      query = query.in('id_customer_company', params.destinationIds)
    }

    const { data: invoices, error: invoiceError, count } = await query

    console.log('[fiscalInvoiceService.list] invoices:', {
      count: invoices?.length,
      error: invoiceError,
    })

    if (invoiceError) throw new Error(invoiceError.message)

    if (!invoices || invoices.length === 0) {
      return { data: [], total: count || 0 }
    }

    console.log(
      '[fiscalInvoiceService.list] sample invoice:',
      JSON.stringify(invoices[0], null, 2)
    )

    const supplierIds = [
      ...new Set(
        invoices
          .map((i) => i.id_supplier_company)
          .filter((id): id is number => id !== null && id !== undefined)
      ),
    ]

    const destIds = [
      ...new Set(
        invoices
          .map((i) => i.id_customer_company)
          .filter((id): id is number => id !== null && id !== undefined)
      ),
    ]

    console.log('[fiscalInvoiceService.list] supplierIds:', supplierIds)
    console.log('[fiscalInvoiceService.list] destIds:', destIds)

    let suppliers: CompanyRow[] = []
    if (supplierIds.length > 0) {
      const { data, error } = await supabase
        .from('master_person_company')
        .select('id, trade_name, legal_name')
        .in('id', supplierIds)

      console.log('[fiscalInvoiceService.list] suppliers response:', {
        count: data?.length,
        error,
      })

      if (error) throw new Error(error.message)
      suppliers = data || []
    }

    let destinations: CompanyRow[] = []
    if (destIds.length > 0) {
      const { data, error } = await supabase
        .from('master_person_company')
        .select('id, trade_name, legal_name')
        .in('id', destIds)

      console.log('[fiscalInvoiceService.list] destinations response:', {
        count: data?.length,
        error,
      })

      if (error) throw new Error(error.message)
      destinations = data || []
    }

    const supplierMap = new Map(
      suppliers.map((company) => [
        String(company.id),
        company.trade_name ?? company.legal_name ?? '-',
      ])
    )

    const destinationMap = new Map(
      destinations.map((company) => [
        String(company.id),
        company.trade_name ?? company.legal_name ?? '-',
      ])
    )

    const result: InvoiceListItem[] = invoices.map((invoice) => {
      const supplierName =
        supplierMap.get(String(invoice.id_supplier_company)) ?? '-'
      const destName =
        destinationMap.get(String(invoice.id_customer_company)) ?? '-'

      console.log('[fiscalInvoiceService.list] mapping:', {
        id: invoice.id,
        id_supplier_company: invoice.id_supplier_company,
        id_customer_company: invoice.id_customer_company,
        destId: String(invoice.id_customer_company),
        destName,
        destinationMapSize: destinationMap.size,
      })

      return {
        id: String(invoice.id),
        invoice_number: invoice.invoice_number || '',
        serie: invoice.invoice_series || '',
        value: Number(invoice.invoice_amount) || 0,
        weight: Number(invoice.gross_weight) || 0,
        volume: invoice.box_quantity || 0,
        issue_date: invoice.invoice_issue_date || '',
        status: String(invoice.id_fiscal_invoice_status ?? ''),
        status_description: '',
        supplier_name: supplierName,
        destination_name: destName,
        is_active: invoice.is_active ?? true,
      }
    })

    console.log('[fiscalInvoiceService.list] result:', result.length, 'items')
    return { data: result, total: count || 0 }
  },

  async listUnassigned(params?: { page?: number; limit?: number }): Promise<any> {
    return this.list(params)
  },

  async getById(id: string): Promise<InvoiceListItem | null> {
    const isTest = getEnvironment() !== 'production'

    const { data, error } = await supabase
      .from('trx_fiscal_invoice')
      .select('*')
      .eq('id', id)
      .eq('is_test', isTest)
      .single()

    if (error || !data) return null

    let supplierName = '-'
    let destName = '-'

    if (data.id_supplier_company != null) {
      const { data: supplier, error: supplierError } = await supabase
        .from('master_person_company')
        .select('trade_name, legal_name')
        .eq('id', data.id_supplier_company)
        .single()

      if (supplierError) {
        console.error('[fiscalInvoiceService.getById] supplier error:', supplierError)
      }

      if (supplier) {
        supplierName = supplier.trade_name ?? supplier.legal_name ?? '-'
      }
    }

    if (data.id_customer_company != null) {
      const { data: dest, error: destError } = await supabase
        .from('master_person_company')
        .select('trade_name, legal_name')
        .eq('id', data.id_customer_company)
        .single()

      if (destError) {
        console.error('[fiscalInvoiceService.getById] destination error:', destError)
      }

      if (dest) {
        destName = dest.trade_name ?? dest.legal_name ?? '-'
      }
    }

    return {
      id: String(data.id),
      invoice_number: data.invoice_number || '',
      serie: data.invoice_series || '',
      value: Number(data.invoice_amount) || 0,
      weight: Number(data.gross_weight) || 0,
      volume: data.box_quantity || 0,
      supplier_name: supplierName,
      destination_name: destName,
      is_active: data.is_active ?? true,
    }
  },

  // Get invoices assigned to a specific route
  async getByRouteId(routeId: string): Promise<InvoiceListItem[]> {
    const isTest = getEnvironment() !== 'production'
    // Convert routeId to number for BigInt comparison in DB
    const routeIdNum = typeof routeId === 'string' ? parseInt(routeId, 10) : routeId

    console.log('[getByRouteId] routeId:', routeId, '-> routeIdNum:', routeIdNum, 'isTest:', isTest)

    // Check if rel_route_invoice table exists
    let assignments: any[] = []
    try {
      const { data, error } = await supabase
        .from('rel_route_invoice')
        .select('id_fiscal_invoice, id_route, is_test, is_active')
        .eq('id_route', routeIdNum)
        .eq('is_test', isTest)
        .eq('is_active', true)

      if (error) {
        console.warn('[getByRouteId] rel_route_invoice error:', error)
        return []
      }
      assignments = data || []
      console.log('[getByRouteId] assignments for route', routeId, ':', assignments.length, 'data sample:', assignments.slice(0, 2))
    } catch (e) {
      console.warn('[getByRouteId] rel_route_invoice table not found:', e)
      return []
    }

    if (!assignments || assignments.length === 0) {
      console.log('[getByRouteId] no assignments for route', routeId)
      return []
    }

    // Map to invoice IDs (convert to string for consistency)
    const invoiceIds = assignments.map(a => String(a.id_fiscal_invoice))
    console.log('[getByRouteId] invoiceIds for route', routeId, ':', invoiceIds)

    if (invoiceIds.length === 0) {
      console.log('[getByRouteId] no invoice IDs for route', routeId)
      return []
    }

    const { data: invoices, error: invoicesError } = await supabase
      .from('trx_fiscal_invoice')
      .select('id, invoice_number, invoice_series, invoice_amount, gross_weight, box_quantity, id_customer_company, is_test, is_active')
      .in('id', invoiceIds)
      .eq('is_test', isTest)

    if (invoicesError) throw new Error(invoicesError.message)
    console.log('[getByRouteId] invoices found for route', routeId, ':', invoices?.length || 0)

    // Get company names for destinations
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

    return (invoices || []).map(invoice => ({
      id: String(invoice.id),
      invoice_number: invoice.invoice_number || '',
      serie: invoice.invoice_series || '',
      value: Number(invoice.invoice_amount) || 0,
      weight: Number(invoice.gross_weight) || 0,
      volume: invoice.box_quantity || 0,
      supplier_name: '',
      destination_name: companyMap.get(invoice.id_customer_company) || '',
      is_active: invoice.is_active ?? true,
    }))
  },

  // Create a new invoice from form data
  async createFromForm(data: CreateInvoiceFormData): Promise<void> {
    const isTest = getEnvironment() !== 'production'

    const { error } = await supabase
      .from('trx_fiscal_invoice')
      .insert({
        invoice_number: data.invoice_number,
        box_quantity: data.quantity,
        id_customer_company: data.delivery_location ? parseInt(data.delivery_location, 10) : null,
        id_supplier_company: data.supplier ? parseInt(data.supplier, 10) : null,
        gross_weight: data.gross_weight || data.net_weight,
        is_test: isTest,
        is_active: true,
      })

    if (error) {
      console.error('[fiscalInvoiceService.createFromForm] error:', error)
      throw new Error(error.message)
    }
  },
}