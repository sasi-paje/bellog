import { useState, useEffect } from 'react'
import { AppIcon, ModalFooter, ModalButton } from '../../../shared/components'
import { ReasonType, ReasonCategory } from '../../../hooks/useMotivos'

interface MotivoModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: MotivoFormData) => Promise<void>
  onToggleActive?: (id: string, isActive: boolean) => Promise<void>
  isActing?: boolean
  reasonTypes: ReasonType[]
  reasonCategories: ReasonCategory[]
  initialData?: {
    id: string
    motivo: string
    idReasonType: number | null
    idReasonCategory: number | null
    isActive: boolean
    sortOrder: number | null
  }
}

export interface MotivoFormData {
  name: string
  id_reason_type: number
  id_reason_category: number | null
  is_active: boolean
  sort_order?: number
}

const COLORS = {
  text: '#2A2A2A',
  textLight: '#919191',
  border: '#0F3255',
}

const FONT = 'Inter, sans-serif'
const ORANGE = '#e67c26'

const ReadonlyField = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="block text-sm font-semibold mb-1" style={{ fontFamily: FONT, color: COLORS.text }}>{label}</p>
    <p className="text-sm" style={{ fontFamily: FONT, color: COLORS.text }}>{value || '-'}</p>
  </div>
)

const fieldStyle = {
  padding: '12px 16px',
  border: `1px solid ${COLORS.border}`,
  borderRadius: '5px',
  height: '45px',
  fontFamily: FONT,
}

export const MotivoModal = ({
  isOpen,
  onClose,
  onSave,
  onToggleActive,
  isActing,
  reasonTypes,
  reasonCategories,
  initialData,
}: MotivoModalProps) => {
  const [name, setName] = useState('')
  const [idReasonType, setIdReasonType] = useState<number | ''>('')
  const [idReasonCategory, setIdReasonCategory] = useState<number | ''>('')
  const [isActive, setIsActive] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'ativar' | 'inativar' | null>(null)

  const isNew = !initialData?.id
  const isViewing = !isNew && !isEditing
  const anyLoading = isSaving || !!isActing

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.motivo || '')
      setIdReasonType(initialData?.idReasonType ?? '')
      setIdReasonCategory(initialData?.idReasonCategory ?? '')
      setIsActive(initialData?.isActive !== false)
      setIsEditing(false)
      setIsSaving(false)
      setConfirmAction(null)
    }
  }, [isOpen, initialData])

  const handleClose = () => {
    setIsEditing(false)
    onClose()
  }

  const handleCancelEdit = () => {
    // Reset fields to original values and go back to view mode
    setName(initialData?.motivo || '')
    setIdReasonType(initialData?.idReasonType ?? '')
    setIdReasonCategory(initialData?.idReasonCategory ?? '')
    setIsActive(initialData?.isActive !== false)
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!name.trim() || !idReasonType) return
    setIsSaving(true)
    try {
      await onSave({
        name: name.trim(),
        id_reason_type: Number(idReasonType),
        id_reason_category: idReasonCategory !== '' ? Number(idReasonCategory) : null,
        is_active: isActive,
      })
      handleClose()
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfirmToggle = async () => {
    if (!confirmAction || !initialData?.id || anyLoading) return
    const nextActive = confirmAction === 'ativar'
    setConfirmAction(null)
    await onToggleActive?.(initialData.id, nextActive)
  }

  const canSave = name.trim().length > 0 && idReasonType !== ''

  const selectedTypeName =
    reasonTypes.find((rt) => rt.id === Number(idReasonType))?.name ?? '-'
  const selectedCategoryName =
    reasonCategories.find((cat) => cat.id === Number(idReasonCategory))?.name ?? '-'

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={handleClose} />

      <div className="fixed inset-0 flex items-center justify-end z-50">
        <div className="bg-white flex flex-col h-full min-w-[50vw] overflow-hidden p-8" style={{ fontFamily: 'Inter, sans-serif' }}>
          {/* Header */}
          <div className="flex items-center justify-between h-6 shrink-0 mb-4">
            <h2 className="font-semibold text-2xl" style={{ fontFamily: 'Inter, sans-serif', color: '#0F3255' }}>
              {isNew ? 'Novo Motivo' : 'Editar Motivo'}
            </h2>
            <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded">
              <AppIcon name="close" size={20} color="#0F3255" />
            </button>
          </div>

          <div className="border-t border-[#E0E0E0] mb-4" />

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-5">
              {isViewing ? (
                /* ── Modo visualização ── */
                <>
                  <ReadonlyField label="Status" value={isActive ? 'Ativo' : 'Inativo'} />
                  <ReadonlyField label="Motivo" value={name} />
                  <ReadonlyField label="Tipo da Entrega" value={selectedTypeName} />
                  <ReadonlyField label="Categoria" value={selectedCategoryName} />
                </>
              ) : (
                /* ── Modo edição ── */
                <>
                  {/* Status — somente exibição mesmo no modo edição */}
                  <div>
                    <p className="block text-sm font-semibold mb-1" style={{ fontFamily: FONT, color: COLORS.text }}>Status</p>
                    <p className="text-sm" style={{ fontFamily: FONT, color: COLORS.text }}>{isActive ? 'Ativo' : 'Inativo'}</p>
                  </div>

                  {/* Motivo */}
                  <div>
                    <label className="block text-sm font-semibold mb-1" style={{ fontFamily: FONT, color: COLORS.text }}>
                      Motivo
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isSaving}
                      className="w-full text-sm outline-none bg-white cursor-text"
                      style={{ ...fieldStyle, color: COLORS.text }}
                      placeholder="Digite o motivo"
                    />
                  </div>

                  {/* Tipo da Entrega */}
                  <div>
                    <label className="block text-sm font-semibold mb-1" style={{ fontFamily: FONT, color: COLORS.text }}>
                      Tipo da Entrega
                    </label>
                    <select
                      value={idReasonType}
                      onChange={(e) => setIdReasonType(e.target.value === '' ? '' : Number(e.target.value))}
                      disabled={isSaving}
                      className="w-full text-sm outline-none bg-white cursor-pointer"
                      style={{ ...fieldStyle, color: idReasonType !== '' ? COLORS.text : COLORS.textLight }}
                    >
                      <option value="">Selecione o tipo de entrega</option>
                      {reasonTypes.map((rt) => (
                        <option key={rt.id} value={rt.id}>
                          {rt.name ?? rt.description ?? String(rt.id)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Categoria */}
                  <div>
                    <label className="block text-sm font-semibold mb-1" style={{ fontFamily: FONT, color: COLORS.text }}>
                      Categoria
                    </label>
                    <select
                      value={idReasonCategory}
                      onChange={(e) => setIdReasonCategory(e.target.value === '' ? '' : Number(e.target.value))}
                      disabled={isSaving}
                      className="w-full text-sm outline-none bg-white cursor-pointer"
                      style={{ ...fieldStyle, color: idReasonCategory !== '' ? COLORS.text : COLORS.textLight }}
                    >
                      <option value="">Selecione a categoria</option>
                      {reasonCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name ?? String(cat.id)}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <ModalFooter
            leftActions={
              <>
                {isViewing && isActive && onToggleActive && (
                  <ModalButton variant="danger" onClick={() => setConfirmAction('inativar')} disabled={anyLoading}>
                    Inativar
                  </ModalButton>
                )}
                {isViewing && !isActive && onToggleActive && (
                  <ModalButton variant="success" onClick={() => setConfirmAction('ativar')} disabled={anyLoading}>
                    Ativar
                  </ModalButton>
                )}
                {(isNew || isEditing) && (
                  <ModalButton variant="secondary" onClick={isNew ? handleClose : handleCancelEdit} disabled={anyLoading}>
                    Cancelar
                  </ModalButton>
                )}
              </>
            }
            rightActions={
              <>
                {isViewing ? (
                  <ModalButton variant="primary" onClick={() => setIsEditing(true)} disabled={anyLoading}>
                    Editar
                  </ModalButton>
                ) : (
                  <ModalButton variant="primary" onClick={handleSave} disabled={anyLoading || !canSave}>
                    {isSaving ? 'Salvando...' : isNew ? 'Criar' : 'Salvar'}
                  </ModalButton>
                )}
              </>
            }
          />
        </div>
      </div>

      {/* Confirmation dialog */}
      {confirmAction && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setConfirmAction(null)} />
          <div
            className="fixed inset-0 flex items-center justify-center z-[61]"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="bg-white rounded-[8px] p-6 flex flex-col gap-4"
              style={{ width: 'min(480px, calc(100vw - 32px))', fontFamily: FONT }}
            >
              <h3 className="text-lg font-semibold" style={{ color: COLORS.text }}>
                {confirmAction === 'inativar' ? 'Inativar motivo' : 'Ativar motivo'}
              </h3>
              <p className="text-sm" style={{ color: COLORS.text }}>
                {confirmAction === 'inativar'
                  ? 'Este motivo não estará mais disponível para seleção em novas entregas. Deseja continuar?'
                  : 'Este motivo voltará a estar disponível para seleção em novas entregas. Deseja continuar?'}
              </p>
              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  disabled={anyLoading}
                  className="h-[42px] px-5 rounded-[5px] border text-sm font-semibold"
                  style={{ borderColor: ORANGE, color: ORANGE, backgroundColor: 'white' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmToggle}
                  disabled={anyLoading}
                  className="h-[42px] px-5 rounded-[5px] text-sm font-semibold text-white"
                  style={{ backgroundColor: confirmAction === 'inativar' ? '#c7392c' : '#27ae60' }}
                >
                  {confirmAction === 'inativar' ? 'Inativar' : 'Ativar'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
