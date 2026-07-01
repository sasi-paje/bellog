import { useEffect, useRef, useCallback } from 'react'
import { supabase, IS_TEST } from '../lib/supabase'

export type TableName = 'trx_route' | 'trx_fiscal_invoice' | 'master_fleet_vehicle' | 'master_person_driver' | 'master_person_company'

interface UseRealtimeOptions {
  table: TableName
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
  enabled?: boolean
}

export const useRealtime = ({
  table,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: UseRealtimeOptions) => {
  const onInsertRef = useRef(onInsert)
  const onUpdateRef = useRef(onUpdate)
  const onDeleteRef = useRef(onDelete)

  useEffect(() => {
    onInsertRef.current = onInsert
    onUpdateRef.current = onUpdate
    onDeleteRef.current = onDelete
  }, [onInsert, onUpdate, onDelete])

  useEffect(() => {
    if (!enabled) return

    const isTest = IS_TEST

    const channel = supabase
      .channel(`${table}-realtime-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table,
          filter: isTest ? `is_test=eq.${isTest}` : undefined,
        },
        (payload) => {
          console.log(`[Realtime] ${table} INSERT:`, payload)
          onInsertRef.current?.(payload)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table,
          filter: isTest ? `is_test=eq.${isTest}` : undefined,
        },
        (payload) => {
          console.log(`[Realtime] ${table} UPDATE:`, payload)
          onUpdateRef.current?.(payload)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table,
          filter: isTest ? `is_test=eq.${isTest}` : undefined,
        },
        (payload) => {
          console.log(`[Realtime] ${table} DELETE:`, payload)
          onDeleteRef.current?.(payload)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, enabled])
}

export const useRealtimeRoutes = (options: {
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
  enabled?: boolean
}) => {
  return useRealtime({ table: 'trx_route', ...options })
}

export const useRealtimeInvoices = (options: {
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
  enabled?: boolean
}) => {
  return useRealtime({ table: 'trx_fiscal_invoice', ...options })
}

export const useRealtimeVehicles = (options: {
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
  enabled?: boolean
}) => {
  return useRealtime({ table: 'master_fleet_vehicle', ...options })
}