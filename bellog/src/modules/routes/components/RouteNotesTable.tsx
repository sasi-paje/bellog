import { AppIcon } from '../../../shared/components'
import type { NotaFiscal } from '../data/notas-fiscais.mock'

interface RouteNotesTableProps {
  data: NotaFiscal[]
  onRowClick?: (note: NotaFiscal) => void
}

const TEXT_LIGHT75 = '#2a2a2a'
const TEXT_LIGHT25 = '#919191'
const BORDER_LIGHT = '#7d9dd3'
const BORDER_ROW = '#828282'

const TableHeader = () => (
  <div className="flex h-[32px] items-center w-full border-b border-[#7d9dd3]">
    <div className="flex-[1_0_0] h-full flex items-center px-3 py-4">
      <span className="flex-[1_0_0] font-medium text-[12px]" style={{ color: TEXT_LIGHT75 }}>Fornecedor</span>
    </div>
    <div className="flex-[1_0_0] h-full flex items-center px-3 py-4">
      <span className="font-medium text-[12px] whitespace-nowrap" style={{ color: TEXT_LIGHT75 }}>Destino</span>
    </div>
    <div className="flex-[1_0_0] h-full flex items-center px-3 py-4">
      <span className="font-medium text-[12px] whitespace-nowrap" style={{ color: TEXT_LIGHT75 }}>N° NF</span>
    </div>
    <div className="flex-[1_0_0] h-full flex items-center px-3 py-4">
      <span className="font-medium text-[12px] whitespace-nowrap" style={{ color: TEXT_LIGHT75 }}>N° Caixas</span>
    </div>
    <div className="flex-[1_0_0] h-full flex items-center px-3 py-4">
      <span className="font-medium text-[12px] whitespace-nowrap" style={{ color: TEXT_LIGHT75 }}>Peso Líquido</span>
    </div>
    <div className="flex-[1_0_0] h-full flex items-center px-3 py-4">
      <span className="font-medium text-[12px] whitespace-nowrap" style={{ color: TEXT_LIGHT75 }}>Peso Bruto</span>
    </div>
    <div className="flex-[1_0_0] h-full flex items-center px-3 py-4">
      <span className="font-medium text-[12px] whitespace-nowrap" style={{ color: TEXT_LIGHT75 }}>Valor NF</span>
    </div>
    <div className="flex-[1_0_0] h-full flex items-center px-3 py-4">
      <span className="font-medium text-[12px] whitespace-nowrap" style={{ color: TEXT_LIGHT75 }}>Canhoto</span>
    </div>
    <div className="flex-[1_0_0] h-full flex items-center px-3 py-4">
      <span className="font-medium text-[12px] whitespace-nowrap" style={{ color: TEXT_LIGHT75 }}>NFD</span>
    </div>
    <div className="flex-[1_0_0] h-full flex items-center px-3 py-4">
      <span className="font-medium text-[12px] whitespace-nowrap" style={{ color: TEXT_LIGHT75 }}>Status</span>
    </div>
    <div className="flex-[1_0_0] h-full flex items-center px-3 py-4">
      <span className="font-medium text-[12px] whitespace-nowrap" style={{ color: TEXT_LIGHT75 }}>Motivo</span>
    </div>
    <div className="w-[64px] h-full flex items-center justify-center px-3 py-4">
      <span className="font-medium text-[12px] whitespace-nowrap" style={{ color: TEXT_LIGHT75 }}>Actions</span>
    </div>
  </div>
)

const TableRow = ({ data, onClick }: { data: NotaFiscal; onClick?: (note: NotaFiscal) => void }) => (
  <div
    className={`flex h-[54px] items-center w-full border-b border-[#828282] ${onClick ? 'cursor-pointer hover:bg-[#f5f5f5]' : ''}`}
    onClick={onClick ? () => onClick(data) : undefined}
  >
    <div className="flex-[1_0_0] h-10 flex items-center px-3 py-4">
      <span className="font-medium text-[12px] whitespace-nowrap" style={{ color: TEXT_LIGHT75 }}>{data.fornecedor}</span>
    </div>
    <div className="flex-[1_0_0] h-10 flex items-center px-3 py-4">
      <span className="font-medium text-[12px] whitespace-nowrap" style={{ color: TEXT_LIGHT75 }}>{data.destino}</span>
    </div>
    <div className="flex-[1_0_0] h-10 flex items-center px-3 py-4">
      <span className="font-medium text-[12px] whitespace-nowrap" style={{ color: TEXT_LIGHT75 }}>{data.numNF}</span>
    </div>
    <div className="flex-[1_0_0] h-10 flex items-center px-3 py-4">
      <span className="font-medium text-[12px] whitespace-nowrap" style={{ color: TEXT_LIGHT75 }}>{data.numCaixas}</span>
    </div>
    <div className="flex-[1_0_0] h-10 flex items-center px-3 py-4">
      <span className="font-medium text-[12px] whitespace-nowrap" style={{ color: TEXT_LIGHT75 }}>{data.pesoLiquido}</span>
    </div>
    <div className="flex-[1_0_0] h-10 flex items-center px-3 py-4">
      <span className="font-medium text-[12px] whitespace-nowrap" style={{ color: TEXT_LIGHT75 }}>{data.pesoBruto}</span>
    </div>
    <div className="flex-[1_0_0] h-10 flex items-center px-3 py-4">
      <span className="font-medium text-[12px] whitespace-nowrap" style={{ color: TEXT_LIGHT75 }}>{data.valorNF}</span>
    </div>
    <div className="flex-[1_0_0] h-10 flex items-center px-3 py-4">
      <span className="font-medium text-[12px] whitespace-nowrap" style={{ color: TEXT_LIGHT25 }}>{data.canhoto}</span>
    </div>
    <div className="flex-[1_0_0] h-10 flex items-center px-3 py-4">
      <span className="font-medium text-[12px] whitespace-nowrap" style={{ color: TEXT_LIGHT25 }}>{data.nfd}</span>
    </div>
    <div className="flex-[1_0_0] h-10 flex items-center px-3 py-4">
      <span className="font-medium text-[12px] whitespace-nowrap" style={{ color: TEXT_LIGHT25 }}>{data.status}</span>
    </div>
    <div className="flex-[1_0_0] h-10 flex items-center px-3 py-4">
      <span className="font-medium text-[12px] whitespace-nowrap" style={{ color: TEXT_LIGHT25 }}>{data.motivo}</span>
    </div>
    <div className="w-[64px] h-10 flex items-center justify-center px-3 py-4">
      <div className="w-5 h-5 flex items-center justify-center cursor-pointer">
        <AppIcon name="open_in_new" size={16} color={TEXT_LIGHT75} />
      </div>
    </div>
  </div>
)

export const RouteNotesTable = ({ data, onRowClick }: RouteNotesTableProps) => (
  <div className="flex flex-col w-full">
    <TableHeader />
    {data.map((item) => (
      <TableRow key={item.id} data={item} onClick={onRowClick} />
    ))}
  </div>
)