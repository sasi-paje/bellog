import { useState, useEffect, useCallback } from 'react'
import { fiscalInvoiceService, InvoiceListItem, FiscalInvoiceWithDetails, CreateInvoiceDTO, UpdateInvoiceDTO } from '../features/notes'
import { useRealtimeInvoices } from './useRealtime'

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
    showInactive?: boolean
    idRoute?: string
    page?: number
    limit?: number
    supplierGroupIds?: string[]
    supplierIds?: string[]
    destinationIds?: string[]
    invoiceNumberStart?: number
    invoiceNumberEnd?: number
    tripNumber?: string
    attemptMin?: number
    attemptMax?: number
    boxMin?: number
    boxMax?: number
    grossWeightMin?: number
    grossWeightMax?: number
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
  supplierGroupIds?: string[]
}): UseFiscalInvoicesResult => {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [referenceData, setReferenceData] = useState<UseFiscalInvoicesResult['referenceData']>(null)

  const fetchInvoices = useCallback(async (params?: {
    search?: string
    isActive?: boolean
    showInactive?: boolean
    idRoute?: string
    page?: number
    limit?: number
    supplierGroupIds?: string[]
    supplierIds?: string[]
    destinationIds?: string[]
    invoiceNumberStart?: number
    invoiceNumberEnd?: number
    tripNumber?: string
    attemptMin?: number
    attemptMax?: number
    boxMin?: number
    boxMax?: number
    grossWeightMin?: number
    grossWeightMax?: number
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

  const handleRealtimeUpdate = useCallback((payload: any) => {
    const updatedInvoice = payload.new
    setInvoices(prev => prev.map(inv => {
      if (inv.id === updatedInvoice.id) {
        return {
          ...inv,
          invoice_status: updatedInvoice.id_fiscal_invoice_status || inv.invoice_status,
          receipt_status: updatedInvoice.id_receipt_status || inv.receipt_status,
        }
      }
      return inv
    }))
  }, [])

  const handleRealtimeInsert = useCallback(() => {
    fetchInvoices({ isActive: true, page: 1, limit: 20 })
  }, [fetchInvoices])

  const handleRealtimeDelete = useCallback((payload: any) => {
    setInvoices(prev => prev.filter(inv => inv.id !== payload.old.id))
    setTotal(prev => Math.max(0, prev - 1))
  }, [])

  useRealtimeInvoices({
    onUpdate: handleRealtimeUpdate,
    onInsert: handleRealtimeInsert,
    onDelete: handleRealtimeDelete,
    enabled: true,
  })

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
