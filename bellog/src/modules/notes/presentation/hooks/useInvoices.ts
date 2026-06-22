import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useDeferredValue, useState } from 'react'
import { InvoiceViewModel } from '../domain/entities/Invoice'
import { SupabaseInvoiceRepository } from '../infrastructure/persistence/SupabaseInvoiceRepository'
import { LocalCacheService } from '../infrastructure/cache/CacheService'
import { validateCreateInvoice, validateUpdateInvoice, sanitizeInvoiceInput, ListInvoicesFilter } from '../schemas/invoice.validation'
import { CreateInvoiceInput, UpdateInvoiceInput } from '../schemas/invoice.validation'

const repository = new SupabaseInvoiceRepository()
const cacheService = new LocalCacheService()

const QUERY_KEYS = {
  invoices: {
    all: ['invoices'] as const,
    list: (filters: ListInvoicesFilter) => [...QUERY_KEYS.invoices.all, 'list', filters] as const,
    detail: (id: string) => [...QUERY_KEYS.invoices.all, 'detail', id] as const,
  },
}

interface UseInvoicesOptions {
  filters: ListInvoicesFilter
}

interface UseInvoicesResult {
  invoices: InvoiceViewModel[]
  total: number
  page: number
  totalPages: number
  isLoading: boolean
  isFetching: boolean
  isPreviousData: boolean
  error: Error | null
  pagination: {
    currentPage: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
    goTo: (page: number) => void
  }
  filters: ListInvoicesFilter
  updateFilters: (newFilters: Partial<ListInvoicesFilter>) => void
  clearFilters: () => void
  refresh: () => void
  search: (term: string) => void
}

export function useInvoices(options: UseInvoicesOptions): UseInvoicesResult {
  const queryClient = useQueryClient()
  const [localFilters, setLocalFilters] = useState<ListInvoicesFilter>(options.filters)

  const query = useQuery({
    queryKey: QUERY_KEYS.invoices.list(localFilters),
    queryFn: () => repository.findWithRelations({
      filters: localFilters,
      pagination: { page: localFilters.page ?? 1, limit: localFilters.limit ?? 20 },
    }),
    staleTime: localFilters.search ? 30_000 : 60_000,
    placeholderData: (previousData) => previousData,
  })

  const updateFilters = useCallback((newFilters: Partial<ListInvoicesFilter>) => {
    setLocalFilters(prev => ({
      ...prev,
      ...newFilters,
      page: newFilters.page !== undefined ? newFilters.page : 1,
    }))
  }, [])

  const clearFilters = useCallback(() => {
    setLocalFilters({ page: 1, limit: 20 })
  }, [])

  const search = useCallback((term: string) => {
    updateFilters({ search: term || undefined, page: 1 })
  }, [updateFilters])

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoices.list(localFilters) })
  }, [queryClient, localFilters])

  const goToPage = useCallback((page: number) => {
    updateFilters({ page })
  }, [updateFilters])

  return {
    invoices: query.data?.data ?? [],
    total: query.data?.total ?? 0,
    page: query.data?.pagination?.page ?? localFilters.page ?? 1,
    totalPages: Math.ceil((query.data?.total ?? 0) / (localFilters.limit ?? 20)),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isPreviousData: query.isPreviousData,
    error: query.error as Error | null,
    pagination: {
      currentPage: localFilters.page ?? 1,
      totalPages: Math.ceil((query.data?.total ?? 0) / (localFilters.limit ?? 20)),
      hasNextPage: (localFilters.page ?? 1) < Math.ceil((query.data?.total ?? 0) / (localFilters.limit ?? 20)),
      hasPreviousPage: (localFilters.page ?? 1) > 1,
      goTo: goToPage,
    },
    filters: localFilters,
    updateFilters,
    clearFilters,
    refresh,
    search,
  }
}

export function useInvoiceSearch(initialValue = '') {
  const [searchTerm, setSearchTerm] = useState(initialValue)
  const deferredValue = useDeferredValue(searchTerm)

  return {
    searchTerm: deferredValue,
    rawSearchTerm: searchTerm,
    onChange: setSearchTerm,
    isTyping: searchTerm !== deferredValue,
  }
}

export function useInvoiceMutations() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: async (data: CreateInvoiceInput) => {
      const validated = validateCreateInvoice(data)
      const sanitized = sanitizeInvoiceInput(validated)
      return repository.create(sanitized)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoices.all })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateInvoiceInput }) => {
      const validated = validateUpdateInvoice(data)
      return repository.update(id, validated)
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.invoices.all })
      const previousData = queryClient.getQueryData(QUERY_KEYS.invoices.all)

      queryClient.setQueryData(QUERY_KEYS.invoices.all, (old: any) => {
        if (!old?.data) return old
        return {
          ...old,
          data: old.data.map((invoice: InvoiceViewModel) =>
            invoice.id === id ? { ...invoice, ...data } : invoice
          ),
        }
      })

      return { previousData }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(QUERY_KEYS.invoices.all, context.previousData)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoices.all })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => repository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoices.all })
    },
  })

  return {
    createInvoice: createMutation.mutate,
    updateInvoice: updateMutation.mutate,
    deleteInvoice: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useInvoiceDetail(invoiceId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.invoices.detail(invoiceId),
    queryFn: () => repository.findById(invoiceId),
    staleTime: 60_000,
    enabled: !!invoiceId,
  })
}