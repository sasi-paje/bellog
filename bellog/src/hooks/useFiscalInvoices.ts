import { useState, useEffect, useCallback } from 'react'
import { fiscalInvoiceService, InvoiceListItem, FiscalInvoiceWithDetails, CreateInvoiceDTO, UpdateInvoiceDTO } from '../services/fiscal-invoice.service'

interface CreateInvoiceFormData {
  invoice_number: string
  quantity: number
  delivery_location: string
  supplier: string
  net_weight: number
  gross_weight: number
}

interface UseFiscalInvoicesResult {
  invoices: InvoiceListItem[]
  total: number
  loading: boolean
  error: string | null
  fetchInvoices: (params?: {
    search?: string
    isActive?: boolean
    showCancelled?: boolean
    idRoute?: string
    page?: number
    limit?: number
  }) => Promise<void>
  fetchUnassignedInvoices: (params?: {
    search?: string
    page?: number
    limit?: number
  }) => Promise<void>
  createInvoice: (data: CreateInvoiceFormData) => Promise<void>
  getInvoiceById: (id: string) => Promise<FiscalInvoiceWithDetails | null>
  getInvoicesByRouteId: (routeId: string) => Promise<InvoiceListItem[]>
  referenceData: {
    statuses: any[]
    receiptStatuses: any[]
    nfdStatuses: any[]
    totalStatuses: any[]
  } | null
  fetchReferenceData: () => Promise<void>
}

export const useFiscalInvoices = (initialParams?: {
  search?: string
  isActive?: boolean
  showCancelled?: boolean
  idRoute?: string
  page?: number
  limit?: number
}): UseFiscalInvoicesResult => {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [referenceData, setReferenceData] = useState<UseFiscalInvoicesResult['referenceData']>(null)

  const fetchInvoices = useCallback(async (params?: {
    search?: string
    isActive?: boolean
    showCancelled?: boolean
    idRoute?: string
    page?: number
    limit?: number
  }) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fiscalInvoiceService.list(params)
      setInvoices(result.data)
      setTotal(result.total)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchUnassignedInvoices = useCallback(async (params?: {
    search?: string
    page?: number
    limit?: number
  }) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fiscalInvoiceService.listUnassigned(params)
      setInvoices(result.data)
      setTotal(result.total)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const getInvoiceById = useCallback(async (id: string) => {
    try {
      return await fiscalInvoiceService.getById(id)
    } catch (err) {
      setError((err as Error).message)
      return null
    }
  }, [])

  const getInvoicesByRouteId = useCallback(async (routeId: string) => {
    try {
      return await fiscalInvoiceService.getByRouteId(routeId)
    } catch (err) {
      setError((err as Error).message)
      return []
    }
  }, [])

  const createInvoice = useCallback(async (formData: CreateInvoiceFormData) => {
    setLoading(true)
    setError(null)
    try {
      await fiscalInvoiceService.createFromForm(formData)
      // Refresh the list - use default params
      const result = await fiscalInvoiceService.list({ isActive: true, page: 1, limit: 20 })
      setInvoices(result.data)
      setTotal(result.total)
    } catch (err) {
      console.error('[useFiscalInvoices] Error:', err)
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchReferenceData = useCallback(async () => {
    try {
      const data = await fiscalInvoiceService.getReferenceData()
      setReferenceData(data)
    } catch (err) {
      setError((err as Error).message)
    }
  }, [])

  useEffect(() => {
    if (initialParams) {
      fetchInvoices(initialParams)
    }
  }, [])

  return {
    invoices,
    total,
    loading,
    error,
    fetchInvoices,
    fetchUnassignedInvoices,
    createInvoice,
    getInvoiceById,
    getInvoicesByRouteId,
    referenceData,
    fetchReferenceData,
  }
}
