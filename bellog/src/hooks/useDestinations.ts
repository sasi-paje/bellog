import { useState, useEffect, useCallback } from 'react'
import { companyService, CompanyWithAddress, CompanyFormData } from '../services/company.service'

interface UseDestinationsResult {
  destinations: CompanyWithAddress[]
  total: number
  loading: boolean
  error: string | null
  fetchDestinations: (params?: {
    search?: string
    isActive?: boolean
    page?: number
    limit?: number
  }) => Promise<void>
  getDestinationById: (id: string) => Promise<CompanyWithAddress | null>
  createDestination: (formData: CompanyFormData) => Promise<CompanyWithAddress>
  updateDestination: (id: string, formData: CompanyFormData) => Promise<CompanyWithAddress>
  toggleActive: (id: string, isActive: boolean) => Promise<void>
  cnpjExists: (cnpj: string, excludeId?: string) => Promise<boolean>
}

export const useDestinations = (initialParams?: {
  search?: string
  isActive?: boolean
  page?: number
  limit?: number
}): UseDestinationsResult => {
  const [destinations, setDestinations] = useState<CompanyWithAddress[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDestinations = useCallback(async (params?: {
    search?: string
    isActive?: boolean
    page?: number
    limit?: number
  }) => {
    setLoading(true)
    setError(null)
    try {
      const result = await companyService.listDestinations(params)
      setDestinations(result.data)
      setTotal(result.total)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const getDestinationById = useCallback(async (id: string) => {
    try {
      return await companyService.getById(id)
    } catch (err) {
      setError((err as Error).message)
      return null
    }
  }, [])

  const createDestination = useCallback(async (formData: CompanyFormData) => {
    console.log('[useDestinations] createDestination called:', formData)
    try {
      // Pass 'DESTINATION' role type when creating
      const result = await companyService.createWithAddress(formData, 'DELIVERY', 'DESTINATION')
      console.log('[useDestinations] createWithAddress result:', result)
      const full = await companyService.getById(result.id)
      console.log('[useDestinations] getById result:', full)
      return full as CompanyWithAddress
    } catch (err) {
      console.error('[useDestinations] Error creating destination:', err)
      throw err
    }
  }, [])

  const updateDestination = useCallback(async (id: string, formData: CompanyFormData) => {
    await companyService.updateWithAddress(id, formData)
    return companyService.getById(id) as Promise<CompanyWithAddress>
  }, [])

  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    await companyService.updateCompany(id, { is_active: isActive })
  }, [])

  const cnpjExists = useCallback(async (cnpj: string, excludeId?: string) => {
    return await companyService.cnpjExists(cnpj, excludeId)
  }, [])

  useEffect(() => {
    fetchDestinations(initialParams)
  }, [])

  return {
    destinations,
    total,
    loading,
    error,
    fetchDestinations,
    getDestinationById,
    createDestination,
    updateDestination,
    toggleActive,
    cnpjExists,
  }
}
