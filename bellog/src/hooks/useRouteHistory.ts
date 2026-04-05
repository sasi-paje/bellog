import { useState, useEffect, useCallback } from 'react'
import { routeHistoryService, HistoryWithDetails } from '../services/route-history.service'

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
      const data = await routeHistoryService.getByRouteId(routeId)
      setHistory(data)
    } catch (err) {
      setError((err as Error).message)
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
