import { useState, useCallback } from 'react'
import { assignmentService } from '../features/assignments'

interface UseAssignmentsResult {
  loading: boolean
  error: string | null
  assignInvoice: (routeId: string, invoiceId: string) => Promise<void>
  unassignInvoice: (routeId: string, invoiceId: string) => Promise<void>
  getInvoicesByRouteId: (routeId: string) => Promise<any[]>
  getActiveRouteForInvoice: (invoiceId: string) => Promise<any | null>
  getUnassignedInvoices: () => Promise<{ id: string; invoice_number: string }[]>
  getRouteCurrentLoad: (routeId: string) => Promise<number>
}

export const useAssignments = (): UseAssignmentsResult => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const assignInvoice = useCallback(async (routeId: string, invoiceId: string) => {
    setLoading(true)
    setError(null)
    try {
      await assignmentService.assignInvoiceToRoute(routeId, invoiceId)
    } catch (err) {
      setError((err as Error).message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const unassignInvoice = useCallback(async (routeId: string, invoiceId: string) => {
    setLoading(true)
    setError(null)
    try {
      await assignmentService.unassignInvoiceFromRoute(routeId, invoiceId)
    } catch (err) {
      setError((err as Error).message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const getInvoicesByRouteId = useCallback(async (routeId: string) => {
    try {
      return await assignmentService.getInvoicesByRouteId(routeId)
    } catch (err) {
      setError((err as Error).message)
      return []
    }
  }, [])

  const getActiveRouteForInvoice = useCallback(async (invoiceId: string) => {
    try {
      return await assignmentService.getActiveRouteForInvoice(invoiceId)
    } catch (err) {
      setError((err as Error).message)
      return null
    }
  }, [])

  const getUnassignedInvoices = useCallback(async () => {
    try {
      return await assignmentService.getUnassignedInvoices()
    } catch (err) {
      setError((err as Error).message)
      return []
    }
  }, [])

  const getRouteCurrentLoad = useCallback(async (routeId: string) => {
    try {
      return await assignmentService.getRouteCurrentLoad(routeId)
    } catch (err) {
      setError((err as Error).message)
      return 0
    }
  }, [])

  return {
    loading,
    error,
    assignInvoice,
    unassignInvoice,
    getInvoicesByRouteId,
    getActiveRouteForInvoice,
    getUnassignedInvoices,
    getRouteCurrentLoad,
  }
}
