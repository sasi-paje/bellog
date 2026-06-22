import { useState, useEffect, useCallback } from 'react'
import { AppIcon } from '../../../shared/components'
import { CompanyWithAddress, CompanyFormData, CompanyAddressFormData, CompanyGroup, companyService } from '../../../features/companies'
import { MasterPersonCompanyGroup } from '../../../lib/supabase'

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
  context: 'supplier' | 'destination'
}

const PRIMARY_DARK = '#0f3255'
const ORANGE_PRIMARY = '#e67c26'
const BLACK_LIGHT75 = '#2a2a2a'
const BORDER_EDIT = '#0f3255'

const maskCNPJ = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  let f = ''
  if (digits.length > 0) f = digits.slice(0, 2)
  if (digits.length > 2) f += '.' + digits.slice(2, 5)
  if (digits.length > 5) f += '.' + digits.slice(5, 8)
  if (digits.length > 8) f += '/' + digits.slice(8, 12)
  if (digits.length > 12) f += '-' + digits.slice(12, 14)
  return f
}

const maskCEP = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  let f = ''
  if (digits.length > 0) f = digits.slice(0, 5)
  if (digits.length > 5) f += '-' + digits.slice(5, 8)
  return f
}

const initialAddressForm: CompanyAddressFormData = {
  zipCode: '',
  city: '',
  state: '',
  district: '',
  street: '',
  number: '',
  complement: '',
}

const initialFormData: CompanyFormData = {
  cnpj: '',
  corporateName: '',
  tradeName: '',
  email: '',
  address: initialAddressForm,
  id_company_group: null,
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

// ─── View field component ──────────────────────────────────────────────────

const ViewField = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-[8px]">
    <span
      className="font-semibold text-[14px]"
      style={{ fontFamily: 'Inter, sans-serif', color: BLACK_LIGHT75 }}
    >
      {label}
    </span>
    <div
      className="h-[45px] flex items-center px-[16px] rounded-[5px] bg-white"
    >
      <span
        className="font-normal text-[14px]"
        style={{ fontFamily: 'Inter, sans-serif', color: BLACK_LIGHT75, lineHeight: '24px' }}
      >
        {value || '-'}
      </span>
    </div>
  </div>
)

// ─── Drawer ────────────────────────────────────────────────────────────────

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
  context,
}: CompanyDrawerProps) => {
  const [formData, setFormData] = useState<CompanyFormData>(initialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isSearchingCNPJ, setIsSearchingCNPJ] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  // Group states
  const [companyGroups, setCompanyGroups] = useState<MasterPersonCompanyGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [useNewGroup, setUseNewGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  const isFormValid = useCallback(() => {
    for (const field of REQUIRED_FIELDS) {
      if (field.includes('.')) {
        const [parent, child] = field.split('.')
        if (!formData[parent as keyof CompanyFormData]?.[child as keyof CompanyAddressFormData]) return false
      } else {
        const value = formData[field as keyof CompanyFormData]
        if (!value || !(value as string).trim()) return false
      }
    }
    return true
  }, [formData])

  // Load groups when opening edit/create mode
  useEffect(() => {
    if (isOpen && (isEditing || isNew)) {
      companyService.listGroups(context).then(setCompanyGroups).catch(() => setCompanyGroups([]))
    }
  }, [isOpen, isEditing, isNew, context])

  useEffect(() => {
    if (company && !isNew) {
      setFormData({
        cnpj: maskCNPJ(company.cnpj || ''),
        corporateName: company.legal_name || '',
        tradeName: company.trade_name || '',
        email: company.email || '',
        address: {
          zipCode: maskCEP(company.addresses?.[0]?.zip_code || ''),
          city: company.addresses?.[0]?.city || '',
          state: company.addresses?.[0]?.state || '',
          district: company.addresses?.[0]?.district || '',
          street: company.addresses?.[0]?.street || '',
          number: company.addresses?.[0]?.street_number || '',
          complement: company.addresses?.[0]?.complement || '',
        },
        id_company_group: company.id_company_group ?? null,
      })
      setSelectedGroupId(company.id_company_group ? String(company.id_company_group) : '')
    } else {
      setFormData(initialFormData)
      setSelectedGroupId('')
    }
    setUseNewGroup(false)
    setNewGroupName('')
    setErrors({})
    setSearchError(null)
  }, [company, isNew])

  if (!isOpen) return null

  // ─── VIEW MODE ────────────────────────────────────────────────────────────

  if (!isEditing && !isNew && company) {
    const address = company.addresses?.[0]
    const companyTitle = company.trade_name || company.legal_name || 'Detalhes'

    return (
      <>
        <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

        <div
          className="fixed right-0 top-0 h-full w-1/2 bg-white shadow-lg z-50 flex flex-col"
          style={{ maxWidth: '100vw' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-[32px] py-[20px] shrink-0">
            <div className="flex items-center gap-[8px]">
              <AppIcon name="location_on" size={24} color={PRIMARY_DARK} />
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
              <span className="font-semibold text-[20px]" style={{ color: PRIMARY_DARK }}>X</span>
            </button>
          </div>

          <div className="h-[1px] bg-[#e0e0e0] shrink-0" />

          {/* Body */}
          <div className="flex-1 overflow-auto">
            <div className="flex flex-col gap-[8px] px-[32px] py-[32px]">
              {/* Status — full width */}
              <ViewField label="Status" value={company.is_active ? 'Ativo' : 'Inativo'} />

              {/* CNPJ | Razão Social */}
              <div className="flex gap-[16px]">
                <div className="flex-1">
                  <ViewField label="CNPJ" value={maskCNPJ(company.cnpj || '')} />
                </div>
                <div className="flex-1">
                  <ViewField label="Razão Social" value={company.legal_name || '-'} />
                </div>
              </div>

              {/* Nome de exibição | E-mail */}
              <div className="flex gap-[16px]">
                <div className="flex-1">
                  <ViewField label="Nome de exibição" value={company.trade_name || '-'} />
                </div>
                <div className="flex-1">
                  <ViewField label="E-mail" value={company.email || '-'} />
                </div>
              </div>

              {context === 'destination' ? (
                <>
                  {/* CEP | Estado */}
                  <div className="flex gap-[16px]">
                    <div className="flex-1">
                      <ViewField label="CEP" value={maskCEP(address?.zip_code || '')} />
                    </div>
                    <div className="flex-1">
                      <ViewField label="Estado" value={address?.state || '-'} />
                    </div>
                  </div>

                  {/* Município | Rua */}
                  <div className="flex gap-[16px]">
                    <div className="flex-1">
                      <ViewField label="Município" value={address?.city || '-'} />
                    </div>
                    <div className="flex-1">
                      <ViewField label="Rua" value={address?.street || '-'} />
                    </div>
                  </div>

                  {/* Bairro | Número */}
                  <div className="flex gap-[16px]">
                    <div className="flex-1">
                      <ViewField label="Bairro" value={address?.district || '-'} />
                    </div>
                    <div className="flex-1">
                      <ViewField label="Número" value={address?.street_number || '-'} />
                    </div>
                  </div>

                  {/* Complemento | Grupo */}
                  <div className="flex gap-[16px]">
                    <div className="flex-1">
                      <ViewField label="Complemento" value={address?.complement || 'Sem Complemento'} />
                    </div>
                    <div className="flex-1">
                      <ViewField label="Grupo" value={company.company_group?.name || '-'} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* CEP | Município */}
                  <div className="flex gap-[16px]">
                    <div className="flex-1">
                      <ViewField label="CEP" value={maskCEP(address?.zip_code || '')} />
                    </div>
                    <div className="flex-1">
                      <ViewField label="Município" value={address?.city || '-'} />
                    </div>
                  </div>

                  {/* Rua | Bairro */}
                  <div className="flex gap-[16px]">
                    <div className="flex-1">
                      <ViewField label="Rua" value={address?.street || '-'} />
                    </div>
                    <div className="flex-1">
                      <ViewField label="Bairro" value={address?.district || '-'} />
                    </div>
                  </div>

                  {/* Número | Complemento */}
                  <div className="flex gap-[16px]">
                    <div className="flex-1">
                      <ViewField label="Número" value={address?.street_number || '-'} />
                    </div>
                    <div className="flex-1">
                      <ViewField label="Complemento" value={address?.complement || 'Sem Complemento'} />
                    </div>
                  </div>

                  {/* Grupo — full width */}
                  <ViewField label="Grupo" value={company.company_group?.name || '-'} />
                </>
              )}
            </div>
          </div>

          <div className="h-[1px] bg-[#e0e0e0] shrink-0" />

          {/* Footer */}
          <div className="flex items-center justify-between px-[32px] py-[16px] shrink-0">
            {onToggleActive && (
              <button
                type="button"
                onClick={() => onToggleActive(!company.is_active)}
                disabled={isLoading}
                className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] w-[150px] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                style={{ backgroundColor: company.is_active ? '#eb5757' : '#2E7D32' }}
              >
                <span className="font-bold text-[14px] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {isLoading
                    ? (company.is_active ? 'Verificando...' : 'Ativando...')
                    : (company.is_active ? 'Inativar' : 'Ativar')}
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
                <span className="font-bold text-[14px] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Editar
                </span>
              </button>
            )}
          </div>
        </div>
      </>
    )
  }

  // ─── CREATE / EDIT MODE ────────────────────────────────────────────────────

  const handleChange = (field: string, value: string, applyMask = false) => {
    let processed = value
    if (applyMask) {
      if (field === 'cnpj') processed = maskCNPJ(value)
      else if (field === 'address.zipCode') processed = maskCEP(value)
    }
    if (field.startsWith('address.')) {
      const addressField = field.replace('address.', '')
      setFormData(prev => ({ ...prev, address: { ...prev.address, [addressField]: processed } }))
    } else {
      setFormData(prev => ({ ...prev, [field]: processed }))
    }
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const handleGroupSelectChange = (value: string) => {
    setSelectedGroupId(value)
    if (errors.group) setErrors(prev => ({ ...prev, group: '' }))
  }

  const handleNewGroupToggle = (checked: boolean) => {
    setUseNewGroup(checked)
    if (checked) {
      setSelectedGroupId('')
    } else {
      setNewGroupName('')
    }
    if (errors.group) setErrors(prev => ({ ...prev, group: '' }))
  }

  const handleCNPJSearch = async () => {
    const clean = formData.cnpj.replace(/\D/g, '')
    if (clean.length !== 14) { setSearchError('CNPJ inválido'); return }
    setIsSearchingCNPJ(true)
    setSearchError(null)
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`)
      if (!response.ok) throw new Error('CNPJ não encontrado')
      const data = await response.json()
      setFormData(prev => ({
        ...prev,
        corporateName: data.razao_social || prev.corporateName,
        tradeName: data.nome_fantasia || prev.tradeName,
        address: {
          zipCode: data.cep ? maskCEP(data.cep) : prev.address.zipCode,
          state: data.uf || prev.address.state,
          city: data.municipio || prev.address.city,
          district: data.bairro || prev.address.district,
          street: data.logradouro || prev.address.street,
          number: data.numero || prev.address.number,
          complement: data.complemento || prev.address.complement,
        },
      }))
    } catch (err) {
      setSearchError('CNPJ não encontrado ou erro na pesquisa')
    } finally {
      setIsSearchingCNPJ(false)
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    const cleanCNPJ = formData.cnpj.replace(/\D/g, '')
    if (!cleanCNPJ) newErrors.cnpj = 'CNPJ é obrigatório'
    else if (cleanCNPJ.length !== 14) newErrors.cnpj = 'CNPJ inválido'
    if (!formData.corporateName.trim()) newErrors.corporateName = 'Razão Social é obrigatória'
    if (!formData.address.zipCode.replace(/\D/g, '')) newErrors['address.zipCode'] = 'CEP é obrigatório'
    if (!formData.address.city.trim()) newErrors['address.city'] = 'Município é obrigatório'
    if (!formData.address.street.trim()) newErrors['address.street'] = 'Rua é obrigatória'
    if (!formData.address.district.trim()) newErrors['address.district'] = 'Bairro é obrigatório'
    if (!formData.address.number.trim()) newErrors['address.number'] = 'Número é obrigatório'
    if (useNewGroup && !newGroupName.trim()) newErrors.group = 'Informe o nome do novo grupo.'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setIsSaving(true)
    setErrors({})
    try {
      let resolvedGroupId: number | null = null

      if (useNewGroup) {
        resolvedGroupId = await companyService.findOrCreateGroup(newGroupName)
      } else {
        resolvedGroupId = selectedGroupId ? Number(selectedGroupId) : null
      }

      await onSave({
        ...formData,
        cnpj: formData.cnpj.replace(/\D/g, ''),
        id_company_group: resolvedGroupId,
      })
      onClose()
    } catch (err) {
      setErrors({ general: (err as Error).message || 'Erro ao salvar' })
    } finally {
      setIsSaving(false)
    }
  }

  const canCreate = isFormValid() && !isSaving

  const entityLabel = context === 'destination' ? 'Destino' : 'Fornecedor'
  const title = isNew ? `Novo ${entityLabel}` : (company?.trade_name || company?.legal_name || entityLabel)

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
        className={`h-[45px] flex items-center px-[16px] py-[12px] rounded-[5px] border bg-white ${
          errors[field] ? 'border-red-500' : `border-[${BORDER_EDIT}]`
        }`}
      >
        <input
          type={type}
          value={value}
          onChange={(e) => handleChange(field, e.target.value, applyMask)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[#bdbdbd]"
          style={{ fontFamily: 'Inter, sans-serif', color: BLACK_LIGHT75 }}
        />
      </div>
      {errors[field] && <span className="text-red-500 text-[12px]">{errors[field]}</span>}
    </div>
  )

  const renderCNPJField = () => (
    <div className="flex flex-col gap-[8px] w-full">
      <label
        className="font-semibold text-[14px]"
        style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
      >
        CNPJ *
      </label>
      <div
        className={`h-[45px] flex items-center px-[16px] py-[12px] rounded-[5px] border bg-white ${
          errors.cnpj ? 'border-red-500' : 'border-[#0f3255]'
        }`}
      >
        <input
          type="text"
          value={formData.cnpj}
          onChange={(e) => handleChange('cnpj', e.target.value, true)}
          placeholder="Insira o CNPJ"
          className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[#bdbdbd]"
          style={{ fontFamily: 'Inter, sans-serif', color: BLACK_LIGHT75 }}
        />
        <button
          type="button"
          onClick={handleCNPJSearch}
          disabled={isSearchingCNPJ}
          className="flex items-center justify-center w-[28px] h-full disabled:opacity-50 transition-opacity shrink-0"
          title="Buscar CNPJ"
        >
          {isSearchingCNPJ ? (
            <div className="w-4 h-4 border-2 border-[#0f3255] border-t-transparent rounded-full animate-spin" />
          ) : (
            <AppIcon name="search" size={18} color={PRIMARY_DARK} />
          )}
        </button>
      </div>
      {errors.cnpj && <span className="text-red-500 text-[12px]">{errors.cnpj}</span>}
      {searchError && <span className="text-red-500 text-[12px]">{searchError}</span>}
    </div>
  )

  const renderGroupField = () => (
    <div className="flex flex-col gap-[8px] w-full">
      <label
        className="font-semibold text-[14px]"
        style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
      >
        Grupo
      </label>

      {useNewGroup ? (
        <div
          className={`h-[45px] flex items-center px-[16px] py-[12px] rounded-[5px] border bg-white ${
            errors.group ? 'border-red-500' : `border-[${BORDER_EDIT}]`
          }`}
        >
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => {
              setNewGroupName(e.target.value)
              if (errors.group) setErrors(prev => ({ ...prev, group: '' }))
            }}
            placeholder="Digite o nome do novo grupo"
            className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[#bdbdbd]"
            style={{ fontFamily: 'Inter, sans-serif', color: BLACK_LIGHT75 }}
          />
        </div>
      ) : (
        <div
          className={`h-[45px] flex items-center px-[16px] rounded-[5px] border bg-white ${
            errors.group ? 'border-red-500' : `border-[${BORDER_EDIT}]`
          }`}
        >
          <select
            value={selectedGroupId}
            onChange={(e) => handleGroupSelectChange(e.target.value)}
            className="flex-1 bg-transparent outline-none text-[14px]"
            style={{ fontFamily: 'Inter, sans-serif', color: selectedGroupId ? BLACK_LIGHT75 : '#bdbdbd' }}
          >
            <option value="">Sem grupo</option>
            {companyGroups.map(g => (
              <option key={g.id} value={String(g.id)}>{g.name}</option>
            ))}
          </select>
        </div>
      )}

      <label className="flex items-center gap-[8px] cursor-pointer select-none">
        <input
          type="checkbox"
          checked={useNewGroup}
          onChange={(e) => handleNewGroupToggle(e.target.checked)}
          className="w-4 h-4 accent-[#0f3255]"
        />
        <span
          className="text-[13px]"
          style={{ fontFamily: 'Inter, sans-serif', color: BLACK_LIGHT75 }}
        >
          Novo Grupo
        </span>
      </label>

      {errors.group && <span className="text-red-500 text-[12px]">{errors.group}</span>}
    </div>
  )

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      <div
        className="fixed right-0 top-0 h-full w-1/2 bg-white shadow-lg z-50 flex flex-col"
        style={{ maxWidth: '100vw' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-[32px] py-[20px] shrink-0">
          <div className="flex items-center gap-[8px]">
            <AppIcon name="location_on" size={24} color={PRIMARY_DARK} />
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
            <span className="font-semibold text-[20px]" style={{ color: PRIMARY_DARK }}>X</span>
          </button>
        </div>

        <div className="h-[1px] bg-[#e0e0e0] shrink-0" />

        {/* Body — scrollable */}
        <div className="flex-1 overflow-auto">
          <div className="flex flex-col gap-[8px] px-[32px] py-[32px]">
            {errors.general && (
              <div className="text-red-500 text-[12px] p-2 bg-red-50 rounded">{errors.general}</div>
            )}

            {/* Row 1 — CNPJ | Razão Social */}
            <div className="flex gap-[16px]">
              <div className="flex-1">{renderCNPJField()}</div>
              <div className="flex-1">
                {renderInput('Razão Social', 'corporateName', 'Insira a Razão Social', formData.corporateName, true)}
              </div>
            </div>

            {/* Row 2 — Nome de exibição | E-mail */}
            <div className="flex gap-[16px]">
              <div className="flex-1">
                {renderInput('Nome de exibição', 'tradeName', 'Insira o Nome de Exibição', formData.tradeName)}
              </div>
              <div className="flex-1">
                {renderInput('E-mail', 'email', 'Insira o E-mail', formData.email || '')}
              </div>
            </div>

            {context === 'destination' ? (
              <>
                {/* Row 3 — CEP | Estado */}
                <div className="flex gap-[16px]">
                  <div className="flex-1">
                    {renderInput('CEP', 'address.zipCode', 'Insira o CEP', formData.address.zipCode, true, 'text', true)}
                  </div>
                  <div className="flex-1">
                    {renderInput('Estado', 'address.state', 'Insira Estado', formData.address.state || '')}
                  </div>
                </div>

                {/* Row 4 — Município | Rua */}
                <div className="flex gap-[16px]">
                  <div className="flex-1">
                    {renderInput('Município', 'address.city', 'Insira o Município', formData.address.city, true)}
                  </div>
                  <div className="flex-1">
                    {renderInput('Rua', 'address.street', 'Insira a Rua', formData.address.street, true)}
                  </div>
                </div>

                {/* Row 5 — Bairro | Número */}
                <div className="flex gap-[16px]">
                  <div className="flex-1">
                    {renderInput('Bairro', 'address.district', 'Insira o Bairro', formData.address.district, true)}
                  </div>
                  <div className="flex-1">
                    {renderInput('Número', 'address.number', 'Insira o Número', formData.address.number, true)}
                  </div>
                </div>

                {/* Row 6 — Complemento | Grupo */}
                <div className="flex gap-[16px]">
                  <div className="flex-1">
                    {renderInput('Complemento', 'address.complement', 'Insira o Complemento', formData.address.complement)}
                  </div>
                  <div className="flex-1">
                    {renderGroupField()}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Row 3 — CEP | Município */}
                <div className="flex gap-[16px]">
                  <div className="flex-1">
                    {renderInput('CEP', 'address.zipCode', 'Insira o CEP', formData.address.zipCode, true, 'text', true)}
                  </div>
                  <div className="flex-1">
                    {renderInput('Município', 'address.city', 'Insira o Município', formData.address.city, true)}
                  </div>
                </div>

                {/* Row 4 — Rua | Bairro */}
                <div className="flex gap-[16px]">
                  <div className="flex-1">
                    {renderInput('Rua', 'address.street', 'Insira a Rua', formData.address.street, true)}
                  </div>
                  <div className="flex-1">
                    {renderInput('Bairro', 'address.district', 'Insira o Bairro', formData.address.district, true)}
                  </div>
                </div>

                {/* Row 5 — Número | Complemento */}
                <div className="flex gap-[16px]">
                  <div className="flex-1">
                    {renderInput('Número', 'address.number', 'Insira o Número', formData.address.number, true)}
                  </div>
                  <div className="flex-1">
                    {renderInput('Complemento', 'address.complement', 'Insira o Complemento', formData.address.complement)}
                  </div>
                </div>

                {/* Row 6 — Grupo (full width) */}
                {renderGroupField()}
              </>
            )}
          </div>
        </div>

        <div className="h-[1px] bg-[#e0e0e0] shrink-0" />

        {/* Footer */}
        <div className="flex items-center justify-between px-[32px] py-[16px] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[5px] border w-[150px]"
            style={{ borderColor: ORANGE_PRIMARY }}
          >
            <span className="font-bold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: ORANGE_PRIMARY }}>
              Voltar
            </span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!canCreate}
            className={`flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] w-[150px] transition-opacity ${
              !canCreate ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{ backgroundColor: ORANGE_PRIMARY }}
          >
            <span className="font-bold text-[14px] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
              {isSaving ? 'Salvando...' : isNew ? 'Criar' : 'Salvar'}
            </span>
          </button>
        </div>
      </div>
    </>
  )
}
