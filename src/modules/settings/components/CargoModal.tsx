import { useState, useEffect } from 'react'
import { AppIcon, ModalFooter, ModalButton } from '../../../shared/components'
import { fetchActivePermissions, SystemPermission } from '../../../features/roles/api/role-permissions.service'

interface CargoModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CargoFormData) => Promise<void>
  onToggleActive?: (id: string, isActive: boolean) => void
  initialData?: { id: string; name: string; is_active: boolean; permissions?: number[] }
}

export interface CargoFormData {
  name: string
  permissions?: number[]
}

const COLORS = {
  primary: '#E67C26',
  secondary: '#4077D9',
  text: '#2A2A2A',
  textLight: '#919191',
  disabled: '#BDBDBD',
  border: '#E0E0E0',
  bg: '#F9F9F9',
}

const PermissionCheckbox = ({
  id,
  label,
  checked,
  onChange,
  disabled = false,
}: {
  id: number
  label: string
  checked: boolean
  onChange: (id: number, checked: boolean) => void
  disabled?: boolean
}) => (
  <label
    className={`flex items-center gap-2 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    style={{ padding: '8px', borderRadius: '4px' }}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => !disabled && onChange(id, e.target.checked)}
      disabled={disabled}
      style={{ accentColor: '#0F3255', width: '18px', height: '18px' }}
    />
    <span
      className="text-sm"
      style={{
        color: checked ? '#1E5588' : COLORS.text,
        fontFamily: 'Inter, sans-serif',
        fontWeight: checked ? 600 : 400,
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {label}
    </span>
  </label>
)

export const CargoModal = ({
  isOpen,
  onClose,
  onSave,
  onToggleActive,
  initialData,
}: CargoModalProps) => {
  const [name, setName] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([])
  const [availablePermissions, setAvailablePermissions] = useState<SystemPermission[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showPermissionDropdown, setShowPermissionDropdown] = useState(false)

  const isNew = !initialData?.id
  const isActive = initialData?.is_active !== false

  // VIEW sempre obrigatório — localizado por code, sem hardcode de ID
  const viewPermission = availablePermissions.find(p => p.code === 'VIEW')

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '')
      setSelectedPermissions(initialData?.permissions || [])
      setIsEditing(!initialData?.id)
      setIsSaving(false)
      setSaveError(null)
    }
  }, [isOpen, initialData])

  useEffect(() => {
    fetchActivePermissions()
      .then(setAvailablePermissions)
      .catch(() => { /* silencia — dropdown fica vazio */ })
  }, [])

  // Garantir que VIEW está sempre selecionado quando as permissões carregam
  useEffect(() => {
    if (!isOpen || availablePermissions.length === 0) return
    const viewPerm = availablePermissions.find(p => p.code === 'VIEW')
    if (!viewPerm) return
    setSelectedPermissions(prev =>
      prev.includes(viewPerm.id) ? prev : [viewPerm.id, ...prev]
    )
  }, [isOpen, availablePermissions])

  const handlePermissionChange = (id: number, checked: boolean) => {
    // VIEW não pode ser removido
    if (viewPermission && id === viewPermission.id) return
    if (checked) {
      setSelectedPermissions([...selectedPermissions, id])
    } else {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== id))
    }
  }

  const handleBack = () => {
    setName('')
    setSelectedPermissions([])
    onClose()
  }

  const handleSave = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) return
    setIsSaving(true)
    setSaveError(null)
    try {
      await onSave({ name: trimmedName, permissions: selectedPermissions })
      handleBack()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar cargo.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = () => {
    if (!onToggleActive || !initialData?.id) return
    onToggleActive(initialData.id, !isActive)
  }

  const canEdit = isEditing || isNew

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={handleBack} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-end z-50">
        <div className="bg-white flex flex-col h-full min-w-[50vw] overflow-hidden p-8">
          {/* Header */}
          <div className="flex items-center justify-between h-6 shrink-0 mb-4">
            <h2 className="font-semibold text-2xl" style={{ fontFamily: 'Inter, sans-serif', color: '#0F3255' }}>
              {isNew ? 'Novo Cargo' : 'Editar Cargo'}
            </h2>
            <button onClick={handleBack} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded">
              <AppIcon name="close" size={20} color="#0F3255" />
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-[#E0E0E0] mb-4" />

          {/* Content */}
          <div className="flex-1 overflow-auto w-full">
            {/* Name */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-1" style={{ fontFamily: 'Inter, sans-serif', color: COLORS.text }}>
                Nome
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canEdit || isSaving}
                className={`w-full text-sm outline-none ${canEdit ? 'bg-white cursor-text' : 'bg-[#F5F5F5] cursor-default'}`}
                style={{
                  padding: '12px 16px',
                  border: '1px solid #0F3255',
                  borderRadius: '5px',
                  height: '45px',
                  color: canEdit ? COLORS.text : COLORS.textLight,
                  fontFamily: 'Inter, sans-serif',
                }}
                placeholder="Digite o nome do cargo"
              />
            </div>

            {/* Permissions */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-1" style={{ fontFamily: 'Inter, sans-serif', color: COLORS.text }}>
                Permissões
              </label>
              <div
                className="permission-dropdown-trigger w-full flex flex-wrap items-center gap-2 cursor-pointer"
                style={{
                  padding: '12px 16px',
                  border: '1px solid #0F3255',
                  borderRadius: '5px',
                  backgroundColor: canEdit ? '#FFFFFF' : '#F5F5F5',
                  fontFamily: 'Inter, sans-serif',
                  minHeight: '44px',
                }}
                onClick={() => canEdit && setShowPermissionDropdown(!showPermissionDropdown)}
              >
                {selectedPermissions.map((permId) => {
                  const perm = availablePermissions.find((p) => p.id === permId)
                  if (!perm) return null
                  const isView = viewPermission?.id === permId
                  return (
                    <div
                      key={permId}
                      className="flex items-center justify-center px-[8px] py-0 rounded-[4px] shrink-0"
                      style={{
                        backgroundColor: '#1E5588',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      <span>{perm.name}</span>
                      {/* VIEW não tem botão de remover — é permissão obrigatória */}
                      {canEdit && !isView && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePermissionChange(permId, false)
                          }}
                          className="flex items-center justify-center ml-1"
                        >
                          <AppIcon name="close" size={14} color="#FFFFFF" />
                        </button>
                      )}
                    </div>
                  )
                })}
                {selectedPermissions.length === 0 && (
                  <span style={{ color: COLORS.textLight, fontSize: '14px' }}>
                    Selecione as permissões
                  </span>
                )}
                {canEdit && (
                  <div className="ml-auto">
                    <AppIcon name="arrow_drop_down" size={24} color="#0F3255" />
                  </div>
                )}
              </div>
              {showPermissionDropdown && canEdit && (
                <div className="border border-[#0F3255] rounded mt-1 p-2 bg-white max-h-40 overflow-auto">
                  {availablePermissions.length > 0 ? (
                    availablePermissions.map((perm) => (
                      <PermissionCheckbox
                        key={perm.id}
                        id={perm.id}
                        label={perm.name}
                        checked={selectedPermissions.includes(perm.id)}
                        onChange={handlePermissionChange}
                        disabled={viewPermission?.id === perm.id}
                      />
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm" style={{ color: COLORS.textLight }}>Nenhuma permissão disponível</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Erro de salvamento */}
          {saveError && (
            <p className="text-[13px] mb-2" style={{ color: '#d32f2f', fontFamily: 'Inter, sans-serif' }}>
              {saveError}
            </p>
          )}

          {/* Footer */}
          <ModalFooter
            leftActions={
              <>
                {!isNew && isActive && onToggleActive && (
                  <ModalButton variant="danger" onClick={handleToggleActive} disabled={isSaving}>
                    Inativar
                  </ModalButton>
                )}
                {!isNew && !isActive && onToggleActive && (
                  <ModalButton variant="success" onClick={handleToggleActive} disabled={isSaving}>
                    Ativar
                  </ModalButton>
                )}
                {(!onToggleActive || isNew) && (
                  <ModalButton variant="secondary" onClick={handleBack} disabled={isSaving}>
                    {isNew ? 'Cancelar' : 'Voltar'}
                  </ModalButton>
                )}
              </>
            }
            rightActions={
              <>
                {canEdit ? (
                  <ModalButton variant="primary" onClick={handleSave} disabled={isSaving || !name.trim()}>
                    {isSaving ? 'Salvando...' : isNew ? 'Criar' : 'Salvar'}
                  </ModalButton>
                ) : (
                  <ModalButton variant="primary" onClick={() => setIsEditing(true)}>
                    Editar
                  </ModalButton>
                )}
              </>
            }
          />
        </div>
      </div>
    </>
  )
}
