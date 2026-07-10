import { useEffect, useRef, useState } from 'react'
import { AppIcon } from '../../../shared/components'

interface Option {
  value: string
  label: string
}

interface PlateFilterDropdownProps {
  options: Option[]
  selected: Option[]
  onChange: (selected: Option[]) => void
  placeholder?: string
  width?: number
}

// Seletor múltiplo compacto de placas, estilizado igual ao input de Data
// (altura 40px, borda #bdbdbd, padding px-3, raio 5px), acrescentando apenas
// o ícone de dropdown e a lista de opções necessários para o seletor.
export const PlateFilterDropdown = ({
  options,
  selected,
  onChange,
  placeholder = 'Todas',
  width = 200,
}: PlateFilterDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const onMouse = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouse)
    return () => document.removeEventListener('mousedown', onMouse)
  }, [isOpen])

  const toggleOption = (option: Option) => {
    const isSelected = selected.some(s => s.value === option.value)
    if (isSelected) {
      onChange(selected.filter(s => s.value !== option.value))
    } else {
      onChange([...selected, option])
    }
  }

  const displayText =
    selected.length === 0
      ? placeholder
      : selected.map(s => s.label).join(', ')

  return (
    <div className="relative" ref={containerRef} style={{ width }}>
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className="h-[40px] w-full px-3 rounded-[5px] border border-[#bdbdbd] bg-white flex items-center justify-between gap-2 text-[14px] focus:outline-none focus:border-[#4077d9]"
      >
        <span className={`truncate ${selected.length === 0 ? 'text-[#919191]' : 'text-[#2a2a2a]'}`}>
          {displayText}
        </span>
        <AppIcon name="keyboard_arrow_down" size={14} color="#0f3255" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#bdbdbd] rounded-[5px] z-50 max-h-[240px] overflow-auto shadow-lg">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-[13px] text-[#919191]" style={{ fontFamily: 'Inter, sans-serif' }}>
              Nenhuma placa
            </div>
          ) : (
            options.map(option => {
              const isSelected = selected.some(s => s.value === option.value)
              return (
                <div
                  key={option.value}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${isSelected ? 'bg-[#eef3fc]' : 'hover:bg-[#f0f0f0]'}`}
                  onClick={() => toggleOption(option)}
                >
                  <AppIcon
                    name={isSelected ? 'check_box' : 'check_box_outline_blank'}
                    size={18}
                    color={isSelected ? '#4077d9' : '#919191'}
                  />
                  <span
                    className="text-[14px] truncate"
                    style={{ fontFamily: 'Inter, sans-serif', fontWeight: isSelected ? 600 : 400, color: '#2a2a2a' }}
                  >
                    {option.label}
                  </span>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
