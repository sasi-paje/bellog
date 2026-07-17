import { useState, useEffect, useRef } from 'react'
import { PageHeader, Pagination, Drawer, TabId, AppIcon, Toggle, useToast, ToastContainer } from '../../shared/components'
import { RoutesTable } from './components/RoutesTable'
import { RoutesToolbar, FilterData } from './components/RoutesToolbar'
import { RouteForm } from './components/RouteForm'
import { RouteNotesTable } from './components/RouteNotesTable'
import { RouteNoteDetail, setGlobalRefreshCallback, triggerGlobalRefresh } from './components/RouteNoteDetail'
import { RouteHistory } from './components/RouteHistory'
import { OccurrenceDetailModal } from './components/OccurrenceDetailModal'
import { ExportModal } from './components/ExportModal'
import { InactivateConfirmModal } from '../settings/components/InactivateConfirmModal'
import { DisassociateNoteModal } from './components/DisassociateNoteModal'
import { useRoutes } from '../../hooks/useRoutes'
import { useFiscalInvoices } from '../../hooks/useFiscalInvoices'
import { useRouteHistory } from '../../hooks/useRouteHistory'
import { routeService, UpdateRouteDTO } from '../../features/routes/api/route.service'

interface RoutesPageProps {
  userName?: string
  userRole?: string
  onLogout?: () => void
  userEmail?: string
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
}

const TABS = [
  { id: 'dados-rota' as TabId, label: 'Dados de Rota' },
  { id: 'notas-fiscais' as TabId, label: 'Notas Fiscais' },
  { id: 'historico' as TabId, label: 'Histórico' },
]

// Tipo para os dados do formulário
interface RouteFormData {
  status: string
  statusEntrega: string
  numeroRota: string
  originalNumeroRota?: string
  areaRota: string
  responsaveis: { value: string; label: string; color?: string }[]
  destinos: { value: string; label: string; color?: string }[]
  tipoRota: string
  dataSaida: string
  fimRota: string
  motorista: { value: string; label: string; color?: string }[]
  ajudante: { value: string; label: string; color?: string }[]
  placaVeiculo: string
  cargaMaxima: string
  isActive: boolean
}

interface HistoricoItem {
  id: string
  tipo: 'rota-criada' | 'em-rota' | 'em-andamento' | 'entrega-parcial' | 'entrega-total' | 'entrega-negada' | 'entrega-abortada' | 'rota-finalizada'
  titulo: string
  subtitulo?: string
  data: string
  hora: string
  local?: string
  hasDetail: boolean
  detail?: {
    id: string
    titulo: string
    local: string
    notas: string[]
    observacao: string
    anexos: { id: string; nome: string; tipo: 'imagem' | 'documento'; url?: string; file_path?: string; file_url?: string }[]
  }
}

// Helper para formatar data para exibição (DD/MM/YYYY)
const formatDateDisplay = (dateStr: string | undefined | null): string => {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return dateStr
  }
}

// Helper para formatar data para input type="date" (YYYY-MM-DD)
const formatDateForInput = (dateStr: string | undefined | null): string => {
  if (!dateStr) return ''
  try {
    // Extrair data diretamente da string sem usar new Date() para evitar fuso horário
    // Aceita formatos: "2026-04-30", "2026-04-30T00:00:00-03:00", "30/04/2026"
    if (dateStr.includes('/')) {
      // Formato DD/MM/YYYY
      const parts = dateStr.split('/')
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`
      }
    } else {
      // Formato YYYY-MM-DD ou similar
      const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (match) {
        return `${match[1]}-${match[2]}-${match[3]}`
      }
    }
    return dateStr
  } catch {
    return dateStr
  }
}

// Helper para converter data para formato do banco (YYYY-MM-DD)
const convertToDbDate = (dateStr: string): string => {
  if (!dateStr) return ''
  // Se já está no formato YYYY-MM-DD (do input type="date"), retornar direto
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    // Anexar timezone para evitar problema de fuso horário
    return `${dateStr}T00:00:00-03:00`
  }
  // Converter de DD/MM/YYYY para YYYY-MM-DD
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}T00:00:00-03:00`
  }
  return dateStr
}

// Convert DB route to form data
const convertRouteToFormData = (route: any): RouteFormData => {
  return {
    status: route.status?.name || 'Aberta',
    statusEntrega: route.delivery_status?.name || 'Em Andamento',
    numeroRota: route.route_code || '',
    originalNumeroRota: route.route_code || '',  // Track original for validation
    areaRota: route.route_area?.description || route.area || '',
    responsaveis: (route.responsible || []).map((r: any) => ({
      value: r.id,
      label: r.name || '',
      color: '#e67c26',
    })),
    destinos: (route.destinations || []).map((d: any) => ({
      value: d.id,
      label: d.company_name,
      color: '#e67c26',
    })),
    tipoRota: route.route_type?.description || 'Entrega',
    dataSaida: formatDateForInput(route.departure_date),
    fimRota: route.ends_at ? `Finalizada em ${formatDateDisplay(route.ends_at)}` : 'Aguardando fim da rota',
    motorista: (route.drivers || []).map((d: any) => ({
      value: d.id,
      label: d.name || '',
      color: '#e67c26',
    })),
    ajudante: (route.helpers || []).map((h: any) => ({
      value: h.id,
      label: h.name || '',
      color: '#e67c26',
    })),
    placaVeiculo: route.vehicle?.plate || '',
    cargaMaxima: route.vehicle?.nominal_capacity?.toString() || '',
    isActive: route.is_active !== false,
  }
}

const DELIVERY_EVENT_TYPES = new Set(['DELIVERY_TOTAL', 'DELIVERY_PARTIAL', 'DELIVERY_DENIED', 'DELIVERY_ABORTED'])
const DETAIL_EVENT_TYPES = new Set([...DELIVERY_EVENT_TYPES, 'CLIENT_ARRIVAL'])

function mapEventTypeToTipo(code: string | null | undefined): HistoricoItem['tipo'] {
  switch (code) {
    case 'CREATED': return 'rota-criada'
    case 'IN_PROGRESS': return 'em-andamento'
    case 'ROUTE_STARTED': return 'em-rota'
    case 'DELIVERY_TOTAL': return 'entrega-total'
    case 'DELIVERY_PARTIAL': return 'entrega-parcial'
    case 'DELIVERY_DENIED': return 'entrega-negada'
    case 'DELIVERY_ABORTED': return 'entrega-abortada'
    case 'CLIENT_ARRIVAL': return 'em-rota'
    case 'ROUTE_ENDED': return 'rota-finalizada'
    default: return 'rota-criada'
  }
}

export const RoutesPage = ({
  userName = 'Leon Kennedy',
  userRole = 'Usuário',
  onLogout,
  userEmail,
  isSidebarOpen = true,
  onToggleSidebar,
}: RoutesPageProps) => {
  const { routes, total, loading, fetchRoutes, getRouteById, updateRoute, fetchReferenceData } = useRoutes()
  const { getInvoicesByRouteId, fetchReferenceData: fetchInvoiceRefData } = useFiscalInvoices()
  const { history, fetchHistory } = useRouteHistory()
  const { showSuccess, showError, toasts, removeToast } = useToast()

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('dados-rota')
  const [selectedNote, setSelectedNote] = useState<any>(null)
  const [isViewingNoteDetail, setIsViewingNoteDetail] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isRouteLoading, setIsRouteLoading] = useState(false)
  const [isInvoicesLoading, setIsInvoicesLoading] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [formData, setFormData] = useState<RouteFormData | null>(null)
  const [routeInvoices, setRouteInvoices] = useState<any[]>([])
  const [refStatuses, setRefStatuses] = useState<any[]>([])
  const [refDeliveryStatuses, setRefDeliveryStatuses] = useState<any[]>([])
  const [refVehicles, setRefVehicles] = useState<any[]>([])
  const [refHelpers, setRefHelpers] = useState<any[]>([])
  const [refDrivers, setRefDrivers] = useState<any[]>([])
  const [refResponsibles, setRefResponsibles] = useState<any[]>([])
  const [refDataLoading, setRefDataLoading] = useState(false)

  // Estado para modal de exportação
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  // Estado para modal de confirmação de ativação/inativação
  const [confirmAction, setConfirmAction] = useState<'activate' | 'inactivate' | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isProcessingAction, setIsProcessingAction] = useState(false)

  // Estado para modal de confirmação de desassociação de nota
  const [isDisassociateOpen, setIsDisassociateOpen] = useState(false)
  const [isDisassociating, setIsDisassociating] = useState(false)

  // Loading ao salvar a edição da rota
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // Estado para seleção de linhas
  const [selectedRouteIds, setSelectedRouteIds] = useState<Set<string>>(new Set())
  const [isExportSelectionMode, setIsExportSelectionMode] = useState(false)
  // Seleção de todos os registros dos filtros (todas as páginas)
  const [selectAllAcrossPages, setSelectAllAcrossPages] = useState(false)
  const [allFilteredRoutes, setAllFilteredRoutes] = useState<any[]>([])
  const [selectingAll, setSelectingAll] = useState(false)

  // Refs para guardar valores atuais para o callback global
  const routeIdRef = useRef(selectedRouteId)
  const noteIdRef = useRef(selectedNote?.id)

  // Atualizar refs quando mudarem
  useEffect(() => {
    routeIdRef.current = selectedRouteId
  }, [selectedRouteId])

  useEffect(() => {
    noteIdRef.current = selectedNote?.id
  }, [selectedNote?.id])

  // Estados para histórico
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoricoItem | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedOccurrenceDetail, setSelectedOccurrenceDetail] = useState<any>(null)

  const [showInactive, setShowInactive] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [appliedFilters, setAppliedFilters] = useState<FilterData | null>(null)

  // Set global refresh callback on mount - busca dados diretamente
  useEffect(() => {
    const wrapper = async () => {
      const routeId = routeIdRef.current
      if (!routeId) {
        console.log('[globalRefresh] routeId não disponível')
        return
      }
      const invoices = await getInvoicesByRouteId(routeId)
      setRouteInvoices(invoices)
      const noteId = noteIdRef.current
      if (noteId) {
        const updated = invoices.find(i => String(i.id) === String(noteId))
        if (updated) setSelectedNote(updated)
      }
    }
    setGlobalRefreshCallback(wrapper)
    return () => setGlobalRefreshCallback(() => {})
  }, [])
  const LIMIT = 50
  const totalPages = Math.ceil(total / LIMIT) || 1

  // Recarrega a lista respeitando busca, toggle de inativos, página e
  // os filtros aplicados no toolbar. Sem filtro aplicado, usa o dia atual
  // como padrão; com filtro, usa as datas/critérios informados.
  const buildRoutesParams = () => {
    const today = new Date()
    const day = String(today.getDate()).padStart(2, '0')
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const year = today.getFullYear()
    const todayStr = `${year}-${month}-${day}`

    const f = appliedFilters

    return {
      search: searchTerm || undefined,
      isActive: showInactive ? undefined : true,
      page: currentPage,
      limit: LIMIT,
      dataInicio: f ? (f.dataInicio || undefined) : todayStr,
      dataFim: f ? (f.dataFim || undefined) : todayStr,
      status: f?.status?.map((s) => s.value),
      statusEntrega: f?.statusEntrega?.map((s) => s.value),
      motorist: f?.motorista?.map((m) => m.value),
      area: f?.area?.map((a) => a.value),
      veiculo: f?.veiculo?.map((v) => v.value),
      ordenar: f?.ordenar,
      rotaInicio: f?.rotaInicio || undefined,
      rotaFim: f?.rotaFim || undefined,
      responsavel: f?.responsavel || undefined,
    }
  }

  const reloadRoutes = () => {
    fetchRoutes(buildRoutesParams())
  }

  // Fetch routes on mount and when filtros/busca/página mudam
  useEffect(() => {
    reloadRoutes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, showInactive, currentPage, appliedFilters, fetchRoutes])

  // Reseta a seleção quando filtros/busca mudam (não ao paginar)
  useEffect(() => {
    setSelectedRouteIds(new Set())
    setSelectAllAcrossPages(false)
    setAllFilteredRoutes([])
  }, [searchTerm, showInactive, appliedFilters])

  // Fetch reference data
  useEffect(() => {
    const loadRefData = async () => {
      setRefDataLoading(true)
      try {
        const [refData, helpers, drivers, responsibles] = await Promise.all([
          routeService.getReferenceData(),
          routeService.getHelpers(),
          routeService.getDrivers(),
          routeService.getRouteResponsibles(),
        ])
        setRefStatuses(refData.statuses || [])
        setRefDeliveryStatuses(refData.deliveryStatuses || [])
        setRefVehicles(refData.vehicles || [])
        setRefHelpers(helpers || [])
        setRefDrivers(drivers || [])
        setRefResponsibles(responsibles || [])
      } catch (err) {
        console.error('[RoutesPage] Error loading ref data:', err)
      } finally {
        setRefDataLoading(false)
      }
    }
    loadRefData()
  }, [fetchReferenceData, fetchInvoiceRefData])

  const handleRowClick = async (route: any) => {
    setSelectedRouteId(route.id)
    setIsDrawerOpen(true)
    setActiveTab('dados-rota')
    setSelectedNote(null)
    setIsEditing(false)
    setFormData(null)
    setIsRouteLoading(true)

    try {
      const routeDetails = await getRouteById(route.id)
      if (routeDetails) {
        setFormData(convertRouteToFormData(routeDetails))
      }
    } catch (err) {
      console.error('Error loading route:', err)
    } finally {
      setIsRouteLoading(false)
    }
  }

  // Verificar se pode inativar (status de entrega não pode ser Em Andamento ou Finalizada)
  const canInativar = !formData?.statusEntrega?.toLowerCase().includes('andamento') &&
                     !formData?.statusEntrega?.toLowerCase().includes('finalizada')

  // Regra de montagem: a nota só pode ser desassociada se o status de entrega
  // atual da rota permite edição (ref_route_delivery_status.allows_route_edition).
  // Fail-closed: só libera quando o campo é explicitamente true.
  const currentDeliveryStatus = refDeliveryStatuses.find((s) => s.name === formData?.statusEntrega)
  const canEditAssembly = currentDeliveryStatus?.allows_route_edition === true

  // Edição da rota no Web é administrativa: fica liberada, EXCETO quando a rota
  // está finalizada (todas as notas já foram entregues). A montagem de notas
  // (desassociar) continua governada por canEditAssembly acima.
  const isRouteFinalized = !!formData?.statusEntrega?.toLowerCase().includes('finaliz')
  const canEditRoute = !isRouteFinalized

  const handleCloseDrawerOnly = () => {
    setIsDrawerOpen(false)
    setSelectedRouteId(null)
    setSelectedNote(null)
    setIsEditing(false)
    setFormData(null)
    setRouteInvoices([])
    setSelectedHistoryItem(null)
    setIsDetailModalOpen(false)
    setIsInvoicesLoading(false)
    setIsHistoryLoading(false)
  }

  // Abre o modal de confirmação de inativação
  const handleInativar = () => {
    if (!selectedRouteId || !canInativar) return
    setConfirmAction('inactivate')
    setIsConfirmOpen(true)
  }

  // Abre o modal de confirmação de ativação
  const handleAtivar = () => {
    if (!selectedRouteId) return
    setConfirmAction('activate')
    setIsConfirmOpen(true)
  }

  // Executa ativação/inativação após confirmação no modal
  const handleConfirmAction = async () => {
    if (!selectedRouteId || !confirmAction) return
    const activating = confirmAction === 'activate'
    setIsProcessingAction(true)
    try {
      await routeService.setActive(selectedRouteId, activating)
      setIsConfirmOpen(false)
      setConfirmAction(null)
      handleCloseDrawerOnly()
      showSuccess(activating ? 'Rota ativada com sucesso' : 'Rota inativada com sucesso')
      reloadRoutes()
    } catch (err) {
      console.error('Error updating route active state:', err)
      showError(err instanceof Error ? err.message : `Erro ao ${activating ? 'ativar' : 'inativar'} rota`)
    } finally {
      setIsProcessingAction(false)
    }
  }

  // Handler para fechar drawer (X button) sem inativar
  const handleCloseDrawer = () => {
    handleCloseDrawerOnly()
  }

  // Handler para abrir modal de importação
  const handleImport = () => {
    console.log('[RoutesPage] Import clicked')
    // TODO: Implementar modal de importação
  }

// Handler para abrir modal de exportação
  const handleExport = () => {
    setIsExportSelectionMode(true)
  }

  // Handlers para seleção de linhas
  const handleSelectRoute = (id: string, selected: boolean) => {
    setSelectAllAcrossPages(false)
    setSelectedRouteIds(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(id)
      } else {
        newSet.delete(id)
      }
      return newSet
    })
  }

  // Checkbox do cabeçalho: seleciona apenas os registros da página atual
  const handleSelectAllRoutes = (selected: boolean) => {
    setSelectAllAcrossPages(false)
    setSelectedRouteIds(selected ? new Set(routes.map(r => String(r.id))) : new Set())
  }

  // Seleciona todos os registros retornados pelos filtros (todas as páginas)
  const handleSelectAllAcrossPages = async () => {
    setSelectingAll(true)
    try {
      const result = await routeService.list({ ...buildRoutesParams(), page: 1, limit: total || 10000 })
      setAllFilteredRoutes(result.data)
      setSelectedRouteIds(new Set(result.data.map((r: any) => String(r.id))))
      setSelectAllAcrossPages(true)
      showSuccess(`Todos os ${result.data.length} registros encontrados foram selecionados.`)
    } catch (err) {
      console.error('[RoutesPage] Erro ao selecionar todos os registros:', err)
      showError('Não foi possível selecionar todos os registros. Tente novamente.')
    } finally {
      setSelectingAll(false)
    }
  }

  const handleClearSelection = () => {
    setSelectedRouteIds(new Set())
    setSelectAllAcrossPages(false)
    setAllFilteredRoutes([])
    setIsExportSelectionMode(false)
  }

  const handleExportSelected = () => {
    if (selectedRouteIds.size === 0) return
    setIsExportModalOpen(true)
  }

  const handleExportModalClose = () => {
    setIsExportModalOpen(false)
  }

  const handleNoteClick = (note: any) => {
    setSelectedNote(note)
    setIsViewingNoteDetail(true)
  }

  const handleBackToNotes = () => {
    setSelectedNote(null)
    setIsViewingNoteDetail(false)
  }

  // Abre o modal de confirmação de desassociação (bloqueado se a rota não
  // permite mais edição da montagem — regra de status de entrega)
  const handleDesassociar = () => {
    if (!selectedRouteId || !selectedNote?.id || !canEditAssembly) return
    setIsDisassociateOpen(true)
  }

  // Executa a desassociação após confirmação
  const handleConfirmDisassociate = async () => {
    if (!selectedRouteId || !selectedNote?.id) return
    setIsDisassociating(true)
    try {
      await routeService.disassociateInvoice(selectedRouteId, String(selectedNote.id))
      setIsDisassociateOpen(false)
      showSuccess('Nota desassociada com sucesso')
      handleBackToNotes()
      await refreshInvoices()
    } catch (err) {
      console.error('Error disassociating note:', err)
      showError(err instanceof Error ? err.message : 'Erro ao desassociar nota')
    } finally {
      setIsDisassociating(false)
    }
  }

  // Função única para refresh de invoices - atualiza lista e detalhe
  // Definida no nível do componente para garantir que é estável
  const refreshInvoices = async () => {
    console.log('[refreshInvoices] Função chamada!')

    // Usar refs para ter valores atuais
    const routeId = routeIdRef.current
    const noteId = noteIdRef.current

    if (!routeId) {
      console.log('[refreshInvoices] selectedRouteId não disponível')
      return
    }

    try {
      const invoices = await getInvoicesByRouteId(routeId)
      console.log('[refreshInvoices] invoices carregadas:', invoices.length)
      setRouteInvoices(invoices)

      // Sincronizar selectedNote com dados atualizados
      if (noteId) {
        const updated = invoices.find(i => String(i.id) === String(noteId))
        if (updated) {
          setSelectedNote(updated)
          console.log('[refreshInvoices] selectedNote atualizado')
        }
      }
    } catch (error) {
      console.error('[refreshInvoices] Erro:', error)
    }
  }

  const handleEditClick = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = async () => {
    setIsEditing(false)
    // Reload route data
    if (selectedRouteId) {
      const routeDetails = await getRouteById(selectedRouteId)
      if (routeDetails) {
        setFormData(convertRouteToFormData(routeDetails))
      }
    }
  }

  const handleSaveEdit = async () => {
    if (!selectedRouteId || !formData) return

    // Edição administrativa (Web): liberada, exceto quando a rota está
    // finalizada — todas as notas já foram entregues.
    if (!canEditRoute) {
      showError('Rota finalizada: todas as notas já foram entregues. Não é possível editar.')
      return
    }

    setIsSavingEdit(true)
    try {
      // Check if NUMBER was changed
      const codeChanged = formData.numeroRota !== formData.originalNumeroRota

      if (codeChanged) {
        // Only check for duplicates if the number was changed
        const codeExists = await routeService.checkRouteCodeExists(formData.numeroRota, selectedRouteId)
        console.log('[handleSaveEdit] Code changed from', formData.originalNumeroRota, 'to', formData.numeroRota, 'exists:', codeExists)

        if (codeExists) {
          showError(`Número da Rota não pode ser alterado para "${formData.numeroRota}", pois já existe uma rota com esse número. O número continuará "${formData.originalNumeroRota}".`)
          return
        } else {
          showSuccess(`Número da Rota alterado de "${formData.originalNumeroRota}" para "${formData.numeroRota}".`)
        }
      }

      // Ensure reference data is loaded before saving
      if (refVehicles.length === 0 || refStatuses.length === 0) {
        const refData = await routeService.getReferenceData()
        setRefStatuses(refData.statuses || [])
        setRefDeliveryStatuses(refData.deliveryStatuses || [])
        setRefVehicles(refData.vehicles || [])
      }

      // Look up IDs - now values match exactly since dropdown is dynamic
      const statusItem = refStatuses.find(s => s.name === formData.status)
      const deliveryStatusItem = refDeliveryStatuses.find(s => s.name === formData.statusEntrega)
      console.log('[handleSaveEdit] refVehicles:', refVehicles)
      console.log('[handleSaveEdit] placaVeiculo:', formData.placaVeiculo)
      const vehicleItem = refVehicles.find(v => v.plate === formData.placaVeiculo)
      console.log('[handleSaveEdit] vehicleItem:', vehicleItem)

      // Get helper names from form - database expects text[] array, not comma-separated string
      const helperNames = (formData.ajudante || []).map((h: any) => h.label)

      // Responsável (único): id vem de ref_route_responsible via responsibleOptions
      const responsavelId = formData.responsaveis?.[0]?.value

      const updateDTO: UpdateRouteDTO = {
        route_code: formData.numeroRota,
        id_route_status: statusItem?.id,
        id_route_delivery_status: deliveryStatusItem?.id,
        id_vehicle: vehicleItem?.id,
        id_driver: formData.motorista?.[0]?.value || undefined,
        id_route_responsible: responsavelId ? Number(responsavelId) : undefined,
        assistant: helperNames,
        departure_date: convertToDbDate(formData.dataSaida),
        area: formData.areaRota,
      }

      if (!deliveryStatusItem || !statusItem) {
        showError('Status não encontrado na base de dados')
        return
      }

      await updateRoute(selectedRouteId, updateDTO)

      // Refresh formData to show current values
      const routeDetails = await getRouteById(selectedRouteId)
      if (routeDetails) {
        setFormData(convertRouteToFormData(routeDetails))
      }
      setIsEditing(false)
      // Recarrega a lista para refletir na tabela TODOS os campos editados
      // (motorista, responsável, área, data de saída, etc.). A atualização
      // otimista de updateRoute cobre só alguns campos, então sem este reload
      // a tabela ficaria desatualizada até um refresh manual da tela.
      reloadRoutes()
      showSuccess('Rota salva com sucesso!')
    } catch (err) {
      console.error('Error saving route:', err)
      showError('Erro ao salvar a rota. Tente novamente.')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => prev ? { ...prev, [field]: value } : null)
  }

  // Fetch tab content based on active tab
  useEffect(() => {
    if (!selectedRouteId) return

    if (activeTab === 'notas-fiscais') {
      setIsInvoicesLoading(true)
      setRouteInvoices([])
      getInvoicesByRouteId(selectedRouteId).then((invoices) => {
        setRouteInvoices(invoices)
      }).catch(err => {
        console.error('[RoutesPage] Error fetching invoices:', err)
      }).finally(() => {
        setIsInvoicesLoading(false)
      })
    } else if (activeTab === 'historico') {
      setIsHistoryLoading(true)
      fetchHistory(selectedRouteId).finally(() => {
        setIsHistoryLoading(false)
      })
    }
  }, [activeTab, selectedRouteId, getInvoicesByRouteId, fetchHistory])

  // Atualiza o Histórico automaticamente enquanto o modal está aberto nessa aba,
  // sem exigir refresh manual (ex.: quando a entrega é finalizada no mobile).
  // Refetch periódico + ao focar/reexibir a janela. Silencioso: não dispara o
  // spinner de carregamento (não mexe em isHistoryLoading) para evitar flicker.
  useEffect(() => {
    if (!selectedRouteId || activeTab !== 'historico') return

    const silentRefresh = () => {
      if (document.visibilityState !== 'visible') return
      fetchHistory(selectedRouteId)
    }

    const intervalId = window.setInterval(silentRefresh, 10000)
    window.addEventListener('focus', silentRefresh)
    document.addEventListener('visibilitychange', silentRefresh)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', silentRefresh)
      document.removeEventListener('visibilitychange', silentRefresh)
    }
  }, [selectedRouteId, activeTab, fetchHistory])

  // Handler para clique em item do histórico
  const handleHistoryItemClick = (item: HistoricoItem) => {
    if (item.hasDetail && item.detail) {
      setSelectedHistoryItem(item)
      setSelectedOccurrenceDetail(item.detail)
      setIsDetailModalOpen(true)
    }
  }

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false)
    setSelectedHistoryItem(null)
    setSelectedOccurrenceDetail(null)
  }

  const renderTabContent = () => {
    if (isRouteLoading || !formData) {
      return (
        <div className="flex items-center justify-center h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e67c26]"></div>
        </div>
      )
    }

    // Convert ref data to options format
    const statusOptions = refStatuses.map((s: any) => ({ value: s.name, label: s.name }))
    const deliveryStatusOptions = refDeliveryStatuses.map((s: any) => ({ value: s.name, label: s.name }))
    const vehicleOptions = refVehicles.map((v: any) => ({ value: v.plate, label: v.plate, carga: v.nominal_capacity?.toString() || '' }))
    const helperOptions = refHelpers.map((h: any) => ({ value: h.id, label: h.name, color: '#e67c26' }))
    const driverOptions = refDrivers.map((d: any) => ({ value: d.id, label: d.name, color: '#e67c26' }))
    const responsibleOptions = refResponsibles.map((r: any) => ({ value: String(r.id), label: r.name, color: '#e67c26' }))

    switch (activeTab) {
      case 'dados-rota':
        return (
          <RouteForm
            data={formData}
            isEditing={isEditing}
            isInactive={formData.isActive === false}
            onChange={handleFormChange}
            statusOptions={statusOptions}
            deliveryStatusOptions={deliveryStatusOptions}
            vehicleOptions={vehicleOptions}
            helperOptions={helperOptions}
            driverOptions={driverOptions}
            responsibleOptions={responsibleOptions}
            routeTypeOptions={[]}
          />
        )
      case 'notas-fiscais':
        if (selectedNote) {
          return <RouteNoteDetail nota={selectedNote} routeCode={formData?.numeroRota || ''} routeId={selectedRouteId || ''} onBack={handleBackToNotes} onRefresh={refreshInvoices} />
        }
        if (isInvoicesLoading) {
          return (
            <div className="flex items-center justify-center h-[200px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e67c26]"></div>
            </div>
          )
        }
        return (
          <div className="w-full min-w-0 py-2">
            <RouteNotesTable data={routeInvoices} onRowClick={handleNoteClick} />
          </div>
        )
      case 'historico':
        if (isHistoryLoading) {
          return (
            <div className="flex items-center justify-center h-[200px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e67c26]"></div>
            </div>
          )
        }
        if (history.length > 0) {
          const mappedHistory: HistoricoItem[] = history.map((h) => {
            const code = h.history_type?.code ?? null
            const isDelivery = code !== null && DELIVERY_EVENT_TYPES.has(code)
            const hasDetail = code !== null && DETAIL_EVENT_TYPES.has(code)
            const isClientArrival = code === 'CLIENT_ARRIVAL'
            const destinationName = h.metadata?.destination_name || h.metadata?.reference_name || ''
            const titulo = isClientArrival
              ? (destinationName ? `Chegada em ${destinationName}` : 'Chegada ao Cliente')
              : (h.description || h.title || h.history_type?.description || 'Evento')
            const arrivalPhotoPath = h.metadata?.arrival_photo_path
            const arrivalPhotoUrl = h.metadata?.arrival_photo_url

            // Anexos da entrega (canhoto/NFD) — as URLs já são públicas (bellog-files)
            const receiptUrl = h.metadata?.receipt_image_path
            const nfdUrl = h.metadata?.nfd_image_path
            const deliveryAnexos: NonNullable<HistoricoItem['detail']>['anexos'] = isDelivery
              ? [
                  ...(receiptUrl ? [{ id: `${h.id}-canhoto`, nome: 'Canhoto', tipo: 'imagem' as const, url: receiptUrl, file_url: receiptUrl, file_path: receiptUrl }] : []),
                  ...(nfdUrl ? [{ id: `${h.id}-nfd`, nome: 'NFD', tipo: 'documento' as const, url: nfdUrl, file_url: nfdUrl, file_path: nfdUrl }] : []),
                ]
              : []

            // Título do detalhe: só o rótulo (o modal já renderiza "titulo em local")
            const detailTitulo = isClientArrival
              ? 'Chegada ao Cliente'
              : isDelivery
                ? (h.metadata?.delivery_label || titulo)
                : titulo

            const detailObs = isClientArrival
              ? (arrivalPhotoUrl
                ? (h.metadata?.justification ? `Justificativa: ${h.metadata.justification}` : 'Foto registrada na chegada ao cliente.')
                : 'Foto da chegada não encontrada no armazenamento.')
              : isDelivery
                ? (h.metadata?.observation || '')
                : ''

            const arrivalAnexos: NonNullable<HistoricoItem['detail']>['anexos'] = (isClientArrival && arrivalPhotoPath && arrivalPhotoUrl)
              ? [{
                  id: String(h.metadata?.id_route_stop || h.id),
                  nome: 'Foto da chegada',
                  tipo: 'imagem' as const,
                  url: arrivalPhotoUrl,
                  file_url: arrivalPhotoUrl,
                  file_path: arrivalPhotoPath,
                }]
              : []

            return {
              id: h.id,
              tipo: mapEventTypeToTipo(code),
              titulo,
              data: h.event_at ? new Date(h.event_at).toLocaleDateString('pt-BR') : '',
              hora: h.event_at ? new Date(h.event_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
              hasDetail,
              detail: hasDetail ? {
                id: h.metadata?.invoice_id || h.id,
                titulo: detailTitulo,
                local: destinationName,
                notas: [],
                observacao: detailObs,
                anexos: isClientArrival ? arrivalAnexos : deliveryAnexos,
              } : undefined,
            }
          })
          return <RouteHistory data={mappedHistory} onItemClick={handleHistoryItemClick} />
        }
        return (
          <div className="flex flex-col items-center justify-center h-[200px] text-[#919191]">
            <span className="text-[14px]">Nenhum histórico disponível</span>
          </div>
        )
      default:
        return null
    }
  }

  // Renderizar footer dependendo do modo
  const renderFooter = () => {
    // Não renderiza footer quando estiver no detalhe da nota
    if (isViewingNoteDetail) {
      return null
    }

    // As ações de edição da rota (Editar/Inativar/Ativar) só valem na aba
    // "Dados de Rota". Nas abas "Notas Fiscais" e "Histórico" a edição não é
    // permitida, então o footer não é exibido.
    if (activeTab !== 'dados-rota') {
      return null
    }

    if (isEditing) {
      return (
        <>
          <button
            type="button"
            onClick={handleCancelEdit}
            disabled={isSavingEdit}
            className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] border border-[#e67c26] text-[#e67c26] w-[150px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="font-bold text-[14px]" style={{ fontFamily: 'Inter, sans-serif' }}>
              Cancelar
            </span>
          </button>
          <button
            type="button"
            onClick={handleSaveEdit}
            disabled={isSavingEdit}
            className="flex items-center justify-center gap-2 h-[45px] px-[8px] py-[2px] rounded-[4px] bg-[#e67c26] w-[150px] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSavingEdit && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span className="font-bold text-[14px] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
              {isSavingEdit ? 'Salvando...' : 'Salvar'}
            </span>
          </button>
        </>
      )
    }

    // Rota inativa: oferece Ativar no lugar de Inativar
    if (formData?.isActive === false) {
      return (
        <>
          <button
            type="button"
            onClick={handleAtivar}
            className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] w-[150px] bg-[#2E7D32]"
          >
            <span className="font-bold text-[14px] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
              Ativar
            </span>
          </button>
        </>
      )
    }

    return (
      <>
        <button
          type="button"
          onClick={handleInativar}
          disabled={!canInativar}
          className={`flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] w-[150px] ${
            canInativar ? 'bg-[#eb5757]' : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          <span className="font-bold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: canInativar ? 'white' : '#666' }}>
            Inativar
          </span>
        </button>
        <button
          type="button"
          onClick={handleEditClick}
          disabled={!canEditRoute}
          title={canEditRoute ? undefined : 'Rota finalizada: todas as notas já foram entregues. A edição não é permitida.'}
          className={`flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] w-[150px] ${
            canEditRoute ? 'bg-[#e67c26]' : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          <span className="font-bold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: canEditRoute ? 'white' : '#666' }}>
            Editar
          </span>
        </button>
      </>
    )
  }

  return (
    <>
      {/* Page Header */}
      <PageHeader
        title="Rotas"
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar || (() => {})}
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        onLogout={onLogout}
      />

      {/* Main Content - Figma spacing: p-4 with gap-3 */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Toolbar */}
        <RoutesToolbar
          onSearch={(term) => setSearchTerm(term)}
          onToggleInactive={(show) => setShowInactive(show)}
          onExport={handleExport}
          onExportSelected={handleExportSelected}
          isSelectionMode={isExportSelectionMode}
          selectedCount={selectedRouteIds.size}
          onFilter={(filters) => {
            // Persiste os filtros e volta à página 1. O fetch é feito
            // pelo useEffect (reloadRoutes), evitando que buscas paralelas
            // sobrescrevam os filtros aplicados.
            setAppliedFilters(filters)
            setCurrentPage(1)
          }}
        />

        {/* Exibir inativos + Cancelar Seleção + Pagination row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Toggle
              label="Exibir inativos"
              checked={showInactive}
              onChange={(checked) => {
                setShowInactive(checked)
                setCurrentPage(1)
              }}
            />
            {isExportSelectionMode && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="flex items-center justify-center h-[40px] px-[16px] rounded-[4px] border border-[#C7392C] bg-white gap-2"
              >
                <AppIcon name="delete_forever" size={20} color="#C7392C" />
                <span className="font-bold text-[13px]" style={{ fontFamily: 'Inter, sans-serif', color: '#C7392C' }}>
                  Cancelar Exportação
                </span>
              </button>
            )}
          </div>

          {/* Pagination - always on right */}
          <div className="flex items-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>

        {/* Banner de seleção entre páginas (estilo Gmail) */}
        {isExportSelectionMode && (() => {
          const currentPageCount = routes.length
          const allCurrentSelected = currentPageCount > 0 && routes.every((r) => selectedRouteIds.has(String(r.id)))
          const hasMore = total > currentPageCount
          if (!allCurrentSelected || !hasMore || selectAllAcrossPages) return null
          return (
            <div className="flex items-center justify-center gap-3 shrink-0 w-full bg-[#eef3fc] border border-[#4077d9]/40 rounded-[6px] px-4 py-2">
              <span className="text-[13px] text-[#2a2a2a]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Todos os <strong>{currentPageCount}</strong> registros desta página foram selecionados.
              </span>
              <button
                type="button"
                onClick={handleSelectAllAcrossPages}
                disabled={selectingAll}
                className="text-[13px] font-bold text-[#4077d9] underline disabled:opacity-50"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {selectingAll ? 'Selecionando...' : `Deseja selecionar todos os ${total} registros encontrados?`}
              </button>
            </div>
          )
        })()}

        {/* Table */}
        <div className="flex flex-1 flex-col w-full min-w-0">
          {loading ? (
            <div className="flex items-center justify-center h-[300px] bg-white rounded-[8px]">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#e67c26]"></div>
            </div>
          ) : routes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] bg-white rounded-[8px] gap-3">
              <AppIcon name="inbox" size={48} color="#919191" />
              <span className="text-[14px] text-[#919191]" style={{ fontFamily: 'Inter, sans-serif' }}>
                Nenhuma rota encontrada para o filtro selecionado
              </span>
            </div>
          ) : (
            <RoutesTable
              data={routes}
              onRowClick={handleRowClick}
              selectable={isExportSelectionMode}
              selectedIds={selectedRouteIds}
              onSelectRow={handleSelectRoute}
              onSelectAll={handleSelectAllRoutes}
            />
          )}
        </div>
      </div>

      {/* Drawer */}
      <Drawer
        isOpen={isDrawerOpen && !isViewingNoteDetail}
        onClose={handleCloseDrawer}
        title={selectedRouteId ? `Rota ${formData?.numeroRota || ''}` : 'Detalhes da Rota'}
        icon="road"
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showFooter={activeTab === 'dados-rota'}
        footerContent={renderFooter()}
        fullWidth
      >
        {renderTabContent()}
      </Drawer>

      {/* Drawer de Detalhe da Nota Fiscal */}
      {isViewingNoteDetail && selectedNote && (
        <Drawer
          isOpen={true}
          onClose={handleBackToNotes}
          title={`Rota ${formData?.numeroRota || ''}`}
          icon="road"
          showFooter={true}
          fullWidth
          footerContent={
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={handleBackToNotes}
                className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] border border-[#e67c26] bg-white w-[150px]"
              >
                <span className="font-bold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: '#e67c26' }}>
                  Voltar
                </span>
              </button>
              <button
                type="button"
                onClick={handleDesassociar}
                disabled={!canEditAssembly}
                title={canEditAssembly ? undefined : 'Rota em andamento. A montagem não pode mais ser alterada.'}
                className={`flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] border bg-white gap-2 ${
                  canEditAssembly ? 'border-[#eb5757]' : 'border-[#cccccc] cursor-not-allowed opacity-60'
                }`}
              >
                <AppIcon name="do_not_disturb_on" size={24} color={canEditAssembly ? '#eb5757' : '#999999'} />
                <span
                  className="font-bold text-[14px]"
                  style={{ fontFamily: 'Inter, sans-serif', color: canEditAssembly ? '#eb5757' : '#999999' }}
                >
                  Desassociar Nota
                </span>
              </button>
            </div>
          }
        >
          <RouteNoteDetail
            nota={selectedNote}
            routeCode={formData?.numeroRota || ''}
            routeId={selectedRouteId || ''}
            onBack={handleBackToNotes}
            onRefresh={refreshInvoices}
          />
        </Drawer>
      )}

      {/* Modal de Detalhe da Ocorrência */}
      <OccurrenceDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        detail={selectedOccurrenceDetail}
        routeId={selectedRouteId}
      />

      {/* Modal de Exportação */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => {
          // Voltar: apenas fecha o modal, mantendo a seleção e o modo de exportação
          setIsExportModalOpen(false)
        }}
        onExported={() => {
          // Exportou com sucesso: encerra o fluxo de exportação
          setIsExportModalOpen(false)
          setIsExportSelectionMode(false)
          setSelectedRouteIds(new Set())
          setSelectAllAcrossPages(false)
          setAllFilteredRoutes([])
        }}
        routes={
          selectAllAcrossPages
            ? allFilteredRoutes
            : (selectedRouteIds.size > 0 ? routes.filter(r => selectedRouteIds.has(String(r.id))) : routes)
        }
      />

      {/* Modal de confirmação de ativação/inativação de rota */}
      <InactivateConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false)
          setConfirmAction(null)
        }}
        onConfirm={handleConfirmAction}
        isLoading={isProcessingAction}
        companyName={formData?.numeroRota || ''}
        action={confirmAction ?? 'inactivate'}
        entityLabel="Rota"
      />

      {/* Modal de confirmação de desassociação de nota */}
      <DisassociateNoteModal
        isOpen={isDisassociateOpen}
        onClose={() => setIsDisassociateOpen(false)}
        onConfirm={handleConfirmDisassociate}
        isLoading={isDisassociating}
        invoiceNumber={selectedNote?.invoice_number || ''}
        routeCode={formData?.numeroRota || ''}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}
