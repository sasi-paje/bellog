/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { vehicleService } from './vehicle.service'
import { supabase, getEnvironment } from '../../../lib/supabase'
import { makeVehicle } from '../../../testing/factories'

// ──────────────────────────────────────────────
// Mock
// ──────────────────────────────────────────────

vi.mock('../../../lib/supabase', () => ({
  supabase: { from: vi.fn() },
  getEnvironment: vi.fn().mockReturnValue('development'),
}))

/**
 * Builds a chainable query mock that also acts as a thenable.
 * - Every chain method (select, eq, …) returns the same object.
 * - `.single()` / `.maybeSingle()` return a resolved Promise.
 * - `await chain` works because the object has a `then` method.
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
  // Makes `await chain` resolve to `result`
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
// canInactivateVehicle
// ──────────────────────────────────────────────

describe('vehicleService.canInactivateVehicle', () => {
  it('retorna false quando veículo já está inativo', async () => {
    const vehicle = makeVehicle({ is_active: false })
    vi.mocked(supabase.from).mockReturnValue(qb({ data: vehicle, error: null }) as any)

    const result = await vehicleService.canInactivateVehicle(vehicle.id)

    expect(result.canInactivate).toBe(false)
    expect(result.reason).toBe('Este veículo já está inativo.')
  })

  it('retorna false quando veículo possui rota ativa', async () => {
    const vehicle = makeVehicle({ is_active: true })

    vi.mocked(supabase.from)
      .mockReturnValueOnce(qb({ data: vehicle, error: null }) as any)     // getById single()
      .mockReturnValueOnce(qb({ data: [{ id: 'route-x' }], error: null }) as any) // trx_route limit(1)

    const result = await vehicleService.canInactivateVehicle(vehicle.id)

    expect(result.canInactivate).toBe(false)
    expect(result.reason).toContain('rota em andamento')
  })

  it('retorna true quando veículo ativo não tem rotas ativas', async () => {
    const vehicle = makeVehicle({ is_active: true })

    vi.mocked(supabase.from)
      .mockReturnValueOnce(qb({ data: vehicle, error: null }) as any)  // vehicle single()
      .mockReturnValueOnce(qb({ data: [], error: null }) as any)       // trx_route limit(1) → vazio

    const result = await vehicleService.canInactivateVehicle(vehicle.id)

    expect(result.canInactivate).toBe(true)
    expect(result.reason).toBeUndefined()
  })

  it('falha fechada quando query de rotas retorna erro (não permite inativar)', async () => {
    const vehicle = makeVehicle({ is_active: true })

    vi.mocked(supabase.from)
      .mockReturnValueOnce(qb({ data: vehicle, error: null }) as any)
      .mockReturnValueOnce(qb({ data: null, error: { message: 'DB error' } }) as any)

    const result = await vehicleService.canInactivateVehicle(vehicle.id)

    expect(result.canInactivate).toBe(false)
  })
})

// ──────────────────────────────────────────────
// setActive
// ──────────────────────────────────────────────

describe('vehicleService.setActive', () => {
  it('inativa veículo (is_active = false) sem lançar erro', async () => {
    const vehicle = makeVehicle({ is_active: true })
    vi.mocked(supabase.from).mockReturnValue(qb({ data: null, error: null }) as any)

    await expect(vehicleService.setActive(vehicle.id, false)).resolves.toBeUndefined()
  })

  it('ativa veículo (is_active = true) sem lançar erro', async () => {
    const vehicle = makeVehicle({ is_active: false })
    vi.mocked(supabase.from).mockReturnValue(qb({ data: null, error: null }) as any)

    await expect(vehicleService.setActive(vehicle.id, true)).resolves.toBeUndefined()
  })

  it('propaga erro do banco ao tentar atualizar', async () => {
    vi.mocked(supabase.from).mockReturnValue(
      qb({ data: null, error: { message: 'Falha de conexão' } }) as any
    )

    await expect(vehicleService.setActive('any-id', false)).rejects.toThrow('Falha de conexão')
  })
})

// ──────────────────────────────────────────────
// create — placa duplicada
// ──────────────────────────────────────────────

describe('vehicleService.create — placa', () => {
  it('lança erro quando placa já existe', async () => {
    // First from() call → plate check returns existing record
    vi.mocked(supabase.from).mockReturnValue(
      qb({ data: { id: 'existing-vehicle' }, error: null }) as any
    )

    await expect(
      vehicleService.create({ plate: 'ABC1234' })
    ).rejects.toThrow('Já existe um veículo com esta placa')
  })

  it('cria veículo quando placa é nova', async () => {
    const created = {
      id: 'new-id',
      plate: 'XYZ9999',
      code: null,
      name: 'Fiat Ducato',
      nominal_capacity: 2000,
      is_active: true,
      is_test: true,
    }

    vi.mocked(supabase.from)
      .mockReturnValueOnce(qb({ data: null, error: null }) as any)    // plate check → not found
      .mockReturnValueOnce(qb({ data: created, error: null }) as any) // insert → created

    const result = await vehicleService.create({ plate: 'XYZ9999', model: 'Fiat Ducato' })

    expect(result.plate).toBe('XYZ9999')
    expect(result.id).toBe('new-id')
  })
})
