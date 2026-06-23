import { z } from 'zod'

export const DeliveryTypeEnum = z.enum([
  'entrega_total',
  'entrega_parcial',
  'entrega_negada',
  'entrega_abortada',
])

export type DeliveryType = z.infer<typeof DeliveryTypeEnum>

export const DeliveryResultInputSchema = z.object({
  id_fiscal_invoice: z.string().min(1, 'Nota fiscal é obrigatória'),
  id_route: z.string().min(1, 'Rota é obrigatória'),
  id_delivery_type: z.number().int().min(1).max(4, 'Tipo de entrega inválido'),
  id_reason: z.string().nullable().optional(),
  receipt_image_path: z.string().nullable().optional(),
  nfd_image_path: z.string().nullable().optional(),
  nfd_number: z.string().nullable().optional(),
  returned_box_quantity: z.string().nullable().optional(),
  returned_amount: z.string().nullable().optional(),
  observation: z.string().nullable().optional(),
})

export const ObservationSchema = z.object({
  noteId: z.string(),
  text: z.string().max(1000, 'Observação deve ter no máximo 1000 caracteres'),
})

export const DeliveryFormSchema = z.object({
  local_entrega: z.object({
    id: z.string(),
    company_id: z.number(),
    company_name: z.string(),
    route_id: z.string(),
  }, { required_error: 'Selecione o local da entrega' }),
  observacoes: z.string().max(2000, 'Observações devem ter no máximo 2000 caracteres').optional(),
  notas_fiscais: z.array(DeliveryResultInputSchema).min(1, 'Adicione pelo menos uma nota fiscal'),
})

export const FiscalNoteFormSchema = z.object({
  delivery_type: DeliveryTypeEnum,
  receipt_image_path: z.string().nullable().optional(),
  nfd_image_path: z.string().nullable().optional(),
  id_reason: z.string().nullable().optional(),
  nfd_number: z.string().nullable().optional(),
  returned_box_quantity: z.string().nullable().optional(),
  returned_amount: z.string().nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.delivery_type === 'entrega_parcial') {
    if (!data.id_reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Motivo é obrigatório para entrega parcial',
        path: ['id_reason'],
      })
    }
    if (!data.nfd_number) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Número da NFD é obrigatório para entrega parcial',
        path: ['nfd_number'],
      })
    }
    const qty = parseInt(data.returned_box_quantity || '0', 10)
    if (isNaN(qty) || qty < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Quantidade de caixas devolvidas deve ser um número positivo',
        path: ['returned_box_quantity'],
      })
    }
    const amt = parseFloat(data.returned_amount?.replace(/[^\d,.-]/g, '').replace(',', '.') || '0')
    if (isNaN(amt) || amt < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Valor da devolução deve ser um número positivo',
        path: ['returned_amount'],
      })
    }
  }
  if (data.delivery_type === 'entrega_negada' || data.delivery_type === 'entrega_abortada') {
    if (!data.id_reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Motivo é obrigatório',
        path: ['id_reason'],
      })
    }
  }
})

export const maskNumber = (value: string): string => {
  return value.replace(/\D/g, '').slice(0, 20)
}

export const maskCurrency = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (!digits) return ''
  const floatValue = parseInt(digits, 10) / 100
  return floatValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export const parseCurrencyToNumber = (value: string): number | null => {
  if (!value) return null
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}