import { useState, useEffect, useCallback } from 'react'
import { AppIcon } from '../../../shared/components'
import { DriverWithAddress, DriverFormData } from '../../../services/driver.service'

interface DriverDrawerProps {
  isOpen: boolean
  onClose: () => void
  driver: DriverWithAddress | null
  isEditing: boolean
  isNew: boolean
  isLoading?: boolean
  onSave: (formData: DriverFormData) => Promise<void>
  onToggleActive?: (isActive: boolean) => Promise<void>
  onEdit?: () => void
}

const PRIMARY_DARK = '#0f3255'
const ORANGE_PRIMARY = '#e67c26'
const BLACK_LIGHT75 = '#2a2a2a'

// Mask functions
const maskCPFCNPJ = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  let formatted = ''

  if (digits.length <= 11) {
    // CPF mask
    if (digits.length > 0) formatted = digits.slice(0, 3)
    if (digits.length > 3) formatted += '.' + digits.slice(3, 6)
    if (digits.length > 6) formatted += '.' + digits.slice(6, 9)
    if (digits.length > 9) formatted += '-' + digits.slice(9, 11)
  } else {
    // CNPJ mask
    if (digits.length > 0) formatted = digits.slice(0, 2)
    if (digits.length > 2) formatted += '.' + digits.slice(2, 5)
    if (digits.length > 5) formatted += '.' + digits.slice(5, 8)
    if (digits.length > 8) formatted += '/' + digits.slice(8, 12)
    if (digits.length > 12) formatted += '-' + digits.slice(12, 14)
  }
  return formatted
}

const maskPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  let formatted = ''
  if (digits.length > 0) {
    if (digits.length <= 2) {
      formatted = '(' + digits
    } else if (digits.length <= 6) {
      formatted = '(' + digits.slice(0, 2) + ') ' + digits.slice(2)
    } else if (digits.length <= 10) {
      formatted = '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 6) + '-' + digits.slice(6)
    } else {
      formatted = '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 7) + '-' + digits.slice(7)
    }
  }
  return formatted
}

const initialFormData: DriverFormData = {
  name: '',
  cpfCnpj: '',
  email: '',
  phone: '',
}

const REQUIRED_FIELDS = ['name', 'email', 'phone'] as const

// ==================== VIEW MODE ====================

const ViewField = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-[4px]">
    <span
      className="font-semibold text-[14px] whitespace-nowrap"
      style={{ fontFamily: 'Inter, sans-serif', color: BLACK_LIGHT75 }}
    >
      {label}
    </span>
    <span
      className="font-normal text-[14px]"
      style={{ fontFamily: 'Inter, sans-serif', color: BLACK_LIGHT75, lineHeight: '24px' }}
    >
      {value || '-'}
    </span>
  </div>
)

// ==================== EDIT MODE ====================

export const DriverDrawer = ({
  isOpen,
  onClose,
  driver,
  isEditing,
  isNew,
  isLoading = false,
  onSave,
  onToggleActive,
  onEdit,
}: DriverDrawerProps) => {
  const [formData, setFormData] = useState<DriverFormData>(initialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  const isFormValid = useCallback(() => {
    for (const field of REQUIRED_FIELDS) {
      const value = formData[field as keyof DriverFormData]
      if (!value || !value.trim()) {
        return false
      }
    }
    return true
  }, [formData])

  useEffect(() => {
    if (driver && !isNew) {
      setFormData({
        name: driver.name || '',
        cpfCnpj: maskCPFCNPJ(driver.tax_id || ''),
        email: driver.email || '',
        phone: maskPhone(driver.phone || ''),
      })
    } else {
      setFormData(initialFormData)
    }
    setErrors({})
  }, [driver, isNew])

  if (!isOpen) return null

  // ==================== VIEW MODE ====================
  if (!isEditing && !isNew && driver) {
    return (
      <>
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

        {/* Drawer Panel - 50% width */}
        <div
          className="fixed right-0 top-0 h-full w-1/2 bg-white shadow-lg z-50 flex flex-col"
          style={{ maxWidth: '100vw' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-[32px] py-[20px] shrink-0">
            <div className="flex items-center gap-[8px]">
              <div className="w-[32px] h-[32px] flex items-center justify-center">
                <AppIcon name="person" size={24} color={PRIMARY_DARK} />
              </div>
              <h2
                className="font-semibold text-[24px]"
                style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
              >
                {driver.name || 'Detalhes'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center w-[32px] h-[32px] rounded hover:bg-[#f0f0f0] transition-colors"
            >
              <span
                className="font-semibold text-[20px]"
                style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
              >
                X
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="h-[1px] bg-[#e0e0e0] shrink-0" />

          {/* Content */}
          <div className="flex-1 overflow-auto">
            <div className="flex flex-col gap-[24px] px-[32px] py-[32px]">
              {/* Status - Top Right */}
              <div className="flex justify-end w-full">
                <ViewField label="Status" value={driver.is_active ? 'Ativo' : 'Inativo'} />
              </div>

              {/* Nome */}
              <ViewField label="Nome" value={driver.name || '-'} />

              {/* CPF/CNPJ */}
              <ViewField label="CPF/CNPJ" value={driver.tax_id ? maskCPFCNPJ(driver.tax_id) : '-'} />

              {/* Email */}
              <ViewField label="Email" value={driver.email || '-'} />

              {/* Telefone */}
              <ViewField label="Telefone" value={driver.phone ? maskPhone(driver.phone) : '-'} />
            </div>
          </div>

          {/* Divider */}
          <div className="h-[1px] bg-[#e0e0e0] shrink-0" />

          {/* Footer */}
          <div className="flex items-center justify-between px-[32px] py-[16px] shrink-0">
            {onToggleActive && (
              <button
                type="button"
                onClick={() => onToggleActive(!driver.is_active)}
                className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] bg-[#eb5757] w-[150px]"
              >
                <span
                  className="font-bold text-[14px] text-white"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {driver.is_active ? 'Inativar' : 'Ativar'}
                </span>
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] w-[150px]"
                style={{ backgroundColor: ORANGE_PRIMARY }}
              >
                <span
                  className="font-bold text-[14px] text-white"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Editar
                </span>
              </button>
            )}
          </div>
        </div>
      </>
    )
  }

  // ==================== EDIT MODE ====================

  const handleChange = (field: string, value: string, applyMask = false) => {
    let processedValue = value

    if (applyMask) {
      if (field === 'cpfCnpj') {
        processedValue = maskCPFCNPJ(value)
      } else if (field === 'phone') {
        processedValue = maskPhone(value)
      }
    }

    setFormData(prev => ({ ...prev, [field]: processedValue }))

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Name is required
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório'
    }

    // CPF/CNPJ is optional but must be valid if provided
    const digitsCpfCnpj = formData.cpfCnpj.replace(/\D/g, '')
    if (formData.cpfCnpj.trim() && digitsCpfCnpj.length < 11) {
      newErrors.cpfCnpj = 'CPF/CNPJ inválido'
    }

    // Email is required
    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido'
    }

    // Phone is required
    const cleanPhone = formData.phone.replace(/\D/g, '')
    if (!cleanPhone) {
      newErrors.phone = 'Telefone é obrigatório'
    } else if (cleanPhone.length < 10) {
      newErrors.phone = 'Telefone inválido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return

    setIsSaving(true)
    setErrors({})
    try {
      await onSave(formData)
      onClose()
    } catch (err) {
      setErrors({ general: (err as Error).message || 'Erro ao salvar' })
    } finally {
      setIsSaving(false)
    }
  }

  const title = isNew ? 'Novo Motorista' : (driver?.name || 'Detalhes')

  const renderInput = (
    label: string,
    field: string,
    placeholder: string,
    value: string,
    required = false,
    type: 'text' | 'number' = 'text',
    applyMask = false
  ) => (
    <div className="flex flex-col gap-[8px] w-full">
      <label
        className="font-semibold text-[14px]"
        style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
      >
        {label}{required && ' *'}
      </label>
      <div
        className={`h-[45px] flex items-center px-[16px] py-[12px] rounded-[5px] border border-[#0f3255] ${errors[field] ? 'border-red-500' : ''}`}
        style={{ backgroundColor: 'white' }}
      >
        <input
          type={type}
          value={value}
          onChange={(e) => handleChange(field, e.target.value, applyMask)}
          placeholder={placeholder}
          disabled={!isEditing}
          className="flex-1 bg-transparent outline-none text-[14px]"
          style={{ fontFamily: 'Inter, sans-serif', color: BLACK_LIGHT75 }}
        />
      </div>
      {errors[field] && <span className="text-red-500 text-[12px]">{errors[field]}</span>}
    </div>
  )

  const canCreate = isFormValid() && !isSaving

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Drawer Panel - 50% width */}
      <div
        className="fixed right-0 top-0 h-full w-1/2 bg-white shadow-lg z-50 flex flex-col"
        style={{ maxWidth: '100vw' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-[32px] py-[20px] shrink-0">
          <div className="flex items-center gap-[8px]">
            <div className="w-[32px] h-[32px] flex items-center justify-center">
              <AppIcon name="person" size={24} color={PRIMARY_DARK} />
            </div>
            <h2
              className="font-semibold text-[24px]"
              style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-[32px] h-[32px] rounded hover:bg-[#f0f0f0] transition-colors"
          >
            <span
              className="font-semibold text-[20px]"
              style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
            >
              X
            </span>
          </button>
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-[#e0e0e0] shrink-0" />

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col gap-[24px] px-[32px] py-[32px]">
            {/* Error messages */}
            {errors.general && <div className="text-red-500 text-[12px] p-2 bg-red-50 rounded">{errors.general}</div>}

            {/* Nome */}
            {renderInput('Nome', 'name', 'Insira o nome do motorista', formData.name, true)}

            {/* CPF ou CNPJ (Opcional) */}
            {renderInput('CPF ou CNPJ', 'cpfCnpj', 'Insira o CPF ou CNPJ', formData.cpfCnpj, false, 'text', true)}

            {/* Email */}
            {renderInput('Email', 'email', 'Insira o email', formData.email, true)}

            {/* Telefone */}
            {renderInput('Telefone', 'phone', 'Insira o telefone', formData.phone, true, 'text', true)}
          </div>
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-[#e0e0e0] shrink-0" />

        {/* Footer */}
        <div className="flex items-center justify-between px-[32px] py-[16px] shrink-0">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[5px] border w-[150px]"
                style={{ borderColor: ORANGE_PRIMARY }}
              >
                <span
                  className="font-bold text-[14px]"
                  style={{ fontFamily: 'Inter, sans-serif', color: ORANGE_PRIMARY }}
                >
                  Voltar
                </span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canCreate}
                className={`flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] w-[150px] ${!canCreate ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{ backgroundColor: ORANGE_PRIMARY }}
              >
                <span
                  className="font-bold text-[14px] text-white"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {isSaving ? 'Salvando...' : isNew ? 'Criar' : 'Salvar'}
                </span>
              </button>
            </>
          ) : (
            <>
              {!isNew && onToggleActive && driver && (
                <button
                  type="button"
                  onClick={() => onToggleActive && onToggleActive(!driver.is_active)}
                  className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] bg-[#eb5757] w-[150px]"
                >
                  <span
                    className="font-bold text-[14px] text-white"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    {driver.is_active ? 'Inativar' : 'Ativar'}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] w-[150px]"
                style={{ backgroundColor: ORANGE_PRIMARY }}
              >
                <span
                  className="font-bold text-[14px] text-white"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Voltar
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
