import { supabase, getEnvironment } from '../lib/supabase'

export interface StgRouteCard {
  id: string
  id_vehicle: string
  vehicle_plate: string
  capacidade: number
  is_test: boolean
  created_at: string
}

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

export interface StgRouteCardWithNotes extends StgRouteCard {
  notes: StgRouteCardNotes[]
}

// Route Card Staging Service - manages temporary card data before route creation
export const routeCardService = {
  // Create or get a staging card for a vehicle
  async getOrCreateCard(vehicleId: string, vehiclePlate: string, capacidade: number): Promise<StgRouteCard> {
    const isTest = getEnvironment() !== 'production'

    // Check if card already exists for this vehicle
    const { data: existing } = await supabase
      .from('stg_route_card')
      .select('*')
      .eq('id_vehicle', vehicleId)
      .eq('is_test', isTest)
      .maybeSingle()

    if (existing) return existing

    // Create new card
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

  // Get all staging cards with their notes
  async getAllCards(): Promise<StgRouteCardWithNotes[]> {
    const isTest = getEnvironment() !== 'production'

    const { data: cards, error } = await supabase
      .from('stg_route_card')
      .select('*')
      .eq('is_test', isTest)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    if (!cards || cards.length === 0) return []

    // Get all notes for these cards
    const cardIds = cards.map(c => c.id)
    const { data: allNotes } = await supabase
      .from('stg_route_card_notes')
      .select('*')
      .in('id_route_card', cardIds)
      .eq('is_test', isTest)
      .order('order_index')

    // Attach notes to cards
    return cards.map(card => ({
      ...card,
      notes: allNotes?.filter(n => n.id_route_card === card.id) || [],
    }))
  },

  // Add a note to a card
  async addNote(cardId: string, invoiceId: string, invoiceNumber: string, peso: number): Promise<StgRouteCardNotes> {
    const isTest = getEnvironment() !== 'production'

    // Get current max order_index
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

  // Remove a note from a card
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

  // Delete a card and all its notes
  async deleteCard(cardId: string): Promise<void> {
    const isTest = getEnvironment() !== 'production'

    // Delete notes first
    await supabase
      .from('stg_route_card_notes')
      .delete()
      .eq('id_route_card', cardId)
      .eq('is_test', isTest)

    // Delete card
    const { error } = await supabase
      .from('stg_route_card')
      .delete()
      .eq('id', cardId)
      .eq('is_test', isTest)

    if (error) throw new Error(error.message)
  },

  // Clear all staging data
  async clearAll(): Promise<void> {
    const isTest = getEnvironment() !== 'production'

    await supabase.from('stg_route_card_notes').delete().eq('is_test', isTest)
    await supabase.from('stg_route_card').delete().eq('is_test', isTest)
  },

  // Calculate total weight for a card
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