import { useState, useEffect, useCallback } from 'react'
import { routeService, RouteListItem, RouteWithDetails, CreateRouteDTO, UpdateRouteDTO } from '../services/route.service'

interface UseRoutesResult {
  routes: RouteListItem[]
  total: number
  loading: boolean
  error: string | null
  fetchRoutes: (params?: {
    search?: string
    isActive?: boolean
    page?: number
    limit?: number
  }) => Promise<void>
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

  const fetchRoutes = useCallback(async (params?: {
    search?: string
    isActive?: boolean
    page?: number
    limit?: number
  }) => {
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
    await routeService.update(id, dto)
    return routeService.getById(id)
  }, [])

  const deleteRoute = useCallback(async (id: string) => {
    await routeService.delete(id)
  }, [])

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
