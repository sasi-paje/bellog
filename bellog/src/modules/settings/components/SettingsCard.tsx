import { AppIcon } from '../../../shared/components'

interface SettingsCardProps {
  title: string
  description?: string
  iconName: string
  onClick?: () => void
}

export const SettingsCard = ({
  title,
  description,
  iconName,
  onClick,
}: SettingsCardProps) => {
  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      role="button"
      tabIndex={0}
      className="
        flex items-center justify-center
        gap-[8px]
        bg-white border border-[#bdbdbd] rounded-[8px]
        w-[200px] h-[80px]
        cursor-pointer select-none
        hover:border-[#4077d9] hover:shadow-md
        transition-all duration-200
      "
    >
      {/* Icon Container */}
      <div className="flex items-center justify-center w-[36px] h-[36px] shrink-0">
        <AppIcon name={iconName as any} size={24} color="#e67c26" />
      </div>

      {/* Text Content */}
      <div className="flex flex-col justify-center gap-[2px] w-[115px]">
        <h3
          className="font-semibold text-[16px] text-[#2a2a2a]"
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '16px',
            fontWeight: 600,
            lineHeight: '16px',
            letterSpacing: '0%',
          }}
        >
          {title}
        </h3>
        {description && (
          <p
            className="font-medium text-[#4c4c4c]"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '10px',
              fontWeight: 500,
              lineHeight: '10px',
              letterSpacing: '0%',
            }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
