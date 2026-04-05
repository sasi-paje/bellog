import { useState, useEffect } from 'react'
import { PageHeader, Pagination, Toggle } from '../../shared/components'
import { VehicleTable } from './components/VehicleTable'
import { VehicleToolbar } from './components/VehicleToolbar'
import { VehicleDrawer } from './components/VehicleDrawer'
import { useVehicles } from '../../hooks/useVehicles'
import { VehicleListItem, CreateVehicleDTO, UpdateVehicleDTO } from '../../services/vehicle.service'

interface VehiclesPageProps {
  userName?: string
  userRole?: string
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
}

export const VehiclesPage = ({
  userName = 'Leon Kennedy',
  userRole = 'Usuário',
  isSidebarOpen = true,
  onToggleSidebar,
}: VehiclesPageProps) => {
  const {
    vehicles,
    total,
    loading,
    error,
    fetchVehicles,
    createVehicle,
    updateVehicle,
    toggleVehicleActive,
    getVehicleById,
  } = useVehicles()

  const [showInactive, setShowInactive] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  const totalPages = Math.ceil(total / limit) || 1

  useEffect(() => {
    fetchVehicles({
      search: searchTerm || undefined,
      isActive: !showInactive,
      showInactive,
      page,
      limit,
    })
  }, [searchTerm, showInactive, page])

  const handleSearch = (term: string) => {
    setSearchTerm(term)
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

  const handleEdit = () => {
    if (selectedVehicle) {
      setDrawerMode('edit')
    }
  }

  const handleToggleActive = async () => {
    if (selectedVehicle) {
      await toggleVehicleActive(selectedVehicle.id)
      const updated = await getVehicleById(selectedVehicle.id)
      setSelectedVehicle(updated)
    }
  }

  const handleSave = async (data: CreateVehicleDTO | UpdateVehicleDTO) => {
    try {
      if (drawerMode === 'create') {
        await createVehicle(data as CreateVehicleDTO)
      } else if (drawerMode === 'edit' && selectedVehicle) {
        await updateVehicle(selectedVehicle.id, data as UpdateVehicleDTO)
      }
      setIsDrawerOpen(false)
      setSelectedVehicle(null)
      setDrawerMode('create')
    } catch (err) {
      console.error('Error saving vehicle:', err)
      throw err
    }
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setSelectedVehicle(null)
    setDrawerMode('create')
  }

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleListItem | null>(null)
  const [drawerMode, setDrawerMode] = useState<'create' | 'view' | 'edit'>('create')

  return (
    <>
      <PageHeader
        title="Veículos"
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar || (() => {})}
        userName={userName}
        userRole={userRole}
      />

      <div className="flex flex-col gap-4 p-8 flex-1 overflow-auto">
        <VehicleToolbar
          onSearch={handleSearch}
          searchValue={searchTerm}
          onAddNew={handleAddNew}
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

        <VehicleTable
          data={vehicles}
          loading={loading}
          onRowClick={handleRowClick}
        />
      </div>

      <VehicleDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        vehicle={selectedVehicle}
        mode={drawerMode}
        onSave={handleSave}
        onToggleActive={handleToggleActive}
        loading={loading}
      />
    </>
  )
}
