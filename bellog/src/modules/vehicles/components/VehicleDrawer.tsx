import { useState, useEffect } from 'react'
import { Drawer } from '../../../shared/components'
import { VehicleListItem, CreateVehicleDTO, UpdateVehicleDTO } from '../../../services/vehicle.service'

interface VehicleDrawerProps {
  isOpen: boolean
  onClose: () => void
  vehicle?: VehicleListItem | null
  mode?: 'create' | 'view' | 'edit'
  onSave?: (data: CreateVehicleDTO | UpdateVehicleDTO) => void
  onToggleActive?: () => void
  loading?: boolean
}

const PRIMARY_DARK = '#161a36'
const TEXT_COLOR = '#2a2a2a'
const PLACEHOLDER_COLOR = '#bdbdbd'
const SECONDARY = '#e67c26'

export const VehicleDrawer = ({
  isOpen,
  onClose,
  vehicle,
  mode = 'create',
  onSave,
  onToggleActive,
  loading = false,
}: VehicleDrawerProps) => {
  const [formData, setFormData] = useState({
    plate: '',
    model: '',
    max_capacity: 0,
    responsible_name: '',
    responsible_type: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) {
      if (vehicle && (mode === 'view' || mode === 'edit')) {
        setFormData({
          plate: vehicle.plate || '',
          model: vehicle.model || '',
          max_capacity: vehicle.max_capacity || 0,
          responsible_name: vehicle.responsible_name || '',
          responsible_type: vehicle.responsible_type || '',
        })
      } else {
        setFormData({
          plate: '',
          model: '',
          max_capacity: 0,
          responsible_name: '',
          responsible_type: '',
        })
      }
      setErrors({})
    }
  }, [isOpen, vehicle, mode])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.plate.trim()) {
      newErrors.plate = 'Placa é obrigatória'
    }
    if (!formData.model.trim()) {
      newErrors.model = 'Modelo é obrigatório'
    }
    const capacity = Number(formData.max_capacity)
    if (!capacity || capacity <= 0) {
      newErrors.max_capacity = 'Carga máxima é obrigatória'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) {
      return
    }

    const data = {
      plate: formData.plate,
      model: formData.model,
      max_capacity: Number(formData.max_capacity),
      responsible_name: formData.responsible_name || undefined,
      responsible_type: formData.responsible_type || undefined,
    }

    onSave?.(data)
  }

  const isViewMode = mode === 'view'
  const isEditMode = mode === 'edit'
  const isCreateMode = mode === 'create'

  const title = isCreateMode ? 'Novo Veículo' : vehicle?.plate || 'Veículo'
  const buttonLabel = isCreateMode ? 'Criar' : isEditMode ? 'Salvar' : 'Editar'

  const getInputClass = (error?: string) => {
    const color = error ? '#eb5757' : PRIMARY_DARK
    return {
      height: '45px',
      display: 'flex',
      alignItems: 'center',
      padding: '12px 16px',
      borderRadius: '5px',
      border: `1px solid ${color}`,
      backgroundColor: 'white',
      width: '100%'
    }
  }

  const renderField = (
    label: string,
    field: string,
    value: string | number,
    type: 'text' | 'number' = 'text',
    required = false,
    placeholder = ''
  ) => {
    const error = errors[field]
    const isDisabled = isViewMode

    return (
      <div className="flex flex-col gap-[8px] w-full">
        <label className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
          {label} {required && <span style={{ color: '#eb5757' }}>*</span>}
        </label>
        <div style={getInputClass(error)}>
          <input
            type={type}
            value={value}
            onChange={(e) => {
              const val = type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
              setFormData({ ...formData, [field]: val })
            }}
            placeholder={placeholder}
            disabled={isDisabled}
            className="flex-1 bg-transparent outline-none text-[14px] w-full"
            style={{ fontFamily: 'Inter, sans-serif', color: isDisabled ? TEXT_COLOR : (value ? TEXT_COLOR : PLACEHOLDER_COLOR) }}
          />
        </div>
        {error && <span className="text-[12px]" style={{ color: '#eb5757' }}>{error}</span>}
      </div>
    )
  }

  const handleBack = () => {
    onClose()
  }

  const renderFooterButtons = () => {
    if (isViewMode) {
      return (
        <>
          <button
            type="button"
            onClick={onToggleActive}
            className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] w-[150px]"
            style={{ backgroundColor: vehicle?.is_active ? '#eb5757' : '#27ae60' }}
          >
            <span className="font-bold text-[14px] text-white">
              {vehicle?.is_active ? 'Inativar' : 'Ativar'}
            </span>
          </button>
        </>
      )
    }

    return (
      <>
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[5px] border border-[#e67c26] bg-white w-[150px]"
        >
          <span className="font-bold text-[14px]" style={{ color: SECONDARY }}>
            Voltar
          </span>
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] w-[150px]"
          style={{ backgroundColor: loading ? '#bdbdbd' : '#919191' }}
        >
          <span className="font-bold text-[14px] text-white">
            {loading ? 'Salvando...' : buttonLabel}
          </span>
        </button>
      </>
    )
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon="delivery_truck_speed"
      showFooter={true}
      footerContent={renderFooterButtons()}
    >
      <div className="flex flex-col gap-[16px] w-full">
        {/* Dados do Veículo */}
        <div className="flex flex-col gap-[16px]">
          <h3 className="font-semibold text-[20px]" style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}>
            Dados do Veículo
          </h3>

          {renderField('Placa', 'plate', formData.plate, 'text', true, 'Insira a placa do veículo')}
          {renderField('Modelo', 'model', formData.model, 'text', true, 'Insira o modelo do veículo')}
          {renderField('Carga máxima', 'max_capacity', formData.max_capacity, 'number', true, 'Insira a carga máxima')}
        </div>

        {/* Dados do Responsável */}
        <div className="flex flex-col gap-[16px]">
          <h3 className="font-semibold text-[20px]" style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}>
            Dados do Responsável
          </h3>

          {renderField('Nome do Responsável', 'responsible_name', formData.responsible_name, 'text', false, 'Insira o nome do responsável')}
          {renderField('Tipo do Responsável', 'responsible_type', formData.responsible_type, 'text', false, 'Insira o tipo do responsável')}
        </div>
      </div>
    </Drawer>
  )
}
