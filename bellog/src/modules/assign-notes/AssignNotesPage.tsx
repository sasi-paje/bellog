// =====================================================
// ASSIGN-NOTES PAGE - Página principal de atribuição
// =====================================================
// Arquivo: src/modules/assign-notes/AssignNotesPage.tsx

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { AppIcon, Drawer, UserMenu } from '../../shared/components'
import { NotesList } from './components/NotesList'
import { RoutesGrid } from './components/RoutesGrid'
import { ConfirmRemoveModal } from './components/ConfirmRemoveModal'
import { FilterPopover, FilterValues } from './components/FilterPopover'
import { NoteDetailsDrawer } from '../notes/components/NoteDetailsDrawer'
import { RouteEditForm } from '../routes/components/RouteEditForm'
import { assignNotesService, FilterOption } from './services/assign-notes.service'
import {
  NoteItem,
  AssignedNote,
  RouteCardData,
  RouteFormData,
  FleetVehicle,
  RouteListItem,
  DivergenceInfo,
  ResponsibleOption,
} from './types/assign-notes.types'

// =====================================================
// UTILITÁRIOS
// =====================================================

function getTodayDateOnly(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// =====================================================
// COMPONENTES AUXILIARES
// =====================================================

function PageHeader({ title, userName = 'Leon', userRole = 'Usuário', userEmail, onLogout }: {
  title: string
  userName?: string
  userRole?: string
  userEmail?: string
  onLogout?: () => void
}) {
  return (
    <div className="flex h-[78px] items-center justify-between p-3 shrink-0 w-full">
      <div className="flex gap-2 items-center w-[675px]">
        <div className="w-6 h-6">
          <AppIcon name="left_panel_close" size={24} />
        </div>
        <h1 className="font-bold text-[24px] text-[#0f3255]">{title}</h1>
      </div>
      <UserMenu
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        onLogout={onLogout}
      />
    </div>
  )
}

// =====================================================
// INTERFACE DO COMPONENTE
// =====================================================

interface AssignNotesPageProps {
  userName?: string
  userRole?: string
  onLogout?: () => void
  userEmail?: string
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function AssignNotesPage({ userName = 'Leon', userRole = 'Usuário', onLogout, userEmail }: AssignNotesPageProps) {
  // ---------- ESTADO ----------
  const [routes, setRoutes] = useState<RouteListItem[]>([])
  const [routeNotes, setRouteNotes] = useState<Record<string, AssignedNote[]>>({})
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([])
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([])
  const [routeStatuses, setRouteStatuses] = useState<{ id: string; description: string; code: string; name: string }[]>([])
  const [deliveryStatuses, setDeliveryStatuses] = useState<{ id: string; description: string; code: string; name: string; allows_route_edition: boolean }[]>([])
  const [routeResponsibles, setRouteResponsibles] = useState<ResponsibleOption[]>([])
  const [routeResponsiblesLoading, setRouteResponsiblesLoading] = useState(false)
  const [localRouteNotes, setLocalRouteNotes] = useState<Record<string, AssignedNote[]>>({})
  const [localUnassignedNotes, setLocalUnassignedNotes] = useState<NoteItem[]>([])
  const [dirtyRoutes, setDirtyRoutes] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ---------- ESTADO DE UI ----------
  const [searchTerm, setSearchTerm] = useState('')
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false)
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false)
  const [isNoteDetailOpen, setIsNoteDetailOpen] = useState(false)
  const [currentFilterDate, setCurrentFilterDate] = useState<string>(() => getTodayDateOnly())

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
  const [pendingRemove, setPendingRemove] = useState<{ routeId: string; noteId: string; invoiceNumber: string } | null>(null)
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null)
  const [createRouteData, setCreateRouteData] = useState<RouteFormData | null>(null)
  const [editRouteData, setEditRouteData] = useState<RouteFormData | null>(null)
  const [createDrawerError, setCreateDrawerError] = useState<string | null>(null)
  const [editDrawerError, setEditDrawerError] = useState<string | null>(null)

  const [notesPage, setNotesPage] = useState(1)
  const [notesHasMore, setNotesHasMore] = useState(false)
  const [notesLoading, setNotesLoading] = useState(false)

  // Opções dos filtros avançados (carregadas do banco)
  const [filterSupplierGroups, setFilterSupplierGroups] = useState<FilterOption[]>([])
  const [filterDestinationGroups, setFilterDestinationGroups] = useState<FilterOption[]>([])
  const [filterCities, setFilterCities] = useState<FilterOption[]>([])
  const [filterNeighborhoods, setFilterNeighborhoods] = useState<FilterOption[]>([])
  const [filterNeighborhoodsByCity, setFilterNeighborhoodsByCity] = useState<Record<string, FilterOption[]>>({})
  const [isLoadingFilterOptions, setIsLoadingFilterOptions] = useState(false)
  // Filtros avançados ativos (aplicados pelo painel)
  const [activeAdvancedFilters, setActiveAdvancedFilters] = useState<FilterValues | null>(null)

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  // ---------- FUNÇÕES DE BUSCA ----------
  const fetchRoutes = useCallback(async (filter?: { departureDate?: string }) => {
    try {
      const result = await assignNotesService.getActiveRoutes({
        departureDate: filter?.departureDate,
        limit: 50,
      })

      setRoutes(result.data)

      if (result.data.length > 0) {
        const routeIds = result.data.map(r => String(r.id))
        const allNotes = await assignNotesService.getAllRouteNotes(routeIds)
        setRouteNotes(allNotes)
      } else {
        setRouteNotes({})
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar rotas')
    }
  }, [])

  const fetchReferenceData = useCallback(async () => {
    try {
      setRouteResponsiblesLoading(true)
      const refData = await assignNotesService.getReferenceData()
      setDrivers(refData.drivers)
      setRouteStatuses(refData.routeStatuses)
      setDeliveryStatuses(refData.deliveryStatuses)
      setRouteResponsibles(refData.responsibles)

      const vehiclesData = await assignNotesService.getActiveVehicles()
      setVehicles(vehiclesData)
      setRouteResponsiblesLoading(false)
    } catch (err) {
      setRouteResponsibles([])
      setRouteResponsiblesLoading(false)
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados de referência')
    }
  }, [])

  const fetchUnassignedNotes = useCallback(async (page = 1, search?: string, advFilters?: FilterValues | null) => {
    try {
      setNotesLoading(true)
      const f = advFilters
      const result = await assignNotesService.getUnassignedNotes({
        page,
        search,
        limit: 50,
        grupoCliente: f?.grupoCliente || undefined,
        razaoSocial: f?.razaoSocial || undefined,
        grupoDestino: f?.grupoDestino || undefined,
        nomeDestino: f?.nomeDestino || undefined,
        cidade: f?.cidade || undefined,
        bairro: f?.bairro || undefined,
        minWeight: f?.minWeight ? Number(f.minWeight) : undefined,
        maxWeight: f?.maxWeight ? Number(f.maxWeight) : undefined,
      })

      if (page === 1) {
        setLocalUnassignedNotes(result.data)
      } else {
        setLocalUnassignedNotes(prev => [...prev, ...result.data])
      }

      setNotesHasMore(result.data.length === 50)
      setNotesPage(page)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar notas')
    } finally {
      setNotesLoading(false)
    }
  }, [])

  // ---------- CARREGAMENTO INICIAL ----------
  useEffect(() => {
    setRoutes([])
    setRouteNotes({})
    setLocalRouteNotes({})
    setLocalUnassignedNotes([])
    setDirtyRoutes(new Set())
    fetchRoutes({ departureDate: currentFilterDate })
    fetchReferenceData()
    fetchUnassignedNotes(1, searchTerm, activeAdvancedFilters)
  }, [currentFilterDate]) // Re-fetch when filter date changes

  // Carregar opções dos filtros avançados (uma vez por sessão)
  useEffect(() => {
    setIsLoadingFilterOptions(true)
    assignNotesService.getAdvancedFilterOptions()
      .then(opts => {
        setFilterSupplierGroups(opts.supplierGroups)
        setFilterDestinationGroups(opts.destinationGroups)
        setFilterCities(opts.cities)
        setFilterNeighborhoods(opts.neighborhoods)
        setFilterNeighborhoodsByCity(opts.neighborhoodsByCity)
      })
      .catch(() => setError('Erro ao carregar opções dos filtros avançados.'))
      .finally(() => setIsLoadingFilterOptions(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- BUSCA COM DEBOUNCE ----------
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      fetchUnassignedNotes(1, value, activeAdvancedFilters)
    }, 300)
  }, [fetchUnassignedNotes, activeAdvancedFilters])

  // ---------- CÁLCULO DE DIVERGÊNCIAS ----------
  const divergences = useMemo(() => {
    const result: Record<string, DivergenceInfo> = {}

    routes.forEach(route => {
      const routeId = String(route.id)
      const localNotes = localRouteNotes[routeId]
      const dbNotes = routeNotes[routeId] || []

      if (localNotes !== undefined) {
        result[routeId] = assignNotesService.calculateDivergence(routeId, localNotes, dbNotes)
      }
    })

    return result
  }, [routes, routeNotes, localRouteNotes])

  // ---------- NOTAS DISPONÍVEIS ----------
  const notesAvailable = useMemo(() => {
    const assignedIds = new Set<string>()

    routes.forEach(route => {
      const routeId = String(route.id)
      const finalNotes = localRouteNotes[routeId] ?? routeNotes[routeId] ?? []
      finalNotes.forEach(n => assignedIds.add(String(n.id)))
    })

    vehicles.forEach(v => {
      const notes = localRouteNotes[`vehicle-${v.id}`] || []
      notes.forEach(n => assignedIds.add(String(n.id)))
    })

    return localUnassignedNotes.filter(n => !assignedIds.has(String(n.id)))
  }, [localUnassignedNotes, routeNotes, localRouteNotes, routes, vehicles])

  // ---------- BUILD DE CARDS ----------
  const routeCards = useMemo((): RouteCardData[] => {
    const cards: RouteCardData[] = []

    vehicles.forEach(vehicle => {
      if (!vehicle.plate) return

      const existingRoute = routes.find(route =>
        Number(route.id_vehicle) === Number(vehicle.id) &&
        String(route.departure_date).slice(0, 10) === currentFilterDate
      )

      if (existingRoute) {
        const routeId = String(existingRoute.id)
        const dbNotes = routeNotes[routeId] || []
        const localNotes = localRouteNotes[routeId]
        const finalNotes = localNotes !== undefined ? localNotes : dbNotes

        const cargaAtual = finalNotes.reduce((sum, n) => sum + n.peso, 0)

        const deliveryStatus = deliveryStatuses.find(s => s.id === String(existingRoute.id_route_delivery_status ?? ''))
        const allowsEdition = deliveryStatus?.allows_route_edition === true

        cards.push({
          id: routeId,
          tipoRota: existingRoute.area_description || 'Rota',
          numeroRota: existingRoute.route_code || '',
          veiculo: vehicle.plate,
          capacidade: vehicle.nominal_capacity || 0,
          cargaAtual,
          notasAtribuidas: finalNotes,
          isTemporary: false,
          hasPendingChanges: dirtyRoutes.has(routeId),
          buttonLabel: 'Alterar Rota',
          buttonColor: dirtyRoutes.has(routeId) ? 'orange' : 'gray',
          route_status: existingRoute.status,
          allowsEdition,
        })
      } else {
        const vehicleKey = `vehicle-${vehicle.id}`
        const tempNotes = localRouteNotes[vehicleKey] || []
        const cargaAtual = tempNotes.reduce((sum, n) => sum + n.peso, 0)

        cards.push({
          id: vehicleKey,
          tipoRota: 'Nova Rota',
          numeroRota: '',
          veiculo: vehicle.plate,
          capacidade: vehicle.nominal_capacity || 0,
          cargaAtual,
          notasAtribuidas: tempNotes,
          isTemporary: true,
          hasPendingChanges: false,
          buttonLabel: 'Criar Rota',
          buttonColor: tempNotes.length > 0 ? 'orange' : 'gray',
          route_status: undefined,
          allowsEdition: true,
        })
      }
    })

    return [...cards].sort((a, b) => {
      const aHasRoute = !a.isTemporary
      const bHasRoute = !b.isTemporary

      if (aHasRoute !== bHasRoute) {
        return aHasRoute ? -1 : 1
      }

      if (aHasRoute && bHasRoute) {
        return String(a.numeroRota ?? '').localeCompare(String(b.numeroRota ?? ''), 'pt-BR', { numeric: true })
      }

      return String(a.veiculo ?? '').localeCompare(String(b.veiculo ?? ''), 'pt-BR', { numeric: true })
    })
  }, [routes, routeNotes, localRouteNotes, vehicles, dirtyRoutes, deliveryStatuses])

  // ---------- AÇÕES ----------

  const clearChanges = useCallback((routeId: string) => {
    setLocalRouteNotes(prev => {
      const next = { ...prev }
      delete next[routeId]
      return next
    })
    setDirtyRoutes(prev => {
      const next = new Set(prev)
      next.delete(routeId)
      return next
    })
  }, [])

  const handleDropNote = useCallback((noteId: string, targetId: string) => {
    const note = notesAvailable.find(n => String(n.id) === noteId)
    if (!note) return

    const noteToAdd: AssignedNote = {
      id: String(noteId),
      invoice_number: note.invoice_number,
      peso: note.weight,
      destination_name: note.destination_name,
    }

    // Veículo temporário — valida apenas se origem é rota persistida
    if (targetId.startsWith('vehicle-')) {
      const vehicleId = targetId.replace('vehicle-', '')
      const vehicleKey = `vehicle-${vehicleId}`

      const sourceRoute = routes.find(r => {
        const routeId = String(r.id)
        const finalNotes = localRouteNotes[routeId] ?? routeNotes[routeId] ?? []
        return finalNotes.some(n => String(n.id) === String(noteId))
      })

      if (sourceRoute) {
        const srcDs = deliveryStatuses.find(s => s.id === String(sourceRoute.id_route_delivery_status ?? ''))
        if (srcDs?.allows_route_edition !== true) {
          setError('Rota em andamento. A montagem não pode mais ser alterada.')
          return
        }
        const sourceId = String(sourceRoute.id)
        const sourceNotes = localRouteNotes[sourceId] ?? routeNotes[sourceId] ?? []
        setLocalRouteNotes(prev => ({ ...prev, [sourceId]: sourceNotes.filter(n => String(n.id) !== String(noteId)) }))
        setDirtyRoutes(prev => new Set(prev).add(sourceId))
      }

      setLocalRouteNotes(prev => ({
        ...prev,
        [vehicleKey]: [...(prev[vehicleKey] ?? []), noteToAdd],
      }))
      setLocalUnassignedNotes(prev => prev.filter(n => String(n.id) !== noteId))
      return
    }

    // Rota persistida — valida se target permite edição
    const targetRoute = routes.find(r => String(r.id) === targetId)
    if (targetRoute) {
      const targetDs = deliveryStatuses.find(s => s.id === String(targetRoute.id_route_delivery_status ?? ''))
      if (targetDs?.allows_route_edition !== true) {
        setError('Rota em andamento. A montagem não pode mais ser alterada.')
        return
      }
    }

    const sourceRoute = routes.find(r => {
      const routeId = String(r.id)
      if (routeId === targetId) return false
      const finalNotes = localRouteNotes[routeId] ?? routeNotes[routeId] ?? []
      return finalNotes.some(n => String(n.id) === String(noteId))
    })

    if (sourceRoute) {
      const srcDs = deliveryStatuses.find(s => s.id === String(sourceRoute.id_route_delivery_status ?? ''))
      if (srcDs?.allows_route_edition !== true) {
        setError('Rota em andamento. A montagem não pode mais ser alterada.')
        return
      }
      const sourceId = String(sourceRoute.id)
      const sourceNotes = localRouteNotes[sourceId] ?? routeNotes[sourceId] ?? []
      setLocalRouteNotes(prev => ({ ...prev, [sourceId]: sourceNotes.filter(n => String(n.id) !== String(noteId)) }))
      setDirtyRoutes(prev => new Set(prev).add(sourceId))
    }

    const targetNotes = localRouteNotes[targetId] ?? routeNotes[targetId] ?? []
    setLocalRouteNotes(prev => ({ ...prev, [targetId]: [...targetNotes, noteToAdd] }))
    setDirtyRoutes(prev => new Set(prev).add(targetId))
    setLocalUnassignedNotes(prev => prev.filter(n => String(n.id) !== noteId))
  }, [notesAvailable, routes, routeNotes, localRouteNotes, deliveryStatuses])

  const handleRemoveNoteClick = useCallback((routeId: string, noteId: string, invoiceNumber: string) => {
    if (routeId.startsWith('vehicle-')) {
      const vehicleId = routeId.replace('vehicle-', '')
      const vehicleKey = `vehicle-${vehicleId}`

      const note = localRouteNotes[vehicleKey]?.find(n => String(n.id) === noteId)

      setLocalRouteNotes(prev => ({
        ...prev,
        [vehicleKey]: (prev[vehicleKey] || []).filter(n => String(n.id) !== noteId),
      }))

      if (note) {
        setLocalUnassignedNotes(prev => {
          if (prev.some(n => String(n.id) === String(noteId))) return prev
          return [...prev, {
            id: note.id,
            invoice_number: note.invoice_number,
            weight: note.peso,
            volume: 1,
            value: 0,
            destination_name: note.destination_name,
          }]
        })
      }
      return
    }

    // Rota persistida — valida se permite edição
    const route = routes.find(r => String(r.id) === routeId)
    if (route) {
      const ds = deliveryStatuses.find(s => s.id === String(route.id_route_delivery_status ?? ''))
      if (ds?.allows_route_edition !== true) {
        setError('Rota em andamento. A montagem não pode mais ser alterada.')
        return
      }
    }

    setPendingRemove({ routeId, noteId, invoiceNumber })
    setIsRemoveModalOpen(true)
  }, [localRouteNotes, routes, deliveryStatuses])

  const handleConfirmRemove = useCallback(() => {
    if (!pendingRemove) return

    const { routeId, noteId } = pendingRemove

    const baseNotes = localRouteNotes[routeId] ?? routeNotes[routeId] ?? []
    const note = baseNotes.find(n => String(n.id) === noteId)

    if (note) {
      const nextNotes = baseNotes.filter(n => String(n.id) !== noteId)
      setLocalRouteNotes(prev => ({ ...prev, [routeId]: nextNotes }))

      setLocalUnassignedNotes(prev => {
        if (prev.some(n => String(n.id) === String(noteId))) return prev
        return [...prev, {
          id: note.id,
          invoice_number: note.invoice_number,
          weight: note.peso || 0,
          volume: 1,
          value: 0,
          destination_name: note.destination_name || '',
        }]
      })

      setDirtyRoutes(prev => new Set(prev).add(routeId))
    }

    setIsRemoveModalOpen(false)
    setPendingRemove(null)
  }, [pendingRemove, localRouteNotes, routeNotes])

  const handleSelectNote = useCallback((note: NoteItem) => {
    setSelectedNote(note)
    setIsNoteDetailOpen(true)
  }, [])

  const handleOpenCreateDrawer = useCallback((vehicleId: string) => {
    const vehicle = vehicles.find(v => String(v.id) === String(vehicleId))
    if (!vehicle) return

    const existingRoute = routes.find(r =>
      Number(r.id_vehicle) === Number(vehicle.id) &&
      String(r.departure_date).slice(0, 10) === currentFilterDate
    )

    if (existingRoute) {
      const existingDs = deliveryStatuses.find(s => s.id === String(existingRoute.id_route_delivery_status ?? ''))
      if (existingDs?.allows_route_edition !== true) {
        setError('Rota em andamento. A montagem não pode mais ser alterada.')
        return
      }
      setSelectedRouteId(String(existingRoute.id))
      setIsEditDrawerOpen(true)
      return
    }

    const vehicleKey = `vehicle-${vehicleId}`
    const notes = localRouteNotes[vehicleKey] ?? []

    // Deduplicar destinos por nome da empresa
    const uniqueDestinations = [...new Map(
      notes.map(n => [n.destination_name, { value: n.id, label: n.destination_name || n.invoice_number }])
    ).values()]

    setCreateRouteData({
      numeroRota: '',
      areaRota: '',
      id_route_responsible: '',
      destinos: uniqueDestinations,
      tipoRota: '',
      dataSaida: currentFilterDate,
      fimRota: '',
      motorista: '',
      ajudante: [],
      placaVeiculo: vehicle.plate || '',
      cargaMaxima: String(vehicle.nominal_capacity ?? 0),
      id_route_status: '',
      id_route_delivery_status: '',
    })

    setSelectedVehicleId(String(vehicleId))
    setIsCreateDrawerOpen(true)
  }, [vehicles, routes, localRouteNotes, currentFilterDate, deliveryStatuses])

const handleSaveNewRoute = useCallback(async () => {
    if (!createRouteData || !selectedVehicleId) return

    const vehicle = vehicles.find(v => String(v.id) === String(selectedVehicleId))
    if (!vehicle) return

    const vehicleKey = `vehicle-${selectedVehicleId}`
    const notes = localRouteNotes[vehicleKey] ?? []

    if (!createRouteData.id_route_responsible) {
      setError('Selecione o responsável')
      return
    }

    if (notes.length === 0) {
      setError('Adicione pelo menos uma nota à rota')
      return
    }

    const cargaAtual = notes.reduce((sum, n) => sum + n.peso, 0)
    const capacidade = vehicle.nominal_capacity || 0
    if (capacidade > 0 && cargaAtual > capacidade) {
      setError('Carga máxima excedida. Remova notas para criar a rota.')
      return
    }

    setLoading(true)
    try {
      await assignNotesService.createRouteWithNotes(
        selectedVehicleId,
        notes,
        {
          departure_date: createRouteData.dataSaida,
          id_driver: createRouteData.motorista || undefined,
          area: createRouteData.areaRota || undefined,
          id_route_responsible: Number(createRouteData.id_route_responsible),
          assistant: createRouteData.ajudante.length > 0
            ? createRouteData.ajudante.map((a: any) => a.label).join(', ')
            : undefined,
        }
      )

      setLocalRouteNotes(prev => {
        const next = { ...prev }
        delete next[vehicleKey]
        return next
      })

      await fetchRoutes({ departureDate: currentFilterDate })
      await fetchUnassignedNotes(1, searchTerm)

      setIsCreateDrawerOpen(false)
      setCreateRouteData(null)
      setSelectedVehicleId(null)
      setCreateDrawerError(null)
    } catch (err) {
      setCreateDrawerError(err instanceof Error ? err.message : 'Erro ao criar rota')
    } finally {
      setLoading(false)
    }
  }, [createRouteData, selectedVehicleId, vehicles, localRouteNotes, fetchRoutes, fetchUnassignedNotes, currentFilterDate, searchTerm])

  const handleOpenEditDrawer = useCallback(async (routeId: string) => {
    const route = routes.find(r => String(r.id) === String(routeId))
    if (!route) return

    const ds = deliveryStatuses.find(s => s.id === String(route.id_route_delivery_status ?? ''))
    if (ds?.allows_route_edition !== true) {
      setError('Rota em andamento. A montagem não pode mais ser alterada.')
      return
    }

    setSelectedRouteId(String(routeId))
    setLoading(true)

    try {
      const localNotes = localRouteNotes[routeId]
      const dbNotes = routeNotes[routeId] || []
      const finalNotes = localNotes !== undefined ? localNotes : dbNotes

      setEditRouteData({
        numeroRota: route.route_code || '',
        areaRota: route.area || '',
        id_route_responsible: route.id_route_responsible ? String(route.id_route_responsible) : '',
        destinos: finalNotes.map(n => ({
          value: n.id,
          label: n.destination_name || n.invoice_number
        })),
        tipoRota: route.id_route_type ? String(route.id_route_type) : '',
        dataSaida: route.departure_date || '',
        fimRota: route.ends_at || '',
        motorista: route.id_driver ? String(route.id_driver) : '',
        ajudante: (() => {
          const raw = route.assistant
          if (!raw) return []
          const names = Array.isArray(raw)
            ? (raw as string[]).filter(Boolean)
            : String(raw).split(',').map((s: string) => s.trim()).filter(Boolean)
          return names.map((name: string) => ({
            value: name.toLowerCase().replace(/\s+/g, '-'),
            label: name,
            color: '#e67c26',
          }))
        })(),
        placaVeiculo: route.vehicle_plate || vehicles.find(v => String(v.id) === String(route.id_vehicle))?.plate || '',
        cargaMaxima: String(route.vehicle_max_capacity || vehicles.find(v => String(v.id) === String(route.id_vehicle))?.nominal_capacity || 0),
        id_route_status: route.id_route_status ? String(route.id_route_status) : '',
        id_route_delivery_status: route.id_route_delivery_status ? String(route.id_route_delivery_status) : '',
      })

      setIsEditDrawerOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar rota')
    } finally {
      setLoading(false)
    }
  }, [routes, routeNotes, localRouteNotes, vehicles, deliveryStatuses])

  const handleSaveEditRoute = useCallback(async () => {
    if (!selectedRouteId || !editRouteData) return

    const routeForSave = routes.find(r => String(r.id) === selectedRouteId)
    if (routeForSave) {
      const dsForSave = deliveryStatuses.find(s => s.id === String(routeForSave.id_route_delivery_status ?? ''))
      if (dsForSave?.allows_route_edition !== true) {
        setError('Rota em andamento. A montagem não pode mais ser alterada.')
        return
      }
    }

    setLoading(true)
    try {
      const localNotes = localRouteNotes[selectedRouteId]
      const dbNotes = routeNotes[selectedRouteId] || []
      const finalNotes = localNotes !== undefined ? localNotes : dbNotes
      const finalNoteIds = finalNotes.map(n => String(n.id))

      if (!editRouteData.id_route_responsible) {
        setError('Selecione o responsável')
        setLoading(false)
        return
      }

      const cargaAtualEdit = finalNotes.reduce((sum, n) => sum + n.peso, 0)
      const capacidadeEdit = Number(editRouteData.cargaMaxima) || 0
      if (capacidadeEdit > 0 && cargaAtualEdit > capacidadeEdit) {
        setError('Carga máxima excedida. Remova notas para salvar a rota.')
        setLoading(false)
        return
      }

      await assignNotesService.updateRouteWithNotes(
        selectedRouteId,
        {
          departure_date: editRouteData.dataSaida || undefined,
          id_driver: editRouteData.motorista || undefined,
          area: editRouteData.areaRota || undefined,
          id_route_responsible: Number(editRouteData.id_route_responsible),
          assistant: editRouteData.ajudante.length > 0
            ? editRouteData.ajudante.map((a: any) => a.label).join(', ')
            : undefined,
        },
        finalNoteIds
      )

      clearChanges(selectedRouteId)
      await fetchRoutes({ departureDate: currentFilterDate })
      await fetchUnassignedNotes(1, searchTerm)

      setIsEditDrawerOpen(false)
      setSelectedRouteId(null)
      setEditRouteData(null)
      setEditDrawerError(null)
    } catch (err) {
      setEditDrawerError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }, [selectedRouteId, editRouteData, localRouteNotes, routeNotes, deliveryStatuses, clearChanges, fetchRoutes, fetchUnassignedNotes, currentFilterDate, searchTerm])

  const handleLoadMoreNotes = useCallback(() => {
    fetchUnassignedNotes(notesPage + 1, searchTerm, activeAdvancedFilters)
  }, [notesPage, searchTerm, fetchUnassignedNotes, activeAdvancedFilters])

  const handleViewRouteNote = useCallback((note: AssignedNote) => {
    setSelectedNote({
      id: note.id,
      invoice_number: note.invoice_number,
      weight: note.peso || note.weight || 0,
      volume: note.volume || 0,
      value: note.value || 0,
      destination_name: note.destination_name || '',
      supplier_name: note.supplier_name || note.fornecedor || '',
      fornecedor: note.fornecedor || note.supplier_name || '',
      customer_name: note.customer_name || note.destination_name || '',
      is_active: true,
    })
    setIsNoteDetailOpen(true)
  }, [])

  // =====================================================
  // COMPUTED: permite edição apenas para status Pendente
  // =====================================================

  const editRouteAllowsEdition = useMemo(() => {
    if (!selectedRouteId || !isEditDrawerOpen) return false
    const route = routes.find(r => String(r.id) === selectedRouteId)
    if (!route) return false
    const ds = deliveryStatuses.find(s => s.id === String(route.id_route_delivery_status ?? ''))
    return ds?.allows_route_edition === true
  }, [selectedRouteId, isEditDrawerOpen, routes, deliveryStatuses])

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="flex flex-col h-full w-full bg-white">
      <PageHeader title="Atribuir Notas" userName={userName} userRole={userRole} userEmail={userEmail} onLogout={onLogout} />

      {/* Toolbar: data (esq) + filtros avançados (dir) */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#828282]">
        {/* Esquerda — campo de data */}
        <div className="flex items-center gap-2">
          <label className="font-semibold text-[13px] text-[#2a2a2a] whitespace-nowrap">
            Data
          </label>
          <input
            type="date"
            value={currentFilterDate}
            onChange={(e) => { if (e.target.value) setCurrentFilterDate(e.target.value) }}
            className="h-[40px] px-3 rounded-[5px] border border-[#bdbdbd] text-[14px] text-[#2a2a2a] focus:outline-none focus:border-[#4077d9] bg-white"
          />
        </div>

        {/* Direita — erro + botão filtros avançados + popover */}
        <div className="flex items-center gap-3">
          {error && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#fee2e2] text-[#991b1b]">
              <AppIcon name="error" size={16} />
              <span className="text-[12px]">{error}</span>
              <button onClick={() => setError(null)} className="ml-1 text-[#991b1b]">✕</button>
            </div>
          )}

          <div className="relative">
            <button
              onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
              className="flex gap-[10px] h-[40px] items-center justify-center px-4 rounded-[6px] bg-[#e67c26] hover:bg-[#d06c1e]"
            >
              <span className="font-bold text-[14px] text-white">Filtros avançados</span>
              <AppIcon name="filter_alt" size={24} color="white" />
            </button>

            <FilterPopover
              isOpen={isFilterModalOpen}
              onClose={() => setIsFilterModalOpen(false)}
              initialDate={currentFilterDate}
              supplierGroups={filterSupplierGroups}
              destinationGroups={filterDestinationGroups}
              cities={filterCities}
              allNeighborhoods={filterNeighborhoods}
              neighborhoodsByCity={filterNeighborhoodsByCity}
              isLoadingOptions={isLoadingFilterOptions}
              onApply={(filters: FilterValues) => {
                setActiveAdvancedFilters(filters)
                fetchUnassignedNotes(1, searchTerm, filters)
              }}
            />
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex flex-1 min-h-0">
        {/* Lista de notas disponíveis */}
        <div className="w-[280px] shrink-0 flex flex-col bg-white border-r border-[#e0e0e0]">
          <div className="p-4 pb-2">
            <span className="font-bold text-[14px] text-[#2a2a2a] mb-3 block">
              Notas disponíveis ({notesAvailable.length})
            </span>
            <input
              type="text"
              placeholder="Buscar nota..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full px-3 py-2 border border-[#bdbdbd] rounded-[5px] text-[14px]"
            />
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <NotesList
              notes={notesAvailable}
              onSelectNote={handleSelectNote}
              onViewNote={handleSelectNote}
              hasMore={notesHasMore}
              isLoading={notesLoading}
              onLoadMore={handleLoadMoreNotes}
            />
          </div>
        </div>

        {/* Grid de veículos */}
        <div className="flex-1 bg-[#f9f9f9] p-4 overflow-y-auto">
          <RoutesGrid
            routes={routeCards}
            divergences={divergences}
            onDropNote={handleDropNote}
            onRemoveNote={handleRemoveNoteClick}
            onCreateRoute={handleOpenCreateDrawer}
            onAlterRoute={handleOpenEditDrawer}
            onViewNote={handleViewRouteNote}
            loading={loading}
          />
        </div>
      </div>

      {/* Drawer de criar nova rota */}
      <Drawer
        isOpen={isCreateDrawerOpen}
        onClose={() => { setIsCreateDrawerOpen(false); setCreateDrawerError(null) }}
        title="Nova Rota"
        icon="road"
        footerContent={
          <div className="flex gap-3">
            <button
              onClick={() => { setIsCreateDrawerOpen(false); setCreateDrawerError(null) }}
              className="px-4 py-2 rounded-[4px] border border-[#e67c26] text-[#e67c26] font-bold"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveNewRoute}
              disabled={loading}
              className="px-4 py-2 rounded-[4px] bg-[#e67c26] text-white font-bold disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Rota'}
            </button>
          </div>
        }
      >
        {createDrawerError && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-[4px] flex items-start gap-2">
            <span className="text-[12px] text-[#991b1b] flex-1">{createDrawerError}</span>
            <button onClick={() => setCreateDrawerError(null)} className="text-[#991b1b] text-[12px] font-bold shrink-0">✕</button>
          </div>
        )}
        {createRouteData && (
          <RouteEditForm
            data={createRouteData}
            isEditing
            onChange={(field, value) => setCreateRouteData(prev => prev ? { ...prev, [field]: value } : null)}
            driverOptions={drivers.map(d => ({ value: d.id, label: d.name }))}
            vehicleOptions={vehicles.map(v => ({ value: String(v.id), label: v.plate }))}
            routeStatusOptions={routeStatuses.map(s => ({ value: s.id, label: s.description }))}
            deliveryStatusOptions={deliveryStatuses.map(s => ({ value: s.id, label: s.description }))}
            responsibleOptions={routeResponsibles.map((item) => ({
              value: String(item.id),
              label: item.name,
            }))}
            responsibleOptionsLoading={routeResponsiblesLoading}
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
          setEditDrawerError(null)
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
                setEditDrawerError(null)
              }}
              className="px-4 py-2 rounded-[4px] border border-[#e67c26] text-[#e67c26] font-bold"
            >
              Cancelar
            </button>
            {editRouteAllowsEdition && (
              <button
                onClick={handleSaveEditRoute}
                disabled={loading}
                className="px-4 py-2 rounded-[4px] bg-[#e67c26] text-white font-bold disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            )}
          </div>
        }
      >
        {editDrawerError && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-[4px] flex items-start gap-2">
            <span className="text-[12px] text-[#991b1b] flex-1">{editDrawerError}</span>
            <button onClick={() => setEditDrawerError(null)} className="text-[#991b1b] text-[12px] font-bold shrink-0">✕</button>
          </div>
        )}
        {editRouteData && (
          <RouteEditForm
            data={editRouteData}
            isEditing={editRouteAllowsEdition}
            onChange={editRouteAllowsEdition ? (field, value) => setEditRouteData(prev => prev ? { ...prev, [field]: value } : null) : undefined}
            driverOptions={drivers.map(d => ({ value: d.id, label: d.name }))}
            vehicleOptions={vehicles.map(v => ({ value: String(v.id), label: v.plate }))}
            routeStatusOptions={routeStatuses.map(s => ({ value: s.id, label: s.description }))}
            deliveryStatusOptions={deliveryStatuses.map(s => ({ value: s.id, label: s.description }))}
            responsibleOptions={routeResponsibles.map((item) => ({
              value: String(item.id),
              label: item.name,
            }))}
            responsibleOptionsLoading={routeResponsiblesLoading}
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

      {/* Drawer de detalhes da nota — somente leitura nesta tela */}
      <NoteDetailsDrawer
        isOpen={isNoteDetailOpen}
        onClose={() => setIsNoteDetailOpen(false)}
        mode="readonly"
        note={selectedNote}
      />
    </div>
  )
}

export default AssignNotesPage
