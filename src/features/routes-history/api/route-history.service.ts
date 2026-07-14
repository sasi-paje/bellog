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
  title?: string | null
  id_route_history_type?: string | number | null
}

const ARRIVAL_PHOTO_BUCKET = 'bellog-files'
const LEGACY_ARRIVAL_PHOTO_BUCKET = 'route-arrivals'

const getArrivalPhotoUrl = async (path: string | null | undefined): Promise<string | null> => {
  if (!path) return null

  const isLegacyArrivalPath = /^(prod|test)?\/?route-\d+\/company-\d+\//.test(path)
  const buckets = isLegacyArrivalPath
    ? [LEGACY_ARRIVAL_PHOTO_BUCKET, ARRIVAL_PHOTO_BUCKET]
    : [ARRIVAL_PHOTO_BUCKET, LEGACY_ARRIVAL_PHOTO_BUCKET]

  try {
    for (const bucket of buckets) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60)

      if (!error && data?.signedUrl) {
        return data.signedUrl
      }

      if (error && !/object not found/i.test(error.message)) {
        console.warn('[routeHistoryService] Could not sign arrival photo URL:', error.message)
      }
    }

    return null
  } catch (err) {
    console.warn('[routeHistoryService] Could not sign arrival photo URL:', err)
    return null
  }
}

export const routeHistoryService = {
  async getByRouteId(routeId: string): Promise<HistoryWithDetails[]> {
    const isTest = IS_TEST

    const { data: history, error } = await supabase
      .from('trx_route_history')
      .select('*')
      .eq('id_route', routeId)
      .eq('is_test', isTest)
      .order('event_at', { ascending: true })

    if (error) throw new Error(error.message)

    const rawHistory = (history || []) as any[]
    const activeHistory = rawHistory.filter(h => h.is_active !== false)
    const getHistoryTypeId = (h: any) => h.id_history_type ?? h.id_route_history_type ?? null
    const typeIds = [...new Set(activeHistory.map(getHistoryTypeId).filter(Boolean).map(String))]
    const { data: types } = typeIds.length > 0
      ? await supabase.from('ref_route_history_type').select('*').in('id', typeIds)
      : { data: [] as RefRouteHistoryType[] }

    const baseHistory: HistoryWithDetails[] = await Promise.all(activeHistory.map(async h => {
      const historyType = types?.find(t => String(t.id) === String(getHistoryTypeId(h)))
      const metadata = h.metadata as Record<string, any> | null | undefined
      const photoUrl = historyType?.code === 'CLIENT_ARRIVAL'
        ? await getArrivalPhotoUrl(metadata?.arrival_photo_path)
        : null

      return {
        ...h,
        id_history_type: getHistoryTypeId(h),
        description: h.description ?? h.title ?? null,
        history_type: historyType,
        metadata: photoUrl ? { ...(metadata || {}), arrival_photo_url: photoUrl } : metadata,
      }
    }))

    // Chegadas ao cliente (trx_route_stop) entram no histórico como eventos,
    // mesclados por event_at. Assim, ao registrar a chegada no mobile, ela
    // aparece na aba Histórico do modal da rota.
    const arrivals = await this.getArrivalHistory(routeId, baseHistory)

    const merged = [...baseHistory, ...arrivals].sort((a, b) => {
      const ta = a.event_at ? new Date(a.event_at).getTime() : 0
      const tb = b.event_at ? new Date(b.event_at).getTime() : 0
      return ta - tb
    })

    return merged
  },

  // Lê as chegadas registradas (trx_route_stop com arrived_at) e as converte
  // em itens de histórico sintéticos (code CLIENT_ARRIVAL) quando ainda não
  // existe uma linha real em trx_route_history. Mantém compatibilidade com
  // chegadas registradas antes da criação do evento no backend.
  async getArrivalHistory(routeId: string, existingHistory: HistoryWithDetails[] = []): Promise<HistoryWithDetails[]> {
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

    const arrivalItems = await Promise.all(stops.map(async s => {
      const company = companyMap.get(String(s.id_company)) || ''
      const label = company ? `Chegada ao Cliente — ${company}` : 'Chegada ao Cliente'
      const alreadyInHistory = existingHistory.some(h => {
        const metadata = h.metadata as Record<string, any> | null | undefined
        const sameStop = String(metadata?.id_route_stop ?? '') === String(s.id)
        const sameCompany = String(metadata?.company_id ?? '') === String(s.id_company)
        const sameTime = Boolean(h.event_at && s.arrived_at && new Date(h.event_at).getTime() === new Date(s.arrived_at).getTime())
        const isClientArrival = h.history_type?.code === 'CLIENT_ARRIVAL' || /Chegada ao Cliente/i.test(h.description || h.title || '')

        return isClientArrival && (sameStop || (sameCompany && sameTime))
      })

      if (alreadyInHistory) return null

      const photoUrl = await getArrivalPhotoUrl(s.arrival_photo_path)

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
          arrival_photo_url: photoUrl,
        },
      } as unknown as HistoryWithDetails
    }))

    return arrivalItems.filter(Boolean) as HistoryWithDetails[]
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
