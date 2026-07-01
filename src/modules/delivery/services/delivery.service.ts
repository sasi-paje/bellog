/**
 * Serviço de Entrega (Mobile) - REFATORADO
 * - Resolve N+1 queries
 * - Usa strings para bigint
 * - Adiciona tratamento de erros
 * - Separa queries de transforms
 */

import { supabase, IS_TEST } from '../../../lib/supabase'
import {
  DeliveryDestination,
  FiscalNoteData,
  DeliveryReason,
  DeliveryResultInput,
  DeliveryResultData,
  NoteWithDeliveryResult,
  DELIVERY_TYPE_MAP,
} from '../domain/entities/DeliveryEntities'

const isTestEnv = () => IS_TEST

export interface DeliveryDestinationResult {
  destinations: DeliveryDestination[]
  total: number
}

type DeliveryReasonCategoryRelation = { name?: string } | { name?: string }[] | null | undefined

const getReasonCategoryName = (relation: DeliveryReasonCategoryRelation): string => {
  const category = Array.isArray(relation) ? relation[0] : relation
  return category?.name || 'Outros'
}

const toStringId = (id: string | number | null | undefined): string => {
  if (id === null || id === undefined) return ''
  return String(id)
}

const safeParseInt = (value: string | number | null | undefined, fallback: number = 0): number => {
  if (value === null || value === undefined) return fallback
  const parsed = parseInt(String(value), 10)
  return isNaN(parsed) ? fallback : parsed
}

export const deliveryService = {
  /**
   * Listar destinos das rotas em andamento - OTIMIZADO
   * Uma query com JOIN para buscar destinos
   */
  async getDestinations(): Promise<DeliveryDestinationResult> {
    const isTest = isTestEnv()

    try {
      const statusData = await this.getRouteStatusId('Em Andamento')
      if (!statusData) {
        return { destinations: [], total: 0 }
      }

      const routesResult = await this.getRoutesInProgress(statusData.id, isTest)
      if (routesResult.length === 0) {
        return { destinations: [], total: 0 }
      }

      const routeIds = routesResult.map(r => toStringId(r.id))

      const destinations = await this.buildDestinationsFromRoutes(routeIds, routesResult, isTest)

      return {
        destinations,
        total: destinations.length,
      }
    } catch (error) {
      console.error('[deliveryService] getDestinations error:', error)
      return { destinations: [], total: 0 }
    }
  },

  /**
   * Buscar ID do status da rota
   */
  async getRouteStatusId(statusName: string): Promise<{ id: number } | null> {
    const { data, error } = await supabase
      .from('ref_route_delivery_status')
      .select('id')
      .eq('name', statusName)
      .single()

    if (error || !data) {
      console.error('[deliveryService] getRouteStatusId error:', error)
      return null
    }

    return { id: data.id }
  },

  /**
   * Buscar rotas em andamento
   */
  async getRoutesInProgress(statusId: number, isTest: boolean) {
    const { data, error } = await supabase
      .from('trx_route')
      .select('id, route_code')
      .eq('id_route_delivery_status', statusId)
      .eq('is_test', isTest)
      .eq('is_active', true)

    if (error || !data) {
      console.error('[deliveryService] getRoutesInProgress error:', error)
      return []
    }

    return data
  },

  /**
   * Construir destinos a partir das rotas - uma query otimizada
   */
  async buildDestinationsFromRoutes(
    routeIds: string[],
    routesResult: Array<{ id: string; route_code: string }>,
    isTest: boolean
  ): Promise<DeliveryDestination[]> {
    const routeCodeMap = new Map(routesResult.map(r => [toStringId(r.id), r.route_code]))

    const { data: routeInvoices } = await supabase
      .from('rel_route_invoice')
      .select('id_route, id_fiscal_invoice')
      .in('id_route', routeIds)
      .eq('is_test', isTest)
      .eq('is_active', true)

    if (!routeInvoices || routeInvoices.length === 0) {
      return []
    }

    const invoiceIds = routeInvoices.map(ri => ri.id_fiscal_invoice).filter(Boolean) as string[]

    if (invoiceIds.length === 0) {
      return []
    }

    const { data: invoices } = await supabase
      .from('trx_fiscal_invoice')
      .select('id, id_customer_company')
      .in('id', invoiceIds)
      .eq('is_test', isTest)

    if (!invoices || invoices.length === 0) {
      return []
    }

    const companyIds = [...new Set(
      invoices
        .map(i => i.id_customer_company)
        .filter(id => id !== null && id !== undefined && id !== 0)
        .map(id => toStringId(id))
        .filter(id => id !== '')
    )]

    if (companyIds.length === 0) {
      return []
    }

    const { data: companies } = await supabase
      .from('master_person_company')
      .select('id, trade_name, legal_name')
      .in('id', companyIds)
      .eq('is_test', isTest)

    const companyMap = new Map(
      (companies || []).map(c => [
        toStringId(c.id),
        {
          trade_name: c.trade_name?.trim() || c.legal_name || null,
          legal_name: c.legal_name,
        },
      ])
    )

    const routeInvoiceMap = new Map(routeInvoices.map(ri => [ri.id_fiscal_invoice, ri.id_route]))

    const destMap = new Map<string, DeliveryDestination>()

    for (const invoice of invoices) {
      const companyIdStr = toStringId(invoice.id_customer_company)
      if (!companyIdStr) continue

      const company = companyMap.get(companyIdStr)
      const routeId = toStringId(routeInvoiceMap.get(invoice.id))

      if (!routeId) continue

      const destinationId = `${routeId}-${companyIdStr}`
      if (destMap.has(destinationId)) continue

      destMap.set(destinationId, {
        id: destinationId,
        company_id: safeParseInt(companyIdStr),
        company_name: company?.trade_name || company?.legal_name || `Empresa ${companyIdStr}`,
        route_id: routeId,
        route_code: routeCodeMap.get(routeId) || '',
      })
    }

    return Array.from(destMap.values())
  },

  /**
   * Buscar notas fiscais por empresa - OTIMIZADO com uma query
   */
  async getFiscalNotesByCompany(
    companyId: number,
    routeIds: string[]
  ): Promise<FiscalNoteData[]> {
    const isTest = isTestEnv()

    if (!companyId || routeIds.length === 0) {
      return []
    }

    const { data: routeInvoices } = await supabase
      .from('rel_route_invoice')
      .select('id, id_route, id_fiscal_invoice')
      .in('id_route', routeIds)
      .eq('is_test', isTest)
      .eq('is_active', true)

    if (!routeInvoices || routeInvoices.length === 0) {
      return []
    }

    const invoiceIdsFromRoutes = routeInvoices.map(ri => ri.id_fiscal_invoice).filter(Boolean) as string[]

    if (invoiceIdsFromRoutes.length === 0) {
      return []
    }

    const { data: invoices } = await supabase
      .from('trx_fiscal_invoice')
      .select('id, invoice_number, id_supplier_company, invoice_series, box_quantity, gross_weight, net_weight')
      .eq('id_customer_company', companyId)
      .eq('is_test', isTest)
      .in('id', invoiceIdsFromRoutes)

    if (!invoices || invoices.length === 0) {
      return []
    }

    const routeInvoiceMap = new Map(routeInvoices.map(ri => [ri.id_fiscal_invoice, ri.id_route]))
    const routeInvoiceIdMap = new Map(routeInvoices.map(ri => [ri.id_fiscal_invoice, toStringId(ri.id)]))

    const supplierIds = [...new Set(
      invoices
        .map(i => i.id_supplier_company)
        .filter(id => id !== null && id !== undefined && id !== 0)
        .map(id => toStringId(id))
        .filter(id => id !== '')
    )]

    let supplierMap = new Map<string, string>()

    if (supplierIds.length > 0) {
      const { data: suppliers } = await supabase
        .from('master_person_company')
        .select('id, trade_name, legal_name')
        .in('id', supplierIds)
        .eq('is_test', isTest)

      if (suppliers && suppliers.length > 0) {
        supplierMap = new Map(
          suppliers.map(s => [toStringId(s.id), s.trade_name ?? s.legal_name ?? 'Fornecedor'])
        )
      }
    }

    return invoices.map(inv => {
      const supplierIdStr = toStringId(inv.id_supplier_company)
      const supplierName = supplierIdStr ? supplierMap.get(supplierIdStr) || 'Fornecedor' : 'Fornecedor'

      return {
        id: inv.id,
        invoice_number: inv.invoice_number ? `NF ${inv.invoice_number}` : 'NF não informada',
        supplier_name: supplierName,
        status: 'Aguardando',
        id_route: routeInvoiceMap.get(inv.id) || '',
        id_route_invoice: routeInvoiceIdMap.get(inv.id) || '',
        box_quantity: inv.box_quantity,
        gross_weight: inv.gross_weight,
        net_weight: inv.net_weight,
      }
    })
  },

  /**
   * Buscar resultados de entrega para múltiplas notas - OTIMIZADO (uma query)
   */
  async getDeliveryResultsByInvoiceIds(invoiceIds: string[]): Promise<Map<string, DeliveryResultData>> {
    const isTest = isTestEnv()

    if (invoiceIds.length === 0) {
      return new Map()
    }

    const { data, error } = await supabase
      .from('trx_route_invoice_delivery')
      .select('*')
      .in('id_fiscal_invoice', invoiceIds)
      .eq('is_test', isTest)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[deliveryService] getDeliveryResultsByInvoiceIds error:', error)
      return new Map()
    }

    const resultMap = new Map<string, DeliveryResultData>()

    for (const item of data || []) {
      const invoiceId = toStringId(item.id_fiscal_invoice)
      if (!resultMap.has(invoiceId)) {
        resultMap.set(invoiceId, item as DeliveryResultData)
      }
    }

    return resultMap
  },

  /**
   * Buscar motivos de entrega do backend
   */
  async getDeliveryReasons(type: 'parcial' | 'negada' | 'abortada'): Promise<DeliveryReason[]> {
    // Resolve o ID do tipo dinamicamente — sem IDs fixos no código
    const { data: reasonTypes, error: typesError } = await supabase
      .from('ref_delivery_reason_type')
      .select('id, code, name')
      .eq('is_active', true)
      .eq('is_test', IS_TEST)

    if (typesError || !reasonTypes || reasonTypes.length === 0) {
      console.error('[deliveryService] getDeliveryReasons: failed to load reason types', typesError)
      return []
    }

    // Tenta code exato (case-insensitive) primeiro, depois name contendo o termo
    const matched =
      reasonTypes.find(rt => rt.code?.toLowerCase() === type) ??
      reasonTypes.find(rt => rt.name?.toLowerCase().includes(type))

    if (!matched) {
      console.error(`[deliveryService] getDeliveryReasons: no reason type found for "${type}"`)
      return []
    }

    const { data, error } = await supabase
      .from('ref_delivery_reason')
      .select('id, name, id_reason_type, id_reason_category, sort_order, ref_delivery_reason_category(name)')
      .eq('id_reason_type', matched.id)
      .eq('is_active', true)
      .eq('is_test', IS_TEST)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[deliveryService] getDeliveryReasons error:', error)
      return []
    }

    return (data || []).map(item => {
      const reason = item as typeof item & {
        ref_delivery_reason_category?: DeliveryReasonCategoryRelation
      }

      return {
        id: toStringId(reason.id),
        reason: reason.name,
        type,
        category_id: safeParseInt(reason.id_reason_category),
        category_name: getReasonCategoryName(reason.ref_delivery_reason_category),
        sort_order: reason.sort_order,
      }
    })
  },

  /**
   * Salvar resultado da entrega - usa RPC register_invoice_delivery_result
   */
  async saveDeliveryResult(
    deliveryData: DeliveryResultInput
  ): Promise<{ success: boolean; error?: string; id?: string }> {
    const isTest = isTestEnv()

    try {
      const invoiceId = toStringId(deliveryData.id_fiscal_invoice)
      const routeId = toStringId(deliveryData.id_route)

      let routeInvoiceId: string

      if (deliveryData.id_route_invoice) {
        routeInvoiceId = toStringId(deliveryData.id_route_invoice)
      } else {
        const { data: routeInvoice, error: routeInvoiceError } = await supabase
          .from('rel_route_invoice')
          .select('id')
          .eq('id_route', routeId)
          .eq('id_fiscal_invoice', invoiceId)
          .eq('is_active', true)
          .eq('is_test', isTest)
          .maybeSingle()

        if (routeInvoiceError || !routeInvoice?.id) {
          return { success: false, error: routeInvoiceError?.message || 'Tentativa da nota na rota não encontrada' }
        }
        routeInvoiceId = toStringId(routeInvoice.id)
      }

      const { error: rpcError } = await supabase.rpc('register_invoice_delivery_result', {
        p_id_route_invoice: routeInvoiceId,
        p_id_delivery_type: deliveryData.id_delivery_type,
        p_id_reason: deliveryData.id_reason ? safeParseInt(deliveryData.id_reason) : null,
        p_receipt_image_path: deliveryData.receipt_image_path || null,
        p_nfd_image_path: deliveryData.nfd_image_path || null,
        p_nfd_number: deliveryData.nfd_number || null,
        p_returned_box_quantity: deliveryData.returned_box_quantity
          ? safeParseInt(deliveryData.returned_box_quantity)
          : null,
        p_returned_amount: deliveryData.returned_amount
          ? parseFloat(String(deliveryData.returned_amount).replace(',', '.'))
          : null,
        p_observation: deliveryData.observation || null,
        p_is_test: isTest,
      })

      if (rpcError) {
        console.error('[deliveryService] saveDeliveryResult RPC error:', rpcError)
        return { success: false, error: rpcError.message }
      }

      return { success: true }
    } catch (err) {
      console.error('[deliveryService] saveDeliveryResult exception:', err)
      return { success: false, error: 'Erro ao salvar resultado da entrega' }
    }
  },

  /**
   * Verificar se já existe registro de entrega
   */
  async getExistingDeliveryResult(
    invoiceId: string,
    routeId: string
  ): Promise<{ id: string; created_at: string } | null> {
    const isTest = isTestEnv()

    const { data, error } = await supabase
      .from('trx_route_invoice_delivery')
      .select('id, created_at')
      .eq('id_fiscal_invoice', invoiceId)
      .eq('id_route', routeId)
      .eq('is_test', isTest)
      .maybeSingle()

    if (error || !data) {
      return null
    }

    return { id: toStringId(data.id), created_at: data.created_at }
  },

  /**
   * Buscar resultado de entrega de uma nota específica
   */
  async getDeliveryResultByInvoice(invoiceId: string): Promise<DeliveryResultData | null> {
    const isTest = isTestEnv()

    const { data, error } = await supabase
      .from('trx_route_invoice_delivery')
      .select('*')
      .eq('id_fiscal_invoice', invoiceId)
      .eq('is_test', isTest)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[deliveryService] getDeliveryResultByInvoice error:', error)
      return null
    }

    return data as DeliveryResultData | null
  },

  /**
   * Mapear delivery_type_id para string
   */
  mapDeliveryTypeIdToString(deliveryTypeId: number | string): string {
    const id = typeof deliveryTypeId === 'string' ? parseInt(deliveryTypeId, 10) : deliveryTypeId
    return DELIVERY_TYPE_MAP[id] || 'entrega_total'
  },

  /**
   * Verificar se uma rota pode ser finalizada
   */
  async canCompleteRoute(routeId: string): Promise<{
    canComplete: boolean
    pendingNotes: number
    totalNotes: number
    message: string
  }> {
    const isTest = isTestEnv()

    try {
      const routeIdStr = toStringId(routeId)
      const routeIdNum = safeParseInt(routeIdStr)

      const { data: routeInvoices, error: routeInvoicesError } = await supabase
        .from('rel_route_invoice')
        .select('id_fiscal_invoice')
        .eq('id_route', routeIdNum)
        .eq('is_test', isTest)
        .eq('is_active', true)

      if (routeInvoicesError) {
        console.error('[deliveryService] canCompleteRoute error:', routeInvoicesError)
        return {
          canComplete: false,
          pendingNotes: 0,
          totalNotes: 0,
          message: 'Erro ao buscar notas da rota',
        }
      }

      const totalNotes = routeInvoices?.length || 0

      if (totalNotes === 0) {
        return {
          canComplete: false,
          pendingNotes: 0,
          totalNotes: 0,
          message: 'Nenhuma nota associada à rota',
        }
      }

      const invoiceIds = (routeInvoices || [])
        .map(ri => toStringId(ri.id_fiscal_invoice))
        .filter(id => id !== '')

      if (invoiceIds.length === 0) {
        return {
          canComplete: false,
          pendingNotes: totalNotes,
          totalNotes,
          message: 'Nenhuma nota vinculada',
        }
      }

      const resultsMap = await this.getDeliveryResultsByInvoiceIds(invoiceIds)
      const pendingNotes = invoiceIds.filter(id => !resultsMap.has(id)).length

      if (pendingNotes > 0) {
        return {
          canComplete: false,
          pendingNotes,
          totalNotes,
          message: `${pendingNotes} nota${pendingNotes > 1 ? 's' : ''} aguardando entrega`,
        }
      }

      return {
        canComplete: true,
        pendingNotes: 0,
        totalNotes,
        message: 'Todas as notas foram entregues',
      }
    } catch (err) {
      console.error('[deliveryService] canCompleteRoute exception:', err)
      return {
        canComplete: false,
        pendingNotes: 0,
        totalNotes: 0,
        message: 'Erro ao verificar rota',
      }
    }
  },

  /**
   * Buscar notas de entrega de uma rota
   */
  async getDeliveryNotesByRoute(routeId: string): Promise<NoteWithDeliveryResult[]> {
    const isTest = isTestEnv()

    try {
      const routeIdStr = toStringId(routeId)
      const routeIdNum = safeParseInt(routeIdStr)

      const { data: deliveries, error: deliveriesError } = await supabase
        .from('trx_route_invoice_delivery')
        .select('*')
        .eq('id_route', routeIdNum)
        .eq('is_test', isTest)
        .order('updated_at', { ascending: false })

      if (deliveriesError || !deliveries || deliveries.length === 0) {
        return []
      }

      const invoiceIds = deliveries.map(d => toStringId(d.id_fiscal_invoice)).filter(id => id !== '')

      if (invoiceIds.length === 0) {
        return []
      }

      const { data: invoices, error: invoicesError } = await supabase
        .from('trx_fiscal_invoice')
        .select('id, invoice_number, id_supplier_company, id_customer_company, box_quantity, gross_weight, net_weight')
        .in('id', invoiceIds)
        .eq('is_test', isTest)

      if (invoicesError || !invoices) {
        return []
      }

      const supplierIds = [...new Set(
        invoices
          .map(i => i.id_supplier_company)
          .filter(id => id !== null && id !== undefined && id !== 0)
          .map(id => toStringId(id))
          .filter(id => id !== '')
      )]

      const companyIds = [...new Set(
        invoices
          .flatMap(i => [i.id_supplier_company, i.id_customer_company])
          .filter(id => id !== null && id !== undefined && id !== 0)
          .map(id => toStringId(id))
          .filter(id => id !== '')
      )]

      let companyMap = new Map<string, { trade_name?: string; legal_name?: string }>()

      if (companyIds.length > 0) {
        const { data: companies } = await supabase
          .from('master_person_company')
          .select('id, trade_name, legal_name')
          .in('id', companyIds)
          .eq('is_test', isTest)

        if (companies) {
          companyMap = new Map(companies.map(c => [toStringId(c.id), c]))
        }
      }

      return deliveries.map(delivery => {
        const invoice = invoices.find(i => i.id === delivery.id_fiscal_invoice)
        const supplierIdStr = toStringId(invoice?.id_supplier_company)
        const customerIdStr = toStringId(invoice?.id_customer_company)
        const supplier = supplierIdStr ? companyMap.get(supplierIdStr) : null
        const customer = customerIdStr ? companyMap.get(customerIdStr) : null

        return {
          id: toStringId(delivery.id_fiscal_invoice),
          invoice_number: invoice?.invoice_number ? `NF ${invoice.invoice_number}` : 'NF não informada',
          supplier_name: supplier?.trade_name ?? supplier?.legal_name ?? 'Fornecedor',
          customer_name: customer?.trade_name ?? customer?.legal_name ?? null,
          status: 'Entregue',
          id_route: toStringId(delivery.id_route),
          box_quantity: invoice?.box_quantity ?? null,
          gross_weight: invoice?.gross_weight ?? null,
          net_weight: invoice?.net_weight ?? null,
          deliveryResult: delivery as DeliveryResultData,
          deliveryTypeLabel: this.mapDeliveryTypeIdToString(delivery.id_delivery_type),
        }
      })
    } catch (err) {
      console.error('[deliveryService] getDeliveryNotesByRoute exception:', err)
      return []
    }
  },
}

// Re-export types
export type { DeliveryResultInput, NoteWithDeliveryResult }
export { DELIVERY_TYPE_MAP } from '../domain/entities/DeliveryEntities'
