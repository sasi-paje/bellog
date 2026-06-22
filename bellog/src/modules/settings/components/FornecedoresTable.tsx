import { AppIcon } from '../../../shared/components'
import { CompanyWithAddress } from '../../../features/companies'

interface FornecedoresTableProps {
  data?: CompanyWithAddress[]
  onRowClick?: (company: CompanyWithAddress) => void
}

const COLUMNS = [
  { label: 'Razão Social', width: '220px' },
  { label: 'Nome de Exibição', width: '190px' },
  { label: 'Grupo', width: '160px' },
  { label: 'E-mail', width: '190px' },
  { label: 'Município', width: '160px' },
  { label: 'Estado', width: '100px' },
  { label: 'Status', width: '110px' },
  { label: 'Ações', width: '70px' },
]

export const FornecedoresTable: React.FC<FornecedoresTableProps> = ({ data = [], onRowClick }) => {
  const getAddress = (row: CompanyWithAddress) => row.addresses?.[0]

  return (
    <div className="w-full rounded-md border border-[#E5E7EB]">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col style={{ width: '18%' }} />
          <col style={{ width: '16%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '16%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '7%' }} />
        </colgroup>

        <thead>
          <tr style={{ backgroundColor: '#F3F6FA', height: '40px' }}>
            {COLUMNS.map((col) => (
              <th
                key={col.label}
                className="px-4 py-2 text-left text-[12px] font-semibold text-[#1F2937]"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={COLUMNS.length}
                className="h-[100px] text-center text-[14px]"
                style={{ color: '#9E9E9E', fontFamily: 'Inter, sans-serif' }}
              >
                Nenhum fornecedor encontrado.
              </td>
            </tr>
          ) : (
            data.map((row, index) => {
              const addr = getAddress(row)
              return (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className="cursor-pointer transition-colors hover:bg-[#E8F4FD]"
                  style={{
                    backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F3F6FA',
                    height: '44px',
                  }}
                >
                  {/* Razão Social */}
                  <td
                    className="px-4 py-2 text-[14px] font-medium text-[#1F2937]"
                    style={{ fontFamily: 'Inter, sans-serif', borderBottom: '1px solid #E5E7EB' }}
                  >
                    <span className="block truncate" title={row.legal_name ?? ''}>
                      {row.legal_name || '-'}
                    </span>
                  </td>

                  {/* Nome de Exibição */}
                  <td
                    className="px-4 py-2 text-[14px] font-medium text-[#1F2937]"
                    style={{ fontFamily: 'Inter, sans-serif', borderBottom: '1px solid #E5E7EB' }}
                  >
                    <span className="block truncate" title={row.trade_name ?? ''}>
                      {row.trade_name || '-'}
                    </span>
                  </td>

                  {/* Grupo */}
                  <td
                    className="px-4 py-2 text-[14px] font-medium text-[#1F2937]"
                    style={{ fontFamily: 'Inter, sans-serif', borderBottom: '1px solid #E5E7EB' }}
                  >
                    <span className="block truncate" title={row.company_group?.name ?? ''}>
                      {row.company_group?.name || '-'}
                    </span>
                  </td>

                  {/* E-mail */}
                  <td
                    className="px-4 py-2 text-[14px] font-medium text-[#1F2937]"
                    style={{ fontFamily: 'Inter, sans-serif', borderBottom: '1px solid #E5E7EB' }}
                  >
                    <span className="block truncate" title={row.email ?? ''}>
                      {row.email || '-'}
                    </span>
                  </td>

                  {/* Município */}
                  <td
                    className="px-4 py-2 text-[14px] font-medium text-[#1F2937]"
                    style={{ fontFamily: 'Inter, sans-serif', borderBottom: '1px solid #E5E7EB' }}
                  >
                    <span className="block truncate" title={addr?.city ?? ''}>
                      {addr?.city || '-'}
                    </span>
                  </td>

                  {/* Estado */}
                  <td
                    className="px-4 py-2 text-[14px] font-medium text-[#1F2937]"
                    style={{ fontFamily: 'Inter, sans-serif', borderBottom: '1px solid #E5E7EB' }}
                  >
                    {addr?.state || '-'}
                  </td>

                  {/* Status */}
                  <td
                    className="px-4 py-2 text-[14px] font-bold"
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontStyle: 'normal',
                      lineHeight: 'normal',
                      color: '#2A2A2A',
                      borderBottom: '1px solid #E5E7EB',
                    }}
                  >
                    {row.is_active ? 'Ativo' : 'Inativo'}
                  </td>

                  {/* Ações */}
                  <td
                    className="px-4 py-2 text-center"
                    style={{ borderBottom: '1px solid #E5E7EB' }}
                  >
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRowClick?.(row)
                        }}
                        className="flex items-center justify-center w-8 h-8 rounded hover:bg-[#F0F4F9] transition-colors"
                      >
                        <AppIcon name="edit" size={18} color="#1F2937" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
