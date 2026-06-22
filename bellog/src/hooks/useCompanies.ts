import { useState, useEffect, useCallback } from 'react'
import { companyService, CompanyWithDetails, CreateCompanyDTO, UpdateCompanyDTO } from '../features/companies'

interface UseCompaniesResult {
  companies: CompanyWithDetails[]
  total: number
  loading: boolean
  error: string | null
  fetchCompanies: (params?: {
    search?: string
    isActive?: boolean
    page?: number
    limit?: number
  }) => Promise<void>
  getCompanyById: (id: string) => Promise<CompanyWithDetails | null>
  createCompany: (dto: CreateCompanyDTO) => Promise<CompanyWithDetails>
  updateCompany: (id: string, dto: UpdateCompanyDTO) => Promise<CompanyWithDetails>
  deleteCompany: (id: string) => Promise<void>
  referenceData: {
    roleTypes: any[]
    addressTypes: any[]
  } | null
  fetchReferenceData: () => Promise<void>
}

export const useCompanies = (initialParams?: {
  search?: string
  isActive?: boolean
  page?: number
  limit?: number
}): UseCompaniesResult => {
  const [companies, setCompanies] = useState<CompanyWithDetails[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [referenceData, setReferenceData] = useState<UseCompaniesResult['referenceData']>(null)

  const fetchCompanies = useCallback(async (params?: {
    search?: string
    isActive?: boolean
    page?: number
    limit?: number
  }) => {
    setLoading(true)
    setError(null)
    try {
      const result = await companyService.list(params)
      setCompanies(result.data)
      setTotal(result.total)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const getCompanyById = useCallback(async (id: string) => {
    try {
      return await companyService.getById(id)
    } catch (err) {
      setError((err as Error).message)
      return null
    }
  }, [])

  const createCompany = useCallback(async (dto: CreateCompanyDTO) => {
    const result = await companyService.create(dto)
    return companyService.getById(result.id)
  }, [])

  const updateCompany = useCallback(async (id: string, dto: UpdateCompanyDTO) => {
    await companyService.update(id, dto)
    return companyService.getById(id)
  }, [])

  const deleteCompany = useCallback(async (id: string) => {
    await companyService.delete(id)
  }, [])

  const fetchReferenceData = useCallback(async () => {
    try {
      const [roleTypes, addressTypes] = await Promise.all([
        companyService.getRoleTypes(),
        companyService.getAddressTypes(),
      ])
      setReferenceData({ roleTypes, addressTypes })
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  useEffect(() => {
    if (initialParams) {
      fetchCompanies(initialParams)
    }
  }, [])

  return {
    companies,
    total,
    loading,
    error,
    fetchCompanies,
    getCompanyById,
    createCompany,
    updateCompany,
    deleteCompany,
    referenceData,
    fetchReferenceData,
  }
}
