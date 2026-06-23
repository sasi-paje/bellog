import { useState, useEffect } from 'react'
import { PageHeader, Pagination, Toggle } from '../../shared/components'
import { useToast, ToastContainer } from '../../shared/components/Toast'
import { VehicleTable } from './components/VehicleTable'
import { VehicleToolbar, VehicleFilterData, EMPTY_VEHICLE_FILTERS } from './components/VehicleToolbar'
import { VehicleDrawer } from './components/VehicleDrawer'
import { InactivateConfirmModal } from '../settings/components/InactivateConfirmModal'
import { useVehicles } from '../../hooks/useVehicles'
import { vehicleService, VehicleListItem, CreateVehicleDTO, UpdateVehicleDTO } from '../../features/vehicles'

interface VehiclesPageProps {
  userName?: string
  userRole?: string
  onLogout?: () => void
  userEmail?: string
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
}

export const VehiclesPage = ({
  userName = 'Leon Kennedy',
  userRole = 'Usuário',
  onLogout,
  userEmail,
  isSidebarOpen = true,
  onToggleSidebar,
}: VehiclesPageProps) => {
  const {
    vehicles,
    total,
    loading,
    fetchVehicles,
    createVehicle,
    updateVehicle,
    getVehicleById,
    setVehicleActive,
  } = useVehicles()

  const { toasts, showSuccess, showError, removeToast } = useToast()

  const [showInactive, setShowInactive] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState<VehicleFilterData>(EMPTY_VEHICLE_FILTERS)
  const [page, setPage] = useState(1)
  const limit = 20
  const totalPages = Math.ceil(total / limit) || 1

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleListItem | null>(null)
  const [drawerMode, setDrawerMode] = useState<'create' | 'view' | 'edit'>('create')

  const [isValidating, setIsValidating] = useState(false)
  const [pendingAction, setPendingAction] = useState<'activate' | 'inactivate' | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  const refreshList = () =>
    fetchVehicles({
      search: searchTerm || undefined,
      isActive: showInactive ? undefined : true,
      showInactive,
      page,
      limit,
      max_capacity: activeFilters.max_capacity ? Number(activeFilters.max_capacity) : undefined,
      responsible_name: activeFilters.responsible_name || undefined,
      responsible_type: activeFilters.responsible_type || undefined,
    })

  useEffect(() => {
    refreshList()
  }, [searchTerm, showInactive, page, activeFilters])

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    setPage(1)
  }

  const handleFilter = (filters: VehicleFilterData) => {
    setActiveFilters(filters)
    setPage(1)
  }

  const handleAddNew = () => {
    setSelectedVehicle(null)
    setDrawerMode('create')
    setIsDrawerOpen(true)
  }

  const handleRowClick = async (vehicle: VehicleListItem) => {
    const fullVehicle = await getVehicleById(vehicle.id)
    setSelectedVehicle(fullVehicle)
    setDrawerMode('view')
    setIsDrawerOpen(true)
  }

  const handleSave = async (data: CreateVehicleDTO | UpdateVehicleDTO) => {
    const isEditingMode = drawerMode === 'edit'
    if (drawerMode === 'create') {
      await createVehicle(data as CreateVehicleDTO)
    } else if (drawerMode === 'edit' && selectedVehicle) {
      await updateVehicle(selectedVehicle.id, data as UpdateVehicleDTO)
    }
    showSuccess(isEditingMode ? 'Veículo atualizado com sucesso.' : 'Veículo criado com sucesso.')
    setDrawerMode('create')
    refreshList()
  }

  const handleToggleActive = async (isActive: boolean) => {
    if (!selectedVehicle) return

    if (isActive) {
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
    } else {
      setPendingAction('activate')
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
      showError((err as Error).message || `Erro ao ${pendingAction === 'activate' ? 'ativar' : 'inativar'} veículo.`)
      setPendingAction(null)
    } finally {
      setIsConfirming(false)
    }
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setSelectedVehicle(null)
    setDrawerMode('create')
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
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

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden p-4 gap-3">
        <div className="shrink-0">
          <VehicleToolbar
            searchValue={searchTerm}
            onSearch={handleSearch}
            onFilter={handleFilter}
            onAddNew={handleAddNew}
          />
        </div>

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

        <div className="flex-1 min-h-0 overflow-y-auto w-full">
          <VehicleTable
            data={vehicles}
            loading={loading}
            onRowClick={handleRowClick}
          />
        </div>
      </div>

      <VehicleDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        vehicle={selectedVehicle}
        mode={drawerMode}
        onSave={handleSave}
        onToggleActive={handleToggleActive}
        onEdit={() => setDrawerMode('edit')}
        loading={loading || isValidating || isConfirming}
      />

      <InactivateConfirmModal
        isOpen={pendingAction !== null}
        action={pendingAction ?? 'inactivate'}
        entityLabel="Veículo"
        companyName={selectedVehicle?.plate || 'este veículo'}
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirmAction}
        isLoading={isConfirming}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
