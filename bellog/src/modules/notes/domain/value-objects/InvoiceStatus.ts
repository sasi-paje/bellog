export type InvoiceStatusValues = 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED'

export interface InvoiceStatusConfig {
  code: InvoiceStatusValues
  label: string
  color: string
}

export const InvoiceStatus: Record<InvoiceStatusValues, InvoiceStatusConfig> = {
  PENDING: {
    code: 'PENDING',
    label: 'Pendente',
    color: '#919191',
  },
  IN_TRANSIT: {
    code: 'IN_TRANSIT',
    label: 'Em Trânsito',
    color: '#4C4C4C',
  },
  DELIVERED: {
    code: 'DELIVERED',
    label: 'Entregue',
    color: '#27ae60',
  },
  CANCELLED: {
    code: 'CANCELLED',
    label: 'Cancelada',
    color: '#eb5757',
  },
}

export function getStatusDescription(code: string): string {
  const status = Object.values(InvoiceStatus).find(s => s.code === code)
  return status?.label ?? code
}

export function getStatusColor(code: string): string {
  const status = Object.values(InvoiceStatus).find(s => s.code === code)
  return status?.color ?? '#919191'
}