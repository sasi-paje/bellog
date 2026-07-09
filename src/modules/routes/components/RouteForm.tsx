import { FormInput, FormDropdown } from '../../../shared/components'

interface RouteFormProps {
  data: {
    status: string
    statusEntrega: string
    numeroRota: string
    areaRota: string
    responsaveis: { value: string; label: string; color?: string }[]
    destinos: { value: string; label: string; color?: string }[]
    tipoRota: string
    dataSaida: string
    fimRota: string
    motorista: { value: string; label: string; color?: string }[]
    ajudante: { value: string; label: string; color?: string }[]
    placaVeiculo: string
    cargaMaxima: string
  }
  isEditing?: boolean
  isInactive?: boolean
  onChange?: (field: string, value: any) => void
  statusOptions: { value: string; label: string }[]
  deliveryStatusOptions: { value: string; label: string }[]
  vehicleOptions: { value: string; label: string; carga?: string }[]
  driverOptions: { value: string; label: string; color?: string }[]
  helperOptions: { value: string; label: string; color?: string }[]
  responsibleOptions: { value: string; label: string; color?: string }[]
  routeTypeOptions: { value: string; label: string }[]
}

const PRIMARY_DARK = '#161a36'
const TEXT_DARK = '#2a2a2a'
const TEXT_LIGHT75 = '#2a2a2a'
const TEXT_LIGHT25 = '#919191'
const SECONDARY_DEFAULT = '#e67c26'
const PRIMARY_DEFAULT = '#4077d9'

// Helper para formatar data para exibição (YYYY-MM-DD -> DD/MM/YYYY)
const formatDateDisplay = (dateStr: string | undefined | null): string => {
  if (!dateStr) return ''
  try {
    // Se já está em DD/MM/YYYY, retornar direto
    if (dateStr.includes('/')) return dateStr
    // Converter de YYYY-MM-DD para DD/MM/YYYY
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  } catch {
    return dateStr
  }
}

// Campos que não podem ser editados (read-only)
const READONLY_FIELDS = ['destinos', 'fimRota', 'cargaMaxima']

export const RouteForm = ({
  data,
  isEditing = false,
  isInactive = false,
  onChange,
  statusOptions,
  deliveryStatusOptions,
  vehicleOptions,
  driverOptions,
  helperOptions,
  responsibleOptions,
  routeTypeOptions,
}: RouteFormProps) => {
  const handleChange = (field: string, value: any) => {
    if (onChange && !READONLY_FIELDS.includes(field)) {
      onChange(field, value)
      // Sincronizar carga máxima quando mudar a placa do veículo
      if (field === 'placaVeiculo') {
        const vehicleData = vehicleOptions.find(v => v.value === value)
        if (vehicleData) {
          onChange('cargaMaxima', vehicleData.carga || '')
        }
      }
    }
  }

  // Helper para verificar se campo é editável
  const isFieldEditable = (field: string) => {
    return isEditing && !READONLY_FIELDS.includes(field)
  }

  // Helper para obter estilo de campo readonly
  const getFieldStyle = (field: string) => {
    if (READONLY_FIELDS.includes(field)) {
      return {
        color: TEXT_LIGHT25,
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
      }
    }
    return {}
  }

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
          {/* Status */}
          {isEditing ? (
            <FormDropdown
              label="Status"
              value={data.status}
              options={statusOptions}
              onChange={(value) => handleChange('status', value)}
            />
          ) : (
            <FormInput
              label="Status"
              value={isInactive ? 'Inativa' : data.status}
              readOnly
            />
          )}

          {/* Status da Entrega */}
          {isEditing ? (
            <FormDropdown
              label="Status da Entrega"
              value={data.statusEntrega}
              options={deliveryStatusOptions}
              onChange={(value) => handleChange('statusEntrega', value)}
            />
          ) : (
            <FormInput
              label="Status da Entrega"
              value={isInactive ? 'Inativa' : data.statusEntrega}
              readOnly
            />
          )}

          {/* Número da Rota */}
          <FormInput
            label="Número da rota"
            value={data.numeroRota}
            readOnly={!isEditing}
            onChange={(value) => handleChange('numeroRota', value)}
          />

          {/* Área da Rota */}
          <FormInput
            label="Área da Rota"
            value={data.areaRota}
            readOnly={!isEditing}
            onChange={(value) => handleChange('areaRota', value)}
          />

          {/* Responsável - Seleção única (rota tem um único id_route_responsible) */}
          {isEditing ? (
            <FormDropdown
              label="Responsável"
              value={data.responsaveis?.[0]?.label || ''}
              options={responsibleOptions.map(r => ({ value: r.label, label: r.label }))}
              onChange={(value) => {
                const selected = responsibleOptions.find(r => r.label === value)
                handleChange('responsaveis', selected ? [selected] : [])
              }}
            />
          ) : (
            <div className="flex flex-col gap-[8px]">
              <label
                className="font-semibold text-[14px]"
                style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
              >
                Responsável
              </label>
              <div className="flex gap-[8px] flex-wrap">
                {data.responsaveis.map((resp, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded-[4px] text-[14px] text-white"
                    style={{ fontFamily: 'Inter, sans-serif', backgroundColor: resp.color || SECONDARY_DEFAULT }}
                  >
                    {resp.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Destino - Multi Select (sempre readonly) */}
          <div className="flex flex-col gap-[8px]">
            <label
              className="font-semibold text-[14px]"
              style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
            >
              Destino
            </label>
            <div className="flex gap-[8px] flex-wrap">
              {data.destinos.length === 0 ? (
                <span
                  className="text-[14px]"
                  style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT25 }}
                >
                  Sem nota vinculada
                </span>
              ) : (
                data.destinos.map((dest, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded-[4px] text-[14px] text-white"
                    style={{ fontFamily: 'Inter, sans-serif', backgroundColor: dest.color || PRIMARY_DEFAULT }}
                  >
                    {dest.label}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Datas Row */}
          <div className="flex gap-[16px] items-start w-full">
            <div className="w-[393px]">
              {isEditing ? (
                <FormInput
                  label="Data de Saída"
                  value={data.dataSaida}
                  onChange={(value) => handleChange('dataSaida', value)}
                  type="date"
                />
              ) : (
                <FormInput
                  label="Data de Saída"
                  value={formatDateDisplay(data.dataSaida)}
                  readOnly
                />
              )}
            </div>
            <div className="flex-1">
              {/* Fim da Rota - Sempre readonly */}
              <div className="flex flex-col gap-[8px] w-full">
                <label
                  className="font-semibold text-[14px]"
                  style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT25 }}
                >
                  Fim da Rota
                </label>
                <div
                  className="flex h-[45px] items-center px-[16px] py-[12px] bg-white rounded-[5px] w-full"
                >
                  <div className="flex flex-[1_0_0] items-center gap-[4px]">
                    <span
                      className="font-normal text-[14px]"
                      style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT25, lineHeight: '24px' }}
                    >
                      {data.fimRota}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
          {/* Motorista - Dropdown único */}
          {isEditing ? (
            <FormDropdown
              label="Motorista"
              value={data.motorista?.[0]?.label || ''}
              options={driverOptions.map(d => ({ value: d.label, label: d.label }))}
              onChange={(value) => {
                const selectedDriver = driverOptions.find(d => d.label === value)
                handleChange('motorista', selectedDriver ? [selectedDriver] : [])
              }}
            />
          ) : (
            <div className="flex flex-col gap-[8px]">
              <label
                className="font-semibold text-[14px]"
                style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
              >
                Motorista
              </label>
              <div className="flex gap-[8px] flex-wrap">
                {data.motorista?.map((motor: any, idx: number) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded-[4px] text-[14px] text-white"
                    style={{ fontFamily: 'Inter, sans-serif', backgroundColor: motor.color || SECONDARY_DEFAULT }}
                  >
                    {motor.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Ajudante - Tag Input */}
          {isEditing ? (
            <div className="flex flex-col gap-[8px]">
              <label
                className="font-semibold text-[14px]"
                style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
              >
                Ajudante
              </label>
              {/* Tag Input Container */}
              <div className="flex flex-wrap gap-[8px] p-2 border border-[#0f3255] rounded-[5px] min-h-[45px] items-center">
                {/* Render existing tags */}
                {(data.ajudante || []).map((ajud: any, idx: number) => (
                  <span
                    key={idx}
                    className="flex items-center gap-1 px-2 py-1 rounded-[4px] text-[14px] text-white"
                    style={{ fontFamily: 'Inter, sans-serif', backgroundColor: SECONDARY_DEFAULT }}
                  >
                    <span>{ajud.label}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newAjudantes = (data.ajudante || []).filter((_: any, i: number) => i !== idx)
                        handleChange('ajudante', newAjudantes)
                      }}
                      className="ml-1 text-white hover:text-gray-200 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {/* Input field */}
                <input
                  type="text"
                  placeholder="Digite nomes separados por vírgula"
                  className="flex-1 min-w-[150px] border-none outline-none text-[14px]"
                  style={{ fontFamily: 'Inter, sans-serif', color: TEXT_DARK }}
                  onKeyDown={(e) => {
                    const target = e.target as HTMLInputElement
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      const value = target.value.trim()
                      if (value) {
                        // Split by comma if key is comma, otherwise use the whole value
                        const names = e.key === ',' ? value.split(',').map(n => n.trim()).filter(n => n) : [value]
                        const newAjudantes = [
                          ...(data.ajudante || []),
                          ...names.map((name: string) => ({
                            value: name.toLowerCase().replace(/\s+/g, '-'),
                            label: name,
                            color: SECONDARY_DEFAULT,
                          }))
                        ]
                        handleChange('ajudante', newAjudantes)
                        target.value = ''
                      }
                    } else if (e.key === 'Backspace' && target.value === '' && (data.ajudante || []).length > 0) {
                      // Remove last chip on Backspace when input is empty
                      handleChange('ajudante', (data.ajudante || []).slice(0, -1))
                    }
                  }}
                />
              </div>
              <span className="text-[12px]" style={{ color: TEXT_LIGHT25 }}>
                Digite nomes e pressione Enter ou vírgula para adicionar
              </span>
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
                {data.ajudante?.map((ajud: any, idx: number) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded-[4px] text-[14px] text-white"
                    style={{ fontFamily: 'Inter, sans-serif', backgroundColor: ajud.color || SECONDARY_DEFAULT }}
                  >
                    {ajud.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Carro Row */}
          <div className="flex gap-[16px] h-[70px] items-start w-full">
            <div className="flex-1">
              {/* Placa do Veículo */}
              {isEditing ? (
                <FormDropdown
                  label="Placa do Veículo"
                  value={data.placaVeiculo}
                  options={vehicleOptions}
                  onChange={(value) => handleChange('placaVeiculo', value)}
                />
              ) : (
                <FormInput
                  label="Placa do Veículo"
                  value={data.placaVeiculo}
                  readOnly
                />
              )}
            </div>
            <div className="flex-1">
              {/* Carga Máxima - Sempre readonly */}
              <div className="flex flex-col gap-[8px] w-full">
                <label
                  className="font-semibold text-[14px]"
                  style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT25 }}
                >
                  Carga Máxima
                </label>
                <div
                  className="flex h-[45px] items-center px-[16px] py-[12px] bg-white rounded-[5px] w-full"
                >
                  <div className="flex flex-[1_0_0] items-center gap-[4px]">
                    <span
                      className="font-normal text-[14px]"
                      style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT25, lineHeight: '24px' }}
                    >
                      {data.cargaMaxima ? `${data.cargaMaxima} kg` : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
