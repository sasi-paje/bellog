import { useState, useEffect } from 'react'
import { PageHeader, Pagination, SharedTable, TableColumn, AppIcon, useToast, ToastContainer } from '../../shared/components'
import { RoutesByNotesToolbar, NoteByRouteData } from './components/RoutesByNotesToolbar'
import { ExportRoutesByNotesModal } from './components/ExportRoutesByNotesModal'
import { useFiscalInvoices } from '../../hooks/useFiscalInvoices'
import { fiscalInvoiceService } from '../../features/notes'
import { formatWeight as formatWeightShared } from '../../shared/utils/format'

interface RoutesByNotesPageProps {
  userName?: string
  userRole?: string
  onLogout?: () => void
  userEmail?: string
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
}

// Cores exatas do Figma
const TEXT_LIGHT75 = '#2a2a2a'
const TEXT_LIGHT25 = '#919191'
const BORDER_HEADER = '#7d9dd3'
const BORDER_ROW = '#828282'

// Helper para formatar peso (padrão do sistema: X.XXX kg)
const formatWeight = (weight?: number): string => {
  if (!weight) return '-'
  return formatWeightShared(weight)
}

// Helper para formatar valor monetário
const formatValue = (value?: number): string => {
  if (!value) return '-'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Helper para estilo do status
const getStatusStyle = (status: string | undefined): React.CSSProperties => {
  if (!status) return { color: TEXT_LIGHT25 }
  const normalized = status.toLowerCase().trim()
  if (normalized.includes('entregue') || normalized.includes('concluído')) return { color: TEXT_LIGHT75 }
  if (normalized.includes('parcial')) return { color: '#e67c26' }
  return { color: TEXT_LIGHT25 }
}

const renderStatus = (status: string | undefined) => (
  <span className="whitespace-nowrap" style={getStatusStyle(status)}>
    {status || '-'}
  </span>
)

const renderText = (value: string | undefined) => (
  <span className="font-medium text-[12px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT75 }}>
    {value || '-'}
  </span>
)

const renderWeight = (weight: number | undefined) => renderText(formatWeight(weight))
const renderValue = (value: number | undefined) => renderText(formatValue(value))

const renderMotivo = (motivo: string | undefined) => (
  <span className="font-medium text-[12px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT25 }}>
    {motivo || '-'}
  </span>
)

const columns: TableColumn<NoteByRouteData>[] = [
  { key: 'route_code', label: 'N° Rota', render: (row) => renderText(row.route_code || row.route_number) },
  { key: 'invoice_number', label: 'N° Nota', render: (row) => renderText(row.invoice_number) },
  { key: 'supplier_name', label: 'Fornecedor', render: (row) => renderText(row.supplier_name) },
  { key: 'destination_name', label: 'Destino', render: (row) => renderText(row.destination_name) },
  { key: 'vehicle_plate', label: 'Veículo', render: (row) => renderText(row.vehicle_plate) },
  { key: 'attempt_number', label: 'Nº Tentativa', render: (row) => renderText(row.attempt_number != null ? String(row.attempt_number) : undefined) },
  { key: 'driver_name', label: 'Motorista', render: (row) => renderText(row.driver_name) },
  { key: 'gross_weight', label: 'Peso Bruto', render: (row) => renderWeight(row.gross_weight) },
  { key: 'invoice_value', label: 'Valor da Nota', render: (row) => renderValue(row.invoice_value) },
  { key: 'delivery_status', label: 'Status de Entrega', render: (row) => renderStatus(row.delivery_status) },
  { key: 'motivo', label: 'Motivo', render: (row) => renderMotivo(row.motivo) },
]

// Converte uma nota fiscal (InvoiceListItem) para o formato da tabela
const mapInvoiceToNote = (inv: any): NoteByRouteData => ({
  id: inv.id,
  route_code: inv.route_code || '',
  route_number: inv.route_number || '',
  invoice_number: inv.invoice_number || '',
  attempt_number: inv.attempt_number ?? 0,
  supplier_name: inv.supplier_name || '',
  destination_name: inv.destination_name || '',
  vehicle_plate: inv.vehicle_plate || '',
  driver_name: inv.driver_name || '',
  gross_weight: inv.gross_weight || inv.weight || 0,
  invoice_value: inv.value || 0,
  delivery_status: inv.delivery_status_description || '',
  motivo: '',
})

export const RoutesByNotesPage = ({
  userName = 'Leon Kennedy',
  userRole = 'Usuário',
  onLogout,
  userEmail,
  isSidebarOpen = true,
  onToggleSidebar,
}: RoutesByNotesPageProps) => {
  const { invoices, total, loading, fetchInvoices } = useFiscalInvoices()
  const { showSuccess, showError, toasts, removeToast } = useToast()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const LIMIT = pageSize
  const totalPages = Math.ceil(total / LIMIT) || 1

  // Export states
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isExportSelectionMode, setIsExportSelectionMode] = useState(false)
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set())
  // Seleção de todos os registros dos filtros (todas as páginas)
  const [selectAllAcrossPages, setSelectAllAcrossPages] = useState(false)
  const [allFilteredNotes, setAllFilteredNotes] = useState<NoteByRouteData[]>([])
  const [selectingAll, setSelectingAll] = useState(false)

  useEffect(() => {
    fetchInvoices({ page: currentPage, limit: LIMIT, onlyWithRoute: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize])

  // Transformar dados das notas para o formato da tabela
  const notesData: NoteByRouteData[] = invoices.map(mapInvoiceToNote)

  // Selection handlers
  const handleSelectNote = (id: string, selected: boolean) => {
    setSelectAllAcrossPages(false)
    setSelectedNoteIds(prev => {
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
  const handleSelectAllNotes = (selected: boolean) => {
    setSelectAllAcrossPages(false)
    setSelectedNoteIds(selected ? new Set(notesData.map(n => String(n.id))) : new Set())
  }

  // Seleciona todos os registros retornados pelos filtros (todas as páginas)
  const handleSelectAllAcrossPages = async () => {
    setSelectingAll(true)
    try {
      const result = await fiscalInvoiceService.list({ page: 1, limit: total || 10000, onlyWithRoute: true })
      const mapped = result.data.map(mapInvoiceToNote)
      setAllFilteredNotes(mapped)
      setSelectedNoteIds(new Set(mapped.map(n => String(n.id))))
      setSelectAllAcrossPages(true)
      showSuccess(`Todos os ${mapped.length} registros encontrados foram selecionados.`)
    } catch (err) {
      console.error('[RoutesByNotesPage] Erro ao selecionar todos os registros:', err)
      showError('Não foi possível selecionar todos os registros. Tente novamente.')
    } finally {
      setSelectingAll(false)
    }
  }

  const handleClearSelection = () => {
    setSelectedNoteIds(new Set())
    setSelectAllAcrossPages(false)
    setAllFilteredNotes([])
    setIsExportSelectionMode(false)
  }

  const handleExport = () => {
    setIsExportSelectionMode(true)
  }

  const handleExportSelected = () => {
    if (selectedNoteIds.size === 0) return
    setIsExportModalOpen(true)
  }

  console.log('[RoutesByNotesPage] notesData:', notesData)

  return (
    <>
      <PageHeader
        title="Notas por Rota"
        page="routes-by-notes"
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar || (() => {})}
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        onLogout={onLogout}
      />

      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Toolbar */}
        <RoutesByNotesToolbar
          onExport={handleExport}
          onExportSelected={handleExportSelected}
          isSelectionMode={isExportSelectionMode}
          selectedCount={selectedNoteIds.size}
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setCurrentPage(1)
          }}
        />

        {/* Cancel Selection + Pagination row */}
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
                  Cancelar Exportação
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

        {/* Banner de seleção entre páginas (estilo Gmail) */}
        {isExportSelectionMode && (() => {
          const currentPageCount = notesData.length
          const allCurrentSelected = currentPageCount > 0 && notesData.every((n) => selectedNoteIds.has(String(n.id)))
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
          <SharedTable<NoteByRouteData>
            columns={columns}
            data={notesData}
            loading={loading}
            emptyMessage="Nenhuma nota fiscal encontrada."
            selectable={isExportSelectionMode}
            selectedIds={selectedNoteIds}
            onSelectRow={handleSelectNote}
            onSelectAll={handleSelectAllNotes}
          />
        </div>
      </div>

      {/* Export Modal */}
      <ExportRoutesByNotesModal
        isOpen={isExportModalOpen}
        onClose={() => {
          // Voltar: apenas fecha o modal, mantendo a seleção e o modo de exportação
          setIsExportModalOpen(false)
        }}
        onExported={() => {
          // Exportou com sucesso: encerra o fluxo de exportação
          setIsExportModalOpen(false)
          setIsExportSelectionMode(false)
          setSelectedNoteIds(new Set())
          setSelectAllAcrossPages(false)
          setAllFilteredNotes([])
        }}
        notes={
          selectAllAcrossPages
            ? allFilteredNotes
            : (selectedNoteIds.size > 0 ? notesData.filter(n => selectedNoteIds.has(String(n.id))) : notesData)
        }
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}