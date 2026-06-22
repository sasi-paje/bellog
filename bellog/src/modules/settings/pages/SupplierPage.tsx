import { useState, useEffect } from 'react'
import { PageHeader, Pagination, Toggle } from '../../../shared/components'
import { useToast, ToastContainer } from '../../../shared/components/Toast'
import { CompanyDrawer } from '../components/CompanyDrawer'
import { FornecedoresTable } from '../components/FornecedoresTable'
import { InactivateConfirmModal } from '../components/InactivateConfirmModal'
import { FornecedoresToolbar, FornecedoresFilterData, EMPTY_FORNECEDORES_FILTERS } from '../components/FornecedoresToolbar'
import { useSuppliers } from '../../../hooks/useSuppliers'
import { companyService, CompanyWithAddress, CompanyFormData } from '../../../features/companies'

interface SupplierPageProps {
  userName?: string
  userRole?: string
  onLogout?: () => void
  userEmail?: string
  onBack?: () => void
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
}

export const SupplierPage = ({
  userName = 'Leon Kennedy',
  userRole = 'Usuário',
  onLogout,
  userEmail,
  onBack,
  isSidebarOpen = true,
  onToggleSidebar,
}: SupplierPageProps) => {
  const {
    suppliers,
    total,
    loading,
    fetchSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    toggleActive,
    groups,
    fetchGroups,
  } = useSuppliers()

  const { toasts, showSuccess, showError, removeToast } = useToast()

  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [page, setPage] = useState(1)
  const [activeFilters, setActiveFilters] = useState<FornecedoresFilterData>(EMPTY_FORNECEDORES_FILTERS)
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
    fetchSuppliers({
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

  const handleFilter = (filters: FornecedoresFilterData) => {
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
    const fullCompany = await getSupplierById(company.id)
    setSelectedCompany(fullCompany)
    setIsNew(false)
    setIsEditing(false)
    setIsDrawerOpen(true)
  }

  const handleSave = async (formData: CompanyFormData) => {
    const isEditingMode = !isNew && Boolean(selectedCompany)
    if (isNew) {
      await createSupplier(formData)
    } else if (selectedCompany) {
      await updateSupplier(selectedCompany.id, formData)
      const updated = await getSupplierById(selectedCompany.id)
      setSelectedCompany(updated)
    }
    showSuccess(isEditingMode ? 'Fornecedor atualizado com sucesso.' : 'Fornecedor criado com sucesso.')
    setIsEditing(false)
    refreshList()
  }

  const handleToggleActive = async (isActive: boolean) => {
    if (!selectedCompany) return

    if (isActive) {
      setPendingAction('activate')
      return
    }

    setIsValidating(true)
    try {
      const { canInactivate, reason } = await companyService.canInactivateSupplier(selectedCompany.id)
      if (!canInactivate) {
        showError(reason || 'Não é possível inativar este fornecedor.')
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
      showSuccess(newActive ? 'Fornecedor ativado com sucesso.' : 'Fornecedor inativado com sucesso.')
    } catch (err) {
      showError((err as Error).message || `Erro ao ${pendingAction === 'activate' ? 'ativar' : 'inativar'} fornecedor.`)
      setPendingAction(null)
    } finally {
      setIsConfirming(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
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
        title="Fornecedores"
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
          <FornecedoresToolbar
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
          <FornecedoresTable
            data={suppliers}
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
        context="supplier"
      />

      {/* Activation / Inactivation confirmation modal */}
      <InactivateConfirmModal
        isOpen={pendingAction !== null}
        action={pendingAction ?? 'inactivate'}
        entityLabel="Fornecedor"
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirmAction}
        isLoading={isConfirming}
        companyName={selectedCompany?.trade_name || selectedCompany?.legal_name || 'este fornecedor'}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
