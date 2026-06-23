/**
 * Custom errors for delivery service
 */
export class DeliveryServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'DeliveryServiceError'
  }
}

export class RouteCompletionError extends Error {
  constructor(
    message: string,
    public pendingNotes: number,
    public totalNotes: number
  ) {
    super(message)
    this.name = 'RouteCompletionError'
  }
}

/**
 * Delivery types enum
 */
export enum DeliveryType {
  TOTAL = 1,
  PARCIAL = 2,
  NEGADA = 3,
  ABORTADA = 4,
}

export const DeliveryTypeLabels: Record<number, string> = {
  [DeliveryType.TOTAL]: 'entrega_total',
  [DeliveryType.PARCIAL]: 'entrega_parcial',
  [DeliveryType.NEGADA]: 'entrega_negada',
  [DeliveryType.ABORTADA]: 'entrega_abortada',
}