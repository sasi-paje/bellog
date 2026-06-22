import { useState, useEffect, useCallback } from 'react'
import { AppIcon } from '../../../shared/components'
import { VehicleListItem, CreateVehicleDTO, UpdateVehicleDTO } from '../../../features/vehicles'

export interface VehicleFormData {
  plate: string
  nominal_capacity: string
  responsible_name: string
  responsible_type: string
}

interface VehicleSettingsDrawerProps {
  isOpen: boolean
  onClose: () => void
  vehicle: VehicleListItem | null
  isEditing: boolean
  isNew: boolean
  isLoading?: boolean
  onSave: (formData: VehicleFormData) => Promise<void>
  onToggleActive?: (isActive: boolean) => void
  onEdit: () => void
}

const PRIMARY_DARK = '#0f3255'
const ORANGE_PRIMARY = '#e67c26'
const BLACK_LIGHT75 = '#2a2a2a'
const INACTIVATE_COLOR = '#eb5757'
const ACTIVATE_COLOR = '#2E7D32'

const initialFormData: VehicleFormData = {
  plate: '',
  nominal_capacity: '',
  responsible_name: '',
  responsible_type: '',
}

const ReadonlyField = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-[6px] mb-[16px]">
    <p className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}>
      {label}
    </p>
    <p className="text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: '#2A2A2A' }}>
      {value || '-'}
    </p>
  </div>
)

export const VehicleSettingsDrawer = ({
  isOpen,
  onClose,
  vehicle,
  isEditing,
  isNew,
  isLoading = false,
  onSave,
  onToggleActive,
  onEdit,
}: VehicleSettingsDrawerProps) => {
  const [formData, setFormData] = useState<VehicleFormData>(initialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  const isViewing = !isNew && !isEditing

  const isFormValid = useCallback(() => {
    return formData.plate.trim().length > 0
  }, [formData])

  useEffect(() => {
    if (isOpen) {
      if (vehicle && !isNew) {
        setFormData({
          plate: vehicle.plate || '',
          nominal_capacity: vehicle.max_capacity ? String(vehicle.max_capacity) : '',
          responsible_name: vehicle.responsible_name || '',
          responsible_type: vehicle.responsible_type || '',
        })
      } else {
        setFormData(initialFormData)
      }
      setErrors({})
    }
  }, [isOpen, vehicle, isNew])

  useEffect(() => {
    if (!isEditing && !isNew && vehicle) {
      setFormData({
        plate: vehicle.plate || '',
        nominal_capacity: vehicle.max_capacity ? String(vehicle.max_capacity) : '',
        responsible_name: vehicle.responsible_name || '',
        responsible_type: vehicle.responsible_type || '',
      })
      setErrors({})
    }
  }, [isEditing])

  const handleChange = (field: keyof VehicleFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.plate.trim()) newErrors.plate = 'Placa é obrigatória'
    if (formData.nominal_capacity && isNaN(Number(formData.nominal_capacity))) {
      newErrors.nominal_capacity = 'Capacidade deve ser um número'
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

  const canSubmit = isFormValid() && !isSaving

  const title = isNew
    ? 'Novo Veículo'
    : (vehicle?.plate || 'Detalhes')

  const renderInput = (
    label: string,
    field: keyof VehicleFormData,
    placeholder: string,
    required = false
  ) => (
    <div className="flex flex-col gap-[8px] w-full">
      <label
        className="font-semibold text-[14px]"
        style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
      >
        {label}{required && ' *'}
      </label>
      <div
        className={`h-[45px] flex items-center px-[16px] py-[12px] rounded-[5px] border ${
          errors[field] ? 'border-red-500' : 'border-[#0f3255]'
        }`}
        style={{ backgroundColor: 'white' }}
      >
        <input
          type="text"
          value={formData[field]}
          onChange={(e) => handleChange(field, e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-[14px]"
          style={{ fontFamily: 'Inter, sans-serif', color: BLACK_LIGHT75 }}
        />
      </div>
      {errors[field] && (
        <span className="text-red-500 text-[12px]">{errors[field]}</span>
      )}
    </div>
  )

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      <div
        className="fixed right-0 top-0 h-full w-1/2 bg-white shadow-lg z-50 flex flex-col"
        style={{ maxWidth: '100vw' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-[32px] py-[20px] shrink-0">
          <div className="flex items-center gap-[8px]">
            <div className="w-[32px] h-[32px] flex items-center justify-center">
              <AppIcon name="local_shipping" size={24} color={PRIMARY_DARK} />
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
            <AppIcon name="close" size={20} color={PRIMARY_DARK} />
          </button>
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-[#e0e0e0] shrink-0" />

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="px-[32px] py-[32px]">
            {isViewing ? (
              <>
                <ReadonlyField label="Status" value={vehicle?.is_active ? 'Ativo' : 'Inativo'} />
                <p className="font-semibold text-[13px] uppercase tracking-wide mb-2" style={{ color: PRIMARY_DARK }}>Dados do Veículo</p>
                <ReadonlyField label="Placa" value={vehicle?.plate || '-'} />
                <ReadonlyField
                  label="Carga Máxima (kg)"
                  value={
                    vehicle?.max_capacity
                      ? `${vehicle.max_capacity} kg`
                      : vehicle?.nominal_capacity
                      ? `${vehicle.nominal_capacity} kg`
                      : '-'
                  }
                />
                <p className="font-semibold text-[13px] uppercase tracking-wide mb-2 mt-2" style={{ color: PRIMARY_DARK }}>Dados do Responsável</p>
                <ReadonlyField label="Nome do Responsável" value={vehicle?.responsible_name || '-'} />
                <ReadonlyField label="Tipo do Responsável" value={vehicle?.responsible_type || '-'} />
              </>
            ) : (
              <div className="flex flex-col gap-[24px]">
                {errors.general && (
                  <div className="text-red-500 text-[12px] p-2 bg-red-50 rounded">
                    {errors.general}
                  </div>
                )}
                <p className="font-semibold text-[13px] uppercase tracking-wide" style={{ color: PRIMARY_DARK }}>Dados do Veículo</p>
                {renderInput('Placa', 'plate', 'Ex: ABC1234', true)}
                {renderInput('Carga Máxima (kg)', 'nominal_capacity', 'Ex: 1500')}
                <p className="font-semibold text-[13px] uppercase tracking-wide mt-2" style={{ color: PRIMARY_DARK }}>Dados do Responsável</p>
                {renderInput('Nome do Responsável', 'responsible_name', 'Nome do responsável')}
                {renderInput('Tipo do Responsável', 'responsible_type', 'Tipo do responsável')}
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-[#e0e0e0] shrink-0" />

        {/* Footer */}
        <div className="flex items-center justify-between px-[32px] py-[16px] shrink-0">
          {isViewing ? (
            <>
              <div>
                {onToggleActive && vehicle && (
                  <button
                    type="button"
                    onClick={() => onToggleActive(!vehicle.is_active)}
                    disabled={isLoading}
                    className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] w-[150px] disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: vehicle.is_active ? INACTIVATE_COLOR : ACTIVATE_COLOR,
                    }}
                  >
                    <span
                      className="font-bold text-[14px] text-white"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {vehicle.is_active ? 'Inativar' : 'Ativar'}
                    </span>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={onEdit}
                disabled={isLoading}
                className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] w-[150px] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: ORANGE_PRIMARY }}
              >
                <span
                  className="font-bold text-[14px] text-white"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Editar
                </span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[5px] border w-[150px] disabled:opacity-50"
                style={{ borderColor: ORANGE_PRIMARY }}
              >
                <span
                  className="font-bold text-[14px]"
                  style={{ fontFamily: 'Inter, sans-serif', color: ORANGE_PRIMARY }}
                >
                  Cancelar
                </span>
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSubmit}
                className={`flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] w-[150px] ${
                  !canSubmit ? 'opacity-50 cursor-not-allowed' : ''
                }`}
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
          )}
        </div>
      </div>
    </>
  )
}
