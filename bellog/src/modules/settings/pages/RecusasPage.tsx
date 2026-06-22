import { useState, useEffect } from 'react'
import { PageHeader, Pagination, Toggle, useToast, ToastContainer } from '../../../shared/components'
import { RecusasTable } from '../components/RecusasTable'
import { MotivoModal, MotivoFormData } from '../components/MotivoModal'
import { RecusasToolbar, RecusasFilterData, EMPTY_RECUSAS_FILTERS } from '../components/RecusasToolbar'
import { useMotivos, MotivosData } from '../../../hooks/useMotivos'

interface RecusasPageProps {
  userName?: string
  userRole?: string
  onLogout?: () => void
  userEmail?: string
  onBack?: () => void
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
}

export const RecusasPage = ({
  userName = 'Leon Kennedy',
  userRole = 'Usuário',
  onLogout,
  userEmail,
  onBack,
  isSidebarOpen = true,
  onToggleSidebar,
}: RecusasPageProps) => {
  const { data: motivos, total, fetchData, fetchReasonTypes, fetchReasonCategories, create, update, toggleActive, reasonTypes, reasonCategories } = useMotivos()
  const { toasts, showSuccess, showError, removeToast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMotivo, setSelectedMotivo] = useState<MotivosData | null>(null)
  const [activeFilters, setActiveFilters] = useState<RecusasFilterData>(EMPTY_RECUSAS_FILTERS)
  const [isActing, setIsActing] = useState(false)
  const limit = 20
  const totalPages = Math.ceil(total / limit) || 1

  const refreshData = (overrideFilters?: RecusasFilterData) => {
    const f = overrideFilters ?? activeFilters
    fetchData({
      search: searchTerm || undefined,
      isActive: showInactive ? undefined : true,
      page,
      limit,
      idReasonType: f.tipoEntrega ? Number(f.tipoEntrega) : undefined,
      idReasonCategory: f.categoria ? Number(f.categoria) : undefined,
      ordenar: f.ordenar || undefined,
    })
  }

  useEffect(() => {
    refreshData()
  }, [searchTerm, showInactive, page, activeFilters])

  useEffect(() => {
    fetchReasonTypes()
    fetchReasonCategories()
  }, [])

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    setPage(1)
  }

  const handleFilter = (filters: RecusasFilterData) => {
    setActiveFilters(filters)
    setPage(1)
  }

  const handleAddNew = () => {
    setSelectedMotivo(null)
    setIsModalOpen(true)
  }

  const handleEdit = (motivo: MotivosData) => {
    setSelectedMotivo(motivo)
    setIsModalOpen(true)
  }

  const handleSaveMotivo = async (formData: MotivoFormData) => {
    const isEditing = Boolean(selectedMotivo)
    try {
      if (selectedMotivo) {
        await update(selectedMotivo.id, {
          name: formData.name,
          id_reason_type: formData.id_reason_type,
          id_reason_category: formData.id_reason_category,
          is_active: formData.is_active,
        })
      } else {
        await create({
          name: formData.name,
          id_reason_type: formData.id_reason_type,
          id_reason_category: formData.id_reason_category,
          is_active: formData.is_active,
        })
      }
      refreshData()
      showSuccess(isEditing ? 'Motivo atualizado com sucesso.' : 'Motivo criado com sucesso.')
    } catch (err) {
      console.error('[RecusasPage] Erro ao salvar motivo:', err)
      showError(isEditing ? 'Não foi possível atualizar o motivo.' : 'Não foi possível criar o motivo.')
      throw err
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    if (isActing) return
    setIsActing(true)
    try {
      await toggleActive(id, isActive)
      showSuccess(isActive ? 'Motivo ativado com sucesso.' : 'Motivo inativado com sucesso.')
      setIsModalOpen(false)
      setSelectedMotivo(null)
      refreshData()
    } catch (err) {
      console.error('[RecusasPage] Erro ao alterar status do motivo:', err)
      showError(isActive ? 'Não foi possível ativar o motivo.' : 'Não foi possível inativar o motivo.')
    } finally {
      setIsActing(false)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedMotivo(null)
  }

  return (
    <>
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader
        title="Motivos"
        breadcrumb="Configurações"
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar || (() => {})}
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        onLogout={onLogout}
      />

      <div className="flex flex-col gap-4 p-4 flex-1 min-h-0 overflow-hidden">
        <RecusasToolbar
          initialSearch={searchTerm}
          onSearch={handleSearch}
          onFilter={handleFilter}
          onBack={onBack}
          onAddNew={handleAddNew}
          reasonTypes={reasonTypes}
          reasonCategories={reasonCategories}
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
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>

        <div className="flex-1 min-h-0 overflow-auto w-full">
          <RecusasTable
            data={motivos}
            onToggleActive={handleToggleActive}
            onEdit={handleEdit}
          />
        </div>
      </div>

      <MotivoModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveMotivo}
        onToggleActive={selectedMotivo ? handleToggleActive : undefined}
        isActing={isActing}
        reasonTypes={reasonTypes}
        reasonCategories={reasonCategories}
        initialData={
          selectedMotivo
            ? {
                id: selectedMotivo.id,
                motivo: selectedMotivo.motivo,
                idReasonType: selectedMotivo.idReasonType,
                idReasonCategory: selectedMotivo.idReasonCategory,
                isActive: selectedMotivo.isActive,
                sortOrder: selectedMotivo.sortOrder,
              }
            : undefined
        }
      />
    </div>
    <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  )
}
