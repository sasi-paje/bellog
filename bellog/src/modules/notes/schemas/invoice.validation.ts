import { z } from 'zod'

// Field validation schemas
const invoiceNumberSchema = z.string()
  .min(1, 'Número da nota é obrigatório')
  .max(50, 'Número da nota muito longo')
  .regex(/^[A-Z0-9]+$/i, 'Número da nota contém caracteres inválidos')

const positiveNumberSchema = z.number()
  .positive('Valor deve ser positivo')
  .max(999999.99, 'Valor excede limite máximo')

const nonNegativeNumberSchema = z.number()
  .nonnegative('Valor não pode ser negativo')

const uuidSchema = z.string().uuid('ID inválido')

const dateStringSchema = z.string().datetime().optional()

// Invoice creation schema
export const CreateInvoiceSchema = z.object({
  invoice_number: invoiceNumberSchema,
  serie: z.string().max(10).optional(),
  id_supplier_company: uuidSchema,
  id_customer_company: uuidSchema,
  box_quantity: z.number().int().positive().max(99999),
  net_weight: positiveNumberSchema,
  gross_weight: positiveNumberSchema,
  invoice_amount: nonNegativeNumberSchema,
  invoice_issue_date: dateStringSchema,
  attempt_number: z.number().int().nonnegative().optional().default(0),
}).refine(
  data => data.gross_weight >= data.net_weight,
  { message: 'Peso bruto deve ser maior ou igual ao peso líquido', path: ['gross_weight'] }
)

// Invoice update schema
export const UpdateInvoiceSchema = z.object({
  invoice_number: invoiceNumberSchema.optional(),
  box_quantity: z.number().int().positive().optional(),
  net_weight: positiveNumberSchema.optional(),
  gross_weight: positiveNumberSchema.optional(),
  attempt_number: z.number().int().nonnegative().optional(),
}).refine(
  data => {
    if (data.net_weight !== undefined && data.gross_weight !== undefined) {
      return data.gross_weight >= data.net_weight
    }
    return true
  },
  { message: 'Peso bruto deve ser maior ou igual ao peso líquido', path: ['gross_weight'] }
)

// List filter schema
export const ListInvoicesFilterSchema = z.object({
  search: z.string().max(100).optional(),
  status: z.enum(['PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']).optional(),
  supplierId: uuidSchema.optional(),
  destinationId: uuidSchema.optional(),
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional(),
  onlyWithRoute: z.boolean().optional(),
  includeCancelled: z.boolean().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
})

// Types
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>
export type ListInvoicesFilter = z.infer<typeof ListInvoicesFilterSchema>

// Validation helpers
export function validateCreateInvoice(data: unknown): CreateInvoiceInput {
  return CreateInvoiceSchema.parse(data)
}

export function validateUpdateInvoice(data: unknown): UpdateInvoiceInput {
  return UpdateInvoiceSchema.parse(data)
}

export function safeValidateCreateInvoice(data: unknown) {
  return CreateInvoiceSchema.safeParse(data)
}

export function safeValidateUpdateInvoice(data: unknown) {
  return UpdateInvoiceSchema.safeParse(data)
}

// Sanitization
export function sanitizeInvoiceInput(data: CreateInvoiceInput): CreateInvoiceInput {
  return {
    ...data,
    invoice_number: data.invoice_number.trim().toUpperCase(),
    serie: data.serie?.trim().toUpperCase(),
  }
}