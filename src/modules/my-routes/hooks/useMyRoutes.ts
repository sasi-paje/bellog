/**
 * Hook para gerenciar o estado da feature Minhas Rotas (Mobile)
 * Refatorado com error handling adequado e estados tipados
 */

import { useState, useEffect, useCallback } from 'react'
import { myRoutesService, MyRoutesServiceError } from '../services/my-routes.service'
import type {
  MyRouteListItem,
  MyRouteDetail,
  MyRoutesTab,
  StartRouteConfirmData,
} from '../types/my-routes.types'

interface UseMyRoutesResult {
  activeTab: MyRoutesTab
  setActiveTab: (tab: MyRoutesTab) => void

  routesInProgress: MyRouteListItem[]
  availableRoutes: MyRouteListItem[]
  completedRoutes: MyRouteListItem[]
  selectedRoute: MyRouteDetail | null
  selectedRouteId: string | null

  isLoading: boolean
  isLoadingDetail: boolean
  error: string | null
  errorDetail: string | null
  isDetailOpen: boolean

  confirmStartData: StartRouteConfirmData | null
  confirmCompleteData: MyRouteListItem | null

  successMessage: string | null

  fetchRoutes: () => Promise<void>
  openRouteDetail: (routeId: string) => Promise<void>
  closeRouteDetail: () => void
  openStartConfirm: (route: MyRouteListItem | MyRouteDetail) => void
  closeStartConfirm: () => void
  openCompleteConfirm: (route: MyRouteListItem | MyRouteDetail) => void
  closeCompleteConfirm: () => void
  startRoute: (routeId: string) => Promise<void>
  completeRoute: (routeId: string) => Promise<void>
  clearSuccessMessage: () => void
  clearError: () => void
}

export const useMyRoutes = (driverId?: string | null): UseMyRoutesResult => {
  const [activeTab, setActiveTab] = useState<MyRoutesTab>('available')

  const [routesInProgress, setRoutesInProgress] = useState<MyRouteListItem[]>([])
  const [availableRoutes, setAvailableRoutes] = useState<MyRouteListItem[]>([])
  const [completedRoutes, setCompletedRoutes] = useState<MyRouteListItem[]>([])

  const [selectedRoute, setSelectedRoute] = useState<MyRouteDetail | null>(null)
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const [confirmStartData, setConfirmStartData] = useState<StartRouteConfirmData | null>(null)
  const [confirmCompleteData, setConfirmCompleteData] = useState<MyRouteListItem | null>(null)

  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const categorizeRoutes = useCallback((routes: MyRouteListItem[]) => {
    const inProgress: MyRouteListItem[] = []
    const available: MyRouteListItem[] = []
    const completed: MyRouteListItem[] = []

    routes.forEach(route => {
      switch (route.status) {
        case 'in_progress':
          inProgress.push(route)
          break
        case 'completed':
          completed.push(route)
          break
        case 'available':
        default:
          available.push(route)
          break
      }
    })

    return { inProgress, available, completed }
  }, [])

  const fetchRoutes = useCallback(async () => {
    if (!driverId) {
      setRoutesInProgress([])
      setAvailableRoutes([])
      setCompletedRoutes([])
      setError('Motorista nao identificado para carregar rotas')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await myRoutesService.list({ driverId })

      const { inProgress, available, completed } = categorizeRoutes(result.data)

      setRoutesInProgress(inProgress)
      setAvailableRoutes(available)
      setCompletedRoutes(completed)
    } catch (err) {
      const errorMessage = err instanceof MyRoutesServiceError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Erro ao carregar rotas'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [categorizeRoutes, driverId])

  const openRouteDetail = useCallback(async (routeId: string) => {
    if (!routeId) return

    setSelectedRouteId(routeId)
    setSelectedRoute(null)
    setIsDetailOpen(true)
    setIsLoadingDetail(true)
    setErrorDetail(null)

    try {
      const detail = await myRoutesService.getById(routeId, driverId)
      setSelectedRoute(detail)
      setIsDetailOpen(true)
    } catch (err) {
      // Rota não encontrada = foi inativada/cancelada pela operação. Mostra
      // mensagem clara e atualiza a lista para a rota sumir de "Em Andamento".
      const isNotFound = err instanceof MyRoutesServiceError && err.code === 'NOT_FOUND'
      const errorMessage = isNotFound
        ? 'Esta rota não está mais disponível. Ela foi cancelada ou inativada pela operação. Volte para a lista de rotas ou entre em contato com o responsável.'
        : err instanceof MyRoutesServiceError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Erro ao carregar detalhes da rota'
      setSelectedRoute(null)
      setErrorDetail(errorMessage)
      if (isNotFound) {
        void fetchRoutes()
      }
    } finally {
      setIsLoadingDetail(false)
    }
  }, [driverId, fetchRoutes])

  const closeRouteDetail = useCallback(() => {
    setIsDetailOpen(false)
    setSelectedRoute(null)
    setSelectedRouteId(null)
    setErrorDetail(null)
  }, [])

  const openStartConfirm = useCallback((route: MyRouteListItem | MyRouteDetail) => {
    setConfirmStartData({
      route_id: route.id,
      route_code: route.route_code,
      area_description: route.area_description,
    })
  }, [])

  const closeStartConfirm = useCallback(() => {
    setConfirmStartData(null)
  }, [])

  const openCompleteConfirm = useCallback((route: MyRouteListItem | MyRouteDetail) => {
    setConfirmCompleteData(route as MyRouteListItem)
  }, [])

  const closeCompleteConfirm = useCallback(() => {
    setConfirmCompleteData(null)
  }, [])

  const startRoute = useCallback(async (routeId: string) => {
    if (!routeId) return

    // Regra: o motorista só pode ter uma rota em andamento por vez.
    // Bloqueio imediato quando já existe rota em andamento (o serviço revalida).
    if (routesInProgress.length > 0) {
      setConfirmStartData(null)
      setError('Você já possui uma rota em andamento. Finalize-a antes de iniciar outra.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await myRoutesService.startRoute(routeId)
      setConfirmStartData(null)
      setIsDetailOpen(false)
      setSelectedRoute(null)
      setSelectedRouteId(null)
      setSuccessMessage('Rota iniciada com sucesso')
      await fetchRoutes()
    } catch (err) {
      const errorMessage = err instanceof MyRoutesServiceError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Erro ao iniciar rota'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [fetchRoutes, routesInProgress])

  const completeRoute = useCallback(async (routeId: string) => {
    if (!routeId) return

    setIsLoading(true)
    setError(null)

    try {
      await myRoutesService.completeRoute(routeId)
      setConfirmCompleteData(null)
      setSuccessMessage('Rota finalizada com sucesso')
      await fetchRoutes()

      if (selectedRouteId === routeId) {
        closeRouteDetail()
      }
    } catch (err) {
      const errorMessage = err instanceof MyRoutesServiceError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Erro ao finalizar rota'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [fetchRoutes, closeRouteDetail, selectedRouteId])

  const clearSuccessMessage = useCallback(() => {
    setSuccessMessage(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
    setErrorDetail(null)
  }, [])

  useEffect(() => {
    fetchRoutes()
  }, [fetchRoutes])

  // Sem realtime no mobile: ao voltar o foco para o app, atualiza a lista e,
  // se houver um detalhe aberto, recarrega-o — reflete mudanças feitas no web
  // (ex.: notas adicionadas/removidas, rota cancelada) sem exigir reabrir.
  useEffect(() => {
    const refresh = () => {
      void fetchRoutes()
      if (selectedRouteId) {
        void openRouteDetail(selectedRouteId)
      }
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
  }, [fetchRoutes, openRouteDetail, selectedRouteId])

  return {
    activeTab,
    setActiveTab,

    routesInProgress,
    availableRoutes,
    completedRoutes,
    selectedRoute,
    selectedRouteId,

    isLoading,
    isLoadingDetail,
    error,
    errorDetail,
    isDetailOpen,

    confirmStartData,
    confirmCompleteData,

    successMessage,

    fetchRoutes,
    openRouteDetail,
    closeRouteDetail,
    openStartConfirm,
    closeStartConfirm,
    openCompleteConfirm,
    closeCompleteConfirm,
    startRoute,
    completeRoute,
    clearSuccessMessage,
    clearError,
  }
}

export default useMyRoutes
