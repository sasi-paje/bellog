import { useState, useEffect } from 'react'
import { AppIcon, PageHeader, Pagination, PrimaryButton, SecondaryButton, Toggle } from '../../../shared/components'
import { MotoristasTable } from '../components/MotoristasTable'
import { DriverDrawer } from '../components/DriverDrawer'
import { useDrivers } from '../../../hooks/useDrivers'
import { DriverWithAddress, DriverFormData } from '../../../services/driver.service'

interface MotoristasPageProps {
  userName?: string
  userRole?: string
  onBack?: () => void
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
}

export const MotoristasPage = ({
  userName = 'Leon Kennedy',
  userRole = 'Usuário',
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

  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [page, setPage] = useState(1)
  const limit = 20

  // Calculate total pages
  const totalPages = Math.ceil(total / limit) || 1

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState<DriverWithAddress | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isNew, setIsNew] = useState(false)

  // Fetch drivers when filters change
  useEffect(() => {
    fetchDrivers({
      search: searchTerm || undefined,
      isActive: showInactive ? undefined : true,
      page,
      limit,
    })
  }, [searchTerm, showInactive, page])

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    setPage(1)
  }

  const handleAddNew = () => {
    setSelectedDriver(null)
    setIsNew(true)
    setIsEditing(true)
    setIsDrawerOpen(true)
  }

  const handleRowClick = async (driver: DriverWithAddress) => {
    // Get full driver details
    const fullDriver = await getDriverById(driver.id)
    setSelectedDriver(fullDriver)
    setIsNew(false)
    setIsEditing(false)
    setIsDrawerOpen(true)
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = async () => {
    if (isNew) {
      setIsDrawerOpen(false)
    } else {
      // Reload driver data
      if (selectedDriver) {
        const updated = await getDriverById(selectedDriver.id)
        setSelectedDriver(updated)
      }
    }
    setIsEditing(false)
  }

  const handleSave = async (formData: DriverFormData) => {
    console.log('[MotoristasPage] handleSave called with:', formData)
    try {
      if (isNew) {
        console.log('[MotoristasPage] Creating new driver...')
        await createDriver(formData)
        console.log('[MotoristasPage] Created successfully')
      } else if (selectedDriver) {
        console.log('[MotoristasPage] Updating driver:', selectedDriver.id)
        await updateDriver(selectedDriver.id, formData)
        // Reload to get updated data
        const updated = await getDriverById(selectedDriver.id)
        setSelectedDriver(updated)
      }
      setIsEditing(false)
      // Refresh list
      fetchDrivers({
        search: searchTerm || undefined,
        isActive: showInactive ? undefined : true,
        page,
        limit,
      })
    } catch (err) {
      console.error('[MotoristasPage] Error saving:', err)
      throw err
    }
  }

  const handleToggleActive = async (isActive: boolean) => {
    if (selectedDriver) {
      await toggleActive(selectedDriver.id, isActive)
      // Reload driver
      const updated = await getDriverById(selectedDriver.id)
      setSelectedDriver(updated)
      // Refresh list
      fetchDrivers({
        search: searchTerm || undefined,
        isActive: showInactive ? undefined : true,
        page,
        limit,
      })
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
        userRole={userRole}
      />

      {/* Main Content */}
      <div className="flex flex-col gap-4 p-4 flex-1 overflow-auto">
        {/* Toolbar Row */}
        <div className="flex items-center justify-between shrink-0 w-full">
          {/* Left: Search */}
          <div className="flex items-center">
            {/* Search Input */}
            <div className="bg-[#f9f9f9] border border-[#bdbdbd] flex items-center h-10 rounded-[5px] w-[526px]">
              <div className="flex flex-1 items-center h-full px-[8px]">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Busque por um motorista..."
                  className="flex-1 bg-transparent outline-none text-[14px] text-[#2a2a2a]"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                />
              </div>
              <div className="bg-[#e67c26] flex items-center justify-center h-full px-[8px] py-[2px] rounded-br-[4px] rounded-tr-[4px]">
                <AppIcon name="search" size={24} className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex gap-4 items-center">
            {/* Voltar para Configurações */}
            <SecondaryButton
              label="Voltar para Configurações"
              onClick={onBack}
            />

            {/* Adicionar Novo */}
            <PrimaryButton
              label="Adicionar Novo"
              icon="add_box"
              onClick={handleAddNew}
            />
          </div>
        </div>

        {/* Toggle and Pagination Row */}
        <div className="flex items-center justify-between shrink-0 w-full">
          {/* Toggle Exibir Inativos */}
          <Toggle
            label="Exibir inativos"
            checked={showInactive}
            onChange={(checked) => {
              setShowInactive(checked)
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

        {/* Table */}
        <div className="flex-1 w-full min-w-0">
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
        isLoading={loading}
        onSave={handleSave}
        onToggleActive={handleToggleActive}
        onEdit={handleEdit}
      />
    </div>
  )
}
