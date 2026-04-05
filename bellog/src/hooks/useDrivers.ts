import { useState, useEffect, useCallback } from 'react'
import { driverService, DriverWithAddress, DriverFormData } from '../services/driver.service'

interface UseDriversResult {
  drivers: DriverWithAddress[]
  total: number
  loading: boolean
  error: string | null
  fetchDrivers: (params?: {
    search?: string
    isActive?: boolean
    page?: number
    limit?: number
  }) => Promise<void>
  getDriverById: (id: string) => Promise<DriverWithAddress | null>
  createDriver: (formData: DriverFormData) => Promise<DriverWithAddress>
  updateDriver: (id: string, formData: DriverFormData) => Promise<DriverWithAddress>
  toggleActive: (id: string, isActive: boolean) => Promise<void>
  cpfExists: (cpf: string, excludeId?: string) => Promise<boolean>
}

export const useDrivers = (initialParams?: {
  search?: string
  isActive?: boolean
  page?: number
  limit?: number
}): UseDriversResult => {
  const [drivers, setDrivers] = useState<DriverWithAddress[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDrivers = useCallback(async (params?: {
    search?: string
    isActive?: boolean
    page?: number
    limit?: number
  }) => {
    setLoading(true)
    setError(null)
    try {
      const result = await driverService.list(params)
      setDrivers(result.data)
      setTotal(result.total)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const getDriverById = useCallback(async (id: string) => {
    try {
      return await driverService.getById(id)
    } catch (err) {
      setError((err as Error).message)
      return null
    }
  }, [])

  const createDriver = useCallback(async (formData: DriverFormData) => {
    const result = await driverService.createWithForm(formData)
    return driverService.getById(result.id) as Promise<DriverWithAddress>
  }, [])

  const updateDriver = useCallback(async (id: string, formData: DriverFormData) => {
    await driverService.updateWithForm(id, formData)
    return driverService.getById(id) as Promise<DriverWithAddress>
  }, [])

  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    await driverService.toggleActive(id, isActive)
  }, [])

  const cpfExists = useCallback(async (cpf: string, excludeId?: string) => {
    return await driverService.cpfExists(cpf, excludeId)
  }, [])

  useEffect(() => {
    fetchDrivers(initialParams)
  }, [])

  return {
    drivers,
    total,
    loading,
    error,
    fetchDrivers,
    getDriverById,
    createDriver,
    updateDriver,
    toggleActive,
    cpfExists,
  }
}
