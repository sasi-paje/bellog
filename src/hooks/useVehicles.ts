import { useState, useEffect, useCallback } from 'react'
import { vehicleService, VehicleListItem, CreateVehicleDTO, UpdateVehicleDTO } from '../features/vehicles'
import { useRealtimeVehicles } from './useRealtime'

interface UseVehiclesResult {
  vehicles: VehicleListItem[]
  total: number
  loading: boolean
  error: string | null
  fetchVehicles: (params?: {
    search?: string
    isActive?: boolean
    showInactive?: boolean
    page?: number
    limit?: number
    max_capacity?: number
    responsible_name?: string
    responsible_type?: string
  }) => Promise<void>
  createVehicle: (data: CreateVehicleDTO) => Promise<void>
  updateVehicle: (id: string, data: UpdateVehicleDTO) => Promise<void>
  toggleVehicleActive: (id: string) => Promise<void>
  setVehicleActive: (id: string, isActive: boolean) => Promise<void>
  getVehicleById: (id: string) => Promise<VehicleListItem | null>
}

export const useVehicles = (initialParams?: {
  search?: string
  isActive?: boolean
  showInactive?: boolean
  page?: number
  limit?: number
}): UseVehiclesResult => {
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchVehicles = useCallback(async (params?: {
    search?: string
    isActive?: boolean
    showInactive?: boolean
    page?: number
    limit?: number
    max_capacity?: number
    responsible_name?: string
    responsible_type?: string
  }) => {
    setLoading(true)
    setError(null)
    try {
      const result = await vehicleService.list(params)
      setVehicles(result.data)
      setTotal(result.total)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const createVehicle = useCallback(async (data: CreateVehicleDTO) => {
    setLoading(true)
    setError(null)
    try {
      await vehicleService.create(data)
      // Refresh the list
      const result = await vehicleService.list({ isActive: true, page: 1, limit: 20 })
      setVehicles(result.data)
      setTotal(result.total)
    } catch (err) {
      setError((err as Error).message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const updateVehicle = useCallback(async (id: string, data: UpdateVehicleDTO) => {
    setLoading(true)
    setError(null)
    try {
      await vehicleService.update(id, data)
      // Refresh the list
      const result = await vehicleService.list({ isActive: true, page: 1, limit: 20 })
      setVehicles(result.data)
      setTotal(result.total)
    } catch (err) {
      setError((err as Error).message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const toggleVehicleActive = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      await vehicleService.toggleActive(id)
      const result = await vehicleService.list({ isActive: true, page: 1, limit: 20 })
      setVehicles(result.data)
      setTotal(result.total)
    } catch (err) {
      setError((err as Error).message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const setVehicleActive = useCallback(async (id: string, isActive: boolean) => {
    await vehicleService.setActive(id, isActive)
  }, [])

  const handleRealtimeUpdate = useCallback((payload: any) => {
    const updated = payload.new
    setVehicles(prev => prev.map(v => v.id === updated.id ? { ...v, plate: updated.plate, is_active: updated.is_active } : v))
  }, [])

  const handleRealtimeInsert = useCallback(() => {
    fetchVehicles({ isActive: true, page: 1, limit: 20 })
  }, [fetchVehicles])

  const handleRealtimeDelete = useCallback((payload: any) => {
    setVehicles(prev => prev.filter(v => v.id !== payload.old.id))
    setTotal(prev => Math.max(0, prev - 1))
  }, [])

  useRealtimeVehicles({
    onUpdate: handleRealtimeUpdate,
    onInsert: handleRealtimeInsert,
    onDelete: handleRealtimeDelete,
    enabled: true,
  })

  const getVehicleById = useCallback(async (id: string) => {
    try {
      return await vehicleService.getById(id)
    } catch (err) {
      setError((err as Error).message)
      return null
    }
  }, [])

  useEffect(() => {
    if (initialParams) {
      fetchVehicles(initialParams)
    }
  }, [])

  return {
    vehicles,
    total,
    loading,
    error,
    fetchVehicles,
    createVehicle,
    updateVehicle,
    toggleVehicleActive,
    setVehicleActive,
    getVehicleById,
  }
}
