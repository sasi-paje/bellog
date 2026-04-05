import { ReactNode } from 'react'

export interface TableColumn<T> {
  key: keyof T | string
  label: string
  width?: string
  align?: 'left' | 'center' | 'right'
  render?: (row: T, index: number) => ReactNode
}

export interface SharedTableProps<T extends { id: string | number }> {
  columns: TableColumn<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  loading?: boolean
  emptyMessage?: string
}

// Figma Design Tokens
const TEXT_COLOR = '#2a2a2a'
const TEXT_COLOR_LIGHT = '#757575'
const BG_HEADER = '#F0F4F9'
const BG_ZEBRA_1 = '#FFFFFF'
const BG_ZEBRA_2 = '#F0F4F9'
const BORDER_COLOR = '#e0e0e0'
const HOVER_COLOR = '#e8f4fd'

export function SharedTable<T extends { id: string | number }>({
  columns,
  data,
  onRowClick,
  loading = false,
  emptyMessage = 'Nenhum registro encontrado',
}: SharedTableProps<T>) {
  const getAlignment = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return 'text-center'
      case 'right':
        return 'text-right'
      default:
        return 'text-left'
    }
  }

  const getCellAlignment = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return 'justify-center'
      case 'right':
        return 'justify-end'
      default:
        return 'justify-start'
    }
  }

  return (
    <div className="w-full border border-[#e0e0e0] rounded-[8px] overflow-hidden">
      <table className="w-full border-collapse table-fixed">
        <colgroup>
          {columns.map((column) => (
            <col key={String(column.key)} style={{ width: column.width }} />
          ))}
        </colgroup>

        {/* Header */}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={`h-[32px] px-3 ${getAlignment(column.align)}`}
                style={{
                  backgroundColor: BG_HEADER,
                  color: TEXT_COLOR,
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={columns.length}
                className="h-[100px] text-center"
                style={{ color: TEXT_COLOR, fontSize: '14px' }}
              >
                Carregando...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="h-[100px] text-center"
                style={{ color: TEXT_COLOR_LIGHT, fontSize: '14px' }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className="cursor-pointer"
                style={{
                  backgroundColor: index % 2 === 0 ? BG_ZEBRA_1 : BG_ZEBRA_2,
                  height: '40px',
                }}
              >
                {columns.map((column) => {
                  const content = column.render
                    ? column.render(row, index)
                    : String(row[column.key as keyof T] ?? '-')

                  return (
                    <td
                      key={String(column.key)}
                      className={`px-3 ${getCellAlignment(column.align)}`}
                      style={{
                        color: TEXT_COLOR,
                        fontSize: '14px',
                        fontWeight: 400,
                        fontFamily: 'Inter, sans-serif',
                        borderBottom: '1px solid #e0e0e0',
                      }}
                    >
                      {content}
                    </td>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
