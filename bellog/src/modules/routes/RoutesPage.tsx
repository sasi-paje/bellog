import { useState, useEffect, useRef } from 'react'
import { PageHeader, Pagination, Drawer, TabId, AppIcon, useToast, ToastContainer } from '../../shared/components'
import { RoutesTable } from './components/RoutesTable'
import { RoutesToolbar } from './components/RoutesToolbar'
import { RouteForm } from './components/RouteForm'
import { RouteNotesTable } from './components/RouteNotesTable'
import { RouteNoteDetail, setGlobalRefreshCallback, triggerGlobalRefresh } from './components/RouteNoteDetail'
import { RouteHistory } from './components/RouteHistory'
import { OccurrenceDetailModal } from './components/OccurrenceDetailModal'
import { ExportModal } from './components/ExportModal'
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
    anexos: { id: string; nome: string; tipo: 'imagem' | 'documento' }[]
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
  }
}

const DELIVERY_EVENT_TYPES = new Set(['DELIVERY_TOTAL', 'DELIVERY_PARTIAL', 'DELIVERY_DENIED', 'DELIVERY_ABORTED'])

function mapEventTypeToTipo(code: string | null | undefined): HistoricoItem['tipo'] {
  switch (code) {
    case 'CREATED': return 'rota-criada'
    case 'IN_PROGRESS': return 'em-andamento'
    case 'ROUTE_STARTED': return 'em-rota'
    case 'DELIVERY_TOTAL': return 'entrega-total'
    case 'DELIVERY_PARTIAL': return 'entrega-parcial'
    case 'DELIVERY_DENIED': return 'entrega-negada'
    case 'DELIVERY_ABORTED': return 'entrega-abortada'
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
  const [refDataLoading, setRefDataLoading] = useState(false)

  // Estado para modal de exportação
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)

  // Estado para seleção de linhas
  const [selectedRouteIds, setSelectedRouteIds] = useState<Set<string>>(new Set())
  const [isExportSelectionMode, setIsExportSelectionMode] = useState(false)

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

  // Fetch routes on mount and when filters change
  useEffect(() => {
    const today = new Date()
    const day = String(today.getDate()).padStart(2, '0')
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const year = today.getFullYear()
    const todayStr = `${year}-${month}-${day}`

    fetchRoutes({
      search: searchTerm || undefined,
      isActive: showInactive ? undefined : true,
      page: currentPage,
      limit: LIMIT,
      dataInicio: todayStr,
      dataFim: todayStr,
    })
  }, [searchTerm, showInactive, currentPage, fetchRoutes])

  // Fetch reference data
  useEffect(() => {
    const loadRefData = async () => {
      setRefDataLoading(true)
      try {
        const [refData, helpers, drivers] = await Promise.all([
          routeService.getReferenceData(),
          routeService.getHelpers(),
          routeService.getDrivers(),
        ])
        setRefStatuses(refData.statuses || [])
        setRefDeliveryStatuses(refData.deliveryStatuses || [])
        setRefVehicles(refData.vehicles || [])
        setRefHelpers(helpers || [])
        setRefDrivers(drivers || [])
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

  const handleInativar = async () => {
    if (!selectedRouteId || !canInativar) return
    try {
      await routeService.delete(selectedRouteId)
      handleCloseDrawerOnly()
    } catch (err) {
      console.error('Error deleting route:', err)
    }
  }

  // Handler para fechar drawer (X button) sem inativar
  const handleCloseDrawer = () => {
    if (canInativar) {
      handleInativar()
    } else {
      handleCloseDrawerOnly()
    }
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

  const handleSelectAllRoutes = (selected: boolean) => {
    if (selected) {
      setSelectedRouteIds(new Set(routes.map(r => String(r.id))))
    } else {
      setSelectedRouteIds(new Set())
    }
  }

  const handleClearSelection = () => {
    setSelectedRouteIds(new Set())
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

      const updateDTO: UpdateRouteDTO = {
        id_route_status: statusItem?.id,
        id_route_delivery_status: deliveryStatusItem?.id,
        id_vehicle: vehicleItem?.id,
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
      showSuccess('Rota salva com sucesso!')
    } catch (err) {
      console.error('Error saving route:', err)
      showError('Erro ao salvar a rota. Tente novamente.')
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

    switch (activeTab) {
      case 'dados-rota':
        return (
          <RouteForm
            data={formData}
            isEditing={isEditing}
            onChange={handleFormChange}
            statusOptions={statusOptions}
            deliveryStatusOptions={deliveryStatusOptions}
            vehicleOptions={vehicleOptions}
            helperOptions={helperOptions}
            driverOptions={driverOptions}
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
            const titulo = h.history_type?.description || h.description || 'Evento'
            return {
              id: h.id,
              tipo: mapEventTypeToTipo(code),
              titulo,
              data: h.event_at ? new Date(h.event_at).toLocaleDateString('pt-BR') : '',
              hora: h.event_at ? new Date(h.event_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
              hasDetail: isDelivery,
              detail: isDelivery ? {
                id: h.metadata?.invoice_id || h.id,
                titulo,
                local: h.metadata?.destination_name || '',
                notas: [],
                observacao: '',
                anexos: [],
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

    if (isEditing) {
      return (
        <>
          <button
            type="button"
            onClick={handleCancelEdit}
            className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] border border-[#e67c26] text-[#e67c26] w-[150px]"
          >
            <span className="font-bold text-[14px]" style={{ fontFamily: 'Inter, sans-serif' }}>
              Cancelar
            </span>
          </button>
          <button
            type="button"
            onClick={handleSaveEdit}
            className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] bg-[#e67c26] w-[150px]"
          >
            <span className="font-bold text-[14px] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
              Salvar
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
            {canInativar ? 'Inativar' : 'Bloqueado'}
          </span>
        </button>
        <button
          type="button"
          onClick={handleEditClick}
          className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] bg-[#e67c26] w-[150px]"
        >
          <span className="font-bold text-[14px] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
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
            console.log('[RoutesPage] Filters applied:', filters)
            // Convert FilterOption[] to string[]
            const statusValues = filters.status.map((s: any) => s.value)
            const statusEntregaValues = filters.statusEntrega.map((s: any) => s.value)
            const motoristaValues = filters.motorista.map((m: any) => m.value)
            const areaValues = filters.area.map((a: any) => a.value)
            const veiculoValues = filters.veiculo.map((v: any) => v.value)
            // Apply filters to the route list
            fetchRoutes({
              search: searchTerm,
              isActive: undefined, // Show all routes when filtering
              dataInicio: filters.dataInicio,
              dataFim: filters.dataFim,
              status: statusValues,
              statusEntrega: statusEntregaValues,
              motorist: motoristaValues,
              area: areaValues,
              veiculo: veiculoValues,
              ordenar: filters.ordenar,
              rotaInicio: filters.rotaInicio,
              rotaFim: filters.rotaFim,
              responsavel: filters.responsavel,
            })
          }}
        />

        {/* Cancelar Seleção + Pagination row */}
        <div className="flex items-center justify-between">
          {isExportSelectionMode ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearSelection}
                className="flex items-center justify-center h-[40px] px-[16px] rounded-[4px] border border-[#C7392C] bg-white gap-2"
              >
                <AppIcon name="delete_forever" size={20} color="#C7392C" />
                <span className="font-bold text-[13px]" style={{ fontFamily: 'Inter, sans-serif', color: '#C7392C' }}>
                  Cancelar Seleção
                </span>
              </button>
            </div>
          ) : <div />}

          {/* Pagination - always on right */}
          <div className="flex items-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>

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
                className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] border border-[#eb5757] bg-white gap-2"
              >
                <AppIcon name="do_not_disturb_on" size={24} color="#eb5757" />
                <span className="font-bold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: '#eb5757' }}>
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
          setIsExportModalOpen(false)
          setIsExportSelectionMode(false)
          setSelectedRouteIds(new Set())
        }}
        routes={selectedRouteIds.size > 0 ? routes.filter(r => selectedRouteIds.has(String(r.id))) : routes}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}