// Feature Routes - Hook useRoutes
// Hook para gerenciar estado de rotas
// Compartilhado entre admin e mobile

import { useState, useEffect, useCallback } from 'react'
import { routeService, RouteListItem, RouteWithDetails, CreateRouteDTO, UpdateRouteDTO } from '../api'
import { useRealtimeRoutes } from '../../../hooks/useRealtime'

interface FetchRoutesParams {
  search?: string
  isActive?: boolean
  page?: number
  limit?: number
  dataInicio?: string
  dataFim?: string
  status?: string[]
  statusEntrega?: string[]
  motorist?: string[]
  area?: string[]
  veiculo?: string[]
  ordenar?: string
  rotaInicio?: string
  rotaFim?: string
  responsavel?: string
}

interface UseRoutesResult {
  routes: RouteListItem[]
  total: number
  loading: boolean
  error: string | null
  fetchRoutes: (params?: FetchRoutesParams) => Promise<void>
  getRouteById: (id: string) => Promise<RouteWithDetails | null>
  createRoute: (dto: CreateRouteDTO) => Promise<RouteWithDetails>
  updateRoute: (id: string, dto: UpdateRouteDTO) => Promise<RouteWithDetails>
  deleteRoute: (id: string) => Promise<void>
  referenceData: {
    statuses: any[]
    deliveryStatuses: any[]
    routeTypes: any[]
    routeAreas: any[]
    vehicles: any[]
    drivers: any[]
    helpers: any[]
    responsibles: any[]
    companies: { id: string; trade_name: string }[]
  } | null
  fetchReferenceData: () => Promise<void>
}

export const useRoutes = (initialParams?: {
  search?: string
  isActive?: boolean
  page?: number
  limit?: number
}): UseRoutesResult => {
  const [routes, setRoutes] = useState<RouteListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [referenceData, setReferenceData] = useState<UseRoutesResult['referenceData']>(null)

  const fetchRoutes = useCallback(async (params?: FetchRoutesParams) => {
    setLoading(true)
    setError(null)
    try {
      const result = await routeService.list(params)
      setRoutes(result.data)
      setTotal(result.total)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const getRouteById = useCallback(async (id: string) => {
    try {
      return await routeService.getById(id)
    } catch (err) {
      setError((err as Error).message)
      return null
    }
  }, [])

  const createRoute = useCallback(async (dto: CreateRouteDTO) => {
    const result = await routeService.create(dto)
    return routeService.getById(result.id)
  }, [])

  const updateRoute = useCallback(async (id: string, dto: UpdateRouteDTO) => {
    // 1. Update in database
    await routeService.update(id, dto)
    // 2. Get updated route
    const updatedRoute = await routeService.getById(id)
    // 3. Update local state - replace the old item with updated one
    setRoutes(prev => prev.map(r => r.id === id ? {
      ...r,
      status_description: updatedRoute.status?.name || r.status_description,
      delivery_status_description: updatedRoute.delivery_status?.name || r.delivery_status_description,
      vehicle_plate: updatedRoute.vehicle_plate || r.vehicle_plate,
    } : r))
    // 4. Return the full updated route
    return updatedRoute
  }, [])

  const deleteRoute = useCallback(async (id: string) => {
    await routeService.delete(id)
    setRoutes(prev => prev.filter(r => r.id !== id))
    setTotal(prev => Math.max(0, prev - 1))
  }, [])

  const handleRealtimeUpdate = useCallback((payload: any) => {
    const updatedRoute = payload.new
    setRoutes(prev => prev.map(r => {
      if (r.id === updatedRoute.id) {
        return {
          ...r,
          status_description: updatedRoute.id_route_status || r.status,
          delivery_status_description: updatedRoute.id_route_delivery_status || r.delivery_status,
          vehicle_plate: updatedRoute.id_vehicle || r.vehicle_plate,
        }
      }
      return r
    }))
  }, [])

  const handleRealtimeInsert = useCallback(() => {
    fetchRoutes()
  }, [fetchRoutes])

  const handleRealtimeDelete = useCallback((payload: any) => {
    setRoutes(prev => prev.filter(r => r.id !== payload.old.id))
    setTotal(prev => Math.max(0, prev - 1))
  }, [])

  useRealtimeRoutes({
    onUpdate: handleRealtimeUpdate,
    onInsert: handleRealtimeInsert,
    onDelete: handleRealtimeDelete,
    enabled: true,
  })

  const fetchReferenceData = useCallback(async () => {
    try {
      const [statuses, deliveryStatuses, routeTypes, routeAreas, vehicles, drivers, helpers, responsibles, companies] = await Promise.all([
        routeService.getReferenceData(),
        routeService.getDrivers(),
        routeService.getHelpers(),
        routeService.getResponsibles(),
        routeService.getCompanies(),
      ])

      setReferenceData({
        ...statuses,
        drivers,
        helpers,
        responsibles,
        companies,
      })
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  useEffect(() => {
    fetchRoutes(initialParams)
  }, [])

  return {
    routes,
    total,
    loading,
    error,
    fetchRoutes,
    getRouteById,
    createRoute,
    updateRoute,
    deleteRoute,
    referenceData,
    fetchReferenceData,
  }
}