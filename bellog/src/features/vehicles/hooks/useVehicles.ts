import { useState, useEffect, useCallback } from 'react'
import { vehicleService, VehicleListItem, CreateVehicleDTO } from '../api'

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
  getVehicleById: (id: string) => Promise<VehicleListItem | null>
  createVehicle: (dto: CreateVehicleDTO) => Promise<VehicleListItem>
  updateVehicle: (id: string, dto: Partial<CreateVehicleDTO>) => Promise<VehicleListItem>
  toggleActive: (id: string, isActive: boolean) => Promise<void>
}

export const useVehicles = (initialParams?: {
  search?: string
  isActive?: boolean
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

  const getVehicleById = useCallback(async (id: string) => {
    try {
      return await vehicleService.getById(id)
    } catch (err) {
      setError((err as Error).message)
      return null
    }
  }, [])

  const createVehicle = useCallback(async (dto: CreateVehicleDTO) => {
    const result = await vehicleService.create(dto)
    return result
  }, [])

  const updateVehicle = useCallback(async (id: string, dto: Partial<CreateVehicleDTO>) => {
    const result = await vehicleService.update(id, dto)
    return result
  }, [])

  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    await vehicleService.toggleActive(id, isActive)
  }, [])

  useEffect(() => {
    fetchVehicles(initialParams)
  }, [])

  return {
    vehicles,
    total,
    loading,
    error,
    fetchVehicles,
    getVehicleById,
    createVehicle,
    updateVehicle,
    toggleActive,
  }
}