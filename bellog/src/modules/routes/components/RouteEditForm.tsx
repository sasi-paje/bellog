import { FormInput, FormDropdown } from '../../../shared/components'

interface RouteEditFormProps {
  data: {
    status: string
    statusEntrega: string
    numeroRota: string
    areaRota: string
    responsaveis: string
    destinos: { value: string; label: string }[]
    tipoRota: string
    dataSaida: string
    fimRota: string
    motorista: string
    ajudante: string
    placaVeiculo: string
    cargaMaxima: string
  }
  isEditing?: boolean
  onChange?: (field: string, value: any) => void
  driverOptions?: { value: string; label: string }[]
  vehicleOptions?: { value: string; label: string }[]
  capacityOptions?: { value: string; label: string }[]
  routeStatusOptions?: { value: string; label: string }[]
  deliveryStatusOptions?: { value: string; label: string }[]
}

const PRIMARY_DARK = '#161a36'
const TEXT_LIGHT75 = '#2a2a2a'
const TEXT_LIGHT25 = '#919191'

export const RouteEditForm = ({ data, isEditing = false, onChange, driverOptions = [], vehicleOptions = [], capacityOptions = [], routeStatusOptions = [], deliveryStatusOptions = [] }: RouteEditFormProps) => {
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
              <FormDropdown
                label="Status"
                value={data.status || ''}
                options={routeStatusOptions.length > 0 ? routeStatusOptions : [
                  { value: '', label: 'Selecione o status' },
                ]}
                onChange={isEditing ? (v) => onChange?.('status', v) : undefined}
                readOnly={!isEditing}
              />
            </div>
            <div className="flex-1">
              <FormDropdown
                label="Status da Entrega"
                value={data.statusEntrega || ''}
                options={deliveryStatusOptions.length > 0 ? deliveryStatusOptions : [
                  { value: '', label: 'Selecione o status' },
                ]}
                onChange={isEditing ? (v) => onChange?.('statusEntrega', v) : undefined}
                readOnly={!isEditing}
              />
            </div>
          </div>

          {/* Número da Rota */}
          <FormInput
            label="Número da rota"
            value={data.numeroRota}
            onChange={isEditing ? (v) => onChange?.('numeroRota', v) : undefined}
            readOnly={!isEditing}
          />

          {/* Área da Rota */}
          <FormInput
            label="Área da Rota"
            value={data.areaRota}
            onChange={isEditing ? (v) => onChange?.('areaRota', v) : undefined}
            readOnly={!isEditing}
          />

          {/* Responsável - Dropdown com opções fixas */}
          <FormDropdown
            label="Responsável"
            value={data.responsaveis}
            options={[
              { value: 'Bellog', label: 'Bellog' },
              { value: 'Danone', label: 'Danone' },
            ]}
            onChange={isEditing ? (v) => onChange?.('responsaveis', v) : undefined}
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
                    className="inline-flex items-center px-3 py-1 rounded-full bg-[#4077d9] text-white text-[12px] font-medium"
                  >
                    {dest.label}
                  </span>
                ))
              ) : (
                <span className="text-[14px]" style={{ color: TEXT_LIGHT25 }}>
                  Nenhum destino selecionado
                </span>
              )}
            </div>
          </div>

          {/* Data de Saída - Input com calendário */}
          <FormInput
            label="Data de Saída"
            value={data.dataSaida}
            type="date"
            onChange={isEditing ? (v) => onChange?.('dataSaida', v) : undefined}
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
            onChange={isEditing ? (v) => onChange?.('motorista', v) : undefined}
            readOnly={!isEditing}
          />

          {/* Ajudante - Input de texto livre (vírgula para separar) */}
          <FormInput
            label="Ajudante"
            value={data.ajudante}
            placeholder="Separar nomes com vírgula"
            onChange={isEditing ? (v) => onChange?.('ajudante', v) : undefined}
            readOnly={!isEditing}
          />

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
