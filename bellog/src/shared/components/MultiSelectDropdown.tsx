import { AppIcon } from './AppIcon'

interface Option {
  value: string
  label: string
  color?: string
}

interface MultiSelectDropdownProps {
  label: string
  options: Option[]
  selectedOptions: Option[]
  onChange?: (selected: Option[]) => void
  optional?: boolean
}

const PRIMARY_DARK = '#0f3255'
const SECONDARY = '#4077d9'

export const MultiSelectDropdown = ({
  label,
  options,
  selectedOptions,
  onChange,
  optional = false,
}: MultiSelectDropdownProps) => {
  return (
    <div className="flex flex-col gap-[8px] w-full">
      <label
        className="font-semibold text-[14px]"
        style={{
          fontFamily: 'Inter, sans-serif',
          color: optional ? '#161a36' : PRIMARY_DARK,
          lineHeight: '24px',
        }}
      >
        {label}
        {optional && (
          <span style={{ color: '#919191' }}> (Opcional)</span>
        )}
      </label>
      <div
        className="flex h-[45px] items-center px-[16px] py-[12px] bg-white border border-[#0f3255] rounded-[5px] w-full cursor-pointer"
        data-name="Input"
      >
        <div className="flex flex-[1_0_0] items-center gap-[8px]">
          {selectedOptions.map((option, index) => (
            <div
              key={index}
              className="flex items-center justify-center px-[8px] rounded-[4px]"
              style={{ backgroundColor: option.color || SECONDARY }}
            >
              <span
                className="font-normal text-[14px] text-white whitespace-nowrap"
                style={{ fontFamily: 'Inter, sans-serif', lineHeight: '24px' }}
              >
                {option.label}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center w-[24px] h-[24px]">
          <AppIcon name="keyboard_arrow_down" size={14} color={PRIMARY_DARK} />
        </div>
      </div>
    </div>
  )
}