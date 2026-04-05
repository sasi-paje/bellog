import { useState } from 'react'
import { Tabs, TabId } from '../../../shared/components'
import { FormInput, FormDropdown } from '../../../shared/components'

interface RouteNoteDetailProps {
  notaId: string
  onBack: () => void
}

const PRIMARY_DARK = '#0f3255'
const TEXT_LIGHT75 = '#2a2a2a'

const TABS = [
  { id: 'dados-nota' as TabId, label: 'Dados de Nota' },
  { id: 'anexos' as TabId, label: 'Anexos' },
]

const notaData = {
  status: 'Entrega Total',
  numeroNota: '123123',
  quantidadeCaixas: '200',
  localEntrega: 'Empresa A1',
  fornecedor: 'Fornecedor B1',
  pesoLiquido: '480',
  pesoBruto: '500',
}

export const RouteNoteDetail = ({ notaId, onBack }: RouteNoteDetailProps) => {
  const [activeTab, setActiveTab] = useState<TabId>('dados-nota')

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Breadcrumb */}
      <div>
        <span className="font-normal text-[22px]" style={{ color: PRIMARY_DARK }}>
          Notas Fiscais &gt;
        </span>
        <span className="font-bold text-[22px]" style={{ color: PRIMARY_DARK }}>
          Nota
        </span>
        <span className="text-[22px]" style={{ color: PRIMARY_DARK }}>
          {' '}
        </span>
        <span className="font-bold text-[22px]" style={{ color: PRIMARY_DARK }}>
          {notaId}
        </span>
      </div>

      {/* Tabs */}
      <div className="bg-white flex h-[52px] items-center justify-start w-full">
        <div className="flex flex-[1_0_0] gap-[8px] h-full items-center">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex h-full items-center justify-center px-[16px] py-[8px] relative shrink-0 ${
                  isActive ? 'border-b-2 border-solid' : ''
                }`}
                style={{
                  borderColor: isActive ? '#e67c26' : 'transparent',
                }}
              >
                <span
                  className="font-medium leading-[24px] text-[14px] whitespace-nowrap"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    color: '#161a36',
                  }}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4">
        {/* Status */}
        <div className="flex flex-col gap-2 w-full">
          <label
            className="font-semibold text-[14px]"
            style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT75 }}
          >
            Status
          </label>
          <div className="flex h-[45px] items-center px-[16px] py-[12px] bg-white rounded-[5px] w-full">
            <span
              className="font-normal text-[14px]"
              style={{ fontFamily: 'Inter, sans-serif', color: TEXT_LIGHT75, lineHeight: '24px' }}
            >
              {notaData.status}
            </span>
          </div>
        </div>

        {/* Dados da Nota Section */}
        <div className="flex flex-col gap-2">
          <h3
            className="font-semibold text-[20px]"
            style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
          >
            Dados da Nota
          </h3>

          {/* Número da nota */}
          <FormInput
            label="Número da nota"
            value={notaData.numeroNota}
          />

          {/* Quantidade de Caixas */}
          <FormInput
            label="Quantidade de Caixas"
            value={notaData.quantidadeCaixas}
          />

          {/* Local da entrega e Fornecedor */}
          <div className="flex gap-4 h-[70px] items-start w-full">
            <div className="flex-1">
              <FormDropdown
                label="Local da entrega"
                value={notaData.localEntrega}
                options={[
                  { value: 'Empresa A1', label: 'Empresa A1' },
                  { value: 'Empresa B2', label: 'Empresa B2' },
                ]}
              />
            </div>
            <div className="flex-1">
              <FormDropdown
                label="Fornecedor"
                value={notaData.fornecedor}
                options={[
                  { value: 'Fornecedor B1', label: 'Fornecedor B1' },
                  { value: 'Fornecedor C2', label: 'Fornecedor C2' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Peso do Produto Section */}
        <div className="flex flex-col gap-2 w-full">
          <h3
            className="font-semibold text-[20px]"
            style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
          >
            Peso do Produto
          </h3>

          <div className="flex gap-2 items-start w-full">
            <div className="flex-1">
              <FormInput
                label="Peso Líquido"
                value={notaData.pesoLiquido}
              />
            </div>
            <div className="flex-1">
              <FormInput
                label="Peso Bruto"
                value={notaData.pesoBruto}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions - rendered inside component for proper layout */}
      <div className="flex items-center justify-between h-[45px] w-full mt-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] border border-[#4077d9] bg-white w-[150px]"
        >
          <span
            className="font-bold text-[14px]"
            style={{ fontFamily: 'Inter, sans-serif', color: '#4077d9' }}
          >
            Voltar
          </span>
        </button>
        <button
          type="button"
          onClick={() => {}}
          className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] border border-[#eb5757] bg-white gap-2"
        >
          <span className="material-symbols-outlined text-[#eb5757]" style={{ fontSize: '24px' }}>
            do_not_disturb_on
          </span>
          <span
            className="font-bold text-[14px]"
            style={{ fontFamily: 'Inter, sans-serif', color: '#eb5757' }}
          >
            Desassociar Nota
          </span>
        </button>
      </div>
    </div>
  )
}