/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { driverService } from './driver.service'
import { supabase, getEnvironment } from '../../../lib/supabase'
import { makeDriver } from '../../../testing/factories'

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
// canInactivateDriver
// ──────────────────────────────────────────────

describe('driverService.canInactivateDriver', () => {
  it('retorna false quando motorista já está inativo', async () => {
    const driver = makeDriver({ is_active: false })
    vi.mocked(supabase.from).mockReturnValue(qb({ data: driver, error: null }) as any)

    const result = await driverService.canInactivateDriver(driver.id)

    expect(result.canInactivate).toBe(false)
    expect(result.reason).toBe('Este motorista já está inativo.')
  })

  it('retorna false quando motorista possui rota ativa (rota em andamento)', async () => {
    const driver = makeDriver({ is_active: true })

    vi.mocked(supabase.from)
      .mockReturnValueOnce(qb({ data: driver, error: null }) as any)              // getById single()
      .mockReturnValueOnce(qb({ data: [{ id: 'route-active' }], error: null }) as any) // trx_route limit(1)

    const result = await driverService.canInactivateDriver(driver.id)

    expect(result.canInactivate).toBe(false)
    expect(result.reason).toContain('rota em andamento')
  })

  it('retorna false quando motorista possui rota pendente (is_active = true)', async () => {
    const driver = makeDriver({ is_active: true })

    vi.mocked(supabase.from)
      .mockReturnValueOnce(qb({ data: driver, error: null }) as any)
      .mockReturnValueOnce(qb({ data: [{ id: 'route-pending' }], error: null }) as any)

    const result = await driverService.canInactivateDriver(driver.id)

    expect(result.canInactivate).toBe(false)
  })

  it('retorna true quando motorista só tem histórico finalizado (sem rotas ativas)', async () => {
    const driver = makeDriver({ is_active: true })

    vi.mocked(supabase.from)
      .mockReturnValueOnce(qb({ data: driver, error: null }) as any)
      .mockReturnValueOnce(qb({ data: [], error: null }) as any) // trx_route → sem rotas ativas

    const result = await driverService.canInactivateDriver(driver.id)

    expect(result.canInactivate).toBe(true)
    expect(result.reason).toBeUndefined()
  })

  it('falha fechada quando query de rotas retorna erro', async () => {
    const driver = makeDriver({ is_active: true })

    vi.mocked(supabase.from)
      .mockReturnValueOnce(qb({ data: driver, error: null }) as any)
      .mockReturnValueOnce(qb({ data: null, error: { message: 'timeout' } }) as any)

    const result = await driverService.canInactivateDriver(driver.id)

    expect(result.canInactivate).toBe(false)
  })

  it('lança erro quando motorista não encontrado', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      qb({ data: null, error: { message: 'not found' } }) as any
    )

    await expect(driverService.canInactivateDriver('nonexistent')).rejects.toThrow(
      'Motorista não encontrado.'
    )
  })
})

// ──────────────────────────────────────────────
// toggleActive
// ──────────────────────────────────────────────

describe('driverService.toggleActive', () => {
  it('inativa motorista: is_active = false', async () => {
    const driver = makeDriver({ is_active: true })
    const updated = { ...driver, is_active: false }
    vi.mocked(supabase.from).mockReturnValue(qb({ data: updated, error: null }) as any)

    const result = await driverService.toggleActive(driver.id, false)

    expect(result.is_active).toBe(false)
  })

  it('ativa motorista: is_active = true', async () => {
    const driver = makeDriver({ is_active: false })
    const updated = { ...driver, is_active: true }
    vi.mocked(supabase.from).mockReturnValue(qb({ data: updated, error: null }) as any)

    const result = await driverService.toggleActive(driver.id, true)

    expect(result.is_active).toBe(true)
  })

  it('propaga erro do banco ao tentar atualizar', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      qb({ data: null, error: { message: 'connection refused' } }) as any
    )

    await expect(driverService.toggleActive('any-id', false)).rejects.toThrow('connection refused')
  })
})

// ──────────────────────────────────────────────
// cpfExists
// ──────────────────────────────────────────────

describe('driverService.cpfExists', () => {
  it('retorna false quando CPF não encontrado', async () => {
    vi.mocked(supabase.from).mockReturnValue(qb({ data: [], error: null }) as any)

    const result = await driverService.cpfExists('123.456.789-00')

    expect(result).toBe(false)
  })

  it('retorna true quando CPF já existe', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      qb({ data: [{ id: 'driver-1' }], error: null }) as any
    )

    const result = await driverService.cpfExists('123.456.789-00')

    expect(result).toBe(true)
  })

  it('normaliza CPF removendo formatação antes de consultar', async () => {
    let capturedTaxId: string | undefined

    vi.mocked(supabase.from).mockImplementation(() => {
      const chain: Record<string, unknown> = {}
      const self = () => chain
      for (const m of ['select', 'neq', 'limit', 'order']) {
        chain[m] = vi.fn().mockImplementation(self)
      }
      chain.eq = vi.fn().mockImplementation((field: string, value: unknown) => {
        if (field === 'tax_id') capturedTaxId = value as string
        return chain
      })
      chain.single = vi.fn().mockResolvedValue({ data: [], error: null })
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: [], error: null })
      chain.then = (onFulfilled: (v: unknown) => void) =>
        onFulfilled({ data: [], error: null })
      return chain as any
    })

    await driverService.cpfExists('123.456.789-00')

    expect(capturedTaxId).toBe('12345678900')
  })
})
