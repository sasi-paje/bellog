import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface MotivosData {
  id: string
  motivo: string
  tipoEntrega: string
  categoria: string
  status: string
  isActive: boolean
  idReasonType: number | null
  idReasonCategory: number | null
  sortOrder: number | null
}

export interface ReasonType {
  id: number
  code: string | null
  name: string | null
  description: string | null
  is_active: boolean
}

export interface ReasonCategory {
  id: number
  name: string | null
}

interface UseMotivosResult {
  data: MotivosData[]
  total: number
  loading: boolean
  error: string | null
  reasonTypes: ReasonType[]
  reasonCategories: ReasonCategory[]
  fetchData: (params?: { search?: string; isActive?: boolean; page?: number; limit?: number; idReasonType?: number | null; idReasonCategory?: number | null; ordenar?: 'categoria' | 'tipo' }) => Promise<void>
  fetchReasonTypes: () => Promise<void>
  fetchReasonCategories: () => Promise<void>
  create: (data: { name: string; id_reason_type: number; id_reason_category?: number | null; is_active: boolean; sort_order?: number }) => Promise<void>
  update: (id: string, data: { name?: string; id_reason_type?: number; id_reason_category?: number | null; is_active?: boolean; sort_order?: number }) => Promise<void>
  toggleActive: (id: string, isActive: boolean) => Promise<void>
}

export const useMotivos = (): UseMotivosResult => {
  const [data, setData] = useState<MotivosData[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reasonTypes, setReasonTypes] = useState<ReasonType[]>([])
  const [reasonCategories, setReasonCategories] = useState<ReasonCategory[]>([])

  const fetchData = useCallback(async (params?: {
    search?: string
    isActive?: boolean
    page?: number
    limit?: number
    idReasonType?: number | null
    idReasonCategory?: number | null
    ordenar?: 'categoria' | 'tipo'
  }) => {
    setLoading(true)
    setError(null)

    try {
      const page = params?.page || 1
      const limit = params?.limit || 20
      const start = (page - 1) * limit
      const end = start + limit - 1

      let query = supabase
        .from('vw_delivery_reasons_admin' as any)
        .select('*', { count: 'exact' })
        .eq('is_test', false)

      if (params?.isActive) {
        query = query.eq('is_active', true)
      }

      if (params?.search) {
        query = query.ilike('name', `%${params.search}%`)
      }

      if (params?.idReasonType != null) {
        query = query.eq('id_reason_type', params.idReasonType)
      }

      if (params?.idReasonCategory != null) {
        query = query.eq('id_reason_category', params.idReasonCategory)
      }

      if (params?.ordenar === 'tipo') {
        query = query
          .order('reason_type_name', { ascending: true, nullsFirst: false })
          .order('name', { ascending: true })
          .order('reason_category_name', { ascending: true, nullsFirst: false })
      } else if (params?.ordenar === 'categoria') {
        query = query
          .order('reason_category_name', { ascending: true, nullsFirst: false })
          .order('name', { ascending: true })
          .order('reason_type_name', { ascending: true, nullsFirst: false })
      } else {
        query = query.order('name', { ascending: true })
      }

      query = query.range(start, end)

      const { data: result, error: fetchError, count } = await query

      if (fetchError) throw new Error(fetchError.message)

      const mapped: MotivosData[] = (result || []).map((row: any) => ({
        id: String(row.id),
        motivo: row.name ?? '-',
        tipoEntrega: row.reason_type_name ?? '-',
        categoria: row.reason_category_name ?? '-',
        status: row.is_active ? 'Ativo' : 'Inativo',
        isActive: row.is_active,
        idReasonType: row.id_reason_type,
        idReasonCategory: row.id_reason_category,
        sortOrder: row.sort_order,
      }))

      setData(mapped)
      setTotal(count || 0)
    } catch (err) {
      setError((err as Error).message)
      console.error('[useMotivos] fetchData error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchReasonTypes = useCallback(async () => {
    try {
      const { data: types, error: fetchError } = await supabase
        .from('ref_delivery_reason_type')
        .select('id, code, name, description, is_active, is_test')
        .eq('is_test', false)
        .eq('is_active', true)
        .order('name')

      if (fetchError) throw new Error(fetchError.message)
      setReasonTypes((types || []) as ReasonType[])
    } catch (err) {
      console.error('[useMotivos] fetchReasonTypes error:', err)
    }
  }, [])

  const fetchReasonCategories = useCallback(async () => {
    try {
      const { data: cats, error: fetchError } = await (supabase as any)
        .from('ref_delivery_reason_category')
        .select('id, name')
        .eq('is_test', false)
        .order('name')

      if (fetchError) throw new Error(fetchError.message)
      setReasonCategories((cats || []) as ReasonCategory[])
    } catch (err) {
      console.error('[useMotivos] fetchReasonCategories error:', err)
    }
  }, [])

  const create = async (item: { name: string; id_reason_type: number; id_reason_category?: number | null; is_active: boolean; sort_order?: number }) => {
    const { error } = await supabase
      .from('ref_delivery_reason')
      .insert({
        name: item.name,
        id_reason_type: item.id_reason_type,
        id_reason_category: item.id_reason_category ?? null,
        is_active: item.is_active,
        is_test: false,
        sort_order: item.sort_order ?? null,
      })

    if (error) throw new Error(error.message)
  }

  const update = async (id: string, item: { name?: string; id_reason_type?: number; id_reason_category?: number | null; is_active?: boolean; sort_order?: number }) => {
    const { error } = await supabase
      .from('ref_delivery_reason')
      .update({ ...item, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw new Error(error.message)
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('ref_delivery_reason')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw new Error(error.message)
  }

  return {
    data,
    total,
    loading,
    error,
    reasonTypes,
    reasonCategories,
    fetchData,
    fetchReasonTypes,
    fetchReasonCategories,
    create,
    update,
    toggleActive,
  }
}
