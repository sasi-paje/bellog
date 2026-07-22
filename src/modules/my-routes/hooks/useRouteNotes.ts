/**
 * Hook para buscar e gerenciar notas de entrega de uma rota
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { deliveryService, type NoteWithDeliveryResult } from '../../delivery/services/delivery.service'

interface UseRouteNotesResult {
  notes: NoteWithDeliveryResult[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useRouteNotes = (routeId: string | null): UseRouteNotesResult => {
  const [notes, setNotes] = useState<NoteWithDeliveryResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cacheRef = useRef<Map<string, NoteWithDeliveryResult[]>>(new Map())
  const routeIdRef = useRef<string | null>(null)

  const fetchNotes = useCallback(async (id: string, useCache = true) => {
    if (!id) return

    if (useCache && cacheRef.current.has(id)) {
      setNotes(cacheRef.current.get(id) || [])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const notesWithDelivery = await deliveryService.getDeliveryNotesByRoute(id)
      cacheRef.current.set(id, notesWithDelivery)
      setNotes(notesWithDelivery)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar notas'
      setError(errorMessage)
      console.error('[useRouteNotes] Error fetching notes:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refetch = useCallback(() => {
    if (routeIdRef.current) {
      cacheRef.current.delete(routeIdRef.current)
      fetchNotes(routeIdRef.current, false)
    }
  }, [fetchNotes])

  useEffect(() => {
    routeIdRef.current = routeId
    if (routeId) {
      fetchNotes(routeId)
    } else {
      setNotes([])
      setError(null)
    }
  }, [routeId, fetchNotes])

  // O mobile não tem realtime: ao voltar o foco para o app (ex.: o operador
  // adicionou a nota no web e o motorista retorna ao app), refaz o fetch
  // ignorando o cache para refletir mudanças de montagem feitas fora do app.
  useEffect(() => {
    const refresh = () => {
      const id = routeIdRef.current
      if (!id) return
      cacheRef.current.delete(id)
      fetchNotes(id, false)
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [fetchNotes])

  return { notes, isLoading, error, refetch }
}

export default useRouteNotes