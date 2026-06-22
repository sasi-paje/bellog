import { SharedTable, AppIcon } from '../../../shared/components'
import { MotivosData } from '../../../hooks/useMotivos'

const TEXT_COLOR = '#2A2A2A'

const renderText = (value: string | undefined) => (
  <span className="font-medium text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
    {value || '-'}
  </span>
)

const renderStatus = (row: MotivosData) => (
  <span
    className="font-bold text-[14px] whitespace-nowrap"
    style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}
  >
    {row.isActive ? 'Ativo' : 'Inativo'}
  </span>
)

interface RecusasTableProps {
  data: MotivosData[]
  onToggleActive?: (id: string, isActive: boolean) => void
  onEdit?: (row: MotivosData) => void
}

export const RecusasTable = ({ data, onEdit }: RecusasTableProps) => (
  <SharedTable<MotivosData>
    onRowClick={onEdit}
    columns={[
      { key: 'motivo', label: 'Motivo', render: (row) => renderText(row.motivo) },
      { key: 'categoria', label: 'Categoria', render: (row) => renderText(row.categoria) },
      { key: 'tipoEntrega', label: 'Tipo de Entrega', render: (row) => renderText(row.tipoEntrega) },
      { key: 'status', label: 'Status', render: renderStatus },
      {
        key: 'acoes',
        label: 'Ações',
        width: '70px',
        align: 'center',
        render: (row) => (
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onEdit?.(row)
              }}
              className="flex items-center justify-center w-8 h-8 rounded hover:bg-[#F0F4F9] transition-colors"
            >
              <AppIcon name="edit" size={18} color="#1F2937" />
            </button>
          </div>
        ),
      },
    ]}
    data={data}
    emptyMessage="Nenhum motivo encontrado."
  />
)
