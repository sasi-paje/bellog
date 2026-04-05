import { useState, useEffect, useCallback } from 'react'
import { companyService, CompanyWithAddress, CompanyFormData } from '../services/company.service'

interface UseSuppliersResult {
  suppliers: CompanyWithAddress[]
  total: number
  loading: boolean
  error: string | null
  fetchSuppliers: (params?: {
    search?: string
    isActive?: boolean
    page?: number
    limit?: number
  }) => Promise<void>
  getSupplierById: (id: string) => Promise<CompanyWithAddress | null>
  createSupplier: (formData: CompanyFormData) => Promise<CompanyWithAddress>
  updateSupplier: (id: string, formData: CompanyFormData) => Promise<CompanyWithAddress>
  toggleActive: (id: string, isActive: boolean) => Promise<void>
  cnpjExists: (cnpj: string, excludeId?: string) => Promise<boolean>
}

export const useSuppliers = (initialParams?: {
  search?: string
  isActive?: boolean
  page?: number
  limit?: number
}): UseSuppliersResult => {
  const [suppliers, setSuppliers] = useState<CompanyWithAddress[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSuppliers = useCallback(async (params?: {
    search?: string
    isActive?: boolean
    page?: number
    limit?: number
  }) => {
    setLoading(true)
    setError(null)
    try {
      const result = await companyService.listSuppliers(params)
      setSuppliers(result.data)
      setTotal(result.total)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const getSupplierById = useCallback(async (id: string) => {
    try {
      return await companyService.getById(id)
    } catch (err) {
      setError((err as Error).message)
      return null
    }
  }, [])

  const createSupplier = useCallback(async (formData: CompanyFormData) => {
    // Pass 'SUPPLIER' role type when creating
    const result = await companyService.createWithAddress(formData, 'DELIVERY', 'SUPPLIER')
    return companyService.getById(result.id) as Promise<CompanyWithAddress>
  }, [])

  const updateSupplier = useCallback(async (id: string, formData: CompanyFormData) => {
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
    fetchSuppliers(initialParams)
  }, [])

  return {
    suppliers,
    total,
    loading,
    error,
    fetchSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    toggleActive,
    cnpjExists,
  }
}
