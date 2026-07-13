// Feature Routes History - API Service
import { supabase, IS_TEST, TrxRouteHistory, RefRouteHistoryType } from '../../../lib/supabase'

export interface RouteHistoryItem {
  id: string
  id_route: string
  id_history_type: string | null
  event_at: string | null
  description: string | null
  history_type?: RefRouteHistoryType
}

export interface HistoryWithDetails extends TrxRouteHistory {
  history_type?: RefRouteHistoryType
  metadata?: Record<string, any>
}

export const routeHistoryService = {
  async getByRouteId(routeId: string): Promise<HistoryWithDetails[]> {
    const isTest = IS_TEST

    const { data: history, error } = await supabase
      .from('trx_route_history')
      .select('*')
      .eq('id_route', routeId)
      .eq('is_test', isTest)
      .eq('is_active', true)
      .order('event_at', { ascending: true })

    if (error) throw new Error(error.message)

    const typeIds = [...new Set((history || []).map(h => h.id_history_type).filter(Boolean))]
    const { data: types } = typeIds.length > 0
      ? await supabase.from('ref_route_history_type').select('*').in('id', typeIds)
      : { data: [] as RefRouteHistoryType[] }

    const baseHistory: HistoryWithDetails[] = (history || []).map(h => ({
      ...h,
      history_type: types?.find(t => t.id === h.id_history_type),
    }))

    // Chegadas ao cliente (trx_route_stop) entram no histórico como eventos,
    // mesclados por event_at. Assim, ao registrar a chegada no mobile, ela
    // aparece na aba Histórico do modal da rota.
    const arrivals = await this.getArrivalHistory(routeId)

    const merged = [...baseHistory, ...arrivals].sort((a, b) => {
      const ta = a.event_at ? new Date(a.event_at).getTime() : 0
      const tb = b.event_at ? new Date(b.event_at).getTime() : 0
      return ta - tb
    })

    return merged
  },

  // Lê as chegadas registradas (trx_route_stop com arrived_at) e as converte
  // em itens de histórico sintéticos (code CLIENT_ARRIVAL).
  async getArrivalHistory(routeId: string): Promise<HistoryWithDetails[]> {
    const isTest = IS_TEST

    const { data: stops, error } = await supabase
      .from('trx_route_stop')
      .select('id, id_company, arrived_at, arrival_photo_path')
      .eq('id_route', routeId)
      .eq('is_active', true)
      .eq('is_test', isTest)
      .not('arrived_at', 'is', null)

    if (error || !stops || stops.length === 0) return []

    const companyIds = [...new Set(stops.map(s => s.id_company).filter(Boolean))]
    const { data: companies } = companyIds.length > 0
      ? await supabase.from('master_person_company').select('id, trade_name, legal_name').in('id', companyIds)
      : { data: [] as any[] }
    const companyMap = new Map<string, string>(
      (companies || []).map((c: any) => [String(c.id), c.trade_name || c.legal_name || ''])
    )

    return stops.map(s => {
      const company = companyMap.get(String(s.id_company)) || ''
      const label = company ? `Chegada ao Cliente — ${company}` : 'Chegada ao Cliente'
      return {
        id: `arrival-${s.id}`,
        id_route: routeId,
        id_history_type: null,
        event_at: s.arrived_at,
        description: label,
        is_active: true,
        is_test: isTest,
        created_at: s.arrived_at,
        updated_at: s.arrived_at,
        history_type: {
          id: 'synthetic-CLIENT_ARRIVAL',
          code: 'CLIENT_ARRIVAL',
          description: label,
          is_active: true,
          is_test: isTest,
          created_at: s.arrived_at,
          updated_at: s.arrived_at,
        },
        metadata: {
          destination_name: company,
          company_id: s.id_company,
          arrival_photo_path: s.arrival_photo_path,
        },
      } as unknown as HistoryWithDetails
    })
  },

  async create(routeId: string, historyTypeId: string, description?: string): Promise<TrxRouteHistory> {
    const isTest = IS_TEST

    const { data, error } = await supabase
      .from('trx_route_history')
      .insert({
        id_route: routeId,
        id_history_type: historyTypeId,
        event_at: new Date().toISOString(),
        description,
        is_test: isTest,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  },

  async getHistoryTypes(): Promise<RefRouteHistoryType[]> {
    const { data, error } = await supabase
      .from('ref_route_history_type')
      .select('*')
      .eq('is_active', true)
      .order('description')

    if (error) throw new Error(error.message)
    return data || []
  },
}
