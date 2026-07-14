import { useState, useEffect, useCallback } from 'react'
import { IS_TEST } from '../lib/supabase'
import { routeHistoryService, HistoryWithDetails } from '../features/routes-history'
import { routeService, RouteHistoryItem } from '../features/routes'

interface UseRouteHistoryResult {
  history: HistoryWithDetails[]
  loading: boolean
  error: string | null
  fetchHistory: (routeId: string) => Promise<void>
  createHistoryEntry: (routeId: string, historyTypeId: string, description?: string) => Promise<void>
  historyTypes: any[]
  fetchHistoryTypes: () => Promise<void>
}

export const useRouteHistory = (): UseRouteHistoryResult => {
  const [history, setHistory] = useState<HistoryWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [historyTypes, setHistoryTypes] = useState<any[]>([])

  // Converte eventos sintéticos (ciclo de vida) para o formato HistoryWithDetails
  const toConverted = useCallback((routeHistory: RouteHistoryItem[]): HistoryWithDetails[] =>
    routeHistory.map((h) => ({
      id: h.id,
      id_route: '',
      id_history_type: null,
      event_at: h.event_at,
      description: h.event_label,
      is_active: true,
      is_test: IS_TEST,
      created_at: h.event_at,
      updated_at: h.event_at,
      history_type: {
        id: `synthetic-${h.event_type}`,
        code: h.event_type,
        description: h.event_label,
        is_active: true,
        is_test: IS_TEST,
        created_at: h.event_at,
        updated_at: h.event_at,
      },
      metadata: h.metadata ?? undefined,
    } as unknown as HistoryWithDetails)), [])

  const fetchHistory = useCallback(async (routeId: string) => {
    setLoading(true)
    setError(null)
    try {
      // Ciclo de vida (Rota Criada, Em Andamento, entregas, Finalizada) —
      // derivado dos dados da rota. Sempre computado.
      let synthetic: HistoryWithDetails[] = []
      try {
        synthetic = toConverted(await routeService.getHistory(routeId))
      } catch (e) {
        console.warn('[useRouteHistory] getHistory (sintético) falhou:', e)
      }

      // Eventos reais em trx_route_history (inclui a Chegada ao Cliente).
      let dbHistory: HistoryWithDetails[] = []
      try {
        dbHistory = await routeHistoryService.getByRouteId(routeId)
      } catch (e) {
        console.warn('[useRouteHistory] getByRouteId falhou:', e)
      }

      // Mescla: mantém todos os eventos reais e acrescenta os sintéticos cujo
      // código ainda NÃO existe no real (evita duplicar Criada/Em Andamento/
      // entregas já persistidas). Assim a chegada (real) aparece junto do ciclo
      // de vida (sintético), ordenados por data/hora.
      const dbCodes = new Set(
        dbHistory.map((h) => h.history_type?.code).filter(Boolean) as string[]
      )
      const syntheticToAdd = synthetic.filter(
        (s) => !dbCodes.has(s.history_type?.code as string)
      )
      const merged = [...dbHistory, ...syntheticToAdd].sort((a, b) => {
        const ta = a.event_at ? new Date(a.event_at).getTime() : 0
        const tb = b.event_at ? new Date(b.event_at).getTime() : 0
        return ta - tb
      })

      setHistory(merged)
    } catch (err) {
      console.error('[useRouteHistory] Error:', err)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [toConverted])

  const createHistoryEntry = useCallback(async (routeId: string, historyTypeId: string, description?: string) => {
    setLoading(true)
    setError(null)
    try {
      await routeHistoryService.create(routeId, historyTypeId, description)
      // Refresh history after creating new entry
      const data = await routeHistoryService.getByRouteId(routeId)
      setHistory(data)
    } catch (err) {
      setError((err as Error).message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchHistoryTypes = useCallback(async () => {
    try {
      const types = await routeHistoryService.getHistoryTypes()
      setHistoryTypes(types)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  return {
    history,
    loading,
    error,
    fetchHistory,
    createHistoryEntry,
    historyTypes,
    fetchHistoryTypes,
  }
}
