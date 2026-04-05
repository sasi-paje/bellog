import { useState, useEffect, useCallback } from 'react'
import { vehicleService, VehicleListItem, CreateVehicleDTO, UpdateVehicleDTO } from '../services/vehicle.service'

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
  }) => Promise<void>
  createVehicle: (data: CreateVehicleDTO) => Promise<void>
  updateVehicle: (id: string, data: UpdateVehicleDTO) => Promise<void>
  toggleVehicleActive: (id: string) => Promise<void>
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
    getVehicleById,
  }
}
