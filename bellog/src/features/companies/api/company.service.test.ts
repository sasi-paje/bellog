/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { companyService } from './company.service'
import { supabase, getEnvironment } from '../../../lib/supabase'
import { makeCompany, makePersonCompanyRoleType } from '../../../testing/factories'

// ──────────────────────────────────────────────
// Mock
// ──────────────────────────────────────────────

vi.mock('../../../lib/supabase', () => ({
  supabase: { from: vi.fn() },
  getEnvironment: vi.fn().mockReturnValue('development'),
}))

function qb(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const chain: Record<string, unknown> = {}
  const self = () => chain

  for (const m of [
    'select', 'eq', 'neq', 'limit', 'order', 'range',
    'ilike', 'or', 'not', 'in', 'is', 'update', 'insert', 'upsert',
  ]) {
    chain[m] = vi.fn().mockImplementation(self)
  }

  chain.single = vi.fn().mockResolvedValue(result)
  chain.maybeSingle = vi.fn().mockResolvedValue(result)
  chain.then = (onFulfilled: (v: unknown) => void) => onFulfilled(result)

  return chain
}

// ──────────────────────────────────────────────
// Setup
// ──────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getEnvironment).mockReturnValue('development')
})

// ──────────────────────────────────────────────
// cnpjExists
// ──────────────────────────────────────────────

describe('companyService.cnpjExists', () => {
  it('retorna false quando CNPJ não encontrado', async () => {
    vi.mocked(supabase.from).mockReturnValue(qb({ data: [], error: null }) as any)

    const result = await companyService.cnpjExists('11222333000144')

    expect(result).toBe(false)
  })

  it('retorna true quando CNPJ já existe', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      qb({ data: [{ id: 'company-1' }], error: null }) as any
    )

    const result = await companyService.cnpjExists('11222333000144')

    expect(result).toBe(true)
  })

  it('normaliza CNPJ com formatação antes de consultar', async () => {
    let capturedCnpj: string | undefined

    vi.mocked(supabase.from).mockImplementation(() => {
      const chain: Record<string, unknown> = {}
      const self = () => chain
      for (const m of ['select', 'neq', 'limit', 'is', 'not']) {
        chain[m] = vi.fn().mockImplementation(self)
      }
      chain.eq = vi.fn().mockImplementation((field: string, value: unknown) => {
        if (field === 'cnpj') capturedCnpj = value as string
        return chain
      })
      chain.single = vi.fn().mockResolvedValue({ data: [], error: null })
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: [], error: null })
      chain.then = (onFulfilled: (v: unknown) => void) =>
        onFulfilled({ data: [], error: null })
      return chain as any
    })

    await companyService.cnpjExists('11.222.333/0001-44')

    expect(capturedCnpj).toBe('11222333000144')
  })

  it('propaga erro do banco', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      qb({ data: null, error: { message: 'DB error' } }) as any
    )

    await expect(companyService.cnpjExists('11222333000144')).rejects.toThrow('DB error')
  })
})

// ──────────────────────────────────────────────
// canInactivateDestination
// ──────────────────────────────────────────────

describe('companyService.canInactivateDestination', () => {
  it('retorna false quando destino já está inativo', async () => {
    const company = makeCompany({ is_active: false })
    vi.mocked(supabase.from).mockReturnValue(qb({ data: company, error: null }) as any)

    const result = await companyService.canInactivateDestination(company.id)

    expect(result.canInactivate).toBe(false)
    expect(result.reason).toBe('Este destino já está inativo.')
  })

  it('retorna true quando destino ativo sem notas fiscais ativas', async () => {
    const company = makeCompany({ is_active: true })

    vi.mocked(supabase.from)
      .mockReturnValueOnce(qb({ data: company, error: null }) as any)    // master_person_company single()
      .mockReturnValueOnce(qb({ data: [], error: null }) as any)         // trx_fiscal_invoice → vazio

    const result = await companyService.canInactivateDestination(company.id)

    expect(result.canInactivate).toBe(true)
  })

  it('retorna false quando destino possui rota em andamento', async () => {
    const company = makeCompany({ is_active: true })
    const invoice = { id: 'inv-1' }
    const assignment = { id: 'asgn-1', id_route: 'route-1' }
    const activeRoute = { id: 'route-1' }

    vi.mocked(supabase.from)
      .mockReturnValueOnce(qb({ data: company, error: null }) as any)      // company single()
      .mockReturnValueOnce(qb({ data: [invoice], error: null }) as any)    // invoices limit(1)
      .mockReturnValueOnce(qb({ data: [assignment], error: null }) as any) // assignments limit(1)
      .mockReturnValueOnce(qb({ data: [activeRoute], error: null }) as any) // routes limit(1)

    const result = await companyService.canInactivateDestination(company.id)

    expect(result.canInactivate).toBe(false)
    expect(result.reason).toContain('rota em andamento')
  })

  it('retorna false quando destino possui notas fiscais em aberto sem rota', async () => {
    const company = makeCompany({ is_active: true })
    const invoice = { id: 'inv-1' }

    vi.mocked(supabase.from)
      .mockReturnValueOnce(qb({ data: company, error: null }) as any)    // company single()
      .mockReturnValueOnce(qb({ data: [invoice], error: null }) as any)  // invoices limit(1)
      .mockReturnValueOnce(qb({ data: [], error: null }) as any)         // assignments → vazio

    const result = await companyService.canInactivateDestination(company.id)

    expect(result.canInactivate).toBe(false)
    expect(result.reason).toContain('notas fiscais em aberto')
  })

  it('lança erro quando destino não encontrado', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      qb({ data: null, error: { message: 'not found' } }) as any
    )

    await expect(companyService.canInactivateDestination('nonexistent')).rejects.toThrow(
      'Destino não encontrado.'
    )
  })
})

// ──────────────────────────────────────────────
// canInactivateSupplier
// ──────────────────────────────────────────────

describe('companyService.canInactivateSupplier', () => {
  it('retorna false quando fornecedor já está inativo', async () => {
    const company = makeCompany({ is_active: false })
    vi.mocked(supabase.from).mockReturnValue(qb({ data: company, error: null }) as any)

    const result = await companyService.canInactivateSupplier(company.id)

    expect(result.canInactivate).toBe(false)
    expect(result.reason).toBe('Este fornecedor já está inativo.')
  })

  it('retorna true quando fornecedor ativo sem notas fiscais ativas', async () => {
    const company = makeCompany({ is_active: true })

    vi.mocked(supabase.from)
      .mockReturnValueOnce(qb({ data: company, error: null }) as any)
      .mockReturnValueOnce(qb({ data: [], error: null }) as any)

    const result = await companyService.canInactivateSupplier(company.id)

    expect(result.canInactivate).toBe(true)
  })
})

// ──────────────────────────────────────────────
// createWithAddress — validação de CNPJ duplicado
// ──────────────────────────────────────────────

describe('companyService.createWithAddress — CNPJ duplicado', () => {
  const baseFormData = {
    cnpj: '11222333000144',
    corporateName: 'Empresa Teste LTDA',
    tradeName: '',
    email: '',
    id_company_group: null,
    address: {
      street: 'Rua Teste',
      number: '1',
      city: 'São Paulo',
      state: 'SP',
      zip_code: '01001000',
    },
  }

  it('lança erro amigável quando destino com mesmo CNPJ já existe (ativo)', async () => {
    const roleType = makePersonCompanyRoleType({ code: 'DESTINATION' })
    const existingCompany = makeCompany({ is_active: true })

    vi.mocked(supabase.from)
      // 1. getAddressTypeByCode
      .mockReturnValueOnce(qb({ data: { id: 'addr-type-1', code: 'DELIVERY' }, error: null }) as any)
      // 2. roleType lookup
      .mockReturnValueOnce(qb({ data: roleType, error: null }) as any)
      // 3. existing company by CNPJ
      .mockReturnValueOnce(qb({ data: existingCompany, error: null }) as any)
      // 4. existing role link → already has this role
      .mockReturnValueOnce(qb({ data: { id: 'link-1' }, error: null }) as any)

    await expect(
      companyService.createWithAddress(baseFormData as any, 'DELIVERY', 'DESTINATION')
    ).rejects.toThrow('Já existe um destino cadastrado com este CNPJ.')
  })

  it('lança erro amigável quando fornecedor com mesmo CNPJ já existe (ativo)', async () => {
    const roleType = makePersonCompanyRoleType({ code: 'SUPPLIER' })
    const existingCompany = makeCompany({ is_active: true })

    vi.mocked(supabase.from)
      .mockReturnValueOnce(qb({ data: { id: 'addr-type-1', code: 'DELIVERY' }, error: null }) as any)
      .mockReturnValueOnce(qb({ data: roleType, error: null }) as any)
      .mockReturnValueOnce(qb({ data: existingCompany, error: null }) as any)
      .mockReturnValueOnce(qb({ data: { id: 'link-1' }, error: null }) as any)

    await expect(
      companyService.createWithAddress(baseFormData as any, 'DELIVERY', 'SUPPLIER')
    ).rejects.toThrow('Já existe um fornecedor cadastrado com este CNPJ.')
  })

  it('lança erro amigável quando destino com mesmo CNPJ existe mas está inativo', async () => {
    const roleType = makePersonCompanyRoleType({ code: 'DESTINATION' })
    const inactiveCompany = makeCompany({ is_active: false })

    vi.mocked(supabase.from)
      .mockReturnValueOnce(qb({ data: { id: 'addr-type-1', code: 'DELIVERY' }, error: null }) as any)
      .mockReturnValueOnce(qb({ data: roleType, error: null }) as any)
      .mockReturnValueOnce(qb({ data: inactiveCompany, error: null }) as any)
      .mockReturnValueOnce(qb({ data: { id: 'link-1' }, error: null }) as any)

    await expect(
      companyService.createWithAddress(baseFormData as any, 'DELIVERY', 'DESTINATION')
    ).rejects.toThrow('Já existe um destino inativo com este CNPJ')
  })

  it('erro não contém mensagem de constraint técnica do banco', async () => {
    const roleType = makePersonCompanyRoleType({ code: 'DESTINATION' })
    const existingCompany = makeCompany({ is_active: true })

    vi.mocked(supabase.from)
      .mockReturnValueOnce(qb({ data: { id: 'addr-type-1', code: 'DELIVERY' }, error: null }) as any)
      .mockReturnValueOnce(qb({ data: roleType, error: null }) as any)
      .mockReturnValueOnce(qb({ data: existingCompany, error: null }) as any)
      .mockReturnValueOnce(qb({ data: { id: 'link-1' }, error: null }) as any)

    let errorMessage = ''
    try {
      await companyService.createWithAddress(baseFormData as any, 'DELIVERY', 'DESTINATION')
    } catch (e) {
      errorMessage = (e as Error).message
    }

    expect(errorMessage).not.toContain('unique')
    expect(errorMessage).not.toContain('constraint')
    expect(errorMessage).not.toContain('duplicate key')
    expect(errorMessage.length).toBeGreaterThan(0)
  })

  it('destino e fornecedor são entidades separadas — erro menciona o tipo correto', async () => {
    const destinationRole = makePersonCompanyRoleType({ code: 'DESTINATION' })
    const existingCompany = makeCompany({ is_active: true })

    vi.mocked(supabase.from)
      .mockReturnValueOnce(qb({ data: { id: 'addr-type-1', code: 'DELIVERY' }, error: null }) as any)
      .mockReturnValueOnce(qb({ data: destinationRole, error: null }) as any)
      .mockReturnValueOnce(qb({ data: existingCompany, error: null }) as any)
      .mockReturnValueOnce(qb({ data: { id: 'link-1' }, error: null }) as any)

    await expect(
      companyService.createWithAddress(baseFormData as any, 'DELIVERY', 'DESTINATION')
    ).rejects.toThrow('destino')

    // Reset and test supplier case
    vi.clearAllMocks()
    vi.mocked(getEnvironment).mockReturnValue('development')

    const supplierRole = makePersonCompanyRoleType({ code: 'SUPPLIER' })

    vi.mocked(supabase.from)
      .mockReturnValueOnce(qb({ data: { id: 'addr-type-1', code: 'DELIVERY' }, error: null }) as any)
      .mockReturnValueOnce(qb({ data: supplierRole, error: null }) as any)
      .mockReturnValueOnce(qb({ data: existingCompany, error: null }) as any)
      .mockReturnValueOnce(qb({ data: { id: 'link-1' }, error: null }) as any)

    await expect(
      companyService.createWithAddress(baseFormData as any, 'DELIVERY', 'SUPPLIER')
    ).rejects.toThrow('fornecedor')
  })
})
