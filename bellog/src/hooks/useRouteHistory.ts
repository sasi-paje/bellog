import { useState, useEffect, useCallback } from 'react'
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

  const fetchHistory = useCallback(async (routeId: string) => {
    setLoading(true)
    setError(null)
    try {
      // First try to get history from route_history table
      const dbHistory = await routeHistoryService.getByRouteId(routeId)

      // If no history in database, generate from route data
      if (!dbHistory || dbHistory.length === 0) {
        console.log('[useRouteHistory] No history in database, generating from route data')
        const routeHistory = await routeService.getHistory(routeId)

        // Convert routeService history to HistoryWithDetails format
        const convertedHistory: HistoryWithDetails[] = routeHistory.map((h) => ({
          id: h.id,
          id_route: routeId,
          id_history_type: null,
          event_at: h.event_at,
          description: h.event_label,
          is_active: true,
          is_test: true,
          created_at: h.event_at,
          updated_at: h.event_at,
          history_type: {
            id: `synthetic-${h.event_type}`,
            code: h.event_type,
            description: h.event_label,
            is_active: true,
            is_test: true,
            created_at: h.event_at,
            updated_at: h.event_at,
          },
          metadata: h.metadata ?? undefined,
        }))
        setHistory(convertedHistory)
      } else {
        setHistory(dbHistory)
      }
    } catch (err) {
      console.error('[useRouteHistory] Error:', err)
      // Fallback to route data even on error
      try {
        const routeHistory = await routeService.getHistory(routeId)
        const convertedHistory: HistoryWithDetails[] = routeHistory.map((h) => ({
          id: h.id,
          id_route: routeId,
          id_history_type: null,
          event_at: h.event_at,
          description: h.event_label,
          is_active: true,
          is_test: true,
          created_at: h.event_at,
          updated_at: h.event_at,
          history_type: {
            id: `synthetic-${h.event_type}`,
            code: h.event_type,
            description: h.event_label,
            is_active: true,
            is_test: true,
            created_at: h.event_at,
            updated_at: h.event_at,
          },
          metadata: h.metadata ?? undefined,
        }))
        setHistory(convertedHistory)
      } catch (fallbackErr) {
        setError((fallbackErr as Error).message)
      }
    } finally {
      setLoading(false)
    }
  }, [])

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
