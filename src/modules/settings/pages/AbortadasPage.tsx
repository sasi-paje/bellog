import { useState, useEffect } from 'react'
import { PageHeader, Pagination, PrimaryButton, SecondaryButton, Toggle, PageToolbar } from '../../../shared/components'
import { AbortadasTable } from '../components/AbortadasTable'
import { useRefData } from '../../../hooks/useRefData'

interface AbortadasPageProps {
  userName?: string
  userRole?: string
  onLogout?: () => void
  userEmail?: string
  onBack?: () => void
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
}

export const AbortadasPage = ({
  userName = 'Leon Kennedy',
  userRole = 'Usuário',
  onLogout,
  userEmail,
  onBack,
  isSidebarOpen = true,
  onToggleSidebar,
}: AbortadasPageProps) => {
  const { data: abortadas, total, fetchData, create, toggleActive } = useRefData('ref_abortadas')
  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [page, setPage] = useState(1)
  const limit = 20
  const totalPages = Math.ceil(total / limit) || 1

  useEffect(() => {
    fetchData({
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

  const handleAddNew = async () => {
    const description = prompt('Digite o motivo da abortada:')
    if (description) {
      try {
        await create({ description })
        fetchData({
          search: searchTerm || undefined,
          isActive: showInactive ? undefined : true,
          page,
          limit,
        })
      } catch (err) {
        console.error('[AbortadasPage] Error creating abortada:', err)
      }
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await toggleActive(id, isActive)
      fetchData({
        search: searchTerm || undefined,
        isActive: showInactive ? undefined : true,
        page,
        limit,
      })
    } catch (err) {
      console.error('[AbortadasPage] Error toggling abortada:', err)
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Page Header */}
      <PageHeader
        title="Abortadas"
        breadcrumb="Configurações"
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={onToggleSidebar || (() => {})}
        userName={userName}
        userEmail={userEmail}
        userRole={userRole}
        onLogout={onLogout}
      />

      {/* Main Content */}
      <div className="flex flex-col gap-4 p-4 flex-1 overflow-auto">
        {/* Toolbar Row */}
        <PageToolbar
          search={{
            placeholder: 'Busque por motivos de Abortadas...',
            value: searchTerm,
            onChange: handleSearch,
            onSearch: handleSearch,
            width: '360px',
          }}
          actions={[
            { label: 'Voltar para Configurações', variant: 'secondary', onClick: onBack || (() => {}) },
            { label: 'Adicionar Novo', icon: 'add_box', variant: 'primary', onClick: handleAddNew },
          ]}
        />

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
          <AbortadasTable
            data={abortadas}
            onToggleActive={handleToggleActive}
          />
        </div>
      </div>
    </div>
  )
}
