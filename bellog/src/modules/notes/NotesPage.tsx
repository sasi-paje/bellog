import { useState, useEffect } from 'react'
import { PageHeader, Pagination, Toggle } from '../../shared/components'
import { NotesTable } from './components/NotesTable'
import { NotesToolbar } from './components/NotesToolbar'
import { CreateNoteModal } from './components/CreateNoteModal'
import { NoteDetailModal } from './components/NoteDetailModal'
import { useFiscalInvoices } from '../../hooks/useFiscalInvoices'
import { InvoiceListItem } from '../../services/fiscal-invoice.service'

interface NotesPageProps {
  userName?: string
  userRole?: string
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
}

export const NotesPage = ({
  userName = 'Leon Kennedy',
  userRole = 'Usuário',
  isSidebarOpen = true,
  onToggleSidebar,
}: NotesPageProps) => {
  const {
    invoices,
    total,
    loading,
    error,
    fetchInvoices,
    createInvoice,
  } = useFiscalInvoices()

  const [showCancelledOnly, setShowCancelledOnly] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  // Calculate total pages
  const totalPages = Math.ceil(total / limit) || 1

  // Fetch invoices when filters change
  useEffect(() => {
    fetchInvoices({
      search: searchTerm || undefined,
      isActive: true,
      showCancelled: showCancelledOnly,
      page,
      limit,
    })
  }, [searchTerm, showCancelledOnly, page])

  // Create modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Detail modal state
  const [selectedNote, setSelectedNote] = useState<InvoiceListItem | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    setPage(1)
  }

  const handleAddNew = () => {
    setIsCreateModalOpen(true)
  }

  const handleRowClick = (note: InvoiceListItem) => {
    setSelectedNote(note)
    setIsDetailModalOpen(true)
  }

  const handleCreateSave = async (formData: any) => {
    try {
      await createInvoice(formData)
      setIsCreateModalOpen(false)
    } catch (err) {
      console.error('[NotesPage] Error creating note:', err)
    }
  }

  const handleDetailClose = () => {
    setIsDetailModalOpen(false)
    setSelectedNote(null)
  }

  return (
    <>
      {/* Page Header */}
      <PageHeader
        title="Notas"
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar || (() => {})}
        userName={userName}
        userRole={userRole}
      />

      {/* Main Content - Figma: padding 32px */}
      <div className="flex flex-col gap-4 p-8 flex-1 overflow-auto">
        {/* Toolbar */}
        <NotesToolbar
          onSearch={handleSearch}
          searchValue={searchTerm}
          onAddNew={handleAddNew}
        />

        {/* Toggle + Pagination - matching SupplierPage pattern */}
        <div className="flex items-center justify-between shrink-0 w-full">
          {/* Toggle Exibir Canceladas */}
          <Toggle
            label="Exibir canceladas"
            checked={showCancelledOnly}
            onChange={(checked) => {
              setShowCancelledOnly(checked)
              setPage(1)
            }}
          />

          {/* Pagination */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>

        {/* Table with overflow horizontal */}
        <div className="flex flex-1 flex-col w-full min-w-0 overflow-x-auto">
          <NotesTable
            data={invoices}
            loading={loading}
            onRowClick={handleRowClick}
          />
        </div>
      </div>

      {/* Create Note Modal */}
      <CreateNoteModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateSave}
        loading={loading}
      />

      {/* Note Detail Modal */}
      <NoteDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleDetailClose}
        note={selectedNote}
      />
    </>
  )
}
