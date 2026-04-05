// =====================================================
// ARQUITETURA DA PÁGINA ATRIBUIR NOTAS
// =====================================================
//
// Este arquivo segue uma arquitetura limpa com estas camadas:
//
// 1. TIPOS           - Definições de interfaces e tipos
// 2. ESTADO PERSISTIDO (usePersistedState) - Dados do banco
// 3. ESTADO TEMPORÁRIO (useTemporaryState) - Alterações locais
// 4. REGRAS DE NEGÓCIO - Funções de comando (commands)
// 5. BUILDER - Funções de construção de cards
// 6. UI - Componentes de apresentação
// =====================================================

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { AppIcon, Drawer } from '../../shared/components'
import { NotesList } from './components/NotesList'
import { RoutesGrid } from './components/RoutesGrid'
import { ConfirmRemoveModal } from './components/ConfirmRemoveModal'
import { FilterModal } from './components/FilterModal'
import { NoteDetailModal } from './components/NoteDetailModal'
import { RouteEditForm } from '../routes/components/RouteEditForm'
import { routeService, RouteListItem } from '../../services/route.service'
import { fiscalInvoiceService } from '../../services/fiscal-invoice.service'
import { assignmentService } from '../../services/assignment.service'
import { driverService } from '../../services/driver.service'
import { MasterFleetVehicle, supabase, getEnvironment } from '../../lib/supabase'

// =====================================================
// 1. TIPOS E INTERFACES
// =====================================================

/** Nota disponível na lista da esquerda */
interface NoteItem {
  id: string
  invoice_number: string
  weight: number
  volume: number
  value?: number
  destination_name?: string
  issue_date?: string
  is_active?: boolean
}

/** Nota atribuída a uma rota (formato interno) */
interface AssignedNote {
  id: string
  invoice_number: string
  peso: number
  destination_name?: string
}

/** Dados do card de rota para renderização */
interface RouteCardData {
  id: string
  tipoRota: string
  numeroRota: string
  veiculo: string
  capacidade: number
  cargaAtual: number
  notasAtribuidas: AssignedNote[]
  isTemporary: boolean
  hasPendingChanges: boolean
  buttonLabel: string
  buttonColor: 'gray' | 'orange'
  route_status?: string
}

/** Props do componente de página */
interface AssignNotesPageProps {
  userName?: string
  userRole?: string
}

/** Dados do formulário de rota */
interface RouteFormData {
  status: string
  statusEntrega: string
  numeroRota: string
  areaRota: string
  responsaveis: string
  destinos: { value: string; label: string }[]
  tipoRota: string
  dataSaida: string
  fimRota: string
  motorista: string
  ajudante: string
  placaVeiculo: string
  cargaMaxima: string
}

// =====================================================
// 2. ESTADO PERSISTIDO (usePersistedState)
// =====================================================
//
// Responsabilidade: gerenciar dados que vêm do banco de dados
// - rotas existentes
// - notas vinculadas às rotas
// - veículos disponíveis
// - drivers, statuses de rota, statuses de entrega

function usePersistedState() {
  const [routes, setRoutes] = useState<RouteListItem[]>([])
  const [routeNotes, setRouteNotes] = useState<Record<string, AssignedNote[]>>({})
  const [vehicles, setVehicles] = useState<MasterFleetVehicle[]>([])
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([])
  const [routeStatuses, setRouteStatuses] = useState<{ id: string; description: string }[]>([])
  const [deliveryStatuses, setDeliveryStatuses] = useState<{ id: string; description: string }[]>([])

  /** Busca todas as rotas ativas e suas notas vinculadas */
  const fetchRoutes = useCallback(async () => {
    const result = await routeService.list({ isActive: true, limit: 50 })
    setRoutes(result.data)

    // Para cada rota, buscar suas notas vinculadas
    const notesByRoute: Record<string, AssignedNote[]> = {}
    const promises = result.data.map(async (r) => {
      const invoices = await fiscalInvoiceService.getByRouteId(String(r.id))
      return {
        routeId: String(r.id),
        notes: invoices.map((inv) => ({
          id: String(inv.id),
          invoice_number: inv.invoice_number,
          peso: inv.weight,
          destination_name: inv.destination_name,
        })),
      }
    })

    const results = await Promise.all(promises)
    results.forEach(({ routeId, notes }) => {
      notesByRoute[routeId] = notes
    })

    setRouteNotes(notesByRoute)
  }, [])

  /** Busca dados de referência: veículos, drivers, statuses */
  const fetchReferenceData = useCallback(async () => {
    const refData = await routeService.getReferenceData()

    setVehicles(refData.vehicles)
    setRouteStatuses(refData.statuses.map((s: any) => ({
      id: String(s.id),
      description: s.name || s.description || s.code,
    })))
    setDeliveryStatuses(refData.deliveryStatuses.map((s: any) => ({
      id: String(s.id),
      description: s.name || s.description || s.code,
    })))

    const driverData = await driverService.list()
    setDrivers(driverData.data?.map((d: any) => ({ id: d.id, name: d.name })) || [])
  }, [])

  return {
    routes,
    routeNotes,
    vehicles,
    drivers,
    routeStatuses,
    deliveryStatuses,
    fetchRoutes,
    fetchReferenceData,
  }
}

// =====================================================
// 3. ESTADO TEMPORÁRIO (useTemporaryState)
// =====================================================
//
// Responsabilidade: gerenciar alterações locais não persistidas
// - notas atribuídas a veículos temporários (sem rota)
// - notas adicionadas/removidas em rotas existentes (pendentes)
// - notas disponíveis (não atribuídas a nenhuma rota/veículo)

function useTemporaryState() {
  /** Override local de notas por rota/veículo */
  const [localRouteNotes, setLocalRouteNotes] = useState<Record<string, AssignedNote[]>>({})

  /** Lista de notas disponíveis (não atribuídas) */
  const [localUnassignedNotes, setLocalUnassignedNotes] = useState<NoteItem[]>([])

  /** Rotas que têm alterações locais pendentes */
  const [dirtyRoutes, setDirtyRoutes] = useState<Set<string>>(new Set())

  /** Limpa todas as alterações locais de uma rota */
  const clearChanges = useCallback((routeId: string) => {
    setLocalRouteNotes((prev) => {
      const next = { ...prev }
      delete next[routeId]
      return next
    })
    setDirtyRoutes((prev) => {
      const next = new Set(prev)
      next.delete(routeId)
      return next
    })
  }, [])

  /** Busca notas não atribuídas a nenhuma rota */
  const fetchUnassignedNotes = useCallback(async (page = 1, search?: string, filters?: any) => {
    const result = await fiscalInvoiceService.list({ page, search, isActive: true, ...filters })
    setLocalUnassignedNotes(result.data.map((inv) => ({
      id: String(inv.id),
      invoice_number: inv.invoice_number,
      weight: inv.weight,
      volume: inv.volume,
      value: inv.value,
      destination_name: inv.destination_name,
      issue_date: inv.issue_date,
    })))
  }, [])

  return {
    localRouteNotes,
    setLocalRouteNotes,
    localUnassignedNotes,
    setLocalUnassignedNotes,
    dirtyRoutes,
    setDirtyRoutes,
    clearChanges,
    fetchUnassignedNotes,
  }
}

// =====================================================
// 4. REGRAS DE NEGÓCIO (COMMANDS)
// =====================================================

/**
 * REGRA CENTRAL: Obtém a fonte final de notas para uma rota.
 *
 * Lógica:
 * - Se existir override local (incluindo array vazio []), usa-o
 * - Caso contrário, usa as notas do banco
 *
 * Isso permite que o usuário:
 * - Adicione notas localmente antes de salvar
 * - Remova todas as notas e salve (override = [])
 * - Veja alterações locais refletidas imediatamente
 */
function getFinalNotes(
  routeId: string,
  localNotes: Record<string, AssignedNote[]>,
  dbNotes: Record<string, AssignedNote[]>
): AssignedNote[] {
  const localOverride = localNotes[routeId]
  if (localOverride !== undefined) {
    return localOverride // Pode ser [] - override válido
  }
  return dbNotes[routeId] || [] // Notas do banco
}

/** Cria uma nova rota com suas notas vinculadas */
async function createRouteWithInvoices(
  vehicle: MasterFleetVehicle,
  notes: AssignedNote[],
  data: RouteFormData
): Promise<void> {
  const isTest = getEnvironment() !== 'production'

  // 1. Criar a rota
  const { data: newRoute, error } = await supabase
    .from('trx_route')
    .insert({
      route_code: data.numeroRota,
      departure_date: data.dataSaida,
      id_route_status: data.status,
      id_route_delivery_status: data.statusEntrega,
      id_vehicle: vehicle.id,
      id_driver: data.motorista || null,
      observation: data.responsaveis || null,
      area: data.areaRota || null,
      responsible: data.responsaveis || null,
      assistant: data.ajudante || null,
      is_test: isTest,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // 2. Criar vínculos com as notas
  if (notes.length > 0) {
    await supabase.from('rel_route_invoice').insert(
      notes.map((note) => ({
        id_route: newRoute.id,
        id_fiscal_invoice: parseInt(note.id, 10),
        assigned_at: new Date().toISOString(),
        is_test: isTest,
        is_active: true,
      }))
    )
  }
}

/** Atualiza dados da rota e sincroniza as notas vinculadas */
async function updateRouteAndSyncInvoices(
  routeId: string,
  data: RouteFormData,
  noteIds: string[]
): Promise<void> {
  // 1. Atualizar dados da rota (só passar campos com valores definidos)
  const updateData: any = {}
  if (data.status) updateData.id_route_status = data.status
  if (data.statusEntrega) updateData.id_route_delivery_status = data.statusEntrega
  if (data.dataSaida) updateData.departure_date = data.dataSaida
  if (data.fimRota) updateData.arrival_date = data.fimRota
  if (data.motorista) updateData.id_driver = data.motorista
  if (data.ajudante) updateData.assistant = data.ajudante
  if (data.responsaveis) {
    updateData.observation = data.responsaveis
    updateData.responsible = data.responsaveis
  }

  if (Object.keys(updateData).length > 0) {
    await routeService.update(routeId, updateData)
  }

  // 2. Sincronizar notas (adicionar/remover/reativar)
  await assignmentService.syncRouteInvoices(routeId, noteIds)
}

/** Carrega dados de uma rota para o formulário de edição */
async function loadRouteForEdit(routeId: string): Promise<RouteFormData> {
  const route = await routeService.getById(routeId)
  if (!route) throw new Error('Rota não encontrada')

  const invoices = await fiscalInvoiceService.getByRouteId(routeId)

  return {
    status: route.id_route_status ? String(route.id_route_status) : '',
    statusEntrega: route.id_route_delivery_status ? String(route.id_route_delivery_status) : '',
    numeroRota: route.route_code || '',
    areaRota: (route as any).area || (route as any).route_area?.description || '',
    responsaveis: (route as any).observation || (route as any).responsible || '',
    destinos: invoices.map((inv) => ({
      value: String(inv.id),
      label: inv.destination_name || `NF ${inv.invoice_number}`,
    })),
    tipoRota: route.id_route_type ? String(route.id_route_type) : '',
    dataSaida: route.departure_date || '',
    fimRota: (route as any).arrival_date || (route as any).ends_at || '',
    motorista: route.drivers?.[0]?.id ? String(route.drivers[0].id) : '',
    ajudante: (route as any).assistant || (route as any).helpers?.[0]?.name || '',
    placaVeiculo: '',
    cargaMaxima: '500',
  }
}

// =====================================================
// 5. BUILDER DE CARDS
// =====================================================

/**
 * Constrói os dados de um card de rota para renderização.
 * Este builder centraliza toda a lógica de exibição do card.
 */
function buildRouteCard(
  route: RouteListItem | null,
  vehicle: MasterFleetVehicle | null,
  dbNotes: AssignedNote[],
  localNotes: AssignedNote[] | undefined,
  isTemporary: boolean,
  isDirty: boolean
): RouteCardData {
  // Define as notas finais: local override ou banco
  const notasAtribuidas = localNotes !== undefined ? localNotes : dbNotes

  // Calcula carga atual (soma dos pesos)
  const cargaAtual = notasAtribuidas.reduce((sum, n) => sum + (n.peso || 0), 0)
  const capacidade = vehicle?.max_capacity || 500

  // Define label e cor do botão
  const buttonLabel = isTemporary ? 'Criar Rota' : 'Alterar Rota'
  const buttonColor = isTemporary
    ? (notasAtribuidas.length > 0 ? 'orange' : 'gray')
    : (isDirty ? 'orange' : 'gray')

  // ID do card: usa prefixo "vehicle-" para temporários
  const cardId = isTemporary ? `vehicle-${vehicle?.id}` : String(route?.id || '')

  return {
    id: cardId,
    tipoRota: route?.area_description || (isTemporary ? 'Nova Rota' : 'Rota'),
    numeroRota: route?.route_code || '',
    veiculo: vehicle?.plate || (isTemporary ? 'Sem veículo' : ''),
    capacidade,
    cargaAtual,
    notasAtribuidas,
    isTemporary,
    hasPendingChanges: isDirty,
    buttonLabel,
    buttonColor,
    route_status: route?.status,
  }
}

// =====================================================
// 6. COMPONENTES DE UI
// =====================================================

/** Cabeçalho da página com título e info do usuário */
function PageHeader({ title, userName = 'Leon', userRole = 'Usuário' }: {
  title: string
  userName?: string
  userRole?: string
}) {
  return (
    <div className="flex h-[78px] items-center justify-between p-3 shrink-0 w-full">
      <div className="flex gap-2 items-center w-[675px]">
        <div className="w-6 h-6">
          <AppIcon name="left_panel_close" size={24} />
        </div>
        <h1 className="font-bold text-[24px] text-[#0f3255]">{title}</h1>
      </div>
      <div className="flex gap-1 h-[34px] items-center">
        <div className="w-[34px] h-[34px] rounded-full bg-[#bdcde8] flex items-center justify-center">
          <div className="w-[24px] h-[24px] rounded-full bg-[#0f3255] flex items-center justify-center">
            <span className="font-normal text-[16px] text-white">{userName.charAt(0)}</span>
          </div>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-[12px] text-[#4c4c4c]">{userName}</span>
          <span className="font-normal text-[10px] text-[#4c4c4c]">{userRole}</span>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// 7. COMPONENTE PRINCIPAL
// =====================================================

export function AssignNotesPage({ userName = 'Leon', userRole = 'Usuário' }: AssignNotesPageProps) {
  // ---------- ESTADO PERSISTIDO ----------
  const {
    routes,
    routeNotes,
    vehicles,
    drivers,
    routeStatuses,
    deliveryStatuses,
    fetchRoutes,
    fetchReferenceData,
  } = usePersistedState()

  // ---------- ESTADO TEMPORÁRIO ----------
  const {
    localRouteNotes,
    setLocalRouteNotes,
    localUnassignedNotes,
    setLocalUnassignedNotes,
    dirtyRoutes,
    setDirtyRoutes,
    clearChanges,
    fetchUnassignedNotes,
  } = useTemporaryState()

  // ---------- NOTAS DISPONÍVEIS ----------
  // Calcula quais notas não estão atribuídas a nenhuma rota ou veículo
  const notesAvailable = useMemo(() => {
    const assignedIds = new Set<string>()

    // Rotas persistidas: considera override local ou banco
    routes.forEach((route) => {
      const finalNotes = getFinalNotes(String(route.id), localRouteNotes, routeNotes)
      finalNotes.forEach((n) => assignedIds.add(String(n.id)))
    })

    // Veículos temporários: só usa estado local
    vehicles.forEach((v) => {
      const notes = localRouteNotes[`vehicle-${v.id}`] || []
      notes.forEach((n) => assignedIds.add(String(n.id)))
    })

    return localUnassignedNotes.filter((n) => !assignedIds.has(String(n.id)))
  }, [localUnassignedNotes, routeNotes, localRouteNotes, routes, vehicles])

  // ---------- ESTADO DE UI ----------
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false)
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false)
  const [isNoteDetailOpen, setIsNoteDetailOpen] = useState(false)

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
  const [pendingRemove, setPendingRemove] = useState<{ routeId: string; noteId: string; invoiceNumber: string } | null>(null)
  const [selectedNote, setSelectedNote] = useState<{ id: string; invoice_number: string; weight: number; volume: number; value: number; destination_name: string; is_active: boolean } | null>(null)
  const [createRouteData, setCreateRouteData] = useState<RouteFormData | null>(null)
  const [editRouteData, setEditRouteData] = useState<RouteFormData | null>(null)

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // ---------- CARREGAMENTO INICIAL ----------
  useEffect(() => {
    fetchRoutes()
    fetchReferenceData()
    fetchUnassignedNotes()
  }, [fetchRoutes, fetchReferenceData, fetchUnassignedNotes])

  // ---------- BUSCA COM DEBOUNCE ----------
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => fetchUnassignedNotes(1, value), 300)
  }, [fetchUnassignedNotes])

  // =====================================================
  // AÇÕES DO USUÁRIO
  // =====================================================

  /** Abre o drawer de criação de rota para um veículo temporário */
  const handleOpenCreateDrawer = (vehicleId: string) => {
    console.log('[handleOpenCreateDrawer] vehicleId:', vehicleId)
    console.log('[handleOpenCreateDrawer] vehicles:', vehicles.map(v => ({ id: v.id, plate: v.plate })))

    const vehicle = vehicles.find((v) => String(v.id) === String(vehicleId))
    console.log('[handleOpenCreateDrawer] found vehicle:', vehicle)

    if (!vehicle) {
      console.error('[handleOpenCreateDrawer] Vehicle not found for id:', vehicleId)
      return
    }

    const vehicleKey = `vehicle-${vehicleId}`
    const notes = localRouteNotes[vehicleKey] ?? []
    console.log('[handleOpenCreateDrawer] notes for vehicle:', notes)

    setCreateRouteData({
      status: '',
      statusEntrega: '',
      numeroRota: '',
      areaRota: '',
      responsaveis: '',
      destinos: notes.map((n) => ({ value: n.id, label: n.destination_name || n.invoice_number })),
      tipoRota: '',
      dataSaida: '',
      fimRota: '',
      motorista: '',
      ajudante: '',
      placaVeiculo: vehicle.plate || '',
      cargaMaxima: String(vehicle.max_capacity || 500),
    })

    setSelectedVehicleId(String(vehicleId))
    setIsCreateDrawerOpen(true)
  }

  /** Salva uma nova rota criada a partir de veículo temporário */
  const handleSaveNewRoute = async () => {
    if (!createRouteData || !selectedVehicleId) return

    console.log('[handleSaveNewRoute] selectedVehicleId:', selectedVehicleId)

    const vehicle = vehicles.find((v) => String(v.id) === String(selectedVehicleId))
    console.log('[handleSaveNewRoute] vehicle:', vehicle)

    if (!vehicle) return

    const vehicleKey = `vehicle-${selectedVehicleId}`
    const notes = localRouteNotes[vehicleKey] ?? []
    console.log('[handleSaveNewRoute] notes to save:', notes)

    setLoading(true)
    try {
      // 1. Criar rota no banco
      await createRouteWithInvoices(vehicle, notes, createRouteData)

      // 2. Limpar estado temporário do veículo
      setLocalRouteNotes((prev) => {
        const next = { ...prev }
        delete next[`vehicle-${selectedVehicleId}`]
        return next
      })

      // 3. Recarregar dados do banco
      await fetchRoutes()
      await fetchUnassignedNotes(1)

      setIsCreateDrawerOpen(false)
      setCreateRouteData(null)
      setSelectedVehicleId(null)
    } catch (err) {
      console.error('[handleSaveNewRoute] Erro ao criar rota:', err)
      alert((err as Error).message || 'Erro ao criar rota')
    } finally {
      setLoading(false)
    }
  }

  /** Abre o drawer de edição de uma rota persistida */
  const handleOpenEditDrawer = async (routeId: string) => {
    const route = routes.find((r) => String(r.id) === String(routeId))
    if (!route) return

    setSelectedRouteId(String(routeId))
    setLoading(true)

    try {
      // 1. Carregar dados básicos da rota
      const formData = await loadRouteForEdit(String(routeId))

      // 2. Sobrescrever destinos com a fonte final de notas
      // Isso garante que o drawer reflita o estado atual do card
      const finalNotes = getFinalNotes(String(routeId), localRouteNotes, routeNotes)
      formData.destinos = finalNotes.map((n) => ({
        value: n.id,
        label: n.destination_name || n.invoice_number
      }))

      setEditRouteData(formData)
      setIsEditDrawerOpen(true)
    } catch (err) {
      console.error('Erro ao carregar rota:', err)
      alert('Erro ao carregar dados da rota')
    } finally {
      setLoading(false)
    }
  }

  /** Salva as alterações de uma rota persistida */
  const handleSaveEditRoute = async () => {
    if (!selectedRouteId || !editRouteData) return

    setLoading(true)
    try {
      // Se há múltiplas rotas dirty, salvar todas na ordem correta
      if (dirtyRoutes.size > 1) {
        await saveAllDirtyRoutes()
      } else {
        // Salvar apenas a rota atual
        const finalNotes = getFinalNotes(selectedRouteId, localRouteNotes, routeNotes)
        const finalNoteIds = finalNotes.map((n) => String(n.id))
        await updateRouteAndSyncInvoices(selectedRouteId, editRouteData, finalNoteIds)
        clearChanges(selectedRouteId)
      }

      // Recarregar dados do banco
      await fetchRoutes()
      await fetchUnassignedNotes(1, searchTerm)

      setIsEditDrawerOpen(false)
      setSelectedRouteId(null)
      setEditRouteData(null)
    } catch (err) {
      console.error('Erro ao salvar:', err)
      alert((err as Error).message || 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  /** Salva todas as rotas dirty na ordem correta (origem primeiro, depois destino) */
  const saveAllDirtyRoutes = async () => {
    console.log('[saveAllDirtyRoutes] INICIANDO')
    const dirtyRouteIds = Array.from(dirtyRoutes)
    console.log('[saveAllDirtyRoutes] dirtyRouteIds:', dirtyRouteIds)

    // Para cada rota dirty, construir o mapa de notas transferidas
    // Isso vai nos ajudar a identificar a ordem
    const pendingTransfers: { fromRoute: string; toRoute: string; noteId: string }[] = []

    for (const routeId of dirtyRouteIds) {
      const localNotes = localRouteNotes[routeId]
      const dbNotes = routeNotes[routeId] || []
      const finalNotes = localNotes !== undefined ? localNotes : dbNotes
      const originalNoteIds = new Set(dbNotes.map(n => String(n.id)))
      const finalNoteIds = new Set(finalNotes.map(n => String(n.id)))

      // Notas que saíram desta rota
      for (const noteId of originalNoteIds) {
        if (!finalNoteIds.has(noteId)) {
          // Encontrar para qual rota foi
          for (const otherRouteId of dirtyRouteIds) {
            if (otherRouteId === routeId) continue
            const otherLocalNotes = localRouteNotes[otherRouteId]
            const otherDbNotes = routeNotes[otherRouteId] || []
            const otherFinalNotes = otherLocalNotes !== undefined ? otherLocalNotes : otherDbNotes
            if (otherFinalNotes.some(n => String(n.id) === noteId)) {
              pendingTransfers.push({ fromRoute: routeId, toRoute: otherRouteId, noteId })
              break
            }
          }
        }
      }
    }

    console.log('[saveAllDirtyRoutes] pendingTransfers:', pendingTransfers)

    // Identificar rotas que são origem de transferências (devem ser salvas primeiro)
    const sourceRoutes = new Set(pendingTransfers.map(t => t.fromRoute))

    // Salvar primeiro as rotas que são origem de transferências
    const routesToSaveFirst = dirtyRouteIds.filter(id => sourceRoutes.has(id))
    const routesToSaveAfter = dirtyRouteIds.filter(id => !sourceRoutes.has(id))

    console.log('[saveAllDirtyRoutes] saving first:', routesToSaveFirst)
    console.log('[saveAllDirtyRoutes] saving after:', routesToSaveAfter)

    // Salvar rotas de origem primeiro
    for (const routeId of routesToSaveFirst) {
      await saveSingleRoute(routeId)
    }

    // Depois salvar as rotas de destino
    for (const routeId of routesToSaveAfter) {
      await saveSingleRoute(routeId)
    }
  }

  /** Salva uma única rota */
  const saveSingleRoute = async (routeId: string) => {
    const localNotes = localRouteNotes[routeId]
    const dbNotes = routeNotes[routeId] || []
    const finalNotes = localNotes !== undefined ? localNotes : dbNotes
    const finalNoteIds = finalNotes.map((n) => String(n.id))

    console.log('[saveSingleRoute] saving route:', routeId, 'with notes:', finalNoteIds)

    // Criar dados mínimos para update
    const route = routes.find(r => String(r.id) === routeId)
    const minimalData = {
      status: '',
      statusEntrega: '',
      numeroRota: route?.route_code || '',
      areaRota: '',
      responsaveis: '',
      destinos: [],
      tipoRota: '',
      dataSaida: '',
      fimRota: '',
      motorista: '',
      ajudante: '',
      placaVeiculo: '',
      cargaMaxima: '',
    }

    await updateRouteAndSyncInvoices(routeId, minimalData, finalNoteIds)
    clearChanges(routeId)
  }

  /** Arrasta uma nota para uma rota ou veículo */
  const handleDropNote = (noteId: string, targetId: string) => {
    const note = notesAvailable.find((n) => String(n.id) === String(noteId))
    if (!note) {
      // Nota pode estar em outra rota - verificar
      console.log('[handleDropNote] nota não encontrada em notesAvailable, verificando outras rotas')
    }

    const noteToAdd: AssignedNote = {
      id: String(noteId),
      invoice_number: note?.invoice_number || '',
      peso: note?.weight || 0,
      destination_name: note?.destination_name,
    }

    // VEÍCULO TEMPORÁRIO: prefixo "vehicle-"
    if (targetId.startsWith('vehicle-')) {
      const vehicleId = targetId.replace('vehicle-', '')
      const vehicleKey = `vehicle-${vehicleId}`

      // Verificar se nota já está em outra rota persistida - se sim, remover de lá
      const sourceRouteId = routes.find(r => {
        const routeId = String(r.id)
        const finalNotes = getFinalNotes(routeId, localRouteNotes, routeNotes)
        return finalNotes.some(n => String(n.id) === String(noteId))
      })?.id

      if (sourceRouteId) {
        const sourceId = String(sourceRouteId)
        // Remover da rota de origem
        const sourceNotes = getFinalNotes(sourceId, localRouteNotes, routeNotes)
        const updatedSourceNotes = sourceNotes.filter(n => String(n.id) !== String(noteId))
        setLocalRouteNotes((prev) => ({ ...prev, [sourceId]: updatedSourceNotes }))
        setDirtyRoutes((prev) => new Set(prev).add(sourceId))
      }

      // Adicionar nota ao veículo
      setLocalRouteNotes((prev) => ({
        ...prev,
        [vehicleKey]: [...(prev[vehicleKey] ?? []), noteToAdd],
      }))

      // Remover da lista da esquerda
      setLocalUnassignedNotes((prev) => prev.filter((n) => String(n.id) !== noteId))
      return
    }

    // ROTA PERSISTIDA: usar fonte final como base
    // Verificar se nota já está em outra rota persistida - se sim, remover de lá primeiro
    const sourceRoute = routes.find(r => {
      const routeId = String(r.id)
      if (routeId === targetId) return false // mesma rota destino
      const finalNotes = getFinalNotes(routeId, localRouteNotes, routeNotes)
      return finalNotes.some(n => String(n.id) === String(noteId))
    })

    if (sourceRoute) {
      const sourceId = String(sourceRoute.id)
      console.log('[handleDropNote] transferindo nota', noteId, 'da rota', sourceId, 'para', targetId)

      // Remover da rota de origem no estado local
      const sourceNotes = getFinalNotes(sourceId, localRouteNotes, routeNotes)
      const updatedSourceNotes = sourceNotes.filter(n => String(n.id) !== String(noteId))
      setLocalRouteNotes((prev) => ({ ...prev, [sourceId]: updatedSourceNotes }))

      // Marcar rota de ORIGEM como dirty
      setDirtyRoutes((prev) => new Set(prev).add(sourceId))
    }

    // Adicionar na rota de destino
    setLocalRouteNotes((prev) => {
      const baseNotes = getFinalNotes(targetId, prev, routeNotes)
      return { ...prev, [targetId]: [...baseNotes, noteToAdd] }
    })

    // Remover da lista da esquerda (se ainda estiver lá)
    setLocalUnassignedNotes((prev) => prev.filter((n) => String(n.id) !== noteId))

    // Marcar rota de DESTINO como dirty
    setDirtyRoutes((prev) => new Set(prev).add(targetId))
  }

  /** Abre modal de confirmação para remover nota de rota persistida */
  const handleRemoveNoteClick = (routeId: string, noteId: string, invoiceNumber: string) => {
    // Veículos temporários: remoção direta, sem modal
    if (routeId.startsWith('vehicle-')) {
      const vehicleId = routeId.replace('vehicle-', '')
      const vehicleKey = `vehicle-${vehicleId}`

      const note = localRouteNotes[vehicleKey]?.find((n) => String(n.id) === noteId)

      // Remover do veículo
      setLocalRouteNotes((prev) => ({
        ...prev,
        [vehicleKey]: (prev[vehicleKey] || []).filter((n) => String(n.id) !== noteId),
      }))

      // Devolver para lista da esquerda APENAS se não existir (evitar duplicação)
      if (note) {
        const noteToAdd = {
          id: note.id,
          invoice_number: note.invoice_number,
          weight: note.peso,
          volume: 1,
          value: 0,
          destination_name: note.destination_name,
        }

        setLocalUnassignedNotes((prev) => {
          const exists = prev.some((n) => String(n.id) === String(noteId))
          if (exists) return prev
          return [...prev, noteToAdd]
        })
      }
      return
    }

    // Rotas persistidas: abrir modal
    setPendingRemove({ routeId, noteId, invoiceNumber })
    setIsRemoveModalOpen(true)
  }

  /** Confirma a remoção de nota de uma rota persistida */
  const handleConfirmRemove = () => {
    if (!pendingRemove) return

    const { routeId, noteId } = pendingRemove

    // Usar fonte final de notas
    const baseNotes = getFinalNotes(routeId, localRouteNotes, routeNotes)
    const note = baseNotes.find((n) => String(n.id) === noteId)

    if (note) {
      // Remover nota e criar override (pode ser array vazio)
      const nextNotes = baseNotes.filter((n) => String(n.id) !== noteId)
      setLocalRouteNotes((prev) => ({ ...prev, [routeId]: nextNotes }))

      // Devolver para lista da esquerda APENAS se não existir
      const noteToAdd = {
        id: note.id,
        invoice_number: note.invoice_number,
        weight: note.peso || 0,
        volume: 1,
        value: 0,
        destination_name: note.destination_name || '',
      }

      setLocalUnassignedNotes((prev) => {
        // Verificar se já existe para evitar duplicação
        const exists = prev.some((n) => String(n.id) === String(noteId))
        if (exists) return prev
        return [...prev, noteToAdd]
      })

      // Marcar rota como dirty
      setDirtyRoutes((prev) => new Set(prev).add(routeId))
    }

    setIsRemoveModalOpen(false)
    setPendingRemove(null)
  }

  /** Abre detalhes de uma nota */
  const handleSelectNote = (note: NoteItem) => {
    setSelectedNote({
      id: note.id,
      invoice_number: note.invoice_number,
      weight: note.weight,
      volume: note.volume,
      value: note.value || 0,
      destination_name: note.destination_name || '',
      is_active: true,
    })
    setIsNoteDetailOpen(true)
  }

  // =====================================================
  // COMPUTED VALUES
  // =====================================================

  /** Constrói os cards de todas as rotas e veículos */
  const routeCards = useMemo(() => {
    const cards: RouteCardData[] = []

    // 1. Rotas persistidas (do banco)
    routes.forEach((route) => {
      const routeId = String(route.id)
      const card = buildRouteCard(
        route,
        vehicles.find((v) => v.plate === route.vehicle_plate) || null,
        routeNotes[routeId] || [],
        localRouteNotes[routeId],
        false,
        dirtyRoutes.has(routeId)
      )
      cards.push(card)
    })

    // 2. Veículos sem rota (temporários)
    const usedVehiclePlates = new Set(routes.map((r) => r.vehicle_plate || ''))
    vehicles
      .filter((v) => v.plate && !usedVehiclePlates.has(v.plate))
      .forEach((vehicle) => {
        const vehicleKey = `vehicle-${vehicle.id}`
        const card = buildRouteCard(
          null,
          vehicle,
          [],
          localRouteNotes[vehicleKey],
          true,
          false
        )
        cards.push(card)
      })

    return cards
  }, [routes, routeNotes, localRouteNotes, vehicles, dirtyRoutes])

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="flex flex-col h-full w-full bg-white">
      <PageHeader title="Atribuir Notas" userName={userName} userRole={userRole} />

      {/* Botão de filtros */}
      <div className="flex gap-6 items-start p-4 border-b border-[#828282]">
        <button
          onClick={() => setIsFilterModalOpen(true)}
          className="flex gap-[10px] h-[40px] items-center justify-center p-[8px] rounded-[6px] bg-[#e67c26] hover:bg-[#d06c1e]"
        >
          <span className="font-bold text-[14px] text-white">Filtros avançados</span>
          <AppIcon name="filter_alt" size={24} color="white" />
        </button>
      </div>

      {/* Modal de filtros */}
      {isFilterModalOpen && (
        <FilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          onApply={(filters) => {
            fetchUnassignedNotes(1, searchTerm, {
              startDate: filters.startDate,
              endDate: filters.endDate,
              maxWeight: filters.maxWeight ? parseInt(filters.maxWeight) : undefined,
              minWeight: 0,
              destinationIds: filters.destinations.length > 0 ? filters.destinations : undefined,
            })
          }}
        />
      )}

      {/* Conteúdo principal */}
      <div className="flex flex-1 min-h-0">
        {/* Lista de notas disponíveis */}
        <div className="w-[280px] flex flex-col pl-4 pr-2 pt-4 shrink-0">
          <span className="font-bold text-[14px] text-[#2a2a2a] mb-4">
            Notas disponíveis ({notesAvailable.length})
          </span>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Buscar nota..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-3 py-2 border border-[#bdbdbd] rounded-[5px] text-[14px]"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            <NotesList
              notes={notesAvailable}
              onSelectNote={handleSelectNote}
            />
          </div>
        </div>

        {/* Grid de rotas e veículos */}
        <div className="flex-1 bg-[#f9f9f9] flex flex-col gap-6 pt-4 px-4 overflow-y-auto">
          <RoutesGrid
            routes={routeCards}
            onDropNote={handleDropNote}
            onRemoveNote={handleRemoveNoteClick}
            onCreateRoute={handleOpenCreateDrawer}
            onAlterRoute={handleOpenEditDrawer}
            loading={loading}
          />
        </div>
      </div>

      {/* Drawer de criar nova rota */}
      <Drawer
        isOpen={isCreateDrawerOpen}
        onClose={() => setIsCreateDrawerOpen(false)}
        title="Nova Rota"
        icon="road"
        footerContent={
          <div className="flex gap-3">
            <button
              onClick={() => setIsCreateDrawerOpen(false)}
              className="px-4 py-2 rounded-[4px] border border-[#4077d9] text-[#4077d9] font-bold"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveNewRoute}
              disabled={loading}
              className="px-4 py-2 rounded-[4px] bg-[#4077d9] text-white font-bold disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Rota'}
            </button>
          </div>
        }
      >
        {createRouteData && (
          <RouteEditForm
            data={createRouteData}
            isEditing
            onChange={(field, value) => setCreateRouteData((prev) => prev ? { ...prev, [field]: value } : null)}
            driverOptions={drivers.map((d) => ({ value: d.id, label: d.name }))}
            vehicleOptions={vehicles.map((v) => ({ value: v.plate || '', label: v.plate || '' }))}
            routeStatusOptions={routeStatuses.map((s) => ({ value: s.id, label: s.description }))}
            deliveryStatusOptions={deliveryStatuses.map((s) => ({ value: s.id, label: s.description }))}
          />
        )}
      </Drawer>

      {/* Drawer de editar rota */}
      <Drawer
        isOpen={isEditDrawerOpen}
        onClose={() => {
          setIsEditDrawerOpen(false)
          setSelectedRouteId(null)
          setEditRouteData(null)
        }}
        title={`Editar Rota ${editRouteData?.numeroRota || ''}`}
        icon="road"
        footerContent={
          <div className="flex gap-3">
            <button
              onClick={() => {
                setIsEditDrawerOpen(false)
                setSelectedRouteId(null)
                setEditRouteData(null)
              }}
              className="px-4 py-2 rounded-[4px] border border-[#4077d9] text-[#4077d9] font-bold"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveEditRoute}
              disabled={loading}
              className="px-4 py-2 rounded-[4px] bg-[#4077d9] text-white font-bold disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        }
      >
        {editRouteData && (
          <RouteEditForm
            data={editRouteData}
            isEditing
            onChange={(field, value) => setEditRouteData((prev) => prev ? { ...prev, [field]: value } : null)}
            driverOptions={drivers.map((d) => ({ value: d.id, label: d.name }))}
            vehicleOptions={vehicles.map((v) => ({ value: v.plate || '', label: v.plate || '' }))}
            routeStatusOptions={routeStatuses.map((s) => ({ value: s.id, label: s.description }))}
            deliveryStatusOptions={deliveryStatuses.map((s) => ({ value: s.id, label: s.description }))}
          />
        )}
      </Drawer>

      {/* Modal de confirmação de remoção */}
      <ConfirmRemoveModal
        isOpen={isRemoveModalOpen}
        onClose={() => {
          setIsRemoveModalOpen(false)
          setPendingRemove(null)
        }}
        onConfirm={handleConfirmRemove}
        invoiceNumber={pendingRemove?.invoiceNumber || ''}
        loading={loading}
      />

      {/* Modal de detalhes da nota */}
      <NoteDetailModal
        isOpen={isNoteDetailOpen}
        onClose={() => setIsNoteDetailOpen(false)}
        note={selectedNote}
      />
    </div>
  )
}