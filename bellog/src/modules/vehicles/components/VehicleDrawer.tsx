import { useState, useEffect } from 'react'
import { Drawer } from '../../../shared/components'
import { VehicleListItem, CreateVehicleDTO, UpdateVehicleDTO } from '../../../features/vehicles'

interface VehicleDrawerProps {
  isOpen: boolean
  onClose: () => void
  vehicle?: VehicleListItem | null
  mode?: 'create' | 'view' | 'edit'
  onSave?: (data: CreateVehicleDTO | UpdateVehicleDTO) => Promise<void>
  onToggleActive?: (isActive: boolean) => void
  onEdit?: () => void
  loading?: boolean
}

const PRIMARY_DARK = '#0f3255'
const TEXT_COLOR = '#2a2a2a'
const SECONDARY = '#e67c26'
const INACTIVATE_COLOR = '#eb5757'
const ACTIVATE_COLOR = '#2E7D32'

export const VehicleDrawer = ({
  isOpen,
  onClose,
  vehicle,
  mode = 'create',
  onSave,
  onToggleActive,
  onEdit,
  loading = false,
}: VehicleDrawerProps) => {
  const [formData, setFormData] = useState({
    plate: '',
    nominal_capacity: '',
    responsible_name: '',
    responsible_type: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  const isViewMode = mode === 'view'
  const isEditMode = mode === 'edit'
  const isCreateMode = mode === 'create'

  useEffect(() => {
    if (isOpen) {
      if (vehicle && (isViewMode || isEditMode)) {
        setFormData({
          plate: vehicle.plate || '',
          nominal_capacity: vehicle.max_capacity ? String(vehicle.max_capacity) : '',
          responsible_name: vehicle.responsible_name || '',
          responsible_type: vehicle.responsible_type || '',
        })
      } else {
        setFormData({ plate: '', nominal_capacity: '', responsible_name: '', responsible_type: '' })
      }
      setErrors({})
    }
  }, [isOpen, vehicle, mode])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.plate.trim()) newErrors.plate = 'Placa é obrigatória'
    if (!formData.nominal_capacity || Number(formData.nominal_capacity) <= 0) {
      newErrors.nominal_capacity = 'Carga máxima é obrigatória'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setIsSaving(true)
    setErrors({})
    try {
      if (onSave) {
        await onSave({
          plate: formData.plate,
          nominal_capacity: Number(formData.nominal_capacity),
          responsible_name: formData.responsible_name || undefined,
          responsible_type: formData.responsible_type || undefined,
        })
      }
      onClose()
    } catch (err) {
      setErrors({ general: (err as Error).message || 'Erro ao salvar' })
    } finally {
      setIsSaving(false)
    }
  }

  const getInputStyle = (field: string) => ({
    height: '45px',
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: '5px',
    border: `1px solid ${errors[field] ? '#eb5757' : PRIMARY_DARK}`,
    backgroundColor: 'white',
    width: '100%',
  })

  const renderField = (
    label: string,
    field: keyof typeof formData,
    type: 'text' | 'number' = 'text',
    required = false,
    placeholder = ''
  ) => (
    <div className="flex flex-col gap-[8px] w-full">
      <label
        className="font-semibold text-[14px]"
        style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
      >
        {label}{required && ' *'}
      </label>
      <div style={getInputStyle(field)}>
        <input
          type={type}
          value={formData[field]}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, [field]: e.target.value }))
            if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
          }}
          placeholder={placeholder}
          disabled={isViewMode}
          className="flex-1 bg-transparent outline-none text-[14px] w-full"
          style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}
        />
      </div>
      {errors[field] && (
        <span className="text-[12px]" style={{ color: '#eb5757' }}>{errors[field]}</span>
      )}
    </div>
  )

  const title = isCreateMode ? 'Novo Veículo' : (vehicle?.plate || vehicle?.code || 'Veículo')

  const renderFooterButtons = () => {
    if (isViewMode) {
      return (
        <>
          <button
            type="button"
            onClick={() => onToggleActive?.(vehicle?.is_active ?? false)}
            disabled={loading}
            className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] w-[150px] disabled:opacity-50"
            style={{ backgroundColor: vehicle?.is_active ? INACTIVATE_COLOR : ACTIVATE_COLOR }}
          >
            <span className="font-bold text-[14px] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
              {vehicle?.is_active ? 'Inativar' : 'Ativar'}
            </span>
          </button>
          <button
            type="button"
            onClick={onEdit}
            disabled={loading}
            className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] w-[150px] disabled:opacity-50"
            style={{ backgroundColor: SECONDARY }}
          >
            <span className="font-bold text-[14px] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
              Editar
            </span>
          </button>
        </>
      )
    }

    return (
      <>
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[5px] border w-[150px] disabled:opacity-50"
          style={{ borderColor: SECONDARY }}
        >
          <span className="font-bold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: SECONDARY }}>
            Cancelar
          </span>
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving || loading}
          className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] w-[150px] disabled:opacity-50"
          style={{ backgroundColor: SECONDARY }}
        >
          <span className="font-bold text-[14px] text-white" style={{ fontFamily: 'Inter, sans-serif' }}>
            {isSaving ? 'Salvando...' : isCreateMode ? 'Criar' : 'Salvar'}
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
        {errors.general && (
          <div className="text-[12px] p-2 bg-red-50 rounded" style={{ color: '#eb5757' }}>
            {errors.general}
          </div>
        )}

        {isViewMode ? (
          <>
            <div className="flex flex-col gap-[6px] mb-[16px]">
              <p className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}>Status</p>
              <p className="text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
                {vehicle?.is_active ? 'Ativo' : 'Inativo'}
              </p>
            </div>
            <p className="font-semibold text-[13px] uppercase tracking-wide mb-1" style={{ color: PRIMARY_DARK }}>Dados do Veículo</p>
            <div className="flex flex-col gap-[6px] mb-[16px]">
              <p className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}>Placa</p>
              <p className="text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>{vehicle?.plate || '-'}</p>
            </div>
            <div className="flex flex-col gap-[6px] mb-[16px]">
              <p className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}>Carga Máxima (kg)</p>
              <p className="text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
                {vehicle?.max_capacity || vehicle?.nominal_capacity
                  ? `${vehicle?.max_capacity || vehicle?.nominal_capacity} kg`
                  : '-'}
              </p>
            </div>
            <p className="font-semibold text-[13px] uppercase tracking-wide mb-1 mt-2" style={{ color: PRIMARY_DARK }}>Dados do Responsável</p>
            <div className="flex flex-col gap-[6px] mb-[16px]">
              <p className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}>Nome do Responsável</p>
              <p className="text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>{vehicle?.responsible_name || '-'}</p>
            </div>
            <div className="flex flex-col gap-[6px] mb-[16px]">
              <p className="font-semibold text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}>Tipo do Responsável</p>
              <p className="text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>{vehicle?.responsible_type || '-'}</p>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-[16px]">
            <p className="font-semibold text-[13px] uppercase tracking-wide" style={{ color: PRIMARY_DARK }}>Dados do Veículo</p>
            {renderField('Placa', 'plate', 'text', true, 'Ex: ABC1234')}
            {renderField('Carga Máxima (kg)', 'nominal_capacity', 'number', true, 'Ex: 1500')}
            <p className="font-semibold text-[13px] uppercase tracking-wide mt-2" style={{ color: PRIMARY_DARK }}>Dados do Responsável</p>
            {renderField('Nome do Responsável', 'responsible_name', 'text', false, 'Nome do responsável')}
            {renderField('Tipo do Responsável', 'responsible_type', 'text', false, 'Tipo do responsável')}
          </div>
        )}
      </div>
    </Drawer>
  )
}
