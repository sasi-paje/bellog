// Feature Routes History - API Service
import { supabase, getEnvironment, TrxRouteHistory, RefRouteHistoryType } from '../../../lib/supabase'

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
    const isTest = getEnvironment() !== 'production'

    const { data: history, error } = await supabase
      .from('trx_route_history')
      .select('*')
      .eq('id_route', routeId)
      .eq('is_test', isTest)
      .eq('is_active', true)
      .order('event_at', { ascending: true })

    if (error) throw new Error(error.message)
    if (!history || history.length === 0) return []

    const typeIds = [...new Set(history.map(h => h.id_history_type).filter(Boolean))]
    const { data: types } = await supabase
      .from('ref_route_history_type')
      .select('*')
      .in('id', typeIds)

    return history.map(h => ({
      ...h,
      history_type: types?.find(t => t.id === h.id_history_type),
    }))
  },

  async create(routeId: string, historyTypeId: string, description?: string): Promise<TrxRouteHistory> {
    const isTest = getEnvironment() !== 'production'

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
