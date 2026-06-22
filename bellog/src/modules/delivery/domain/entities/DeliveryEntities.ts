import { DeliveryType } from '../validators/DeliveryFormSchema'

export interface DeliveryDestination {
  id: string
  company_id: number
  company_name: string
  address?: string
  route_id: string
  route_code: string
}

export interface FiscalNote {
  id: string
  invoice_number: string
  supplier_name: string
  status: string
  id_route: string
  id_route_invoice?: string
  box_quantity?: number | null
  gross_weight?: number | null
  net_weight?: number | null
}

export type FiscalNoteData = FiscalNote

export interface DeliveryResultInput {
  id_fiscal_invoice: string | number
  id_route: string | number
  id_route_invoice?: string | null
  id_delivery_type: number
  receipt_image_path?: string | null
  nfd_image_path?: string | null
  id_reason?: string | number | null
  nfd_number?: string | null
  returned_box_quantity?: string | null
  returned_amount?: string | null
  observation?: string | null
}

export interface DeliveryReason {
  id: string
  reason: string
  type: 'parcial' | 'negada' | 'abortada'
  category_id: number
  category_name: string
  sort_order?: number
}

export interface DeliveryResultData {
  id: string
  id_fiscal_invoice: string
  id_route: string
  id_delivery_type: number
  id_reason: string | null
  receipt_image_path: string | null
  nfd_image_path: string | null
  nfd_number: string | null
  returned_box_quantity: number | null
  returned_amount: number | null
  observation: string | null
  delivered_at: string
  created_at: string
  updated_at: string
}

export interface LocalDeliveryState {
  delivery_type: DeliveryType | null
  receipt_image_path: string | null
  nfd_image_path: string | null
  id_reason: string | null
  nfd_number: string | null
  returned_box_quantity: string | null
  returned_amount: string | null
}

export interface FiscalNoteWithDelivery extends FiscalNote {
  has_canhoto: boolean
  delivery_result_id?: string
  delivery_type?: DeliveryType
  deliveryResult?: DeliveryResultData | null
  localState: LocalDeliveryState
  isDirty: boolean
}

export interface NoteObservation {
  noteId: string
  text: string
}

export interface NoteWithDeliveryResult {
  id: string
  invoice_number: string
  supplier_name: string
  customer_name: string | null
  status: string
  id_route: string
  box_quantity?: number | null
  gross_weight?: number | null
  net_weight?: number | null
  deliveryResult: DeliveryResultData | null
  deliveryTypeLabel: string
}

export const DELIVERY_TYPE_MAP: Record<number, DeliveryType> = {
  1: 'entrega_total',
  2: 'entrega_parcial',
  3: 'entrega_negada',
  4: 'entrega_abortada',
}

export const DELIVERY_TYPE_LABEL: Record<DeliveryType, string> = {
  entrega_total: 'Entrega Total',
  entrega_parcial: 'Entrega Parcial',
  entrega_negada: 'Entrega Negada',
  entrega_abortada: 'Entrega Abortada',
}

export const DELIVERY_TYPE_ID: Record<DeliveryType, number> = {
  entrega_total: 1,
  entrega_parcial: 2,
  entrega_negada: 3,
  entrega_abortada: 4,
}