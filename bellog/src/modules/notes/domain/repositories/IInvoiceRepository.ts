import { InvoiceViewModel } from '../entities/Invoice'
import { CreateInvoiceInput, UpdateInvoiceInput, ListInvoicesFilter } from '../../schemas/invoice.validation'

export interface PaginationParams {
  page: number
  limit: number
}

export interface FindInvoicesParams {
  filters: ListInvoicesFilter
  pagination: PaginationParams
  forceRefresh?: boolean
}

export interface FindResult<T> {
  data: T[]
  total: number
  cached: boolean
  queryTimeMs?: number
}

export interface IInvoiceRepository {
  findWithRelations(params: FindInvoicesParams): Promise<FindResult<InvoiceViewModel>>
  findById(id: string): Promise<InvoiceViewModel | null>
  create(data: CreateInvoiceInput): Promise<InvoiceViewModel>
  update(id: string, data: UpdateInvoiceInput): Promise<InvoiceViewModel>
  delete(id: string): Promise<void>
  assignToRoute(invoiceId: string, routeId: string, assignedBy: string): Promise<void>
  unassignFromRoute(invoiceId: string, unassignedBy: string): Promise<void>
}