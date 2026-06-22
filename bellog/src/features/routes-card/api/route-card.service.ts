// =====================================================
// DEPRECATED - ROUTE CARD SERVICE
// =====================================================
// Este arquivo é LEGACY e não deve ser usado em novos fluxos.
//
// ARQUITETURA OFICIAL:
//   - Fontes oficiais de dados:
//     - trx_route = rota
//     - rel_route_invoice = nota/tentativa planejada na rota
//     - trx_route_invoice_delivery = resultado da tentativa
//     - trx_route_stop = paradas/destinos operacionais
//
//   - Para buscar dados da tela Atribuir Notas:
//     - Usar RPC get_assign_notes_board em vez de stg_route_card
//
//   - Tabelas LEGACY (não usar em novos fluxos):
//     - stg_route_card
//     - stg_route_card_notes
//
// =====================================================

// Feature Routes Card - API Service
import { supabase, getEnvironment } from '../../../lib/supabase'

/**
 * @deprecated Esta interface é legacy. Não usar em novos desenvolvimentos.
 * A fonte oficial é rel_route_invoice via RPC get_assign_notes_board.
 */
export interface StgRouteCard {
  id: string
  id_vehicle: string
  vehicle_plate: string
  capacidade: number
  is_test: boolean
  created_at: string
}

/**
 * @deprecated Esta interface é legacy. Não usar em novos desenvolvimentos.
 * A fonte oficial é rel_route_invoice.
 */
export interface StgRouteCardNotes {
  id: string
  id_route_card: string
  id_invoice: string
  invoice_number: string
  peso: number
  order_index: number
  is_test: boolean
  created_at: string
}

/**
 * @deprecated Não usar em novos fluxos. Usar get_assign_notes_board RPC
 * para buscar rotas e rel_route_invoice para notas da rota.
 */
export interface StgRouteCardWithNotes extends StgRouteCard {
  notes: StgRouteCardNotes[]
}

/**
 * @deprecated LEGACY - Não usar em novos fluxos.
 * Função mantida apenas para não quebrar funcionalidades existentes.
 * Substituir por RPC get_assign_notes_board + rel_route_invoice.
 */
export const routeCardService = {
  /**
   * @deprecated Não usar em novos fluxos
   */
  async getOrCreateCard(vehicleId: string, vehiclePlate: string, capacidade: number): Promise<StgRouteCard> {
    const isTest = getEnvironment() !== 'production'

    const { data: existing } = await supabase
      .from('stg_route_card')
      .select('*')
      .eq('id_vehicle', vehicleId)
      .eq('is_test', isTest)
      .maybeSingle()

    if (existing) return existing

    const { data, error } = await supabase
      .from('stg_route_card')
      .insert({
        id_vehicle: vehicleId,
        vehicle_plate: vehiclePlate,
        capacidade,
        is_test: isTest,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },

  /**
   * @deprecated LEGACY - Não usar em novos fluxos. Usar get_assign_notes_board RPC.
   */
  async getAllCards(): Promise<StgRouteCardWithNotes[]> {
    const isTest = getEnvironment() !== 'production'

    const { data: cards, error } = await supabase
      .from('stg_route_card')
      .select('*')
      .eq('is_test', isTest)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    if (!cards || cards.length === 0) return []

    const cardIds = cards.map(c => c.id)
    const { data: allNotes } = await supabase
      .from('stg_route_card_notes')
      .select('*')
      .in('id_route_card', cardIds)
      .eq('is_test', isTest)
      .order('order_index')

    return cards.map(card => ({
      ...card,
      notes: allNotes?.filter(n => n.id_route_card === card.id) || [],
    }))
  },

  /**
   * @deprecated LEGACY - Não usar em novos fluxos. Usar RPC para criar/atualizar rota.
   */
  async addNote(cardId: string, invoiceId: string, invoiceNumber: string, peso: number): Promise<StgRouteCardNotes> {
    const isTest = getEnvironment() !== 'production'

    const { data: existingNotes } = await supabase
      .from('stg_route_card_notes')
      .select('order_index')
      .eq('id_route_card', cardId)
      .eq('is_test', isTest)
      .order('order_index', { ascending: false })
      .limit(1)

    const nextOrder = (existingNotes?.[0]?.order_index ?? -1) + 1

    const { data, error } = await supabase
      .from('stg_route_card_notes')
      .insert({
        id_route_card: cardId,
        id_invoice: invoiceId,
        invoice_number: invoiceNumber,
        peso,
        order_index: nextOrder,
        is_test: isTest,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },

  /**
   * @deprecated LEGACY - Não usar em novos fluxos. A nota é removida da rota via sync_route_invoices RPC.
   */
  async removeNote(cardId: string, noteId: string): Promise<void> {
    const isTest = getEnvironment() !== 'production'

    const { error } = await supabase
      .from('stg_route_card_notes')
      .delete()
      .eq('id', noteId)
      .eq('id_route_card', cardId)
      .eq('is_test', isTest)

    if (error) throw new Error(error.message)
  },

  /**
   * @deprecated LEGACY - Não usar em novos fluxos.
   */
  async deleteCard(cardId: string): Promise<void> {
    const isTest = getEnvironment() !== 'production'

    await supabase
      .from('stg_route_card_notes')
      .delete()
      .eq('id_route_card', cardId)
      .eq('is_test', isTest)

    const { error } = await supabase
      .from('stg_route_card')
      .delete()
      .eq('id', cardId)
      .eq('is_test', isTest)

    if (error) throw new Error(error.message)
  },

  /**
   * @deprecated LEGACY - Não usar em novos fluxos.
   */
  async clearAll(): Promise<void> {
    const isTest = getEnvironment() !== 'production'

    await supabase.from('stg_route_card_notes').delete().eq('is_test', isTest)
    await supabase.from('stg_route_card').delete().eq('is_test', isTest)
  },

  /**
   * @deprecated LEGACY - Não usar em novos fluxos. Peso da carga vem de rel_route_invoice.
   */
  async getCardWeight(cardId: string): Promise<number> {
    const isTest = getEnvironment() !== 'production'

    const { data: notes } = await supabase
      .from('stg_route_card_notes')
      .select('peso')
      .eq('id_route_card', cardId)
      .eq('is_test', isTest)

    return (notes || []).reduce((sum, n) => sum + (n.peso || 0), 0)
  },
}