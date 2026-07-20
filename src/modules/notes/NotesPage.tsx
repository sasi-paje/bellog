import { useState, useEffect } from 'react'
import { PageHeader, Pagination, Toggle, AppIcon, useToast, ToastContainer } from '../../shared/components'
import { NotesTable } from './components/NotesTable'
import { NotesToolbar, NotesFilterValues, emptyNotesFilter } from './components/NotesToolbar'
import { CreateNoteModal, CreateNoteFormData } from './components/CreateNoteModal'
import { ImportNotesModal } from './components/ImportNotesModal'
import { ImportNotesMetadataModal, ImportMetadata } from './components/ImportNotesMetadataModal'
import { ExportNotesModal } from './components/ExportNotesModal'
import { NoteDetailsDrawer, NoteEditData } from './components/NoteDetailsDrawer'
import { InactivateConfirmModal } from '../settings/components/InactivateConfirmModal'
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
  const [pageSize, setPageSize] = useState(20)
  const limit = pageSize

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
  // Seleção de todos os registros dos filtros (todas as páginas)
  const [selectAllAcrossPages, setSelectAllAcrossPages] = useState(false)
  const [allFilteredNotes, setAllFilteredNotes] = useState<InvoiceListItem[]>([])
  const [selectingAll, setSelectingAll] = useState(false)

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState<InvoiceListItem | null>(null)

  // Modal de confirmação de ativação/inativação de nota
  const [confirmAction, setConfirmAction] = useState<'activate' | 'inactivate' | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isProcessingAction, setIsProcessingAction] = useState(false)

  const [deliveryLocations, setDeliveryLocations] = useState<CompanyOption[]>([])
  const [suppliers, setSuppliers] = useState<CompanyOption[]>([])
  const [supplierGroups, setSupplierGroups] = useState<CompanyOption[]>([])

  const totalPages = Math.ceil(total / limit) || 1

  // Monta os parâmetros de busca a partir do estado atual (busca, toggle de
  // inativos, filtros e página). Reutilizado no efeito de listagem e no reload
  // após ativar/inativar uma nota, garantindo que o filtro do toggle seja
  // respeitado (ex.: nota recém-inativada some quando "Exibir inativos" off).
  const buildFetchParams = () => {
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

    return {
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
    }
  }

  useEffect(() => {
    fetchInvoices(buildFetchParams())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, showInactive, appliedFilters, page, pageSize])

  // Reseta a seleção quando os filtros/busca mudam (não ao paginar), pois o
  // conjunto de registros muda. Trocar de página mantém a seleção.
  useEffect(() => {
    setSelectedNoteIds(new Set())
    setSelectAllAcrossPages(false)
    setAllFilteredNotes([])
  }, [searchTerm, showInactive, appliedFilters])

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
    // Qualquer alteração individual desfaz o estado "todos os filtros"
    setSelectAllAcrossPages(false)
    setSelectedNoteIds((prev) => {
      const next = new Set(prev)
      if (selected) next.add(id)
      else next.delete(id)
      return next
    })
  }

  // Checkbox do cabeçalho: seleciona apenas os registros da página atual
  const handleSelectAllNotes = (selected: boolean) => {
    setSelectAllAcrossPages(false)
    setSelectedNoteIds(selected ? new Set(invoices.map((n) => String(n.id))) : new Set())
  }

  // Seleciona todos os registros retornados pelos filtros (todas as páginas)
  const handleSelectAllAcrossPages = async () => {
    setSelectingAll(true)
    try {
      const result = await fiscalInvoiceService.list({ ...buildFetchParams(), page: 1, limit: total || 10000 })
      setAllFilteredNotes(result.data)
      setSelectedNoteIds(new Set(result.data.map((n) => String(n.id))))
      setSelectAllAcrossPages(true)
      showSuccess(`Todos os ${result.data.length} registros encontrados foram selecionados.`)
    } catch (err) {
      console.error('[NotesPage] Erro ao selecionar todos os registros:', err)
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
    fetchInvoices(buildFetchParams())
  }

  // Abre o modal de confirmação de inativação/ativação da nota selecionada.
  // Antes de inativar, valida a regra de negócio (nota atribuída a rota ativa
  // não pode ser inativada) — fail-closed via canInactivateInvoice.
  const handleInactivateNote = async () => {
    if (!selectedNote) return
    try {
      const { canInactivate, reason } = await fiscalInvoiceService.canInactivateInvoice(selectedNote.id)
      if (!canInactivate) {
        showError(reason || 'Esta nota não pode ser inativada.')
        return
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Não foi possível validar a inativação da nota.')
      return
    }
    setConfirmAction('inactivate')
    setIsConfirmOpen(true)
  }

  const handleActivateNote = () => {
    if (!selectedNote) return
    setConfirmAction('activate')
    setIsConfirmOpen(true)
  }

  // Executa ativação/inativação após confirmação
  const handleConfirmNoteAction = async () => {
    if (!selectedNote || !confirmAction) return
    const activating = confirmAction === 'activate'
    setIsProcessingAction(true)
    try {
      await fiscalInvoiceService.setActive(selectedNote.id, activating)
      setIsConfirmOpen(false)
      setConfirmAction(null)
      handleCloseDrawer()
      showSuccess(activating ? 'Nota ativada com sucesso' : 'Nota inativada com sucesso')
      fetchInvoices(buildFetchParams())
    } catch (err) {
      console.error('[NotesPage] Error updating note active state:', err)
      showError(err instanceof Error ? err.message : `Erro ao ${activating ? 'ativar' : 'inativar'} nota`)
    } finally {
      setIsProcessingAction(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Notas"
        page="notes"
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
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />

        <div className="flex items-center justify-between shrink-0 w-full">
          <div className="flex items-center gap-4">
            <Toggle
              label="Exibir inativos"
              checked={showInactive}
              onChange={(checked) => {
                setShowInactive(checked)
                setPage(1)
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
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>

        {/* Banner de seleção entre páginas (estilo Gmail) */}
        {isExportSelectionMode && (() => {
          const currentPageCount = invoices.length
          const allCurrentSelected = currentPageCount > 0 && invoices.every((n) => selectedNoteIds.has(String(n.id)))
          const hasMore = total > currentPageCount

          // Quando todos os registros dos filtros já estão selecionados, a faixa
          // some — o botão "Cancelar Seleção" (ao lado do toggle) já cobre isso.
          if (allCurrentSelected && hasMore && !selectAllAcrossPages) {
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
          }

          return null
        })()}

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
        onInactivate={handleInactivateNote}
        onActivate={handleActivateNote}
        deliveryLocations={deliveryLocations}
        suppliers={suppliers}
      />

      {/* Modal de confirmação de ativação/inativação de nota */}
      <InactivateConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false)
          setConfirmAction(null)
        }}
        onConfirm={handleConfirmNoteAction}
        isLoading={isProcessingAction}
        companyName={selectedNote?.invoice_number || ''}
        action={confirmAction ?? 'inactivate'}
        entityLabel="Nota"
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
          isExportSelectionMode
            ? (selectAllAcrossPages
                ? allFilteredNotes
                : invoices.filter((n) => selectedNoteIds.has(String(n.id))))
            : invoices
        }
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}
