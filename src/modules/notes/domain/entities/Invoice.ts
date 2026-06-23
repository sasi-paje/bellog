import { Entity } from '../../../../shared/base/Entity'
import { InvoiceId } from '../value-objects/InvoiceId'
import { InvoiceStatusValues, getStatusDescription } from '../value-objects/InvoiceStatus'

export { InvoiceStatusValues, getStatusDescription } from '../value-objects/InvoiceStatus'

export interface CreateInvoiceProps {
  invoice_number: string
  serie?: string
  id_supplier_company: string
  id_customer_company: string
  net_weight: number
  gross_weight: number
  box_quantity: number
  invoice_amount: number
  invoice_issue_date?: string
  attempt_number?: number
}

export interface UpdateInvoiceProps {
  invoice_number?: string
  box_quantity?: number
  net_weight?: number
  gross_weight?: number
  attempt_number?: number
}

export class Invoice extends Entity<InvoiceId> {
  private constructor(
    public readonly id: InvoiceId,
    public readonly invoiceNumber: string,
    public readonly supplierId: string,
    public readonly destinationId: string,
    public readonly netWeight: number,
    public readonly grossWeight: number,
    public readonly boxQuantity: number,
    public readonly value: number,
    public readonly status: InvoiceStatusValues,
    public readonly serie?: string,
    public readonly issueDate?: Date,
    public readonly attemptNumber: number = 0,
    public readonly routeId?: string,
    public readonly deliveryId?: string,
    public readonly isActive: boolean = true,
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt?: Date,
    public readonly supplierName?: string,
    public readonly destinationName?: string,
    public readonly routeCode?: string,
  ) {
    super(id)
  }

  static create(props: CreateInvoiceProps): Invoice {
    if (props.gross_weight < props.net_weight) {
      throw new Error('Gross weight must be greater than or equal to net weight')
    }
    if (props.box_quantity <= 0) {
      throw new Error('Box quantity must be positive')
    }
    if (props.invoice_amount < 0) {
      throw new Error('Invoice amount cannot be negative')
    }

    return new Invoice(
      InvoiceId.create(),
      props.invoice_number,
      props.id_supplier_company,
      props.id_customer_company,
      props.net_weight,
      props.gross_weight,
      props.box_quantity,
      props.invoice_amount,
      'PENDING',
      props.serie,
      props.invoice_issue_date ? new Date(props.invoice_issue_date) : undefined,
      props.attempt_number ?? 0,
    )
  }

  get isAssigned(): boolean {
    return this.routeId !== undefined
  }

  get isDelivered(): boolean {
    return this.status === 'DELIVERED'
  }

  get canEdit(): boolean {
    return this.isActive && !this.isAssigned
  }
}

export interface InvoiceViewModel {
  id: string
  invoice_number: string
  invoice_series: string | null
  tripNumber?: string
  invoice_issue_date: string | null
  box_quantity: number | null
  gross_weight: number | null
  net_weight: number | null
  invoice_amount: number | null
  attempt_number: number | null
  is_active: boolean
  created_at: string
  updated_at: string | null

  supplier_id: string | null
  supplier_trade_name: string | null
  supplier_legal_name: string | null
  supplier_cnpj: string | null

  destination_id: string | null
  destination_trade_name: string | null
  destination_legal_name: string | null
  destination_cnpj: string | null

  route_id: string | null
  route_code: string | null
  departure_date: string | null
  vehicle_plate: string | null
  driver_name: string | null

  delivery_id: string | null
  delivery_status: string | null
  delivery_type: string | null
  delivery_reason: string | null
  receipt_image_path: string | null
  nfd_image_path: string | null
  nfd_number: string | null
  delivered_at: string | null

  invoice_status_id: string | null
  invoice_status_code: string | null
  invoice_status_description: string | null

  has_route: boolean
  can_edit: boolean
  computed_status: InvoiceStatusValues
}
