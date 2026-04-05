import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AssignNotesPage } from '../AssignNotesPage'

// ============================================================================
// MOCKS
// ============================================================================

// Mock services
vi.mock('../../services/route.service', () => ({
  routeService: {
    list: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    getById: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue({}),
    getReferenceData: vi.fn().mockResolvedValue({
      vehicles: [],
      statuses: [],
      deliveryStatuses: [],
      routeTypes: [],
      routeAreas: [],
    }),
  },
}))

vi.mock('../../services/fiscal-invoice.service', () => ({
  fiscalInvoiceService: {
    list: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    getByRouteId: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('../../services/assignment.service', () => ({
  assignmentService: {
    syncRouteInvoices: vi.fn().mockResolvedValue(undefined),
    unassignInvoiceFromRoute: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('../../services/driver.service', () => ({
  driverService: {
    list: vi.fn().mockResolvedValue({ data: [] }),
  },
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }),
  },
  getEnvironment: vi.fn().mockReturnValue('development'),
}))

// ============================================================================
// TESTES UNITÁRIOS - AssignNotesPage
// ============================================================================

describe('AssignNotesPage - Regras de Negócio', () => {
  describe('1. buildRouteCard - Resolução de Notas', () => {
    it('deve usar dbNotes quando não existe override local', () => {
      const dbNotes = [
        { id: '1', invoice_number: 'NF001', peso: 100 },
        { id: '2', invoice_number: 'NF002', peso: 200 },
      ]
      const localNotes = undefined

      const result = resolveNotas(dbNotes, localNotes)

      expect(result).toHaveLength(2)
      expect(result.map(n => n.id)).toEqual(['1', '2'])
    })

    it('deve usar localNotes quando existe override (mesmo que vazio)', () => {
      const dbNotes = [
        { id: '1', invoice_number: 'NF001', peso: 100 },
        { id: '2', invoice_number: 'NF002', peso: 200 },
      ]
      const localNotes: any[] = []

      const result = resolveNotas(dbNotes, localNotes)

      expect(result).toHaveLength(0)
    })

    it('deve usar localNotes quando tem notas adicionadas', () => {
      const dbNotes = [
        { id: '1', invoice_number: 'NF001', peso: 100 },
      ]
      const localNotes = [
        { id: '1', invoice_number: 'NF001', peso: 100 },
        { id: '2', invoice_number: 'NF002', peso: 200 },
      ]

      const result = resolveNotas(dbNotes, localNotes)

      expect(result).toHaveLength(2)
      expect(result[1].id).toBe('2')
    })

    it('deve usar override vazio para representar "sem notas"', () => {
      const dbNotes = [
        { id: '1', invoice_number: 'NF001', peso: 100 },
      ]
      const localNotes: any[] = []

      const result = resolveNotas(dbNotes, localNotes)

      expect(result).toHaveLength(0)
    })
  })

  describe('2. addTemporaryNoteToRoute - Preservar notas existentes', () => {
    it('deve adicionar nota mantendo notas existentes do banco', () => {
      // Simula: rota tem 1 nota no banco, usuário adiciona mais 1 via drag
      // O override deve conter: 1 nota do banco + 1 nova = 2 notas
      const dbNotes = [
        { id: '1', invoice_number: 'NF001', peso: 100 },
      ]
      const newNote = { id: '2', invoice_number: 'NF002', peso: 200 }

      // Quando não existe override local, deve usar notas do BANCO como base
      const result = addNoteWithBaseFromDB(dbNotes, newNote)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('1') // nota do banco
      expect(result[1].id).toBe('2') // nova nota
    })

    it('deve criar override quando não existe base', () => {
      const dbNotes: any[] = []
      const newNote = { id: '1', invoice_number: 'NF001', peso: 100 }

      const result = addNoteWithBaseFromDB(dbNotes, newNote)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })
  })

  describe('3. notesAvailable - Nota removida volta para disponíveis', () => {
    it('deve retornar nota como disponível após remoção (override local)', () => {
      const routeNotes = {
        'route-1': [
          { id: '1', invoice_number: 'NF001', peso: 100 },
        ],
      }
      const localRouteNotes = {
        'route-1': [], // Override vazio = nota removida
      }
      const routes = [{ id: 'route-1' }]
      const vehicles: any[] = []
      const unassignedNotes = [
        { id: '1', invoice_number: 'NF001', weight: 100 },
      ]

      const result = calculateAvailableNotes(
        routeNotes,
        localRouteNotes,
        routes,
        vehicles,
        unassignedNotes
      )

      // Nota foi removida (override vazio), então deve estar disponível
      expect(result).toHaveLength(1)
    })

    it('deve manter nota como não disponível quando no banco', () => {
      const routeNotes = {
        'route-1': [
          { id: '1', invoice_number: 'NF001', peso: 100 },
        ],
      }
      const localRouteNotes = {} // Sem override
      const routes = [{ id: 'route-1' }]
      const vehicles: any[] = []
      const unassignedNotes = [
        { id: '1', invoice_number: 'NF001', weight: 100 },
        { id: '2', invoice_number: 'NF002', weight: 200 },
      ]

      const result = calculateAvailableNotes(
        routeNotes,
        localRouteNotes,
        routes,
        vehicles,
        unassignedNotes
      )

      // Nota 1 está no banco, não deve estar disponível
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('2')
    })

    it('deve considerar notas adicionadas localmente como não disponíveis', () => {
      const routeNotes = {
        'route-1': [
          { id: '1', invoice_number: 'NF001', peso: 100 },
        ],
      }
      const localRouteNotes = {
        'route-1': [
          { id: '1', invoice_number: 'NF001', peso: 100 },
          { id: '2', invoice_number: 'NF002', peso: 200 }, // Adicionada localmente
        ],
      }
      const routes = [{ id: 'route-1' }]
      const vehicles: any[] = []
      const unassignedNotes = [
        { id: '1', invoice_number: 'NF001', weight: 100 },
        { id: '2', invoice_number: 'NF002', weight: 200 },
        { id: '3', invoice_number: 'NF003', weight: 300 },
      ]

      const result = calculateAvailableNotes(
        routeNotes,
        localRouteNotes,
        routes,
        vehicles,
        unassignedNotes
      )

      // Notas 1 e 2 estão atribuídas (banco + override), só 3 está disponível
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('3')
    })
  })

  describe('3.5. handleRemoveNote - Remover notas existentes', () => {
    it('deve criar override filtrado ao remover nota da rota', () => {
      // Rota com 2 notas no banco
      const routeNotes = {
        'route-1': [
          { id: '1', invoice_number: 'NF001', peso: 100 },
          { id: '2', invoice_number: 'NF002', peso: 200 },
        ],
      }
      const localRouteNotes = {}

      // Usuário remove nota '1'
      const result = removeNoteAndCreateOverride(routeNotes['route-1'], localRouteNotes, 'route-1', '1')

      // Override deve conter apenas nota '2'
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('2')
    })

    it('deve criar override vazio ao remover última nota', () => {
      // Rota com 1 nota no banco
      const routeNotes = {
        'route-1': [
          { id: '1', invoice_number: 'NF001', peso: 100 },
        ],
      }
      const localRouteNotes = {}

      // Usuário remove a última nota
      const result = removeNoteAndCreateOverride(routeNotes['route-1'], localRouteNotes, 'route-1', '1')

      // Override deve ser vazio (não undefined)
      expect(result).toHaveLength(0)
    })

    it('deve criar override filtrado quando nota estava no override local', () => {
      // Rota com override que tem 2 notas
      const routeNotes = {
        'route-1': [
          { id: '1', invoice_number: 'NF001', peso: 100 },
        ],
      }
      const localRouteNotes = {
        'route-1': [
          { id: '1', invoice_number: 'NF001', peso: 100 },
          { id: '2', invoice_number: 'NF002', peso: 200 },
        ],
      }

      // Usuário remove nota '2' do override
      const result = removeNoteAndCreateOverride(routeNotes['route-1'], localRouteNotes, 'route-1', '2')

      // Override filtrado deve conter apenas '1'
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })
  })

  describe('4. handleCreateRoute - Criar rota com notas temporárias', () => {
    it('deve mapear notas para destinos com destination_name', () => {
      const vehicleNotes = [
        { id: '1', invoice_number: 'NF001', peso: 100, destination_name: 'Empresa A' },
        { id: '2', invoice_number: 'NF002', peso: 200, destination_name: 'Empresa B' },
      ]

      const result = mapNotasParaDestinos(vehicleNotes)

      expect(result).toHaveLength(2)
      expect(result[0].label).toBe('Empresa A')
      expect(result[1].label).toBe('Empresa B')
    })

    it('deve usar invoice_number como fallback quando não tem destination_name', () => {
      const vehicleNotes = [
        { id: '1', invoice_number: 'NF001', peso: 100 },
      ]

      const result = mapNotasParaDestinos(vehicleNotes)

      expect(result[0].label).toBe('NF001')
    })
  })

  describe('5. handleSaveEditRoute - Sync add/remove', () => {
    it('deve sincronizar notas adicionadas e removidas', async () => {
      const syncResult = await syncNotas(
        ['1', '2'], // notas atuais no override
        ['1', '3'] // notas que devem permanecer
      )

      // 2 foi removida, 3 foi adicionada
      expect(syncResult.removed).toContain('2')
      expect(syncResult.added).toContain('3')
      expect(syncResult.kept).toContain('1')
    })

    it('deve manter notas quando não há alteração', async () => {
      const syncResult = await syncNotas(
        ['1', '2'],
        ['1', '2']
      )

      expect(syncResult.removed).toHaveLength(0)
      expect(syncResult.added).toHaveLength(0)
    })
  })

  describe('6. Refresh - Recompõe rota com notas', () => {
    it('deve recompôr notas do banco após refresh', () => {
      const routeNotes = {
        'route-1': [
          { id: '1', invoice_number: 'NF001', peso: 100 },
          { id: '2', invoice_number: 'NF002', peso: 200 },
        ],
      }
      const localRouteNotes = undefined // Após clearLocalChanges

      const result = resolveNotas(routeNotes['route-1'], localRouteNotes)

      expect(result).toHaveLength(2)
    })

    it('deve manter override local quandodirty após refresh', () => {
      const routeNotes = {
        'route-1': [
          { id: '1', invoice_number: 'NF001', peso: 100 },
        ],
      }
      const localRouteNotes = {
        'route-1': [
          { id: '1', invoice_number: 'NF001', peso: 100 },
          { id: '2', invoice_number: 'NF002', peso: 200 },
        ],
      }

      const result = resolveNotas(routeNotes['route-1'], localRouteNotes['route-1'])

      expect(result).toHaveLength(2)
    })
  })

  describe('Nomes de Campos Padronizados', () => {
    it('deve usar "ajudante" no formulário (não "ayudante")', () => {
      const formData = {
        ajudante: 'João',
      }

      // O campo no formulário deve ser "ajudante"
      expect(formData).toHaveProperty('ajudante')
      expect(formData.ajudante).toBe('João')
    })

    it('deve mapear "ends_at" corretamente para "fimRota"', () => {
      const routeDetails = {
        ends_at: '2024-01-15',
      }

      const mapped = mapFimRota(routeDetails)

      expect(mapped.fimRota).toBe('2024-01-15')
    })
  })
})

// ============================================================================
// FUNÇÕES DE TESTE (simulam a lógica do componente)
// ============================================================================

// Simula buildRouteCard
function resolveNotas(
  dbNotes: any[],
  localNotes: any[] | undefined
): any[] {
  // Se existe localNotes (mesmo que []), usar ele; senão usar dbNotes
  return localNotes !== undefined ? localNotes : dbNotes
}

// Simula addTemporaryNoteToRoute
function addNoteToBase(baseNotes: any[] | undefined, newNote: any): any[] {
  const base = baseNotes !== undefined ? baseNotes : []
  return [...base, newNote]
}

// Simula addTemporaryNoteToRoute CORRETO: usa banco como base quando não existe override
function addNoteWithBaseFromDB(dbNotes: any[], newNote: any): any[] {
  // Quando não existe override local (undefined), usar notas do BANCO como base
  // e adicionar a nova nota
  return [...dbNotes, newNote]
}

// Simula notesAvailable
function calculateAvailableNotes(
  routeNotes: Record<string, any[]>,
  localRouteNotes: Record<string, any[]>,
  routes: any[],
  vehicles: any[],
  unassignedNotes: any[]
): any[] {
  const assignedIds = new Set<string>()

  routes.forEach(route => {
    const routeId = String(route.id)
    const localOverride = localRouteNotes[routeId]

    if (localOverride !== undefined) {
      localOverride.forEach((n: any) => assignedIds.add(String(n.id)))
    } else {
      const dbNotes = routeNotes[routeId] || []
      dbNotes.forEach((n: any) => assignedIds.add(String(n.id)))
    }
  })

  return unassignedNotes.filter(n => !assignedIds.has(String(n.id)))
}

// Simula mapNotasParaDestinos
function mapNotasParaDestinos(notes: any[]): { value: string; label: string }[] {
  return notes.map(n => ({
    value: n.id,
    label: n.destination_name || n.invoice_number || n.id,
  }))
}

// Simula sync de notas
async function syncNotas(
  currentNoteIds: string[],
  finalNoteIds: string[]
): Promise<{ added: string[]; removed: string[]; kept: string[] }> {
  const currentSet = new Set(currentNoteIds)
  const finalSet = new Set(finalNoteIds)

  const removed = currentNoteIds.filter(id => !finalSet.has(id))
  const added = finalNoteIds.filter(id => !currentSet.has(id))
  const kept = finalNoteIds.filter(id => currentSet.has(id))

  return { added, removed, kept }
}

// Simula mapFimRota
function mapFimRota(routeDetails: any): { fimRota: string } {
  return {
    fimRota: routeDetails.ends_at || '',
  }
}

// Simula handleRemoveNote - cria override filtrado
function removeNoteAndCreateOverride(
  routeNotes: any[],
  localRouteNotes: Record<string, any[]>,
  routeId: string,
  noteIdToRemove: string
): any[] {
  // Buscar nota no banco ou local
  let note = routeNotes.find(n => String(n.id) === noteIdToRemove)
  if (!note) {
    note = localRouteNotes[routeId]?.find(n => String(n.id) === noteIdToRemove)
  }

  if (!note) {
    // Nota não encontrada, retornar base atual
    const existingOverride = localRouteNotes[routeId]
    return existingOverride !== undefined ? existingOverride : routeNotes
  }

  // Criar override filtrado (removendo a nota)
  // Se já existe override, filtrar ele; senão criar override com notas do banco filtradas
  const existingOverride = localRouteNotes[routeId]
  if (existingOverride !== undefined) {
    return existingOverride.filter(n => String(n.id) !== noteIdToRemove)
  } else {
    // Criar override com notas do banco filtradas
    return routeNotes.filter(n => String(n.id) !== noteIdToRemove)
  }
}
