import { useState, useEffect } from 'react'
import { PageHeader, Pagination, Toggle } from '../../../shared/components'
import { useToast, ToastContainer } from '../../../shared/components/Toast'
import { DestinosTable } from '../components/DestinosTable'
import { CompanyDrawer } from '../components/CompanyDrawer'
import { InactivateConfirmModal } from '../components/InactivateConfirmModal'
import { DestinosToolbar, DestinosFilterData, EMPTY_DESTINOS_FILTERS } from '../components/DestinosToolbar'
import { useDestinations } from '../../../hooks/useDestinations'
import { companyService, CompanyWithAddress, CompanyFormData } from '../../../features/companies'

interface DestinosPageProps {
  userName?: string
  userRole?: string
  onLogout?: () => void
  userEmail?: string
  onBack?: () => void
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
}

export const DestinosPage = ({
  userName = 'Leon Kennedy',
  userRole = 'Usuário',
  onLogout,
  userEmail,
  onBack,
  isSidebarOpen = true,
  onToggleSidebar,
}: DestinosPageProps) => {
  const {
    destinations,
    total,
    loading,
    fetchDestinations,
    getDestinationById,
    createDestination,
    updateDestination,
    toggleActive,
    groups,
    fetchGroups,
  } = useDestinations()

  const { toasts, showSuccess, showError, removeToast } = useToast()

  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [page, setPage] = useState(1)
  const [activeFilters, setActiveFilters] = useState<DestinosFilterData>(EMPTY_DESTINOS_FILTERS)
  const limit = 20

  const totalPages = Math.ceil(total / limit) || 1

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithAddress | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isNew, setIsNew] = useState(false)

  // Confirm modal state (shared for activate and inactivate)
  const [pendingAction, setPendingAction] = useState<'activate' | 'inactivate' | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  const refreshList = () =>
    fetchDestinations({
      search: searchTerm || undefined,
      isActive: showInactive ? undefined : true,
      page,
      limit,
      groupId: activeFilters.groupId ? Number(activeFilters.groupId) : undefined,
      cnpj: activeFilters.cnpj || undefined,
      zipCode: activeFilters.zipCode || undefined,
      street: activeFilters.street || undefined,
      district: activeFilters.district || undefined,
    })

  useEffect(() => {
    refreshList()
  }, [searchTerm, showInactive, page, activeFilters])

  useEffect(() => {
    fetchGroups()
  }, [])

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    setPage(1)
  }

  const handleFilter = (filters: DestinosFilterData) => {
    setActiveFilters(filters)
    setPage(1)
  }

  const handleAddNew = () => {
    setSelectedCompany(null)
    setIsNew(true)
    setIsEditing(true)
    setIsDrawerOpen(true)
  }

  const handleRowClick = async (company: CompanyWithAddress) => {
    const fullCompany = await getDestinationById(company.id)
    setSelectedCompany(fullCompany)
    setIsNew(false)
    setIsEditing(false)
    setIsDrawerOpen(true)
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = async (formData: CompanyFormData) => {
    const isEditingMode = !isNew && Boolean(selectedCompany)
    if (isNew) {
      await createDestination(formData)
    } else if (selectedCompany) {
      await updateDestination(selectedCompany.id, formData)
      const updated = await getDestinationById(selectedCompany.id)
      setSelectedCompany(updated)
    }
    showSuccess(isEditingMode ? 'Destino atualizado com sucesso.' : 'Destino criado com sucesso.')
    setIsEditing(false)
    refreshList()
  }

  const handleToggleActive = async (isActive: boolean) => {
    if (!selectedCompany) return

    if (isActive) {
      // Activation: just show confirmation
      setPendingAction('activate')
      return
    }

    // Inactivation: validate first, then show confirmation
    setIsValidating(true)
    try {
      const { canInactivate, reason } = await companyService.canInactivateDestination(selectedCompany.id)
      if (!canInactivate) {
        showError(reason || 'Não é possível inativar este destino.')
        return
      }
      setPendingAction('inactivate')
    } catch (err) {
      showError((err as Error).message || 'Erro ao validar inativação.')
    } finally {
      setIsValidating(false)
    }
  }

  const handleConfirmAction = async () => {
    if (!selectedCompany || !pendingAction) return
    setIsConfirming(true)
    try {
      const newActive = pendingAction === 'activate'
      await toggleActive(selectedCompany.id, newActive)
      setPendingAction(null)
      setIsDrawerOpen(false)
      setSelectedCompany(null)
      refreshList()
      showSuccess(newActive ? 'Destino ativado com sucesso.' : 'Destino inativado com sucesso.')
    } catch (err) {
      showError((err as Error).message || `Erro ao ${pendingAction === 'activate' ? 'ativar' : 'inativar'} destino.`)
      setPendingAction(null)
    } finally {
      setIsConfirming(false)
    }
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setSelectedCompany(null)
    setIsEditing(false)
    setIsNew(false)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Page Header */}
      <PageHeader
        title="Destinos"
        breadcrumb="Configurações"
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar || (() => {})}
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        onLogout={onLogout}
      />

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden p-4 gap-3">
        {/* Toolbar Row — fixo */}
        <div className="shrink-0">
          <DestinosToolbar
            initialSearch={searchTerm}
            onSearch={handleSearch}
            onFilter={handleFilter}
            onBack={onBack}
            onAddNew={handleAddNew}
            groups={groups}
          />
        </div>

        {/* Toggle and Pagination Row — fixo */}
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

        {/* Table — scroll apenas aqui */}
        <div className="flex-1 min-h-0 overflow-y-auto w-full">
          <DestinosTable
            data={destinations}
            onRowClick={handleRowClick}
          />
        </div>
      </div>

      {/* Drawer */}
      <CompanyDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        company={selectedCompany}
        isEditing={isEditing}
        isNew={isNew}
        isLoading={loading || isValidating || isConfirming}
        onSave={handleSave}
        onToggleActive={handleToggleActive}
        onEdit={handleEdit}
        context="destination"
      />

      {/* Activation / Inactivation confirmation modal */}
      <InactivateConfirmModal
        isOpen={pendingAction !== null}
        action={pendingAction ?? 'inactivate'}
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirmAction}
        isLoading={isConfirming}
        companyName={selectedCompany?.trade_name || selectedCompany?.legal_name || 'este destino'}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
