/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { assignNotesService } from './assign-notes.service'
import { supabase, getEnvironment, applyRefFilter } from '../../../lib/supabase'

// ──────────────────────────────────────────────
// Mock
// ──────────────────────────────────────────────

vi.mock('../../../lib/supabase', () => ({
  supabase: { from: vi.fn() },
  getEnvironment: vi.fn().mockReturnValue('development'),
  applyRefFilter: vi.fn().mockImplementation((q: any) => q), // dev: pass-through
}))

/**
 * Cria um query builder encadeável + thenable.
 * Todo método de chain retorna o mesmo objeto (self).
 * `await chain` funciona porque o objeto possui `.then`.
 */
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

/**
 * qb com spy para capturar chamadas de cada método.
 * chain._calls contém `{ method, args }` de cada invocação.
 * Usado nos testes que precisam inspecionar QUAIS métodos foram chamados.
 */
function spyQb(result: { data?: unknown; error?: unknown }) {
  const calls: { method: string; args: any[] }[] = []
  const chain: Record<string, any> = {}

  for (const m of [
    'select', 'eq', 'neq', 'limit', 'order', 'range',
    'ilike', 'or', 'not', 'in', 'is',
  ]) {
    chain[m] = vi.fn().mockImplementation((...args: any[]) => {
      calls.push({ method: m, args })
      return chain
    })
  }

  chain.then = (onFulfilled: (v: unknown) => void) => onFulfilled(result)
  chain._calls = calls

  return chain
}

// ──────────────────────────────────────────────
// Setup
// ──────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getEnvironment).mockReturnValue('development')
  vi.mocked(applyRefFilter).mockImplementation((q: any) => q)
})

// ──────────────────────────────────────────────
// Ordem de chamadas a supabase.from por passo:
//
// Passo 1 (Promise.all — sempre 3 chamadas):
//   [1] ref_person_company_role_type  code=SUPPLIER  (via applyRefFilter)
//   [2] ref_person_company_role_type  code=DESTINATION (via applyRefFilter)
//   [3] master_person_company_address
//
// Passo 2 (Promise.all — 0, 1 ou 2 chamadas):
//   [4] rel_person_company_role_type  SUPPLIER   (apenas se supplierRoleIds não for vazio)
//   [5] rel_person_company_role_type  DESTINATION (apenas se destinationRoleIds não for vazio)
//
// Passo 3 (Promise.all — 0, 1 ou 2 chamadas):
//   [6] master_person_company  SUPPLIER   (apenas se supplierCompanyIds não for vazio)
//   [7] master_person_company  DESTINATION (apenas se destinationCompanyIds não for vazio)
//
// Passo 4 (sequencial — 0 ou 1 chamada):
//   [8] master_person_company_group   (apenas se allGroupIds não for vazio)
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────────────────
// Testes
// ──────────────────────────────────────────────────────────────────────────────

describe('assignNotesService.getAdvancedFilterOptions', () => {

  // ────────────────────────────────────────────────────────────────────────────
  // 1. Supplier group aparece apenas em supplierGroups
  // ────────────────────────────────────────────────────────────────────────────

  describe('1. Supplier group aparece apenas em supplierGroups', () => {
    it('grupo vinculado a fornecedor aparece em supplierGroups e não em destinationGroups', async () => {
      vi.mocked(supabase.from)
        // Passo 1
        .mockReturnValueOnce(qb({ data: [{ id: 'role-sup-1' }],  error: null }) as any) // ref SUPPLIER
        .mockReturnValueOnce(qb({ data: [{ id: 'role-dest-1' }], error: null }) as any) // ref DESTINATION
        .mockReturnValueOnce(qb({ data: [],                      error: null }) as any) // addresses
        // Passo 2
        .mockReturnValueOnce(qb({ data: [{ id_company: 'co-100' }], error: null }) as any) // rel SUPPLIER
        .mockReturnValueOnce(qb({ data: [{ id_company: 'co-200' }], error: null }) as any) // rel DESTINATION
        // Passo 3: co-100 tem grupo; co-200 não tem grupo
        .mockReturnValueOnce(qb({ data: [{ id_company_group: 'grp-fornecedor' }], error: null }) as any) // master_company SUP
        .mockReturnValueOnce(qb({ data: [],                                       error: null }) as any) // master_company DEST
        // Passo 4
        .mockReturnValueOnce(qb({ data: [{ id: 'grp-fornecedor', name: 'Grupo Fornecedor' }], error: null }) as any)

      const result = await assignNotesService.getAdvancedFilterOptions()

      expect(result.supplierGroups).toEqual([{ value: 'grp-fornecedor', label: 'Grupo Fornecedor' }])
      expect(result.destinationGroups).toEqual([])
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 2. Destination group aparece apenas em destinationGroups
  // ────────────────────────────────────────────────────────────────────────────

  describe('2. Destination group aparece apenas em destinationGroups', () => {
    it('grupo vinculado a destino aparece em destinationGroups e não em supplierGroups', async () => {
      vi.mocked(supabase.from)
        // Passo 1
        .mockReturnValueOnce(qb({ data: [{ id: 'role-sup-1' }],  error: null }) as any) // ref SUPPLIER
        .mockReturnValueOnce(qb({ data: [{ id: 'role-dest-1' }], error: null }) as any) // ref DESTINATION
        .mockReturnValueOnce(qb({ data: [],                      error: null }) as any) // addresses
        // Passo 2
        .mockReturnValueOnce(qb({ data: [{ id_company: 'co-100' }], error: null }) as any) // rel SUPPLIER
        .mockReturnValueOnce(qb({ data: [{ id_company: 'co-200' }], error: null }) as any) // rel DESTINATION
        // Passo 3: co-100 sem grupo; co-200 tem grupo
        .mockReturnValueOnce(qb({ data: [],                                       error: null }) as any) // master_company SUP
        .mockReturnValueOnce(qb({ data: [{ id_company_group: 'grp-destino' }], error: null }) as any)   // master_company DEST
        // Passo 4
        .mockReturnValueOnce(qb({ data: [{ id: 'grp-destino', name: 'Grupo Destino' }], error: null }) as any)

      const result = await assignNotesService.getAdvancedFilterOptions()

      expect(result.destinationGroups).toEqual([{ value: 'grp-destino', label: 'Grupo Destino' }])
      expect(result.supplierGroups).toEqual([])
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 3. Grupo sem empresa vinculada não aparece
  // ────────────────────────────────────────────────────────────────────────────

  describe('3. Grupo sem empresa vinculada não aparece', () => {
    it('grupo órfão nunca entra em supplierGroups nem em destinationGroups', async () => {
      // co-100 mapeia para grp-real.
      // O grupo 'grp-orfao' existe no banco mas nenhuma empresa aponta para ele:
      // seu ID nunca entra em supGroupIds → toOptions(supGroupIds) nunca o inclui.
      vi.mocked(supabase.from)
        // Passo 1
        .mockReturnValueOnce(qb({ data: [{ id: 'role-sup-1' }], error: null }) as any) // ref SUPPLIER
        .mockReturnValueOnce(qb({ data: [],                    error: null }) as any)   // ref DESTINATION → vazio
        .mockReturnValueOnce(qb({ data: [],                    error: null }) as any)   // addresses
        // Passo 2: apenas SUPPLIER (destRoleIds=[])
        .mockReturnValueOnce(qb({ data: [{ id_company: 'co-100' }], error: null }) as any) // rel SUPPLIER
        // rel DESTINATION: skipped → Promise.resolve
        // Passo 3: apenas SUPPLIER (destCompanyIds=[])
        .mockReturnValueOnce(qb({ data: [{ id_company_group: 'grp-real' }], error: null }) as any) // master_company SUP
        // master_company DEST: skipped → Promise.resolve
        // Passo 4: allGroupIds=['grp-real'] — grp-orfao não está incluído
        .mockReturnValueOnce(qb({ data: [{ id: 'grp-real', name: 'Grupo Real' }], error: null }) as any)

      const result = await assignNotesService.getAdvancedFilterOptions()

      expect(result.supplierGroups).toEqual([{ value: 'grp-real', label: 'Grupo Real' }])

      const allValues = [...result.supplierGroups, ...result.destinationGroups].map(g => g.value)
      expect(allValues).not.toContain('grp-orfao')
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 4. Grupo de empresa inativa não aparece
  // ────────────────────────────────────────────────────────────────────────────

  describe('4. Grupo de empresa inativa não aparece', () => {
    it('empresa inativa é excluída em master_person_company is_active=true — grupo não aparece', async () => {
      // Passo 2 retorna co-ativo e co-inativo (ambos vinculados ao role).
      // Passo 3 usa is_active=true: retorna apenas co-ativo com grp-ativo;
      // co-inativo (que mapearia para grp-inativo) é filtrado pelo banco.
      vi.mocked(supabase.from)
        // Passo 1
        .mockReturnValueOnce(qb({ data: [{ id: 'role-sup-1' }], error: null }) as any) // ref SUPPLIER
        .mockReturnValueOnce(qb({ data: [],                    error: null }) as any)   // ref DESTINATION
        .mockReturnValueOnce(qb({ data: [],                    error: null }) as any)   // addresses
        // Passo 2
        .mockReturnValueOnce(qb({ data: [{ id_company: 'co-ativo' }, { id_company: 'co-inativo' }], error: null }) as any) // rel SUPPLIER
        // rel DESTINATION: skipped
        // Passo 3: is_active=true filtra co-inativo — retorna apenas grp-ativo
        .mockReturnValueOnce(qb({ data: [{ id_company_group: 'grp-ativo' }], error: null }) as any) // master_company SUP
        // master_company DEST: skipped
        // Passo 4
        .mockReturnValueOnce(qb({ data: [{ id: 'grp-ativo', name: 'Grupo Ativo' }], error: null }) as any)

      const result = await assignNotesService.getAdvancedFilterOptions()

      expect(result.supplierGroups).toEqual([{ value: 'grp-ativo', label: 'Grupo Ativo' }])

      const allValues = [...result.supplierGroups, ...result.destinationGroups].map(g => g.value)
      expect(allValues).not.toContain('grp-inativo')
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 5. Grupo compartilhado por empresa com dois roles
  // ────────────────────────────────────────────────────────────────────────────

  describe('5. Grupo compartilhado por empresa com dois roles', () => {
    it('empresa com papel SUPPLIER e DESTINATION faz o grupo aparecer nos dois arrays', async () => {
      // co-shared tem roles SUPPLIER e DESTINATION → supGroupIds=['grp-shared'] e
      // destGroupIds=['grp-shared']. allGroupIds desplica → consulta grp-shared uma vez.
      vi.mocked(supabase.from)
        // Passo 1
        .mockReturnValueOnce(qb({ data: [{ id: 'role-sup-1' }],  error: null }) as any) // ref SUPPLIER
        .mockReturnValueOnce(qb({ data: [{ id: 'role-dest-1' }], error: null }) as any) // ref DESTINATION
        .mockReturnValueOnce(qb({ data: [],                      error: null }) as any) // addresses
        // Passo 2
        .mockReturnValueOnce(qb({ data: [{ id_company: 'co-shared' }], error: null }) as any) // rel SUPPLIER
        .mockReturnValueOnce(qb({ data: [{ id_company: 'co-shared' }], error: null }) as any) // rel DESTINATION
        // Passo 3
        .mockReturnValueOnce(qb({ data: [{ id_company_group: 'grp-shared' }], error: null }) as any) // master_company SUP
        .mockReturnValueOnce(qb({ data: [{ id_company_group: 'grp-shared' }], error: null }) as any) // master_company DEST
        // Passo 4: allGroupIds=['grp-shared'] (set deduplicado)
        .mockReturnValueOnce(qb({ data: [{ id: 'grp-shared', name: 'Grupo Compartilhado' }], error: null }) as any)

      const result = await assignNotesService.getAdvancedFilterOptions()

      expect(result.supplierGroups).toEqual([{ value: 'grp-shared', label: 'Grupo Compartilhado' }])
      expect(result.destinationGroups).toEqual([{ value: 'grp-shared', label: 'Grupo Compartilhado' }])
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 6. rel_person_company_role_type nunca usa is_active
  // ────────────────────────────────────────────────────────────────────────────

  describe('6. rel_person_company_role_type não usa is_active', () => {
    it('nenhuma chamada .eq("is_active", ...) é feita na query rel_person_company_role_type', async () => {
      const relSpyChain = spyQb({ data: [], error: null })

      vi.mocked(supabase.from)
        // Passo 1
        .mockReturnValueOnce(qb({ data: [{ id: 'role-sup-1' }], error: null }) as any) // ref SUPPLIER
        .mockReturnValueOnce(qb({ data: [],                    error: null }) as any)   // ref DESTINATION → vazio
        .mockReturnValueOnce(qb({ data: [],                    error: null }) as any)   // addresses
        // Passo 2: apenas SUPPLIER usa supabase.from (destRoleIds=[])
        .mockReturnValueOnce(relSpyChain as any) // rel SUPPLIER ← spy
        // rel DESTINATION: skipped (destRoleIds=[])
        // Passo 3: supCompanyIds=[] (rel retornou []) → skipped
        // Passo 4: allGroupIds=[] → skipped

      await assignNotesService.getAdvancedFilterOptions()

      const isActiveCalls = (relSpyChain._calls as { method: string; args: any[] }[]).filter(
        c => c.method === 'eq' && c.args[0] === 'is_active'
      )
      expect(isActiveCalls).toHaveLength(0)
    })

    it('query rel_ usa is_test (único filtro de ambiente aplicado)', async () => {
      const relSpyChain = spyQb({ data: [], error: null })

      vi.mocked(supabase.from)
        .mockReturnValueOnce(qb({ data: [{ id: 'role-sup-1' }], error: null }) as any)
        .mockReturnValueOnce(qb({ data: [],                    error: null }) as any)
        .mockReturnValueOnce(qb({ data: [],                    error: null }) as any)
        .mockReturnValueOnce(relSpyChain as any)

      await assignNotesService.getAdvancedFilterOptions()

      const isTestCalls = (relSpyChain._calls as { method: string; args: any[] }[]).filter(
        c => c.method === 'eq' && c.args[0] === 'is_test'
      )
      expect(isTestCalls).toHaveLength(1)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 7. applyRefFilter funciona em dev e prod
  // ────────────────────────────────────────────────────────────────────────────

  describe('7. applyRefFilter funciona em dev e prod', () => {
    it('dev — applyRefFilter é chamado exatamente duas vezes (uma por tabela ref_)', async () => {
      vi.mocked(supabase.from)
        // Passo 1
        .mockReturnValueOnce(qb({ data: [{ id: 'role-sup-1' }], error: null }) as any) // ref SUPPLIER
        .mockReturnValueOnce(qb({ data: [],                    error: null }) as any)   // ref DESTINATION
        .mockReturnValueOnce(qb({ data: [],                    error: null }) as any)   // addresses
        // Passo 2: supplierRoleIds=['role-sup-1'] → from chamado
        .mockReturnValueOnce(qb({ data: [], error: null }) as any) // rel SUPPLIER → vazio
        // Passo 3, 4: skipped (supCompanyIds=[], allGroupIds=[])

      await assignNotesService.getAdvancedFilterOptions()

      expect(vi.mocked(applyRefFilter)).toHaveBeenCalledTimes(2)
    })

    it('prod — applyRefFilter adiciona eq(is_test, false) e função retorna grupos corretos', async () => {
      vi.mocked(getEnvironment).mockReturnValue('production')
      // Em produção applyRefFilter chama query.eq('is_test', false).
      // O qb chain absorve a chamada e continua encadeável.
      vi.mocked(applyRefFilter).mockImplementation((q: any) => q.eq('is_test', false))

      vi.mocked(supabase.from)
        // Passo 1
        .mockReturnValueOnce(qb({ data: [{ id: 'role-sup-prod' }], error: null }) as any) // ref SUPPLIER
        .mockReturnValueOnce(qb({ data: [],                       error: null }) as any)   // ref DESTINATION
        .mockReturnValueOnce(qb({ data: [],                       error: null }) as any)   // addresses
        // Passo 2
        .mockReturnValueOnce(qb({ data: [{ id_company: 'co-prod' }], error: null }) as any) // rel SUPPLIER
        // Passo 3
        .mockReturnValueOnce(qb({ data: [{ id_company_group: 'grp-prod' }], error: null }) as any) // master_company SUP
        // Passo 4
        .mockReturnValueOnce(qb({ data: [{ id: 'grp-prod', name: 'Grupo Prod' }], error: null }) as any)

      const result = await assignNotesService.getAdvancedFilterOptions()

      // applyRefFilter foi chamado para ref SUPPLIER e ref DESTINATION
      expect(vi.mocked(applyRefFilter)).toHaveBeenCalledTimes(2)
      // Resultado correto mesmo em produção
      expect(result.supplierGroups).toEqual([{ value: 'grp-prod', label: 'Grupo Prod' }])
      expect(result.destinationGroups).toEqual([])
    })
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// Testes — getUnassignedNotes (filtros avançados com role constraint)
//
// Ordem de chamadas a supabase.from por filtro:
//   1. rel_route_invoice  (sempre)
//   Se grupoCliente:
//     2. ref_person_company_role_type SUPPLIER  (via applyRefFilter)
//     3. rel_person_company_role_type           (sem is_active!)
//     4. master_person_company                  (grupo + role)
//   Se grupoDestino:
//     N. ref_person_company_role_type DESTINATION (via applyRefFilter)
//     N. rel_person_company_role_type
//     N. master_person_company
//   N. trx_fiscal_invoice               (se nenhum filtro retornou [])
//   Se invoices encontradas:
//     N. master_person_company  (enrichment fornecedor)
//     N. master_person_company  (enrichment cliente)
//     N. master_person_company_group  (apenas se supplier tem grupo)
// ──────────────────────────────────────────────────────────────────────────────

describe('assignNotesService.getUnassignedNotes', () => {

  // Objeto invoice mínimo para os testes de enriquecimento
  const makeInvoice = (overrides: Record<string, unknown> = {}) => ({
    id: 'inv-1',
    invoice_number: 'NF001',
    net_weight: 100,
    gross_weight: null,
    box_quantity: 5,
    invoice_amount: 1000,
    id_supplier_company: 'co-sup-100',
    id_customer_company: 'co-dest-200',
    invoice_issue_date: '2026-01-01',
    is_active: true,
    ...overrides,
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 1. grupoDestino filtra por id_customer_company
  // ────────────────────────────────────────────────────────────────────────────

  describe('1. grupoDestino aplica filtro em id_customer_company', () => {
    it('in("id_customer_company", companiesIds) é chamado na invoice query quando grupoDestino é definido', async () => {
      const invoiceSpy = spyQb({ data: [makeInvoice()], error: null, count: 1 } as any)

      vi.mocked(supabase.from)
        .mockReturnValueOnce(qb({ data: [], error: null }) as any)                              // rel_route_invoice
        .mockReturnValueOnce(qb({ data: [{ id: 'role-dest-1' }], error: null }) as any)        // ref DESTINATION
        .mockReturnValueOnce(qb({ data: [{ id_company: 'co-dest-200' }], error: null }) as any) // rel DESTINATION
        .mockReturnValueOnce(qb({ data: [{ id: 'co-dest-200' }], error: null }) as any)         // master_company (group+role)
        .mockReturnValueOnce(invoiceSpy as any)                                                  // trx_fiscal_invoice
        .mockReturnValueOnce(qb({ data: [{ id: 'co-sup-100', trade_name: 'Fornecedor X', id_company_group: null }], error: null }) as any)
        .mockReturnValueOnce(qb({ data: [{ id: 'co-dest-200', trade_name: 'Destino Y' }], error: null }) as any)

      const result = await assignNotesService.getUnassignedNotes({ grupoDestino: 'grp-5' })

      const inCalls = (invoiceSpy._calls as { method: string; args: any[] }[]).filter(c => c.method === 'in')
      const customerFilter = inCalls.find(c => c.args[0] === 'id_customer_company')
      expect(customerFilter).toBeDefined()
      expect(customerFilter!.args[1]).toContain('co-dest-200')

      expect(result.data).toHaveLength(1)
      expect(result.data[0].id).toBe('inv-1')
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 2. grupoDestino NÃO aplica filtro em id_supplier_company
  // ────────────────────────────────────────────────────────────────────────────

  describe('2. grupoDestino não filtra id_supplier_company', () => {
    it('in("id_supplier_company", ...) não é chamado quando apenas grupoDestino está definido', async () => {
      const invoiceSpy = spyQb({ data: [], error: null, count: 0 } as any)

      vi.mocked(supabase.from)
        .mockReturnValueOnce(qb({ data: [], error: null }) as any)
        .mockReturnValueOnce(qb({ data: [{ id: 'role-dest-1' }], error: null }) as any)
        .mockReturnValueOnce(qb({ data: [{ id_company: 'co-dest-200' }], error: null }) as any)
        .mockReturnValueOnce(qb({ data: [{ id: 'co-dest-200' }], error: null }) as any)
        .mockReturnValueOnce(invoiceSpy as any)

      await assignNotesService.getUnassignedNotes({ grupoDestino: 'grp-5' })

      const inCalls = (invoiceSpy._calls as { method: string; args: any[] }[]).filter(c => c.method === 'in')
      const supplierFilter = inCalls.find(c => c.args[0] === 'id_supplier_company')
      expect(supplierFilter).toBeUndefined()
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 3. grupoCliente aplica filtro em id_supplier_company
  // ────────────────────────────────────────────────────────────────────────────

  describe('3. grupoCliente aplica filtro em id_supplier_company', () => {
    it('in("id_supplier_company", companyIds) é chamado na invoice query quando grupoCliente é definido', async () => {
      const invoiceSpy = spyQb({ data: [], error: null, count: 0 } as any)

      vi.mocked(supabase.from)
        .mockReturnValueOnce(qb({ data: [], error: null }) as any)                               // rel_route_invoice
        .mockReturnValueOnce(qb({ data: [{ id: 'role-sup-1' }], error: null }) as any)          // ref SUPPLIER
        .mockReturnValueOnce(qb({ data: [{ id_company: 'co-sup-100' }], error: null }) as any)  // rel SUPPLIER
        .mockReturnValueOnce(qb({ data: [{ id: 'co-sup-100' }], error: null }) as any)          // master_company (group+role)
        .mockReturnValueOnce(invoiceSpy as any)                                                   // trx_fiscal_invoice

      await assignNotesService.getUnassignedNotes({ grupoCliente: 'grp-1' })

      const inCalls = (invoiceSpy._calls as { method: string; args: any[] }[]).filter(c => c.method === 'in')
      const supplierFilter = inCalls.find(c => c.args[0] === 'id_supplier_company')
      expect(supplierFilter).toBeDefined()
      expect(supplierFilter!.args[1]).toContain('co-sup-100')
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 4. grupoCliente NÃO aplica filtro em id_customer_company
  // ────────────────────────────────────────────────────────────────────────────

  describe('4. grupoCliente não filtra id_customer_company', () => {
    it('in("id_customer_company", ...) não é chamado quando apenas grupoCliente está definido', async () => {
      const invoiceSpy = spyQb({ data: [], error: null, count: 0 } as any)

      vi.mocked(supabase.from)
        .mockReturnValueOnce(qb({ data: [], error: null }) as any)
        .mockReturnValueOnce(qb({ data: [{ id: 'role-sup-1' }], error: null }) as any)
        .mockReturnValueOnce(qb({ data: [{ id_company: 'co-sup-100' }], error: null }) as any)
        .mockReturnValueOnce(qb({ data: [{ id: 'co-sup-100' }], error: null }) as any)
        .mockReturnValueOnce(invoiceSpy as any)

      await assignNotesService.getUnassignedNotes({ grupoCliente: 'grp-1' })

      const inCalls = (invoiceSpy._calls as { method: string; args: any[] }[]).filter(c => c.method === 'in')
      const customerFilter = inCalls.find(c => c.args[0] === 'id_customer_company')
      expect(customerFilter).toBeUndefined()
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 5. grupoDestino sem empresas destino ativas → []
  // ────────────────────────────────────────────────────────────────────────────

  describe('5. grupoDestino sem empresas destino ativas retorna []', () => {
    it('retorna { data: [], total: 0 } e não consulta invoices quando getCompanyIdsByGroupAndRole retorna []', async () => {
      vi.mocked(supabase.from)
        .mockReturnValueOnce(qb({ data: [], error: null }) as any)                               // rel_route_invoice
        .mockReturnValueOnce(qb({ data: [{ id: 'role-dest-1' }], error: null }) as any)         // ref DESTINATION
        .mockReturnValueOnce(qb({ data: [{ id_company: 'co-dest-999' }], error: null }) as any) // rel DESTINATION (empresa em outro grupo)
        .mockReturnValueOnce(qb({ data: [], error: null }) as any)                               // master_company → nenhuma no grp-5

      const result = await assignNotesService.getUnassignedNotes({ grupoDestino: 'grp-5' })

      expect(result).toEqual({ data: [], total: 0 })
      // Apenas 4 chamadas: invoice query nunca foi feita (fail-closed)
      expect(vi.mocked(supabase.from)).toHaveBeenCalledTimes(4)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 6. grupoCliente sem fornecedores ativos → []
  // ────────────────────────────────────────────────────────────────────────────

  describe('6. grupoCliente sem fornecedores ativos retorna []', () => {
    it('retorna { data: [], total: 0 } e não consulta invoices quando grupo não tem fornecedores', async () => {
      vi.mocked(supabase.from)
        .mockReturnValueOnce(qb({ data: [], error: null }) as any)                              // rel_route_invoice
        .mockReturnValueOnce(qb({ data: [{ id: 'role-sup-1' }], error: null }) as any)         // ref SUPPLIER
        .mockReturnValueOnce(qb({ data: [{ id_company: 'co-sup-999' }], error: null }) as any) // rel SUPPLIER (empresa em outro grupo)
        .mockReturnValueOnce(qb({ data: [], error: null }) as any)                              // master_company → nenhuma no grp-1

      const result = await assignNotesService.getUnassignedNotes({ grupoCliente: 'grp-1' })

      expect(result).toEqual({ data: [], total: 0 })
      expect(vi.mocked(supabase.from)).toHaveBeenCalledTimes(4)
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 7. grupoDestino com value string funciona com id number no banco
  // ────────────────────────────────────────────────────────────────────────────

  describe('7. grupoDestino com value string (dropdown) funciona corretamente', () => {
    it('string "5" passada como grupoDestino resulta no filtro correto', async () => {
      const invoiceSpy = spyQb({ data: [], error: null, count: 0 } as any)

      vi.mocked(supabase.from)
        .mockReturnValueOnce(qb({ data: [], error: null }) as any)
        .mockReturnValueOnce(qb({ data: [{ id: 'role-dest-1' }], error: null }) as any)
        .mockReturnValueOnce(qb({ data: [{ id_company: 'co-dest-200' }], error: null }) as any)
        .mockReturnValueOnce(qb({ data: [{ id: 'co-dest-200' }], error: null }) as any)
        .mockReturnValueOnce(invoiceSpy as any)

      // Valor vem do dropdown como string '5'
      await assignNotesService.getUnassignedNotes({ grupoDestino: '5' })

      const inCalls = (invoiceSpy._calls as { method: string; args: any[] }[]).filter(c => c.method === 'in')
      const customerFilter = inCalls.find(c => c.args[0] === 'id_customer_company')
      expect(customerFilter).toBeDefined()
      expect(customerFilter!.args[1]).toContain('co-dest-200')
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 8. grupoCliente + grupoDestino aplicam os dois filtros simultâneos
  // ────────────────────────────────────────────────────────────────────────────

  describe('8. grupoCliente + grupoDestino aplicam ambos os filtros', () => {
    it('invoice query recebe in("id_supplier_company",...) e in("id_customer_company",...) simultaneamente', async () => {
      const invoiceSpy = spyQb({ data: [], error: null, count: 0 } as any)

      vi.mocked(supabase.from)
        .mockReturnValueOnce(qb({ data: [], error: null }) as any)                               // rel_route_invoice
        // getCompanyIdsByGroupAndRole('SUPPLIER')
        .mockReturnValueOnce(qb({ data: [{ id: 'role-sup-1' }], error: null }) as any)
        .mockReturnValueOnce(qb({ data: [{ id_company: 'co-sup-100' }], error: null }) as any)
        .mockReturnValueOnce(qb({ data: [{ id: 'co-sup-100' }], error: null }) as any)
        // getCompanyIdsByGroupAndRole('DESTINATION')
        .mockReturnValueOnce(qb({ data: [{ id: 'role-dest-1' }], error: null }) as any)
        .mockReturnValueOnce(qb({ data: [{ id_company: 'co-dest-200' }], error: null }) as any)
        .mockReturnValueOnce(qb({ data: [{ id: 'co-dest-200' }], error: null }) as any)
        // Invoice query
        .mockReturnValueOnce(invoiceSpy as any)

      await assignNotesService.getUnassignedNotes({ grupoCliente: 'grp-1', grupoDestino: 'grp-5' })

      const inCalls = (invoiceSpy._calls as { method: string; args: any[] }[]).filter(c => c.method === 'in')
      const supplierFilter = inCalls.find(c => c.args[0] === 'id_supplier_company')
      const customerFilter = inCalls.find(c => c.args[0] === 'id_customer_company')

      expect(supplierFilter).toBeDefined()
      expect(supplierFilter!.args[1]).toContain('co-sup-100')
      expect(customerFilter).toBeDefined()
      expect(customerFilter!.args[1]).toContain('co-dest-200')
    })
  })

  // ────────────────────────────────────────────────────────────────────────────
  // 9. rel_person_company_role_type nunca recebe is_active
  // ────────────────────────────────────────────────────────────────────────────

  describe('9. rel_person_company_role_type nunca usa is_active', () => {
    it('nenhuma chamada eq("is_active", ...) é feita na tabela rel_ dentro de getUnassignedNotes', async () => {
      const relSpyChain = spyQb({ data: [], error: null })

      vi.mocked(supabase.from)
        .mockReturnValueOnce(qb({ data: [], error: null }) as any)                      // rel_route_invoice
        .mockReturnValueOnce(qb({ data: [{ id: 'role-dest-1' }], error: null }) as any) // ref DESTINATION
        .mockReturnValueOnce(relSpyChain as any)                                          // rel_person_company_role_type (spy)
        .mockReturnValueOnce(qb({ data: [], error: null }) as any)                       // master_company → [] (fail-closed)

      await assignNotesService.getUnassignedNotes({ grupoDestino: 'grp-5' })

      const isActiveCalls = (relSpyChain._calls as { method: string; args: any[] }[]).filter(
        c => c.method === 'eq' && c.args[0] === 'is_active'
      )
      expect(isActiveCalls).toHaveLength(0)

      const isTestCalls = (relSpyChain._calls as { method: string; args: any[] }[]).filter(
        c => c.method === 'eq' && c.args[0] === 'is_test'
      )
      expect(isTestCalls).toHaveLength(1)
    })
  })
})
