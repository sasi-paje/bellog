import { useState, useEffect } from 'react'
import { PageHeader, Pagination, Toggle, useToast, ToastContainer } from '../../shared/components'
import { NotesTable } from './components/NotesTable'
import { NotesToolbar, NotesFilterValues, emptyNotesFilter } from './components/NotesToolbar'
import { CreateNoteModal, CreateNoteFormData } from './components/CreateNoteModal'
import { ImportNotesModal } from './components/ImportNotesModal'
import { ImportNotesMetadataModal, ImportMetadata } from './components/ImportNotesMetadataModal'
import { ExportNotesModal } from './components/ExportNotesModal'
import { NoteDetailsDrawer, NoteEditData } from './components/NoteDetailsDrawer'
import { useFiscalInvoices } from '../../hooks/useFiscalInvoices'
import { InvoiceListItem, fiscalInvoiceService } from '../../features/notes'
import { xmlImportService } from '../../features/xml-import'
import { companyService, CompanyOption } from '../../features/companies'

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
  const { invoices, total, loading, fetchInvoices } = useFiscalInvoices()
  const { showSuccess, showError, toasts, removeToast } = useToast()

  const [showInactive, setShowInactive] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [appliedFilters, setAppliedFilters] = useState<NotesFilterValues>(emptyNotesFilter())
  const [page, setPage] = useState(1)
  const limit = 20

  type ImportStep = 'metadata' | 'upload'

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importStep, setImportStep] = useState<ImportStep>('metadata')
  const [importMetadata, setImportMetadata] = useState<ImportMetadata>({
    supplierGroupId: '',
    tripNumber: '',
    arrivalDate: '',
  })
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  const [isExportSelectionMode, setIsExportSelectionMode] = useState(false)
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set())

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState<InvoiceListItem | null>(null)

  const [deliveryLocations, setDeliveryLocations] = useState<CompanyOption[]>([])
  const [suppliers, setSuppliers] = useState<CompanyOption[]>([])
  const [supplierGroups, setSupplierGroups] = useState<CompanyOption[]>([])

  const totalPages = Math.ceil(total / limit) || 1

  useEffect(() => {
    const parseWeight = (v: string) => {
      if (!v.trim()) return undefined
      const n = parseFloat(v.replace(',', '.'))
      return isNaN(n) ? undefined : Math.round(n * 100) / 100
    }
    const parseNum = (v: string) => {
      if (!v.trim()) return undefined
      const n = Number(v)
      return isNaN(n) ? undefined : n
    }

    fetchInvoices({
      search: searchTerm || undefined,
      showInactive,
      supplierGroupIds: appliedFilters.supplierGroupIds.length > 0 ? appliedFilters.supplierGroupIds : undefined,
      supplierIds: appliedFilters.supplierIds.length > 0 ? appliedFilters.supplierIds : undefined,
      destinationIds: appliedFilters.destinationIds.length > 0 ? appliedFilters.destinationIds : undefined,
      invoiceNumberStart: parseNum(appliedFilters.invoiceNumberStart),
      invoiceNumberEnd: parseNum(appliedFilters.invoiceNumberEnd),
      tripNumber: appliedFilters.tripNumber.trim() || undefined,
      attemptMin: parseNum(appliedFilters.attemptMin),
      attemptMax: parseNum(appliedFilters.attemptMax),
      boxMin: parseNum(appliedFilters.boxMin),
      boxMax: parseNum(appliedFilters.boxMax),
      grossWeightMin: parseWeight(appliedFilters.grossWeightMin),
      grossWeightMax: parseWeight(appliedFilters.grossWeightMax),
      page,
      limit,
    })
  }, [searchTerm, showInactive, appliedFilters, page])

  useEffect(() => {
    Promise.all([
      companyService.listDeliveryLocations(),
      companyService.listSuppliersByRole(),
      companyService.listGroups('supplier'),
    ])
      .then(([locations, supps, groups]) => {
        setDeliveryLocations(locations)
        setSuppliers(supps)
        setSupplierGroups(groups.map(g => ({ value: String(g.id), label: g.name || '-' })))
      })
      .catch(console.error)
  }, [])

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    setPage(1)
  }

  const handleApplyFilters = (filters: NotesFilterValues) => {
    setAppliedFilters(filters)
    setPage(1)
  }

  const handleClearFilters = () => {
    setAppliedFilters(emptyNotesFilter())
    setPage(1)
  }

  const handleSelectNote = (id: string, selected: boolean) => {
    setSelectedNoteIds((prev) => {
      const next = new Set(prev)
      if (selected) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const handleSelectAllNotes = (selected: boolean) => {
    setSelectedNoteIds(selected ? new Set(invoices.map((n) => String(n.id))) : new Set())
  }

  const handleClearSelection = () => {
    setSelectedNoteIds(new Set())
    setIsExportSelectionMode(false)
  }

  const handleExportSelected = () => {
    if (selectedNoteIds.size === 0) return
    setIsExportModalOpen(true)
  }

  const handleImportModalClose = () => {
    setIsImportModalOpen(false)
    setImportStep('metadata')
    setImportMetadata({ supplierGroupId: '', tripNumber: '', arrivalDate: '' })
  }

  const handleCreateNote = async (data: CreateNoteFormData) => {
    setCreating(true)
    try {
      await fiscalInvoiceService.createFromForm({
        invoice_number: data.invoice_number,
        box_quantity: data.volume,
        id_customer_company: data.id_customer_company,
        id_supplier_company: data.id_supplier_company,
        attempt_number: data.attempt_number,
        net_weight: data.net_weight,
        gross_weight: data.gross_weight,
        invoice_amount: data.invoice_amount,
      })
      setIsCreateModalOpen(false)
      fetchInvoices({ page, limit })
    } catch (err) {
      console.error('[NotesPage] Error creating note:', err)
    } finally {
      setCreating(false)
    }
  }

  const handleRowClick = (note: InvoiceListItem) => {
    setSelectedNote(note)
    setIsDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setSelectedNote(null)
  }

  const handleSaveNote = async (data: NoteEditData) => {
    if (!selectedNote) return
    await fiscalInvoiceService.update(selectedNote.id, {
      invoice_number: data.invoice_number,
      box_quantity: data.volume,
      id_supplier_company: data.id_supplier_company || null,
      id_customer_company: data.id_customer_company || null,
      invoice_amount: data.value,
      gross_weight: data.gross_weight,
      net_weight: data.weight,
      // attempt_number não existe em trx_fiscal_invoice — fica em rel_route_invoice
    })
    setSelectedNote((prev) =>
      prev
        ? {
            ...prev,
            invoice_number: data.invoice_number,
            volume: data.volume,
            weight: data.weight,
            gross_weight: data.gross_weight,
            value: data.value,
            attempt_number: data.attempt_number,
            tripNumber: data.tripNumber,
            destination_name: data.destination_name,
            supplier_name: data.supplier_name,
            id_customer_company: data.id_customer_company,
            id_supplier_company: data.id_supplier_company,
          }
        : null
    )
    fetchInvoices({ page, limit })
  }

  return (
    <>
      <PageHeader
        title="Notas"
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar || (() => {})}
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        onLogout={onLogout}
      />

      {creating && (
        <div className="fixed inset-0 bg-white/80 z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: '#e67c26', borderTopColor: 'transparent' }}
            />
            <span
              className="text-[16px] font-semibold"
              style={{ color: '#1e558b', fontFamily: 'Inter, sans-serif' }}
            >
              Processando...
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0 flex-col gap-3 overflow-hidden p-4">
        <NotesToolbar
          onSearch={handleSearch}
          searchValue={searchTerm}
          supplierGroups={supplierGroups.map(g => ({ value: String(g.value), label: g.label }))}
          suppliers={suppliers.map(s => ({ value: String(s.value), label: s.label }))}
          destinations={deliveryLocations.map(d => ({ value: String(d.value), label: d.label }))}
          appliedFilters={appliedFilters}
          onApplyFilters={handleApplyFilters}
          onClearFilters={handleClearFilters}
          onAddNew={() => setIsCreateModalOpen(true)}
          onImport={() => {
            setImportMetadata({ supplierGroupId: '', tripNumber: '', arrivalDate: '' })
            setImportStep('metadata')
            setIsImportModalOpen(true)
          }}
          onExport={() => setIsExportSelectionMode(true)}
          onExportSelected={handleExportSelected}
          loading={creating}
          isSelectionMode={isExportSelectionMode}
          selectedCount={selectedNoteIds.size}
        />

        <div className="flex items-center justify-between shrink-0 w-full">
          <Toggle
            label="Exibir inativos"
            checked={showInactive}
            onChange={(checked) => {
              setShowInactive(checked)
              setPage(1)
            }}
          />
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>

        <div className="flex-1 min-h-0 overflow-auto rounded-md border border-[#E5E7EB]">
          <NotesTable
            data={invoices}
            loading={loading}
            onRowClick={handleRowClick}
            selectable={isExportSelectionMode}
            selectedIds={selectedNoteIds}
            onSelectRow={handleSelectNote}
            onSelectAll={handleSelectAllNotes}
          />
        </div>
      </div>

      <NoteDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        note={selectedNote}
        mode="editable"
        onSave={handleSaveNote}
        onInactivate={() => {}}
        onActivate={() => {}}
        deliveryLocations={deliveryLocations}
        suppliers={suppliers}
      />

      <CreateNoteModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateNote}
        loading={creating}
      />

      {isImportModalOpen && importStep === 'metadata' && (
        <ImportNotesMetadataModal
          values={importMetadata}
          onChange={setImportMetadata}
          onClose={handleImportModalClose}
          onContinue={() => setImportStep('upload')}
        />
      )}

      {isImportModalOpen && importStep === 'upload' && (
        <ImportNotesModal
          isOpen={true}
          onClose={handleImportModalClose}
          onBack={() => setImportStep('metadata')}
          loading={creating}
          metadata={importMetadata}
          onImport={async (files) => {
            setCreating(true)
            try {
              const result = await xmlImportService.importFromXml(files, importMetadata)
              setIsImportModalOpen(false)
              setImportStep('metadata')
              setImportMetadata({ supplierGroupId: '', tripNumber: '', arrivalDate: '' })
              fetchInvoices({ page, limit })
              if (result.success === 0) {
                showError('Nenhuma nota foi importada. Verifique os arquivos.')
              } else if (result.failed > 0) {
                showSuccess(
                  `${result.success} nota(s) importada(s). ${result.failed} arquivo(s) não pôde ser processado.`
                )
              } else {
                showSuccess(`${result.success} nota(s) importada(s) com sucesso!`)
              }
            } catch (error: any) {
              console.error('[NotesPage] Import error:', error)
              if (error?.message?.includes('lote de importação')) {
                showError('Erro ao criar lote de importação. Tente novamente.')
              } else {
                showError('Erro ao importar. Verifique os arquivos e tente novamente.')
              }
            } finally {
              setCreating(false)
            }
          }}
        />
      )}

      <ExportNotesModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        notes={
          isExportSelectionMode
            ? invoices.filter((n) => selectedNoteIds.has(String(n.id)))
            : invoices
        }
      />

      {isExportSelectionMode && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
          <button
            type="button"
            onClick={handleClearSelection}
            className="flex items-center justify-center px-6 py-3 bg-white border border-[#e67c26] rounded-[5px] shadow-lg"
            style={{ minWidth: '200px' }}
          >
            <span
              className="font-bold text-[14px]"
              style={{ fontFamily: 'Inter, sans-serif', color: '#e67c26' }}
            >
              Cancelar Seleção ({selectedNoteIds.size})
            </span>
          </button>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}
