import { SharedTable, AppIcon } from '../../../shared/components'
import { RefData } from '../../../hooks/useRefData'

const TEXT_COLOR = '#2A2A2A'
const TEXT_COLOR_LIGHT = '#919191'
const ACTIVE_COLOR = '#4077D9'

const renderText = (value: string | undefined) => (
  <span className="font-medium text-[14px]" style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}>
    {value || '-'}
  </span>
)

const renderStatus = (row: RefData) => {
  const isActive = row.is_active !== false
  return (
    <span
      className="font-bold text-[14px] whitespace-nowrap"
      style={{ fontFamily: 'Inter, sans-serif', color: TEXT_COLOR }}
    >
      {isActive ? 'Ativo' : 'Inativo'}
    </span>
  )
}

interface AbortadasTableProps {
  data: RefData[]
  onToggleActive?: (id: string, isActive: boolean) => void
}

export const AbortadasTable = ({ data, onToggleActive }: AbortadasTableProps) => (
  <SharedTable<RefData>
    columns={[
      { key: 'description', label: 'Motivo', render: (row) => renderText(row.description ?? undefined) },
      { key: 'status', label: 'Status', render: renderStatus },
      {
        key: 'actions',
        label: 'Ações',
        width: '100px',
        align: 'center',
        render: (row) => {
          const isActive = row.is_active !== false
          return (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleActive?.(String(row.id), !isActive)
                }}
                className="flex items-center justify-center w-8 h-8 rounded hover:bg-[#F0F4F9] transition-colors"
              >
                <AppIcon name={isActive ? 'toggle_on' : 'toggle_off'} size={20} color={isActive ? ACTIVE_COLOR : TEXT_COLOR_LIGHT} />
              </button>
              <button
                type="button"
                className="flex items-center justify-center w-8 h-8 rounded hover:bg-[#F0F4F9] transition-colors"
              >
                <AppIcon name="edit" size={18} color={ACTIVE_COLOR} />
              </button>
            </div>
          )
        },
      },
    ]}
    data={data}
    emptyMessage="Nenhum motivo abortado encontrado."
  />
)