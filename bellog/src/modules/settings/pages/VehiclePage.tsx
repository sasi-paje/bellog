import { useState, useEffect } from 'react'
import { PageHeader, Pagination, Toggle } from '../../../shared/components'
import { useToast, ToastContainer } from '../../../shared/components/Toast'
import { VehicleTable } from '../components/VehicleTable'
import { VehicleSettingsDrawer, VehicleFormData } from '../components/VehicleSettingsDrawer'
import { InactivateConfirmModal } from '../components/InactivateConfirmModal'
import { VeiculosToolbar } from '../components/VeiculosToolbar'
import { useVehicles } from '../../../hooks/useVehicles'
import { vehicleService, VehicleListItem } from '../../../features/vehicles'

interface VehiclePageProps {
  userName?: string
  userRole?: string
  onLogout?: () => void
  userEmail?: string
  onBack?: () => void
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
}

export const VehiclePage = ({
  userName = 'Leon Kennedy',
  userRole = 'Usuário',
  onLogout,
  userEmail,
  onBack,
  isSidebarOpen = true,
  onToggleSidebar,
}: VehiclePageProps) => {
  const {
    vehicles,
    total,
    loading,
    fetchVehicles,
    getVehicleById,
    createVehicle,
    updateVehicle,
    setVehicleActive,
  } = useVehicles()

  const { toasts, showSuccess, showError, removeToast } = useToast()

  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [page, setPage] = useState(1)
  const limit = 20
  const totalPages = Math.ceil(total / limit) || 1

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleListItem | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isNew, setIsNew] = useState(false)

  // Confirm modal state
  const [pendingAction, setPendingAction] = useState<'activate' | 'inactivate' | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  const refreshList = () =>
    fetchVehicles({
      search: searchTerm || undefined,
      isActive: showInactive ? undefined : true,
      page,
      limit,
    })

  useEffect(() => {
    refreshList()
  }, [searchTerm, showInactive, page])

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    setPage(1)
  }

  const handleAddNew = () => {
    setSelectedVehicle(null)
    setIsNew(true)
    setIsEditing(true)
    setIsDrawerOpen(true)
  }

  const handleRowClick = async (vehicle: VehicleListItem) => {
    const full = await getVehicleById(vehicle.id)
    setSelectedVehicle(full)
    setIsNew(false)
    setIsEditing(false)
    setIsDrawerOpen(true)
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = async (formData: VehicleFormData) => {
    const isEditingMode = !isNew && Boolean(selectedVehicle)
    const capacity = formData.nominal_capacity ? Number(formData.nominal_capacity) : undefined
    if (isNew) {
      await createVehicle({
        plate: formData.plate,
        nominal_capacity: capacity,
        responsible_name: formData.responsible_name || undefined,
        responsible_type: formData.responsible_type || undefined,
      })
    } else if (selectedVehicle) {
      await updateVehicle(selectedVehicle.id, {
        plate: formData.plate,
        nominal_capacity: capacity,
        responsible_name: formData.responsible_name || undefined,
        responsible_type: formData.responsible_type || undefined,
      })
      const updated = await getVehicleById(selectedVehicle.id)
      setSelectedVehicle(updated)
    }
    showSuccess(isEditingMode ? 'Veículo atualizado com sucesso.' : 'Veículo criado com sucesso.')
    setIsEditing(false)
    refreshList()
  }

  const handleToggleActive = async (isActive: boolean) => {
    if (!selectedVehicle) return

    if (isActive) {
      setPendingAction('activate')
      return
    }

    setIsValidating(true)
    try {
      const { canInactivate, reason } = await vehicleService.canInactivateVehicle(selectedVehicle.id)
      if (!canInactivate) {
        showError(reason || 'Não é possível inativar este veículo.')
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
    if (!selectedVehicle || !pendingAction) return
    setIsConfirming(true)
    try {
      const newActive = pendingAction === 'activate'
      await setVehicleActive(selectedVehicle.id, newActive)
      setPendingAction(null)
      setIsDrawerOpen(false)
      setSelectedVehicle(null)
      refreshList()
      showSuccess(newActive ? 'Veículo ativado com sucesso.' : 'Veículo inativado com sucesso.')
    } catch (err) {
      showError(
        (err as Error).message ||
          `Erro ao ${pendingAction === 'activate' ? 'ativar' : 'inativar'} veículo.`
      )
      setPendingAction(null)
    } finally {
      setIsConfirming(false)
    }
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setSelectedVehicle(null)
    setIsEditing(false)
    setIsNew(false)
  }

  const vehicleName = selectedVehicle?.plate || 'este veículo'

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Page Header */}
      <PageHeader
        title="Veículos"
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
          <VeiculosToolbar
            initialSearch={searchTerm}
            onSearch={handleSearch}
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
          <VehicleTable
            data={vehicles}
            onRowClick={handleRowClick}
          />
        </div>
      </div>

      {/* Drawer */}
      <VehicleSettingsDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        vehicle={selectedVehicle}
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
        entityLabel="Veículo"
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirmAction}
        isLoading={isConfirming}
        companyName={vehicleName}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
