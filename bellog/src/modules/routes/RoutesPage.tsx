import { useState, useEffect, useCallback } from 'react'
import { PageHeader, Pagination, Drawer, TabId } from '../../shared/components'
import { RoutesTable } from './components/RoutesTable'
import { RoutesToolbar } from './components/RoutesToolbar'
import { RouteForm } from './components/RouteForm'
import { RouteNotesTable } from './components/RouteNotesTable'
import { RouteNoteDetail } from './components/RouteNoteDetail'
import { RouteHistory } from './components/RouteHistory'
import { OccurrenceDetailModal } from './components/OccurrenceDetailModal'
import { useRoutes } from '../../hooks/useRoutes'
import { useFiscalInvoices } from '../../hooks/useFiscalInvoices'
import { useRouteHistory } from '../../hooks/useRouteHistory'
import { routeService, RouteWithDetails, UpdateRouteDTO } from '../services/route.service'
import { historicoData, HistoricoItem } from './data/historico.mock'

interface RoutesPageProps {
  userName?: string
  userRole?: string
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

// Convert DB route to form data
const convertRouteToFormData = (route: RouteWithDetails): RouteFormData => {
  return {
    status: route.status?.description || 'Aberta',
    statusEntrega: route.delivery_status?.description || 'Em Andamento',
    numeroRota: route.route_number || '',
    areaRota: route.area_description || '',
    responsaveis: (route.responsible || []).map(r => ({
      value: r.id,
      label: r.name || '',
      color: '#e67c26',
    })),
    destinos: (route.destinations || []).map(d => ({
      value: d.id,
      label: d.company_name,
      color: '#e67c26',
    })),
    tipoRota: route.route_type?.description || 'Entrega',
    dataSaida: route.departure_date || '',
    fimRota: route.arrival_date ? `Finalizada em ${route.arrival_date}` : 'Aguardando fim da rota',
    motorista: (route.drivers || []).map(d => ({
      value: d.id,
      label: d.name || '',
      color: '#e67c26',
    })),
    ajudante: (route.helpers || []).map(h => ({
      value: h.id,
      label: h.name || '',
      color: '#e67c26',
    })),
    placaVeiculo: route.vehicle?.plate || '',
    cargaMaxima: route.vehicle?.max_capacity?.toString() || '',
  }
}

export const RoutesPage = ({
  userName = 'Leon Kennedy',
  userRole = 'Usuário',
  isSidebarOpen = true,
  onToggleSidebar,
}: RoutesPageProps) => {
  const { routes, loading, fetchRoutes, getRouteById, updateRoute, fetchReferenceData } = useRoutes()
  const { getInvoicesByRouteId, fetchReferenceData: fetchInvoiceRefData } = useFiscalInvoices()
  const { history, fetchHistory } = useRouteHistory()

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('dados-rota')
  const [selectedNote, setSelectedNote] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<RouteFormData | null>(null)
  const [routeInvoices, setRouteInvoices] = useState<any[]>([])

  // Estados para histórico
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoricoItem | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedOccurrenceDetail, setSelectedOccurrenceDetail] = useState<any>(null)

  const [showInactive, setShowInactive] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch routes on mount and when filters change
  useEffect(() => {
    fetchRoutes({
      search: searchTerm || undefined,
      isActive: showInactive ? undefined : true,
      page: 1,
      limit: 20,
    })
  }, [searchTerm, showInactive])

  // Fetch reference data
  useEffect(() => {
    fetchReferenceData()
    fetchInvoiceRefData()
  }, [])

  const handleRowClick = async (route: any) => {
    setSelectedRouteId(route.id)
    setIsDrawerOpen(true)
    setActiveTab('dados-rota')
    setSelectedNote(null)
    setIsEditing(false)

    // Load route details
    const routeDetails = await getRouteById(route.id)
    if (routeDetails) {
      setFormData(convertRouteToFormData(routeDetails))
    }
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setSelectedRouteId(null)
    setSelectedNote(null)
    setIsEditing(false)
    setFormData(null)
    setRouteInvoices([])
    setSelectedHistoryItem(null)
    setIsDetailModalOpen(false)
  }

  const handleNoteClick = (note: any) => {
    setSelectedNote(note)
  }

  const handleBackToNotes = () => {
    setSelectedNote(null)
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
      const updateDTO: UpdateRouteDTO = {
        id_status: formData.status,
        id_delivery_status: formData.statusEntrega,
        id_vehicle: formData.placaVeiculo,
      }
      await updateRoute(selectedRouteId, updateDTO)

      // Reload route data
      const routeDetails = await getRouteById(selectedRouteId)
      if (routeDetails) {
        setFormData(convertRouteToFormData(routeDetails))
      }
      setIsEditing(false)
    } catch (err) {
      console.error('Error saving route:', err)
    }
  }

  const handleFormChange = (field: string, value: any) => {
    setFormData((prev) => prev ? { ...prev, [field]: value } : null)
  }

  // Fetch tab content based on active tab
  useEffect(() => {
    if (!selectedRouteId) return

    if (activeTab === 'notas-fiscais') {
      getInvoicesByRouteId(selectedRouteId).then(setRouteInvoices)
    } else if (activeTab === 'historico') {
      fetchHistory(selectedRouteId)
    }
  }, [activeTab, selectedRouteId])

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
    if (!formData) return null

    switch (activeTab) {
      case 'dados-rota':
        return (
          <RouteForm
            data={formData}
            isEditing={isEditing}
            onChange={handleFormChange}
          />
        )
      case 'notas-fiscais':
        if (selectedNote) {
          return <RouteNoteDetail notaId={selectedNote.invoice_number} onBack={handleBackToNotes} />
        }
        return <RouteNotesTable data={routeInvoices} onRowClick={handleNoteClick} />
      case 'historico':
        // Use real history data if available, otherwise fallback to mock
        if (history.length > 0) {
          const mappedHistory: HistoricoItem[] = history.map((h, idx) => ({
            id: h.id,
            tipo: (h.history_type?.code as any) || 'rota-criada',
            titulo: h.history_type?.description || 'Evento',
            data: h.event_at ? new Date(h.event_at).toLocaleDateString('pt-BR') : '',
            hora: h.event_at ? new Date(h.event_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
            hasDetail: false,
          }))
          return <RouteHistory data={mappedHistory} onItemClick={handleHistoryItemClick} />
        }
        return <RouteHistory data={historicoData} onItemClick={handleHistoryItemClick} />
      default:
        return null
    }
  }

  // Renderizar footer dependendo do modo
  const renderFooter = () => {
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
            className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] bg-[#4077d9] w-[150px]"
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
          onClick={handleCloseDrawer}
          className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] border border-[#e67c26] text-[#e67c26] w-[150px]"
        >
          <span className="font-bold text-[14px]" style={{ fontFamily: 'Inter, sans-serif' }}>
            Voltar
          </span>
        </button>
        <button
          type="button"
          onClick={handleEditClick}
          className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] bg-[#4077d9] w-[150px]"
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
        userRole={userRole}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Toolbar */}
        <RoutesToolbar
          onSearch={(term) => setSearchTerm(term)}
          onToggleInactive={(show) => setShowInactive(show)}
        />

        {/* Table with overflow horizontal */}
        <div className="flex flex-1 flex-col w-full min-w-0 overflow-x-auto">
          <RoutesTable data={routes} onRowClick={handleRowClick} loading={loading} />
        </div>

        {/* Footer with Pagination */}
        <div className="flex items-center justify-end shrink-0 w-full">
          <Pagination />
        </div>
      </div>

      {/* Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title={selectedRouteId ? `Rota ${formData?.numeroRota || ''}` : 'Detalhes da Rota'}
        icon="road"
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        footerContent={renderFooter()}
      >
        {renderTabContent()}
      </Drawer>

      {/* Modal de Detalhe da Ocorrência */}
      <OccurrenceDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        detail={selectedOccurrenceDetail}
      />
    </>
  )
}
