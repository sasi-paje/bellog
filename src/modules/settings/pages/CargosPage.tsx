import { useState, useEffect, useRef } from 'react'
import { PageHeader, Pagination, Toggle, PageToolbar, FormDropdown, useToast, ToastContainer } from '../../../shared/components'
import { CargosTable } from '../components/CargosTable'
import { CargoModal, CargoFormData } from '../components/CargoModal'
import { InactivateConfirmModal } from '../components/InactivateConfirmModal'
import { useRefData, RefData } from '../../../hooks/useRefData'
import { supabase, IS_TEST } from '../../../lib/supabase'
import { SystemPermission, fetchActivePermissions } from '../../../features/roles/api/role-permissions.service'
import { activateCargo, inactivateCargo } from '../../../features/roles/api/cargo.service'
import { saveCargoWithPermissions } from '../../../features/roles/api/save-cargo.service'

interface CargosPageProps {
  userName?: string
  userRole?: string
  onLogout?: () => void
  userEmail?: string
  onBack?: () => void
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
}

export const CargosPage = ({
  userName = 'Leon Kennedy',
  userRole = 'Usuário',
  onLogout,
  userEmail,
  onBack,
  isSidebarOpen = true,
  onToggleSidebar,
}: CargosPageProps) => {
  const { data: cargos, total, loading, fetchData } = useRefData('master_user_role')
  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [availablePermissions, setAvailablePermissions] = useState<SystemPermission[]>([])
  const [selectedPermissionId, setSelectedPermissionId] = useState<number | ''>('')
  const [permissionFilterRoleIds, setPermissionFilterRoleIds] = useState<string[] | null>(null)
  const [ordenar, setOrdenar] = useState<'recentes' | 'antigos'>('recentes')
  const filterWrapperRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(1)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCargo, setSelectedCargo] = useState<RefData | null>(null)

  // Ativação / Inativação state
  const [pendingActivate, setPendingActivate] = useState<{ id: string; name: string } | null>(null)
  const [pendingInactivate, setPendingInactivate] = useState<{ id: string; name: string } | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const { toasts, showSuccess, showError, removeToast } = useToast()

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

  useEffect(() => {
    fetchActivePermissions()
      .then(setAvailablePermissions)
      .catch(() => { /* silencia — filtro fica sem opções */ })
  }, [])

  useEffect(() => {
    if (!showFilters) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowFilters(false)
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (filterWrapperRef.current && !filterWrapperRef.current.contains(e.target as Node)) {
        setShowFilters(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFilters])

  // Busca permissões do cargo ao abrir modal de edição
  useEffect(() => {
    if (isModalOpen && selectedCargo?.id) {
      const fetchPermissions = async () => {
        const { data } = await supabase
          .from('master_user_role_permission')
          .select('permission_id')
          .eq('role_id', selectedCargo.id)

        const perms = data?.map(d => d.permission_id) || []
        setSelectedCargo(prev => prev ? { ...prev, permissions: perms } : null)
      }
      fetchPermissions()
    }
  }, [isModalOpen, selectedCargo?.id])

  const handleClearFilters = () => {
    setSelectedPermissionId('')
    setPermissionFilterRoleIds(null)
    setOrdenar('recentes')
  }

  const handleApplyFilters = async () => {
    if (selectedPermissionId === '') {
      setPermissionFilterRoleIds(null)
    } else {
      const isTest = IS_TEST

      // 1ª query: role_ids com a permissão selecionada (master_user_role_permission não tem is_test)
      const { data: permData } = await supabase
        .from('master_user_role_permission')
        .select('role_id')
        .eq('permission_id', selectedPermissionId)

      const allRoleIds = permData?.map(d => d.role_id) ?? []

      if (allRoleIds.length === 0) {
        setPermissionFilterRoleIds([])
      } else {
        // 2ª query: filtrar pelos que pertencem ao ambiente atual
        const { data: roleData } = await supabase
          .from('master_user_role')
          .select('id')
          .eq('is_test', isTest)
          .in('id', allRoleIds)

        setPermissionFilterRoleIds(roleData?.map(d => String(d.id)) ?? [])
      }
    }
    setShowFilters(false)
    setPage(1)
  }

  const displayCargos = (() => {
    const filtered = permissionFilterRoleIds !== null
      ? cargos.filter(c => permissionFilterRoleIds.includes(c.id))
      : [...cargos]
    return [...filtered].sort((a, b) => {
      const ta = new Date(a.created_at).getTime()
      const tb = new Date(b.created_at).getTime()
      return ordenar === 'antigos' ? ta - tb : tb - ta
    })
  })()

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    setPage(1)
  }

  const handleAddNew = () => {
    setSelectedCargo(null)
    setIsModalOpen(true)
  }

  const handleEdit = (cargo: RefData) => {
    setSelectedCargo(cargo)
    setIsModalOpen(true)
  }

  const handleSaveCargo = async (data: CargoFormData) => {
    const isTest = IS_TEST
    const isEditing = !!selectedCargo?.id

    await saveCargoWithPermissions({
      roleId: selectedCargo?.id ?? null,
      name: data.name,
      code: isEditing ? undefined : `CARGO-${Date.now()}`,
      isTest,
      permissionIds: data.permissions || [],
    })

    fetchData({
      search: searchTerm || undefined,
      isActive: showInactive ? undefined : true,
      page,
      limit,
    })
    showSuccess(isEditing ? 'Cargo atualizado com sucesso.' : 'Cargo criado com sucesso.')
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedCargo(null)
  }

  const handleToggleActive = (id: string, isActive: boolean) => {
    const cargo = cargos.find(c => c.id === id) ?? selectedCargo
    const name = cargo?.name || cargo?.description || ''
    if (isActive) {
      setPendingActivate({ id, name })
    } else {
      setPendingInactivate({ id, name })
    }
  }

  const handleConfirmActivate = async () => {
    if (!pendingActivate) return
    const isTest = IS_TEST
    setIsConfirming(true)
    try {
      await activateCargo(pendingActivate.id, isTest)
      setPendingActivate(null)
      setIsModalOpen(false)
      setSelectedCargo(null)
      fetchData({
        search: searchTerm || undefined,
        isActive: showInactive ? undefined : true,
        page,
        limit,
      })
      showSuccess('Cargo ativado com sucesso.')
    } catch (err) {
      setPendingActivate(null)
      showError((err as Error).message || 'Não foi possível ativar o cargo.')
    } finally {
      setIsConfirming(false)
    }
  }

  const handleConfirmInactivate = async () => {
    if (!pendingInactivate) return
    const isTest = IS_TEST
    setIsConfirming(true)
    try {
      await inactivateCargo(pendingInactivate.id, isTest)
      setPendingInactivate(null)
      setIsModalOpen(false)
      setSelectedCargo(null)
      fetchData({
        search: searchTerm || undefined,
        isActive: showInactive ? undefined : true,
        page,
        limit,
      })
      showSuccess('Cargo inativado com sucesso.')
    } catch (err) {
      setPendingInactivate(null)
      showError((err as Error).message || 'Não foi possível inativar o cargo.')
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Page Header */}
      <PageHeader
        title="Cargos"
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
        <div className="relative" ref={filterWrapperRef}>
          <PageToolbar
            search={{
              placeholder: 'Busque por um Cargo...',
              value: searchTerm,
              onChange: handleSearch,
              onSearch: handleSearch,
              width: '360px',
            }}
            filters={[
              { isActive: showFilters || permissionFilterRoleIds !== null, onClick: () => setShowFilters(prev => !prev) },
            ]}
            actions={[
              { label: 'Voltar para Configurações', variant: 'secondary', onClick: onBack },
              { label: 'Adicionar Novo', icon: 'add_box', variant: 'primary', onClick: handleAddNew },
            ]}
          />

          {showFilters && (
            <div
              className="absolute top-full left-0 mt-2 z-50 flex flex-col bg-white border border-[#bdbdbd] rounded-[5px] shadow-lg"
              style={{ width: '560px' }}
            >
              {/* Ordenação */}
              <div className="flex gap-[16px] p-4 pb-[16px]">
                <div className="flex-1">
                  <span
                    className="font-semibold text-[14px] mb-2 block"
                    style={{ fontFamily: 'Inter, sans-serif', color: '#0f3255' }}
                  >
                    Ordenação
                  </span>
                  <div className="flex">
                    <button
                      type="button"
                      onClick={() => setOrdenar('recentes')}
                      className="flex-1 flex items-center justify-center rounded-l-[4px] font-bold text-[12px] transition-colors h-[38px] border-r-0"
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        backgroundColor: ordenar === 'recentes' ? '#FFF9F4' : 'white',
                        color: ordenar === 'recentes' ? '#E67C26' : '#999999',
                        border: `1px solid ${ordenar === 'recentes' ? '#E67C26' : '#cccccc'}`,
                      }}
                    >
                      Mais Recentes Primeiro
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrdenar('antigos')}
                      className="flex-1 flex items-center justify-center rounded-r-[4px] font-bold text-[12px] transition-colors h-[38px]"
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        backgroundColor: ordenar === 'antigos' ? '#FFF9F4' : 'white',
                        color: ordenar === 'antigos' ? '#E67C26' : '#999999',
                        border: `1px solid ${ordenar === 'antigos' ? '#E67C26' : '#cccccc'}`,
                      }}
                    >
                      Mais Antigos Primeiro
                    </button>
                  </div>
                </div>
              </div>

              {/* Permissão */}
              <div className="flex flex-col gap-[16px] p-4">
                <FormDropdown
                  label="Permissão"
                  value={selectedPermissionId === '' ? '' : String(selectedPermissionId)}
                  options={[
                    { value: '', label: 'Selecione...' },
                    ...availablePermissions.map(p => ({ value: String(p.id), label: p.name })),
                  ]}
                  onChange={(value) => setSelectedPermissionId(value === '' ? '' : Number(value))}
                />
              </div>

              {/* Footer */}
              <div className="flex justify-between p-4">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="flex items-center justify-center rounded-[4px] border border-[#e67c26] bg-white w-[150px] h-[45px]"
                >
                  <span className="font-bold text-[13px]" style={{ fontFamily: 'Inter, sans-serif', color: '#e67c26' }}>
                    Limpar Filtro
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="flex items-center justify-center rounded-[4px] bg-[#e67c26] w-[150px] h-[45px]"
                >
                  <span className="font-bold text-[13px]" style={{ fontFamily: 'Inter, sans-serif', color: 'white' }}>
                    Filtrar
                  </span>
                </button>
              </div>
            </div>
          )}
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
          <CargosTable
            data={displayCargos}
            loading={loading}
            onToggleActive={handleToggleActive}
            onEdit={handleEdit}
          />
        </div>
      </div>

      {/* Modal */}
      <CargoModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveCargo}
        onToggleActive={handleToggleActive}
        initialData={selectedCargo ? { id: selectedCargo.id, name: selectedCargo.name || selectedCargo.description || '', is_active: selectedCargo.is_active, permissions: selectedCargo.permissions || [] } : undefined}
      />

      {/* Confirmação de ativação */}
      <InactivateConfirmModal
        isOpen={pendingActivate !== null}
        onClose={() => setPendingActivate(null)}
        onConfirm={handleConfirmActivate}
        isLoading={isConfirming}
        companyName={pendingActivate?.name || ''}
        action="activate"
        entityLabel="Cargo"
      />

      {/* Confirmação de inativação */}
      <InactivateConfirmModal
        isOpen={pendingInactivate !== null}
        onClose={() => setPendingInactivate(null)}
        onConfirm={handleConfirmInactivate}
        isLoading={isConfirming}
        companyName={pendingInactivate?.name || ''}
        action="inactivate"
        entityLabel="Cargo"
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
