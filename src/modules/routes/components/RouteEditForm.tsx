import { FormInput, FormDropdown } from '../../../shared/components'

interface RouteEditFormProps {
  data: {
    status?: string
    statusEntrega?: string
    id_route_status?: string
    id_route_delivery_status?: string
    numeroRota: string
    areaRota: string
    id_route_responsible: string
    destinos: { value: string; label: string }[]
    tipoRota: string
    dataSaida: string
    fimRota: string
    motorista: string
    ajudante: { value: string; label: string; color?: string }[]
    placaVeiculo: string
    cargaMaxima: string
  }
  isEditing?: boolean
  onChange?: (field: string, value: any) => void
  driverOptions?: { value: string; label: string }[]
  vehicleOptions?: { value: string; label: string }[]
  responsibleOptions?: { value: string; label: string }[]
  responsibleOptionsLoading?: boolean
  routeStatusOptions?: { value: string; label: string }[]
  deliveryStatusOptions?: { value: string; label: string }[]
}

const PRIMARY_DARK = '#161a36'
const TEXT_DARK = '#2a2a2a'
const TEXT_LIGHT25 = '#919191'
const TEXT_LIGHT75 = '#2a2a2a'
const SECONDARY_DEFAULT = '#e67c26'
const PRIMARY_DEFAULT = '#e67c26'

export const RouteEditForm = ({
  data,
  isEditing = false,
  onChange,
  driverOptions = [],
  vehicleOptions = [],
  responsibleOptions = [],
  responsibleOptionsLoading = false,
  routeStatusOptions = [],
  deliveryStatusOptions = [],
}: RouteEditFormProps) => {
  const handleChange = (field: string, value: any) => {
    if (onChange && isEditing) {
      onChange(field, value)
    }
  }

  const responsibleSelectOptions = responsibleOptionsLoading
    ? [{ value: '', label: 'Carregando responsáveis...' }]
    : responsibleOptions.length > 0
      ? responsibleOptions
      : [{ value: '', label: 'Nenhum responsável cadastrado' }]

  const deliveryStatusLabel = (() => {
    const id = data.id_route_delivery_status
    if (!id) return data.statusEntrega || 'Pendente'
    const found = deliveryStatusOptions.find(o => o.value === String(id))
    return found?.label || data.statusEntrega || id
  })()

  return (
    <div className="flex flex-col gap-[24px] w-full">
      {/* Dados da Rota Section */}
      <div className="flex flex-col gap-[8px]">
        <h3
          className="font-semibold text-[20px]"
          style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
        >
          Dados da Rota
        </h3>

        <div className="flex flex-col gap-[16px]">
          {/* Status Row - somente leitura */}
          <div className="flex gap-[16px] w-full">
            <div className="flex-1">
              <FormDropdown
                label="Status"
                value={data.status || 'Pendente'}
                options={routeStatusOptions.length > 0 ? routeStatusOptions : [{ value: data.status || 'Pendente', label: data.status || 'Pendente' }]}
                onChange={undefined}
                readOnly={true}
              />
            </div>
            <div className="flex-1">
              <FormDropdown
                label="Status da Entrega"
                value={deliveryStatusLabel}
                options={[{ value: deliveryStatusLabel, label: deliveryStatusLabel }]}
                onChange={undefined}
                readOnly={true}
              />
            </div>
          </div>

          {/* Área da Rota */}
          <FormInput
            label="Área da Rota"
            value={data.areaRota}
            onChange={isEditing ? (v) => handleChange('areaRota', v) : undefined}
            readOnly={!isEditing}
          />

          {/* Responsável - Dropdown dinâmico via props */}
          <FormDropdown
            label="Responsável"
            value={data.id_route_responsible || ''}
            options={responsibleSelectOptions}
            onChange={isEditing ? (v) => handleChange('id_route_responsible', v) : undefined}
            readOnly={!isEditing}
          />

          {/* Destino - Apenas visualização (não editável) */}
          <div className="flex flex-col gap-[8px] w-full">
            <label
              className="font-semibold text-[14px]"
              style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
            >
              Destino
            </label>
            <div className="flex flex-wrap gap-2">
              {data.destinos && data.destinos.length > 0 ? (
                data.destinos.map((dest) => (
                  <span
                    key={dest.value}
                    className="inline-flex items-center px-3 py-1 rounded-full text-white text-[12px] font-medium"
                    style={{ backgroundColor: PRIMARY_DEFAULT }}
                  >
                    {dest.label}
                  </span>
                ))
              ) : (
                <span className="text-[14px]" style={{ color: TEXT_LIGHT25 }}>
                  Sem nota vinculada
                </span>
              )}
            </div>
          </div>

          {/* Data de Saída - Input com calendário */}
          <FormInput
            label="Data de Saída"
            value={data.dataSaida}
            type="date"
            onChange={isEditing ? (v) => handleChange('dataSaida', v) : undefined}
            readOnly={!isEditing}
          />
        </div>
      </div>

      {/* Dados do Veículo Section */}
      <div className="flex flex-col gap-[8px]">
        <h3
          className="font-semibold text-[20px]"
          style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
        >
          Dados do Veículo
        </h3>

        <div className="flex flex-col gap-[16px]">
          {/* Motorista - Dropdown (será populado via props) */}
          <FormDropdown
            label="Motorista"
            value={data.motorista}
            options={driverOptions}
            onChange={isEditing ? (v) => handleChange('motorista', v) : undefined}
            readOnly={!isEditing}
          />

          {/* Ajudante - Tag Input */}
          {isEditing ? (
            <div className="flex flex-col gap-[8px]">
              <label
                className="font-semibold text-[14px]"
                style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
              >
                Ajudante
              </label>
              <div className="flex flex-wrap gap-[8px] p-2 border border-[#0f3255] rounded-[5px] min-h-[45px] items-center">
                {(data.ajudante || []).map((ajud, idx) => (
                  <span
                    key={idx}
                    className="flex items-center gap-1 px-2 py-1 rounded-[4px] text-[14px] text-white"
                    style={{ fontFamily: 'Inter, sans-serif', backgroundColor: ajud.color || SECONDARY_DEFAULT }}
                  >
                    <span>{ajud.label}</span>
                    <button
                      type="button"
                      onClick={() => handleChange('ajudante', (data.ajudante || []).filter((_, i) => i !== idx))}
                      className="ml-1 text-white hover:text-gray-200 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder="Digite e pressione Enter ou vírgula"
                  className="flex-1 min-w-[150px] border-none outline-none text-[14px]"
                  style={{ fontFamily: 'Inter, sans-serif', color: TEXT_DARK }}
                  onKeyDown={(e) => {
                    const target = e.target as HTMLInputElement
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      const value = target.value.trim()
                      if (value) {
                        const names = value.split(',').map(n => n.trim()).filter(Boolean)
                        handleChange('ajudante', [
                          ...(data.ajudante || []),
                          ...names.map(name => ({
                            value: name.toLowerCase().replace(/\s+/g, '-'),
                            label: name,
                            color: SECONDARY_DEFAULT,
                          })),
                        ])
                        target.value = ''
                      }
                    } else if (e.key === 'Backspace' && target.value === '' && (data.ajudante || []).length > 0) {
                      handleChange('ajudante', (data.ajudante || []).slice(0, -1))
                    }
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-[8px]">
              <label
                className="font-semibold text-[14px]"
                style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
              >
                Ajudante
              </label>
              <div className="flex gap-[8px] flex-wrap">
                {(data.ajudante || []).length > 0 ? (
                  (data.ajudante || []).map((ajud, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded-[4px] text-[14px] text-white"
                      style={{ fontFamily: 'Inter, sans-serif', backgroundColor: ajud.color || SECONDARY_DEFAULT }}
                    >
                      {ajud.label}
                    </span>
                  ))
                ) : (
                  <span className="text-[14px]" style={{ color: TEXT_LIGHT25 }}>—</span>
                )}
              </div>
            </div>
          )}

          {/* Carro Row */}
          <div className="flex gap-[10px] h-[70px] items-start w-full">
            <div className="flex-1">
              {/* Placa do Veículo - automática */}
              <FormInput
                label="Placa do Veículo"
                value={data.placaVeiculo}
                readOnly={true}
              />
            </div>
            <div className="flex-1">
              {/* Carga Máxima - automática baseada no veículo */}
              <FormInput
                label="Carga Máxima"
                value={data.cargaMaxima ? `${data.cargaMaxima} KG` : ''}
                readOnly={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RouteEditForm
