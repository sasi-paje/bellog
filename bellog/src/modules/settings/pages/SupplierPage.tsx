import { useState, useEffect } from 'react'
import { AppIcon, PageHeader, Pagination, PrimaryButton, SecondaryButton, Toggle } from '../../../shared/components'
import { CompanyDrawer } from '../components/CompanyDrawer'
import { FornecedoresTable } from '../components/FornecedoresTable'
import { useSuppliers } from '../../../hooks/useSuppliers'
import { CompanyWithAddress, CompanyFormData } from '../../../services/company.service'

interface SupplierPageProps {
  userName?: string
  userRole?: string
  onBack?: () => void
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
}

export const SupplierPage = ({
  userName = 'Leon Kennedy',
  userRole = 'Usuário',
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
  } = useSuppliers()

  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [page, setPage] = useState(1)
  const limit = 20
  const totalPages = Math.ceil(total / limit) || 1

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithAddress | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isNew, setIsNew] = useState(false)

  // Fetch suppliers when filters change
  useEffect(() => {
    fetchSuppliers({
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
    if (isNew) {
      await createSupplier(formData)
    } else if (selectedCompany) {
      await updateSupplier(selectedCompany.id, formData)
      const updated = await getSupplierById(selectedCompany.id)
      setSelectedCompany(updated)
    }
    setIsEditing(false)
    fetchSuppliers({
      search: searchTerm || undefined,
      isActive: showInactive ? undefined : true,
      page,
      limit,
    })
  }

  const handleToggleActive = async (isActive: boolean) => {
    if (selectedCompany) {
      await toggleActive(selectedCompany.id, isActive)
      const updated = await getSupplierById(selectedCompany.id)
      setSelectedCompany(updated)
      fetchSuppliers({
        search: searchTerm || undefined,
        isActive: showInactive ? undefined : true,
        page,
        limit,
      })
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
        userRole={userRole}
      />

      {/* Main Content */}
      <div className="flex flex-col gap-4 p-4 flex-1 overflow-auto">
        {/* Toolbar Row */}
        <div className="flex items-center justify-between shrink-0 w-full">
          {/* Left: Search */}
          <div className="flex items-center">
            <div className="bg-[#f9f9f9] border border-[#bdbdbd] flex items-center h-10 rounded-[5px] w-[526px]">
              <div className="flex flex-1 items-center h-full px-[8px]">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Busque por um fornecedor..."
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
            <SecondaryButton
              label="Voltar para Configurações"
              onClick={onBack}
            />
            <PrimaryButton
              label="Adicionar Novo"
              icon="add_box"
              onClick={handleAddNew}
            />
          </div>
        </div>

        {/* Toggle and Pagination Row */}
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

        {/* Table */}
        <div className="flex-1 w-full min-w-0">
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
        isLoading={loading}
        onSave={handleSave}
        onToggleActive={handleToggleActive}
        onEdit={handleEdit}
      />
    </div>
  )
}