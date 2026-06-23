import { useState, useEffect } from 'react'
import { PageHeader, Pagination, Toggle } from '../../../shared/components'
import { useToast, ToastContainer } from '../../../shared/components/Toast'
import { MotoristasTable } from '../components/MotoristasTable'
import { DriverDrawer } from '../components/DriverDrawer'
import { InactivateConfirmModal } from '../components/InactivateConfirmModal'
import { MotoristasToolbar, MotoristasFilterData, EMPTY_MOTORISTAS_FILTERS } from '../components/MotoristasToolbar'
import { useDrivers } from '../../../hooks/useDrivers'
import { driverService, DriverWithAddress, DriverFormData } from '../../../features/drivers'

interface MotoristasPageProps {
  userName?: string
  userRole?: string
  onLogout?: () => void
  userEmail?: string
  onBack?: () => void
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
}

export const MotoristasPage = ({
  userName = 'Leon Kennedy',
  userRole = 'Usuário',
  onLogout,
  userEmail,
  onBack,
  isSidebarOpen = true,
  onToggleSidebar,
}: MotoristasPageProps) => {
  const {
    drivers,
    total,
    loading,
    fetchDrivers,
    getDriverById,
    createDriver,
    updateDriver,
    toggleActive,
  } = useDrivers()

  const { toasts, showSuccess, showError, removeToast } = useToast()

  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [page, setPage] = useState(1)
  const [activeFilters, setActiveFilters] = useState<MotoristasFilterData>(EMPTY_MOTORISTAS_FILTERS)
  const limit = 20
  const totalPages = Math.ceil(total / limit) || 1

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState<DriverWithAddress | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isNew, setIsNew] = useState(false)

  // Confirm modal state (shared for activate and inactivate)
  const [pendingAction, setPendingAction] = useState<'activate' | 'inactivate' | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  const refreshList = () =>
    fetchDrivers({
      search: searchTerm || undefined,
      isActive: showInactive ? undefined : true,
      page,
      limit,
      taxId: activeFilters.taxId || undefined,
      email: activeFilters.email || undefined,
      phone: activeFilters.phone || undefined,
    })

  useEffect(() => {
    refreshList()
  }, [searchTerm, showInactive, page, activeFilters])

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    setPage(1)
  }

  const handleFilter = (filters: MotoristasFilterData) => {
    setActiveFilters(filters)
    setPage(1)
  }

  const handleAddNew = () => {
    setSelectedDriver(null)
    setIsNew(true)
    setIsEditing(true)
    setIsDrawerOpen(true)
  }

  const handleRowClick = async (driver: DriverWithAddress) => {
    const fullDriver = await getDriverById(driver.id)
    setSelectedDriver(fullDriver)
    setIsNew(false)
    setIsEditing(false)
    setIsDrawerOpen(true)
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = async (formData: DriverFormData) => {
    const isEditingMode = !isNew && Boolean(selectedDriver)
    if (isNew) {
      await createDriver(formData)
    } else if (selectedDriver) {
      await updateDriver(selectedDriver.id, formData)
      const updated = await getDriverById(selectedDriver.id)
      setSelectedDriver(updated)
    }
    showSuccess(isEditingMode ? 'Motorista atualizado com sucesso.' : 'Motorista criado com sucesso.')
    setIsEditing(false)
    refreshList()
  }

  const handleToggleActive = async (isActive: boolean) => {
    if (!selectedDriver) return

    if (isActive) {
      setPendingAction('activate')
      return
    }

    setIsValidating(true)
    try {
      const { canInactivate, reason } = await driverService.canInactivateDriver(selectedDriver.id)
      if (!canInactivate) {
        showError(reason || 'Não é possível inativar este motorista.')
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
    if (!selectedDriver || !pendingAction) return
    setIsConfirming(true)
    try {
      const newActive = pendingAction === 'activate'
      await toggleActive(selectedDriver.id, newActive)
      setPendingAction(null)
      setIsDrawerOpen(false)
      setSelectedDriver(null)
      refreshList()
      showSuccess(newActive ? 'Motorista ativado com sucesso.' : 'Motorista inativado com sucesso.')
    } catch (err) {
      showError((err as Error).message || `Erro ao ${pendingAction === 'activate' ? 'ativar' : 'inativar'} motorista.`)
      setPendingAction(null)
    } finally {
      setIsConfirming(false)
    }
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setSelectedDriver(null)
    setIsEditing(false)
    setIsNew(false)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Page Header */}
      <PageHeader
        title="Motoristas"
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
          <MotoristasToolbar
            initialSearch={searchTerm}
            onSearch={handleSearch}
            onFilter={handleFilter}
            onBack={onBack}
            onAddNew={handleAddNew}
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
          <MotoristasTable
            data={drivers}
            onRowClick={handleRowClick}
          />
        </div>
      </div>

      {/* Drawer */}
      <DriverDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        driver={selectedDriver}
        isEditing={isEditing}
        isNew={isNew}
        isLoading={loading || isValidating || isConfirming}
        onSave={handleSave}
        onToggleActive={handleToggleActive}
        onEdit={handleEdit}
      />

      {/* Activation / Inactivation confirmation modal */}
      <InactivateConfirmModal
        isOpen={pendingAction !== null}
        action={pendingAction ?? 'inactivate'}
        entityLabel="Motorista"
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirmAction}
        isLoading={isConfirming}
        companyName={selectedDriver?.name || 'este motorista'}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
