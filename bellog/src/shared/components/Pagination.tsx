import { AppIcon } from './AppIcon'

interface PaginationProps {
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
}

const PRIMARY_DARK = '#0f3255'

interface ArrowButtonProps {
  onClick?: () => void
  disabled?: boolean
  children: React.ReactNode
}

const ArrowButton = ({ onClick, disabled = false, children }: ArrowButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="inline-flex h-4 w-4 items-center justify-center transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-30"
  >
    <span style={{ color: PRIMARY_DARK }}>
      {children}
    </span>
  </button>
)

export const Pagination = ({
  currentPage = 1,
  totalPages = 20,
  onPageChange,
}: PaginationProps) => {
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages)

  const handleFirst = () => onPageChange?.(1)
  const handlePrev = () => onPageChange?.(Math.max(1, safeCurrentPage - 1))
  const handleNext = () => onPageChange?.(Math.min(totalPages, safeCurrentPage + 1))
  const handleLast = () => onPageChange?.(totalPages)

  const isFirstPage = safeCurrentPage === 1
  const isLastPage = safeCurrentPage === totalPages

  return (
    <div className="inline-flex h-[55px] items-center gap-[8px] whitespace-nowrap">
      <ArrowButton onClick={handleFirst} disabled={isFirstPage}>
        <AppIcon name="chevrons_left" size={16} color={PRIMARY_DARK} />
      </ArrowButton>

      <ArrowButton onClick={handlePrev} disabled={isFirstPage}>
        <AppIcon name="chevron_left" size={16} color={PRIMARY_DARK} />
      </ArrowButton>

      <div className="inline-flex items-center gap-[8px]">
        <div
          className="inline-flex h-[32px] min-w-[32px] items-center justify-center rounded-[4px] border px-[6px]"
          style={{ borderColor: PRIMARY_DARK }}
        >
          <span
            className="text-center text-[12px] font-bold leading-none"
            style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
          >
            {safeCurrentPage}
          </span>
        </div>

        <span
          className="text-center text-[12px] font-bold leading-none whitespace-nowrap"
          style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_DARK }}
        >
          de {totalPages}
        </span>
      </div>

      <ArrowButton onClick={handleNext} disabled={isLastPage}>
        <AppIcon name="chevron_right" size={16} color={PRIMARY_DARK} />
      </ArrowButton>

      <ArrowButton onClick={handleLast} disabled={isLastPage}>
        <AppIcon name="chevrons_right" size={16} color={PRIMARY_DARK} />
      </ArrowButton>
    </div>
  )
}