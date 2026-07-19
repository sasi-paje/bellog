import { SearchInput, FilterButton, ToolbarButton, ToolbarTokens } from '../components'

export interface PageToolbarProps {
  /** Search configuration */
  search?: {
    placeholder?: string
    value?: string
    onChange?: (value: string) => void
    onSearch?: (value: string) => void
    width?: string
  }

  /** Filter buttons (multiple) */
  filters?: Array<{
    isActive?: boolean
    label?: string
    onClick: () => void
  }>

  /** Seletor "Registros por página" ao lado dos filtros */
  pageSize?: {
    value: number
    options?: number[]
    onChange: (value: number) => void
  }

  /** Action buttons (multiple) */
  actions?: Array<{
    label: string
    icon?: string
    variant?: 'primary' | 'secondary' | 'default'
    onClick: () => void
    disabled?: boolean
  }>

  /** Back button */
  back?: {
    label: string
    onClick: () => void
  }

  /** Loading state */
  loading?: boolean
}

export const PageToolbar = ({
  search,
  filters = [],
  actions = [],
  back,
  loading = false,
  pageSize,
}: PageToolbarProps) => {
  const hasSearch = search?.onSearch !== undefined

  return (
    <div
      className="flex items-center justify-between shrink-0 flex-wrap gap-y-2"
      style={{
        padding: `${ToolbarTokens.PADDING_CONTAINER_Y} ${ToolbarTokens.PADDING_CONTAINER_X}`,
      }}
    >
      {/* Left: Search + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {hasSearch && (
          <SearchInput
            placeholder={search.placeholder || 'Buscar...'}
            width={search.width || '360px'}
            value={search.value || ''}
            onChange={search.onChange || (() => {})}
            onSearch={search.onSearch || (() => {})}
          />
        )}
        {filters.map((filter, index) => (
          <FilterButton
            key={index}
            isActive={filter.isActive}
            onClick={filter.onClick}
          />
        ))}
        {pageSize && (
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[#6b7280] whitespace-nowrap">Registros por página</span>
            <div className="inline-flex items-center gap-1 rounded-[8px] bg-[#f0f0f0] p-1">
              {(pageSize.options ?? [20, 50, 100]).map((opt) => {
                const active = pageSize.value === opt
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => pageSize.onChange(opt)}
                    aria-pressed={active}
                    className={`min-w-[40px] h-[30px] px-3 rounded-[6px] text-[13px] font-semibold transition-colors ${
                      active
                        ? 'bg-white text-[#2a2a2a] shadow-sm'
                        : 'bg-transparent text-[#919191] hover:text-[#2a2a2a]'
                    }`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {back && (
          <ToolbarButton
            label={back.label}
            variant="secondary"
            onClick={back.onClick}
          />
        )}
        {actions.map((action, index) => (
          <ToolbarButton
            key={index}
            label={action.label}
            icon={action.icon}
            variant={action.variant as 'primary' | 'secondary' | 'default' || 'primary'}
            onClick={action.onClick}
            disabled={action.disabled}
          />
        ))}
      </div>
    </div>
  )
}

// Exemplo de uso:
// <PageToolbar
//   search={{
//     placeholder: 'Busque por placa...',
//     value: search,
//     onChange: setSearch,
//     onSearch: setSearch,
//     width: '400px'
//   }}
//   filters={[
//     { isActive: showActive, onClick: () => setShowActive(!showActive) }
//   ]}
//   actions={[
//     { label: 'Importar', icon: 'upload', variant: 'secondary', onClick: handleImport },
//     { label: 'Novo', icon: 'add', variant: 'primary', onClick: handleAdd }
//   ]}
//   back={{ label: 'Voltar', onClick: handleBack }}
// />

export default PageToolbar
