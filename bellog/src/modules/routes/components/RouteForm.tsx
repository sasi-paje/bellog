import { FormInput, FormDropdown, MultiSelectDropdown } from '../../../shared/components'
import { CargaMock } from '../../cargas/data/cargas.mock'

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
  onChange?: (field: string, value: any) => void
}

const PRIMARY_DARK = '#161a36'
const TEXT_LIGHT75 = '#2a2a2a'
const TEXT_LIGHT25 = '#919191'
const SECONDARY_DEFAULT = '#e67c26'
const PRIMARY_DEFAULT = '#4077d9'

// Campos que não podem ser editados (read-only)
const READONLY_FIELDS = ['destinos', 'fimRota', 'cargaMaxima']

export const RouteForm = ({ data, isEditing = false, onChange }: RouteFormProps) => {
  const handleChange = (field: string, value: any) => {
    if (onChange && !READONLY_FIELDS.includes(field)) {
      onChange(field, value)
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
          {/* Status Row */}
          <div className="flex gap-[16px] w-full">
            <div className="flex-1">
              {isEditing ? (
                <FormDropdown
                  label="Status"
                  value={data.status}
                  options={[
                    { value: 'Aberta', label: 'Aberta' },
                    { value: 'Fechada', label: 'Fechada' },
                    { value: 'Em Andamento', label: 'Em Andamento' },
                  ]}
                  onChange={(value) => handleChange('status', value)}
                />
              ) : (
                <FormInput
                  label="Status"
                  value={data.status}
                  readOnly
                />
              )}
            </div>
            <div className="flex-1">
              {isEditing ? (
                <FormDropdown
                  label="Status da Entrega"
                  value={data.statusEntrega}
                  options={[
                    { value: 'Em Andamento', label: 'Em Andamento' },
                    { value: 'Entregue', label: 'Entregue' },
                    { value: 'Pendente', label: 'Pendente' },
                  ]}
                  onChange={(value) => handleChange('statusEntrega', value)}
                />
              ) : (
                <FormInput
                  label="Status da Entrega"
                  value={data.statusEntrega}
                  readOnly
                />
              )}
            </div>
          </div>

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

          {/* Responsável - Multi Select */}
          {isEditing ? (
            <MultiSelectDropdown
              label="Responsável"
              options={[
                { value: 'jose-dias', label: 'José Dias', color: SECONDARY_DEFAULT },
                { value: 'antonio-simas', label: 'Antônio Simas', color: SECONDARY_DEFAULT },
              ]}
              selectedOptions={data.responsaveis}
              onChange={(options) => handleChange('responsaveis', options)}
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
              {data.destinos.map((dest, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 rounded-[4px] text-[14px] text-white"
                  style={{ fontFamily: 'Inter, sans-serif', backgroundColor: dest.color || PRIMARY_DEFAULT }}
                >
                  {dest.label}
                </span>
              ))}
            </div>
          </div>

          {/* Tipo da Rota */}
          {isEditing ? (
            <FormDropdown
              label="Tipo da Rota"
              value={data.tipoRota}
              options={[
                { value: 'Entrega', label: 'Entrega' },
                { value: 'Coleta', label: 'Coleta' },
                { value: 'Ambos', label: 'Ambos' },
              ]}
              onChange={(value) => handleChange('tipoRota', value)}
            />
          ) : (
            <FormInput
              label="Tipo da Rota"
              value={data.tipoRota}
              readOnly
            />
          )}

          {/* Datas Row */}
          <div className="flex gap-[16px] items-start w-full">
            <div className="w-[393px]">
              {isEditing ? (
                <FormInput
                  label="Data de Saída"
                  value={data.dataSaida}
                  onChange={(value) => handleChange('dataSaida', value)}
                />
              ) : (
                <FormInput
                  label="Data de Saída"
                  value={data.dataSaida}
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
                  className="flex h-[45px] items-center px-[16px] py-[12px] bg-white rounded-[5px] w-full border border-[#e0e0e0]"
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
          {/* Motorista - Multi Select */}
          {isEditing ? (
            <MultiSelectDropdown
              label="Motorista"
              options={[
                { value: 'andre-pereira', label: 'André Pereira', color: SECONDARY_DEFAULT },
                { value: 'manuel', label: 'Manuel', color: SECONDARY_DEFAULT },
              ]}
              selectedOptions={data.motorista}
              onChange={(options) => handleChange('motorista', options)}
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
                {data.motorista.map((motor, idx) => (
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

          {/* Ajudante - Multi Select */}
          {isEditing ? (
            <MultiSelectDropdown
              label="Ajudante"
              options={[
                { value: 'rafael', label: 'Rafael', color: SECONDARY_DEFAULT },
                { value: 'gabriel', label: 'Gabriel', color: SECONDARY_DEFAULT },
              ]}
              selectedOptions={data.ajudante}
              onChange={(options) => handleChange('ajudante', options)}
            />
          ) : (
            <div className="flex flex-col gap-[8px]">
              <label
                className="font-semibold text-[14px]"
                style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
              >
                Ajudante
              </label>
              <div className="flex gap-[8px] flex-wrap">
                {data.ajudante.map((ajud, idx) => (
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
                  options={[
                    { value: 'B1AHSJ2', label: 'B1AHSJ2' },
                    { value: 'XYZ1234', label: 'XYZ1234' },
                  ]}
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
                  className="flex h-[45px] items-center px-[16px] py-[12px] bg-white rounded-[5px] w-full border border-[#e0e0e0]"
                >
                  <div className="flex flex-[1_0_0] items-center gap-[4px]">
                    <span
                      className="font-normal text-[14px]"
                      style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT25, lineHeight: '24px' }}
                    >
                      {data.cargaMaxima}
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
