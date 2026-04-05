import { supabase, getEnvironment, RelRouteInvoice } from '../lib/supabase'

// Assignment Service - manages route-invoice relationships
export const assignmentService = {
  normalizeId(value: string | number): number {
    const idNum = typeof value === 'string' ? parseInt(value, 10) : value
    if (!Number.isFinite(idNum)) {
      throw new Error(`Invalid numeric id: ${value}`)
    }
    return idNum
  },

  // Get all active invoices for a route
  async getInvoicesByRouteId(routeId: string): Promise<RelRouteInvoice[]> {
    const isTest = getEnvironment() !== 'production'
    const routeIdNum = this.normalizeId(routeId)

    const { data, error } = await supabase
      .from('rel_route_invoice')
      .select('*')
      .eq('id_route', routeIdNum)
      .eq('is_test', isTest)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data || []
  },

  // Get active route for an invoice
  async getActiveRouteForInvoice(invoiceId: string): Promise<RelRouteInvoice | null> {
    const isTest = getEnvironment() !== 'production'
    const invoiceIdNum = this.normalizeId(invoiceId)

    const { data, error } = await supabase
      .from('rel_route_invoice')
      .select('*')
      .eq('id_fiscal_invoice', invoiceIdNum)
      .eq('is_test', isTest)
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data || null
  },

  async upsertRouteInvoice(
    routeId: string | number,
    invoiceId: string | number,
    userId?: string | number | null,
  ): Promise<RelRouteInvoice> {
    const isTest = getEnvironment() !== 'production'
    const routeIdNum = this.normalizeId(routeId)
    const invoiceIdNum = this.normalizeId(invoiceId)
    const now = new Date().toISOString()

    const activeAssignment = await this.getActiveRouteForInvoice(String(invoiceIdNum))
    if (activeAssignment && Number(activeAssignment.id_route) !== routeIdNum) {
      throw new Error('Esta nota já está vinculada a uma rota ativa')
    }

    const { data: existing, error: existingError } = await supabase
      .from('rel_route_invoice')
      .select('*')
      .eq('id_route', routeIdNum)
      .eq('id_fiscal_invoice', invoiceIdNum)
      .eq('is_test', isTest)
      .maybeSingle()

    if (existingError) throw new Error(existingError.message)

    if (existing) {
      if (existing.is_active) {
        console.log('[upsertRouteInvoice] vínculo já ativo:', {
          routeId: routeIdNum,
          invoiceId: invoiceIdNum,
        })
        return existing
      }

      console.log('[upsertRouteInvoice] reativando vínculo:', {
        routeId: routeIdNum,
        invoiceId: invoiceIdNum,
      })

      const { data: reactivated, error: reactivateError } = await supabase
        .from('rel_route_invoice')
        .update({
          is_active: true,
          assigned_at: now,
          unassigned_at: null,
          unassigned_by: null,
          updated_at: now,
          updated_by: userId ? this.normalizeId(userId) : null,
        })
        .eq('id', existing.id)
        .eq('is_test', isTest)
        .select()
        .single()

      if (reactivateError) throw new Error(reactivateError.message)
      return reactivated
    }

    console.log('[upsertRouteInvoice] criando novo vínculo:', {
      routeId: routeIdNum,
      invoiceId: invoiceIdNum,
    })

    const { data: created, error: insertError } = await supabase
      .from('rel_route_invoice')
      .insert({
        id_route: routeIdNum,
        id_fiscal_invoice: invoiceIdNum,
        assigned_at: now,
        assigned_by: userId ? this.normalizeId(userId) : null,
        created_by: userId ? this.normalizeId(userId) : null,
        updated_by: userId ? this.normalizeId(userId) : null,
        is_test: isTest,
        is_active: true,
      })
      .select()
      .single()

    if (insertError) throw new Error(insertError.message)
    return created
  },

  // Assign invoice to route
  async assignInvoiceToRoute(
    routeId: string,
    invoiceId: string,
    userId?: string | number | null,
  ): Promise<RelRouteInvoice> {
    return this.upsertRouteInvoice(routeId, invoiceId, userId)
  },

  // Unassign invoice from route
  async unassignInvoiceFromRoute(
    routeId: string,
    invoiceId: string,
    userId?: string | number | null,
  ): Promise<void> {
    const isTest = getEnvironment() !== 'production'
    const routeIdNum = this.normalizeId(routeId)
    const invoiceIdNum = this.normalizeId(invoiceId)
    const now = new Date().toISOString()

    console.log('[unassignInvoiceFromRoute] desativando vínculo:', {
      routeId: routeIdNum,
      invoiceId: invoiceIdNum,
    })

    const { error } = await supabase
      .from('rel_route_invoice')
      .update({
        unassigned_at: now,
        unassigned_by: userId ? this.normalizeId(userId) : null,
        is_active: false,
        updated_at: now,
        updated_by: userId ? this.normalizeId(userId) : null,
      })
      .eq('id_route', routeIdNum)
      .eq('id_fiscal_invoice', invoiceIdNum)
      .eq('is_test', isTest)
      .eq('is_active', true)

    if (error) throw new Error(error.message)
  },

  // Sync route invoices - add new and remove old ones
  async syncRouteInvoices(
    routeId: string,
    finalInvoiceIds: string[],
    userId?: string | number | null,
  ): Promise<void> {
    const isTest = getEnvironment() !== 'production'
    const routeIdNum = this.normalizeId(routeId)
    const now = new Date().toISOString()

    console.log('[syncRouteInvoices] routeId:', routeId, '->', routeIdNum)
    console.log('[syncRouteInvoices] finalInvoiceIds:', finalInvoiceIds)

    // Buscar TODAS as vínculo (ativos e inativos) para a rota
    const { data: allAssignments, error: fetchError } = await supabase
      .from('rel_route_invoice')
      .select('id, id_fiscal_invoice, is_active')
      .eq('id_route', routeIdNum)
      .eq('is_test', isTest)

    if (fetchError) throw new Error(fetchError.message)

    // Separar em ativos e inativos
    const activeAssignments = (allAssignments || []).filter(a => a.is_active)
    const inactiveAssignments = (allAssignments || []).filter(a => !a.is_active)

    const currentActiveIds = new Set((activeAssignments || []).map(a => String(a.id_fiscal_invoice)))
    const inactiveIds = new Set((inactiveAssignments || []).map(a => String(a.id_fiscal_invoice)))
    const finalIds = new Set(finalInvoiceIds.map(id => String(this.normalizeId(id))))

    // Notas a desativar (estão ativas mas não estão no resultado final)
    const idsToRemove = [...currentActiveIds].filter(id => !finalIds.has(id))
    // Notas a reativar (estão inativas e estão no resultado final)
    const idsToReactivate = [...inactiveIds].filter(id => finalIds.has(id))
    // Notas a inserir (não existem vínculo algum para a rota)
    const idsToAdd = [...finalIds].filter(
      id => !currentActiveIds.has(id) && !inactiveIds.has(id)
    )

    console.log('[syncRouteInvoices] currentActiveIds:', Array.from(currentActiveIds))
    console.log('[syncRouteInvoices] inactiveIds:', Array.from(inactiveIds))
    console.log('[syncRouteInvoices] finalIds:', Array.from(finalIds))
    console.log('[syncRouteInvoices] idsToRemove:', idsToRemove)
    console.log('[syncRouteInvoices] idsToReactivate:', idsToReactivate)
    console.log('[syncRouteInvoices] idsToAdd:', idsToAdd)

    // Desativar notas que foram removidas
    for (const invoiceIdStr of idsToRemove) {
      const assignment = (activeAssignments || []).find(
        a => String(a.id_fiscal_invoice) === invoiceIdStr,
      )

      if (!assignment) continue

      console.log('[syncRouteInvoices] desativando:', {
        routeId: routeIdNum,
        invoiceId: invoiceIdStr,
      })

      const { error } = await supabase
        .from('rel_route_invoice')
        .update({
          unassigned_at: now,
          unassigned_by: userId ? this.normalizeId(userId) : null,
          is_active: false,
          updated_at: now,
          updated_by: userId ? this.normalizeId(userId) : null,
        })
        .eq('id', assignment.id)
        .eq('is_test', isTest)

      if (error) throw new Error(error.message)
    }

    // Reativar notas que estavam inativas
    for (const invoiceIdStr of idsToReactivate) {
      const assignment = (inactiveAssignments || []).find(
        a => String(a.id_fiscal_invoice) === invoiceIdStr,
      )

      if (!assignment) continue

      console.log('[syncRouteInvoices] reativando:', {
        routeId: routeIdNum,
        invoiceId: invoiceIdStr,
      })

      const { error } = await supabase
        .from('rel_route_invoice')
        .update({
          assigned_at: now,
          unassigned_at: null,
          unassigned_by: null,
          is_active: true,
          updated_at: now,
          updated_by: userId ? this.normalizeId(userId) : null,
        })
        .eq('id', assignment.id)
        .eq('is_test', isTest)

      if (error) throw new Error(error.message)
    }

    // Inserir notas que não têm vínculo com a rota
    for (const invoiceIdStr of idsToAdd) {
      await this.upsertRouteInvoice(routeIdNum, invoiceIdStr, userId)
    }

    console.log('[syncRouteInvoices] done')
  },

  // Get all unassigned invoices (not linked to any active route)
  async getUnassignedInvoices(): Promise<{ id: string; invoice_number: string }[]> {
    const isTest = getEnvironment() !== 'production'

    const { data: allInvoices, error: invoiceError } = await supabase
      .from('trx_fiscal_invoice')
      .select('id, invoice_number')
      .eq('is_test', isTest)
      .eq('is_active', true)

    if (invoiceError) throw new Error(invoiceError.message)
    if (!allInvoices || allInvoices.length === 0) return []

    const { data: activeAssignments, error: assignError } = await supabase
      .from('rel_route_invoice')
      .select('id_fiscal_invoice')
      .eq('is_test', isTest)
      .eq('is_active', true)

    if (assignError) throw new Error(assignError.message)

    const assignedIds = new Set(activeAssignments?.map(a => a.id_fiscal_invoice) || [])

    return allInvoices.filter(i => !assignedIds.has(i.id))
  },

  // Get total load for a route (sum of weights)
  async getRouteCurrentLoad(routeId: string): Promise<number> {
    const isTest = getEnvironment() !== 'production'
    const routeIdNum = this.normalizeId(routeId)

    const { data: assignments, error } = await supabase
      .from('rel_route_invoice')
      .select('id_fiscal_invoice')
      .eq('id_route', routeIdNum)
      .eq('is_test', isTest)
      .eq('is_active', true)

    if (error) throw new Error(error.message)
    if (!assignments || assignments.length === 0) return 0

    const invoiceIds = assignments.map(a => String(a.id_fiscal_invoice))

    const { data: invoices, error: invoicesError } = await supabase
      .from('trx_fiscal_invoice')
      .select('gross_weight')
      .in('id', invoiceIds)
      .eq('is_test', isTest)

    if (invoicesError) throw new Error(invoicesError.message)

    return (invoices || []).reduce((sum, inv) => sum + (inv.gross_weight || 0), 0)
  },
}