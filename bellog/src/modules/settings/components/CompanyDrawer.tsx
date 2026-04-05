import { useState, useEffect, useCallback } from 'react'
import { AppIcon } from '../../../shared/components'
import { CompanyWithAddress, CompanyFormData, CompanyAddressFormData } from '../../../services/company.service'

interface CompanyDrawerProps {
  isOpen: boolean
  onClose: () => void
  company: CompanyWithAddress | null
  isEditing: boolean
  isNew: boolean
  isLoading?: boolean
  onSave: (formData: CompanyFormData) => Promise<void>
  onToggleActive?: (isActive: boolean) => Promise<void>
  onEdit?: () => void
}

const PRIMARY_DARK = '#0f3255'
const SECONDARY_DEFAULT = '#4077D9'
const ORANGE_PRIMARY = '#e67c26'
const BLACK_LIGHT75 = '#2a2a2a'

// Mask functions
const maskCNPJ = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  let formatted = ''
  if (digits.length > 0) formatted = digits.slice(0, 2)
  if (digits.length > 2) formatted += '.' + digits.slice(2, 5)
  if (digits.length > 5) formatted += '.' + digits.slice(5, 8)
  if (digits.length > 8) formatted += '/' + digits.slice(8, 12)
  if (digits.length > 12) formatted += '-' + digits.slice(12, 14)
  return formatted
}

const maskCEP = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  let formatted = ''
  if (digits.length > 0) formatted = digits.slice(0, 5)
  if (digits.length > 5) formatted += '-' + digits.slice(5, 8)
  return formatted
}

const initialAddressForm: CompanyAddressFormData = {
  zipCode: '',
  city: '',
  district: '',
  street: '',
  number: '',
  complement: '',
}

const initialFormData: CompanyFormData = {
  cnpj: '',
  corporateName: '',
  tradeName: '',
  address: initialAddressForm,
}

const REQUIRED_FIELDS = [
  'cnpj',
  'corporateName',
  'address.zipCode',
  'address.city',
  'address.street',
  'address.district',
  'address.number',
] as const

// ==================== VIEW MODE - Figma Exact ====================

const ViewField = ({ label, value, alignRight = false }: { label: string; value: string; alignRight?: boolean }) => (
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

export const CompanyDrawer = ({
  isOpen,
  onClose,
  company,
  isEditing,
  isNew,
  isLoading = false,
  onSave,
  onToggleActive,
  onEdit,
}: CompanyDrawerProps) => {
  const [formData, setFormData] = useState<CompanyFormData>(initialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isSearchingCNPJ, setIsSearchingCNPJ] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const isFormValid = useCallback(() => {
    for (const field of REQUIRED_FIELDS) {
      if (field.includes('.')) {
        const [parent, child] = field.split('.')
        if (!formData[parent as keyof CompanyFormData]?.[child as keyof CompanyAddressFormData]) {
          return false
        }
      } else {
        const value = formData[field as keyof CompanyFormData]
        if (!value || !value.trim()) {
          return false
        }
      }
    }
    return true
  }, [formData])

  useEffect(() => {
    if (company && !isNew) {
      setFormData({
        cnpj: maskCNPJ(company.cnpj || ''),
        corporateName: company.legal_name || '',
        tradeName: company.trade_name || '',
        address: {
          zipCode: maskCEP(company.addresses?.[0]?.zip_code || ''),
          city: company.addresses?.[0]?.city || '',
          district: company.addresses?.[0]?.district || '',
          street: company.addresses?.[0]?.street || '',
          number: company.addresses?.[0]?.street_number || '',
          complement: company.addresses?.[0]?.complement || '',
        },
      })
    } else {
      setFormData(initialFormData)
    }
    setErrors({})
    setSearchError(null)
  }, [company, isNew])

  if (!isOpen) return null

  // ==================== VIEW MODE ====================
  if (!isEditing && !isNew && company) {
    const address = company.addresses?.[0]
    const companyTitle = company.trade_name || company.legal_name || 'Detalhes'

    return (
      <>
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

        {/* Drawer Panel - 50% width as per Figma */}
        <div
          className="fixed right-0 top-0 h-full w-1/2 bg-white shadow-lg z-50 flex flex-col"
          style={{ maxWidth: '100vw' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-[32px] py-[20px] shrink-0">
            <div className="flex items-center gap-[8px]">
              <div className="w-[32px] h-[32px] flex items-center justify-center">
                <AppIcon name="location_on" size={24} color={PRIMARY_DARK} />
              </div>
              <h2
                className="font-semibold text-[24px]"
                style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
              >
                {companyTitle}
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

          {/* Content - View Mode - padding 32px as per Figma */}
          <div className="flex-1 overflow-auto">
            <div className="flex flex-col gap-[24px] px-[32px] py-[32px]">
              {/* Status - Full width, aligned right as per Figma */}
              <div className="flex justify-end w-full">
                <div className="flex flex-col gap-[4px]">
                  <span
                    className="font-semibold text-[14px] whitespace-nowrap"
                    style={{ fontFamily: 'Inter, sans-serif', color: BLACK_LIGHT75 }}
                  >
                    Status
                  </span>
                  <span
                    className="font-normal text-[14px]"
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      color: BLACK_LIGHT75,
                      lineHeight: '24px',
                    }}
                  >
                    {company.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>

              {/* CNPJ - Full width */}
              <ViewField label="CNPJ" value={maskCNPJ(company.cnpj || '')} />

              {/* Razão Social - Full width */}
              <ViewField label="Razão Social" value={company.legal_name || '-'} />

              {/* Nome de Exibição - Full width */}
              <ViewField label="Nome de Exibição" value={company.trade_name || '-'} />

              {/* CEP and Município - 2 Columns as per Figma (gap 16px) */}
              <div className="flex gap-[16px]">
                <div className="flex-1">
                  <ViewField label="CEP" value={maskCEP(address?.zip_code || '')} />
                </div>
                <div className="flex-1">
                  <ViewField label="Município" value={address?.city || '-'} />
                </div>
              </div>

              {/* Rua and Bairro - 2 Columns */}
              <div className="flex gap-[16px]">
                <div className="flex-1">
                  <ViewField label="Rua" value={address?.street || '-'} />
                </div>
                <div className="flex-1">
                  <ViewField label="Bairro" value={address?.district || '-'} />
                </div>
              </div>

              {/* Número and Complemento - 2 Columns */}
              <div className="flex gap-[16px]">
                <div className="flex-1">
                  <ViewField label="Número" value={address?.street_number || '-'} />
                </div>
                <div className="flex-1">
                  <ViewField label="Complemento" value={address?.complement || '-'} />
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-[1px] bg-[#e0e0e0] shrink-0" />

          {/* Footer - fixed, padding 16px 32px as per Figma */}
          <div className="flex items-center justify-between px-[32px] py-[16px] shrink-0">
            {onToggleActive && (
              <button
                type="button"
                onClick={() => onToggleActive(!company.is_active)}
                className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] bg-[#eb5757] w-[150px]"
              >
                <span
                  className="font-bold text-[14px] text-white"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {company.is_active ? 'Inativar' : 'Ativar'}
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
      if (field === 'cnpj') {
        processedValue = maskCNPJ(value)
      } else if (field === 'address.zipCode') {
        processedValue = maskCEP(value)
      }
    }

    if (field.startsWith('address.')) {
      const addressField = field.replace('address.', '')
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: processedValue,
        },
      }))
    } else {
      setFormData(prev => ({ ...prev, [field]: processedValue }))
    }
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleCNPJSearch = async () => {
    const cleanCNPJ = formData.cnpj.replace(/\D/g, '')
    if (cleanCNPJ.length !== 14) {
      setSearchError('CNPJ inválido')
      return
    }

    setIsSearchingCNPJ(true)
    setSearchError(null)

    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`)

      if (!response.ok) {
        throw new Error('CNPJ não encontrado')
      }

      const data = await response.json()

      setFormData(prev => ({
        ...prev,
        corporateName: data.razao_social || prev.corporateName,
        tradeName: data.nome_fantasia || prev.tradeName,
        address: {
          zipCode: data.cep ? maskCEP(data.cep) : prev.address.zipCode,
          city: data.municipio || prev.address.city,
          district: data.bairro || prev.address.district,
          street: data.logradouro || prev.address.street,
          number: data.numero || prev.address.number,
          complement: data.complemento || prev.address.complement,
        },
      }))
    } catch (err) {
      setSearchError('CNPJ não encontrado ou erro na pesquisa')
      console.error('CNPJ search error:', err)
    } finally {
      setIsSearchingCNPJ(false)
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    const cleanCNPJ = formData.cnpj.replace(/\D/g, '')
    if (!cleanCNPJ) {
      newErrors.cnpj = 'CNPJ é obrigatório'
    } else if (cleanCNPJ.length !== 14) {
      newErrors.cnpj = 'CNPJ inválido'
    }

    if (!formData.corporateName.trim()) {
      newErrors.corporateName = 'Razão Social é obrigatória'
    }

    if (!formData.address.zipCode.replace(/\D/g, '')) {
      newErrors['address.zipCode'] = 'CEP é obrigatório'
    }
    if (!formData.address.city.trim()) {
      newErrors['address.city'] = 'Município é obrigatório'
    }
    if (!formData.address.street.trim()) {
      newErrors['address.street'] = 'Rua é obrigatória'
    }
    if (!formData.address.district.trim()) {
      newErrors['address.district'] = 'Bairro é obrigatório'
    }
    if (!formData.address.number.trim()) {
      newErrors['address.number'] = 'Número é obrigatório'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return

    const formDataToSave = {
      ...formData,
      cnpj: formData.cnpj.replace(/\D/g, ''),
    }

    setIsSaving(true)
    setErrors({})
    try {
      await onSave(formDataToSave)
      onClose()
    } catch (err) {
      setErrors({ general: (err as Error).message || 'Erro ao salvar' })
    } finally {
      setIsSaving(false)
    }
  }

  const title = isNew ? 'Novo Destino' : (company?.trade_name || company?.legal_name || 'Detalhes')

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
        style={{ fontFamily: 'Inter, sans-serif', color: isEditing ? PRIMARY_DARK : BLACK_LIGHT75 }}
      >
        {label}{required && ' *'}
      </label>
      <div
        className={`h-[45px] flex items-center px-[16px] py-[12px] rounded-[5px] border ${
          isEditing ? 'border-[#0f3255]' : ''
        } ${errors[field] ? 'border-red-500' : ''}`}
        style={{ backgroundColor: isEditing ? 'white' : '#f9f9f9' }}
      >
        <input
          type={type}
          value={value}
          onChange={(e) => handleChange(field, e.target.value, applyMask)}
          placeholder={placeholder}
          disabled={!isEditing}
          className="flex-1 bg-transparent outline-none text-[14px]"
          style={{
            fontFamily: 'Inter, sans-serif',
            color: BLACK_LIGHT75,
          }}
        />
      </div>
      {errors[field] && (
        <span className="text-red-500 text-[12px]">{errors[field]}</span>
      )}
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
              <AppIcon name="location_on" size={24} color={PRIMARY_DARK} />
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

        {/* Content - padding 32px as per Figma */}
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col gap-[24px] px-[32px] py-[32px]">
            {/* Error messages */}
            {searchError && <div className="text-red-500 text-[12px]">{searchError}</div>}
            {errors.general && <div className="text-red-500 text-[12px] p-2 bg-red-50 rounded">{errors.general}</div>}

            {/* CNPJ - with search button */}
            <div className="flex items-end justify-end gap-0">
              <div className="flex-1">
                {renderInput('CNPJ', 'cnpj', 'Insira o CNPJ', formData.cnpj, true, 'text', true)}
              </div>
              {isEditing && (
                <button
                  type="button"
                  onClick={handleCNPJSearch}
                  disabled={isSearchingCNPJ}
                  className="h-[45px] px-[8px] rounded-br-[4px] rounded-tr-[4px] flex items-center justify-center disabled:opacity-50"
                  style={{ backgroundColor: ORANGE_PRIMARY }}
                >
                  {isSearchingCNPJ ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <AppIcon name="search" size={24} color="white" />
                  )}
                </button>
              )}
            </div>

            {/* Razão Social */}
            {renderInput('Razão Social', 'corporateName', 'Insira o Nome da Empresa', formData.corporateName, true)}

            {/* Nome de Exibição */}
            {renderInput('Nome de Exibição', 'tradeName', 'Nome para exibição na lista', formData.tradeName, false)}

            {/* CEP and Município - 2 columns */}
            <div className="flex gap-[16px]">
              <div className="flex-1">
                {renderInput('CEP', 'address.zipCode', 'Insira o CEP', formData.address.zipCode, true, 'text', true)}
              </div>
              <div className="flex-1">
                {renderInput('Município', 'address.city', 'Insira o Município', formData.address.city, true)}
              </div>
            </div>

            {/* Rua and Bairro - 2 columns */}
            <div className="flex gap-[16px]">
              <div className="flex-1">
                {renderInput('Rua', 'address.street', 'Insira a Rua', formData.address.street, true)}
              </div>
              <div className="flex-1">
                {renderInput('Bairro', 'address.district', 'Insira o Bairro', formData.address.district, true)}
              </div>
            </div>

            {/* Número and Complemento - 2 columns */}
            <div className="flex gap-[16px]">
              <div className="flex-1">
                {renderInput('Número', 'address.number', 'Insira o Número', formData.address.number, true, 'number')}
              </div>
              <div className="flex-1">
                {renderInput('Complemento', 'address.complement', 'Insira o Complemento', formData.address.complement, false)}
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-[#e0e0e0] shrink-0" />

        {/* Footer - padding 16px 32px as per Figma */}
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
              {!isNew && onToggleActive && company && (
                <button
                  type="button"
                  onClick={() => onToggleActive && onToggleActive(!company.is_active)}
                  className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] bg-[#eb5757] w-[150px]"
                >
                  <span
                    className="font-bold text-[14px] text-white"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    {company.is_active ? 'Inativar' : 'Ativar'}
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
