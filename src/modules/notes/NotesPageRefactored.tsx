import { useState, useCallback, useEffect, useMemo } from 'react'
import { PageHeader, Pagination, Drawer, TabId, AppIcon, FormDropdown, Toast } from '../../../shared/components'
import { NotesTable } from '../components/NotesTable'
import { NotesToolbar } from '../components/NotesToolbar'
import { CreateNoteModal, CreateNoteFormData } from '../components/CreateNoteModal'
import { ImportNotesModal } from '../components/ImportNotesModal'
import { ExportNotesModal } from '../components/ExportNotesModal'
import { ErrorBoundary } from '../presentation/components/ErrorBoundary'
import { useInvoices, useInvoiceSearch, useInvoiceMutations, useInvoiceDetail } from '../presentation/hooks/useInvoices'
import { useDebouncedSearch } from '../presentation/hooks/useDebouncedSearch'
import { useInvoiceExport } from '../presentation/hooks/useInvoiceExport'
import { InvoiceViewModel, CreateInvoiceProps } from '../domain/entities/Invoice'
import { ListInvoicesFilter } from '../schemas/invoice.validation'

const PRIMARY_DARK = '#0f3255'
const TEXT_LIGHT75 = '#2a2a2a'
const TEXT_LIGHT25 = '#919191'
const BLUE = '#4077d9'
const RED = '#eb5757'
const ORANGE = '#e67c26'
const BORDER_COLOR = '#e0e0e0'

const TABS = [
  { id: 'dados-nota' as TabId, label: 'Dados de Nota' },
  { id: 'anexos' as TabId, label: 'Anexos' },
]

const formatCurrency = (value?: number) => {
  if (!value && value !== 0) return '-'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const ViewField = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-2">
    <p className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT75 }}>
      {label}
    </p>
    <div
      className="h-[45px] flex items-center px-4 py-3 rounded-[5px] w-full"
      style={{ backgroundColor: '#fff', border: `1px solid ${BORDER_COLOR}` }}
    >
      <span className="font-normal text-[14px] w-full" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT75, lineHeight: '24px' }}>
        {value || '-'}
      </span>
    </div>
  </div>
)

const EditField = ({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) => (
  <div className="flex flex-col gap-2">
    <p className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT75 }}>
      {label}
    </p>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-[45px] flex items-center px-4 py-3 rounded-[5px] w-full bg-white"
      style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT75, lineHeight: '24px', border: `1px solid ${BORDER_COLOR}` }}
    />
  </div>
)

interface NotesPageProps {
  userName?: string
  userRole?: string
  onLogout?: () => void
  userEmail?: string
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
}

export const NotesPage = ({
  userName = 'Leon Kennedy',
  userRole = 'Usuário',
  onLogout,
  userEmail,
  isSidebarOpen = true,
  onToggleSidebar,
}: NotesPageProps) => {
  const [filters, setFilters] = useState<ListInvoicesFilter>({
    page: 1,
    limit: 20,
    search: undefined,
    status: undefined,
    supplierId: undefined,
    destinationId: undefined,
    onlyWithRoute: undefined,
    includeCancelled: false,
  })

  const [showCancelledOnly, setShowCancelledOnly] = useState(false)
  const [page, setPage] = useState(1)

  const {
    invoices,
    total,
    isLoading,
    isFetching,
    pagination,
    refresh,
  } = useInvoices({
    filters: {
      ...filters,
      page,
      includeCancelled: showCancelledOnly,
      status: showCancelledOnly ? 'CANCELLED' : undefined,
    },
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      setPage(1)
      setFilters(prev => ({ ...prev, search: debouncedSearch || undefined }))
    }
  }, [debouncedSearch])

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  const [isExportSelectionMode, setIsExportSelectionMode] = useState(false)
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set())

  const { createInvoice, updateInvoice, isCreating, isUpdating } = useInvoiceMutations()

  const [deliveryLocations, setDeliveryLocations] = useState<{ value: string; label: string }[]>([])
  const [suppliers, setSuppliers] = useState<{ value: string; label: string }[]>([])

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const { companyService } = await import('../../../features/companies')
        const [locations, supps] = await Promise.all([
          companyService.listDeliveryLocations(),
          companyService.listSuppliersByRole(),
        ])
        setDeliveryLocations(locations)
        setSuppliers(supps)
      } catch (err) {
        console.error('[NotesPage] Error loading companies:', err)
      }
    }
    loadCompanies()
  }, [])

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceViewModel | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('dados-nota')
  const [isEditing, setIsEditing] = useState(false)

  const [editData, setEditData] = useState({
    invoice_number: '',
    box_quantity: 0,
    destination_name: '',
    supplier_name: '',
    tripNumber: '',
    attempt_number: 0,
    net_weight: 0,
    gross_weight: 0,
    invoice_amount: 0,
    id_customer_company: '',
    id_supplier_company: '',
  })

  const handleSelectNote = useCallback((id: string, selected: boolean) => {
    setSelectedNoteIds(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(id)
      } else {
        newSet.delete(id)
      }
      return newSet
    })
  }, [])

  const handleSelectAllNotes = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedNoteIds(new Set(invoices.map(n => n.id)))
    } else {
      setSelectedNoteIds(new Set())
    }
  }, [invoices])

  const handleClearSelection = useCallback(() => {
    setSelectedNoteIds(new Set())
    setIsExportSelectionMode(false)
  }, [])

  const handleExport = useCallback(() => {
    setIsExportSelectionMode(true)
  }, [])

  const handleExportSelected = useCallback(() => {
    if (selectedNoteIds.size === 0) return
    setIsExportModalOpen(true)
  }, [selectedNoteIds])

  const handleImportModalClose = useCallback(() => {
    setIsImportModalOpen(false)
  }, [])

  const handleImportFile = useCallback(async (file: File) => {
    setCreating(true)
    try {
      const { xmlImportService } = await import('../../../features/xml-import')
      const result = await xmlImportService.importFromXml([file])
      setIsImportModalOpen(false)
      refresh()
      alert(`Importação concluída! ${result.success} nota(s) importada(s), ${result.failed} falha(s).`)
    } catch (error) {
      console.error('[NotesPage] Import error:', error)
      alert('Erro ao importar arquivo. Verifique o formato do XML.')
    } finally {
      setCreating(false)
    }
  }, [refresh])

  const handleCreateNote = useCallback(async (data: CreateNoteFormData) => {
    setCreating(true)
    try {
      createInvoice({
        invoice_number: data.invoice_number,
        id_supplier_company: data.id_supplier_company,
        id_customer_company: data.id_customer_company,
        box_quantity: data.volume,
        net_weight: data.net_weight,
        gross_weight: data.gross_weight,
        invoice_amount: data.invoice_amount,
        attempt_number: data.attempt_number,
      } as any)
      setIsCreateModalOpen(false)
      refresh()
    } catch (err) {
      console.error('[NotesPage] Error creating note:', err)
    } finally {
      setCreating(false)
    }
  }, [createInvoice, refresh])

  const handleRowClick = useCallback((note: InvoiceViewModel) => {
    setSelectedInvoice(note)
    setIsDrawerOpen(true)
    setActiveTab('dados-nota')
    setIsEditing(false)
  }, [])

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false)
    setSelectedInvoice(null)
    setActiveTab('dados-nota')
    setIsEditing(false)
  }, [])

  const handleEditClick = useCallback(() => {
    if (selectedInvoice) {
      setEditData({
        invoice_number: selectedInvoice.invoice_number || '',
        box_quantity: selectedInvoice.box_quantity || 0,
        destination_name: selectedInvoice.destination_trade_name || '',
        supplier_name: selectedInvoice.supplier_trade_name || '',
        tripNumber: selectedInvoice.tripNumber || '-',
        attempt_number: selectedInvoice.attempt_number || 0,
        net_weight: selectedInvoice.net_weight || 0,
        gross_weight: selectedInvoice.gross_weight || 0,
        invoice_amount: selectedInvoice.invoice_amount || 0,
        id_customer_company: selectedInvoice.destination_id || '',
        id_supplier_company: selectedInvoice.supplier_id || '',
      })
      setIsEditing(true)
    }
  }, [selectedInvoice])

  const handleSaveEdit = useCallback(async () => {
    if (!selectedInvoice) return

    setCreating(true)
    try {
      updateInvoice({
        id: selectedInvoice.id,
        data: {
          invoice_number: editData.invoice_number,
          box_quantity: editData.box_quantity,
          net_weight: editData.net_weight,
          gross_weight: editData.gross_weight,
          attempt_number: editData.attempt_number,
        },
      } as any)

      setIsEditing(false)
      refresh()
    } catch (err) {
      console.error('[NotesPage] Error saving:', err)
    } finally {
      setCreating(false)
    }
  }, [selectedInvoice, editData, updateInvoice, refresh])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
  }, [])

  const renderTabContent = () => {
    if (!selectedInvoice) return null

    if (activeTab === 'dados-nota') {
      if (isEditing) {
        return (
          <div className="flex flex-col gap-4 w-full">
            <EditField label="Número da nota" value={editData.invoice_number} onChange={(v) => setEditData({ ...editData, invoice_number: v })} />
            <EditField label="Quantidade de Caixas" value={String(editData.box_quantity)} onChange={(v) => setEditData({ ...editData, box_quantity: Number(v) })} type="number" />

            <div className="flex gap-4">
              <div className="flex-1">
                <FormDropdown
                  label="Local da entrega"
                  value={editData.id_customer_company}
                  options={deliveryLocations.map(loc => ({ value: loc.value, label: loc.label }))}
                  onChange={(v) => {
                    const selected = deliveryLocations.find(loc => loc.value === v)
                    setEditData({
                      ...editData,
                      destination_name: selected?.label || v,
                      id_customer_company: v,
                    })
                  }}
                />
              </div>
              <div className="flex-1">
                <FormDropdown
                  label="Fornecedor"
                  value={editData.id_supplier_company}
                  options={suppliers.map(sup => ({ value: sup.value, label: sup.label }))}
                  onChange={(v) => {
                    const selected = suppliers.find(sup => sup.value === v)
                    setEditData({
                      ...editData,
                      supplier_name: selected?.label || v,
                      id_supplier_company: v,
                    })
                  }}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <ViewField label="Nº Viagem" value={editData.tripNumber || '-'} />
              </div>
              <div className="flex-1">
                <EditField label="Nº Tentativa" value={String(editData.attempt_number)} onChange={(v) => setEditData({ ...editData, attempt_number: Number(v) })} type="number" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-[20px]" style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}>
                Peso do Produto
              </h3>
              <div className="flex gap-4">
                <div className="flex-1">
                  <EditField label="Peso Líquido" value={String(editData.net_weight)} onChange={(v) => setEditData({ ...editData, net_weight: Number(v) })} type="number" />
                </div>
                <div className="flex-1">
                  <EditField label="Peso Bruto" value={String(editData.gross_weight)} onChange={(v) => setEditData({ ...editData, gross_weight: Number(v) })} type="number" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="font-semibold text-[20px]" style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}>
                Valor
              </h3>
              <EditField label="Valor da Nota" value={String(editData.invoice_amount)} onChange={(v) => setEditData({ ...editData, invoice_amount: Number(v) })} type="number" />
            </div>
          </div>
        )
      }

      return (
        <div className="flex flex-col gap-4 w-full">
          <ViewField label="Número da nota" value={selectedInvoice.invoice_number || '-'} />
          <ViewField label="Quantidade de Caixas" value={String(selectedInvoice.box_quantity || 0)} />

          <div className="flex gap-4">
            <div className="flex-1">
              <ViewField label="Local da entrega" value={selectedInvoice.destination_trade_name || '-'} />
            </div>
            <div className="flex-1">
              <ViewField label="Fornecedor" value={selectedInvoice.supplier_trade_name || '-'} />
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <ViewField label="Nº Viagem" value={selectedInvoice.tripNumber || '-'} />
            </div>
            <div className="flex-1">
              <ViewField label="Nº Tentativa" value={String(selectedInvoice.attempt_number || 0)} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-[20px]" style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}>
              Peso do Produto
            </h3>
            <div className="flex gap-4">
              <div className="flex-1">
                <ViewField label="Peso Líquido" value={`${(selectedInvoice.net_weight || 0).toFixed(1)} kg`} />
              </div>
              <div className="flex-1">
                <ViewField label="Peso Bruto" value={`${(selectedInvoice.gross_weight || 0).toFixed(1)} kg`} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="font-semibold text-[20px]" style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}>
              Valor
            </h3>
            <ViewField label="Valor da Nota" value={formatCurrency(selectedInvoice.invoice_amount)} />
          </div>
        </div>
      )
    }

    if (activeTab === 'anexos') {
      return (
        <div className="flex flex-col gap-4 w-full">
          <p className="font-medium text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT25 }}>
            Nenhum anexo disponível.
          </p>
        </div>
      )
    }

    return null
  }

  const renderFooter = () => {
    if (isEditing) {
      return (
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={handleCancelEdit}
            className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] border border-[#e67c26] bg-white w-[150px]"
          >
            <span className="font-bold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: ORANGE }}>
              Cancelar
            </span>
          </button>
          <button
            type="button"
            onClick={handleSaveEdit}
            disabled={creating || isUpdating}
            className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] bg-[#e67c26] w-[150px]"
          >
            <span className="font-bold text-[14px] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
              {creating || isUpdating ? 'Salvando...' : 'Salvar'}
            </span>
          </button>
        </div>
      )
    }

    return (
      <div className="flex items-center justify-between w-full">
        <button
          type="button"
          onClick={() => { }}
          className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] bg-[#eb5757] w-[150px]"
        >
          <span className="font-bold text-[14px] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
            Inativar
          </span>
        </button>
        <button
          type="button"
          onClick={handleEditClick}
          disabled={!selectedInvoice?.can_edit}
          className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] bg-[#e67c26] w-[150px]"
        >
          <span className="font-bold text-[14px] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
            Editar
          </span>
        </button>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <PageHeader
        title="Notas"
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar || (() => { })}
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        onLogout={onLogout}
      />

      {(creating || isCreating || isUpdating) && (
        <div className="fixed inset-0 bg-white/80 z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#e67c26', borderTopColor: 'transparent' }} />
            <span className="text-[16px] font-semibold" style={{ color: '#1e558b', fontFamily: 'Inter, sans-serif' }}>
              Processando...
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 p-4 flex-1 overflow-auto">
        <NotesToolbar
          onSearch={(term) => setSearchTerm(term)}
          searchValue={searchTerm}
          onAddNew={() => setIsCreateModalOpen(true)}
          onImport={() => setIsImportModalOpen(true)}
          onExport={handleExport}
          onExportSelected={handleExportSelected}
          onToggleCancelled={(show) => {
            setShowCancelledOnly(show)
            setPage(1)
          }}
          showCancelled={showCancelledOnly}
          loading={creating || isCreating || isUpdating}
          isSelectionMode={isExportSelectionMode}
          selectedCount={selectedNoteIds.size}
        />

        <div className="flex items-center justify-end">
          <Pagination
            currentPage={page}
            totalPages={Math.ceil(total / 20) || 1}
            onPageChange={setPage}
          />
        </div>

        <div className="flex flex-1 flex-col w-full min-w-0">
          <NotesTable
            data={invoices}
            loading={isLoading || isFetching}
            onRowClick={handleRowClick}
            selectable={isExportSelectionMode}
            selectedIds={selectedNoteIds}
            onSelectRow={handleSelectNote}
            onSelectAll={handleSelectAllNotes}
          />
        </div>
      </div>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title={`Nota ${selectedInvoice?.invoice_number || ''}`}
        icon="contract"
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        footerContent={renderFooter()}
      >
        {renderTabContent()}
      </Drawer>

      <CreateNoteModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateNote}
        loading={creating || isCreating}
      />

      <ImportNotesModal
        isOpen={isImportModalOpen}
        onClose={handleImportModalClose}
        loading={creating}
        onImport={handleImportFile}
      />

      <ExportNotesModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        notes={isExportSelectionMode ? invoices.filter(n => selectedNoteIds.has(n.id)) : invoices}
      />

      {isExportSelectionMode && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <button
            type="button"
            onClick={handleClearSelection}
            className="flex items-center justify-center px-6 py-3 bg-white border border-[#e67c26] rounded-[5px] shadow-lg"
            style={{ minWidth: '200px' }}
          >
            <span className="font-bold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: '#e67c26' }}>
              Cancelar Seleção ({selectedNoteIds.size})
            </span>
          </button>
        </div>
      )}
    </ErrorBoundary>
  )
}
