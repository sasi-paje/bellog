import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { FilterOption } from '../services/assign-notes.service'

interface MultiSelectProps {
  options: FilterOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
  portalProps?: React.HTMLAttributes<HTMLDivElement>
}

const ORANGE = '#e67c26'
const ORANGE_LIGHT = '#fff4ec'
const DROPDOWN_MAX_H = 220

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecione',
  disabled = false,
  portalProps,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fecha ao clicar fora (trigger OU portal do dropdown)
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (containerRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleToggle = () => {
    if (disabled) return
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      // Abre para cima se não houver espaço suficiente abaixo
      if (spaceBelow >= DROPDOWN_MAX_H + 8) {
        setDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
          zIndex: 9999,
        })
      } else {
        setDropdownStyle({
          position: 'fixed',
          bottom: window.innerHeight - rect.top + 4,
          left: rect.left,
          width: rect.width,
          zIndex: 9999,
        })
      }
    }
    setIsOpen(prev => !prev)
  }

  const toggle = (v: string) => {
    if (value.includes(v)) {
      onChange(value.filter(x => x !== v))
    } else {
      onChange([...value, v])
    }
  }

  const selectedLabels = options
    .filter(o => value.includes(o.value))
    .map(o => o.label)
  const hasValue = selectedLabels.length > 0

  return (
    <div ref={containerRef} className="relative">

      {/* ── Trigger — borda neutra igual aos outros inputs ─────────── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={[
          'h-[36px] px-3 rounded-[4px] border border-[#bdbdbd] text-[13px] bg-white w-full',
          'flex items-center justify-between gap-2',
          'focus:outline-none focus:border-[#4077d9]',
          disabled ? 'opacity-60 cursor-not-allowed bg-[#f5f5f5]' : 'cursor-pointer',
        ].join(' ')}
      >
        {/* Chips ou placeholder */}
        <div className="flex items-center gap-1 overflow-hidden flex-1 min-w-0">
          {hasValue ? (
            <>
              <span
                className="min-w-0 max-w-[110px] truncate rounded-[3px] px-2 py-[2px] text-[11px] font-semibold text-white"
                style={{ backgroundColor: ORANGE }}
              >
                {selectedLabels[0]}
              </span>
              {selectedLabels.length > 1 && (
                <span
                  className="shrink-0 rounded-[3px] px-2 py-[2px] text-[11px] font-semibold text-white"
                  style={{ backgroundColor: ORANGE }}
                >
                  +{selectedLabels.length - 1}
                </span>
              )}
            </>
          ) : (
            <span className="text-[#bdbdbd] truncate">{placeholder}</span>
          )}
        </div>

        {/* Seta laranja — inverte ao abrir */}
        <svg
          className="shrink-0"
          style={{ color: ORANGE }}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d={isOpen ? 'M2 8L6 4L10 8' : 'M2 4L6 8L10 4'}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* ── Dropdown via portal — nunca clipado pelo container pai ─── */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={{ ...dropdownStyle, maxHeight: DROPDOWN_MAX_H }}
          className="bg-white rounded-[4px] shadow-lg overflow-y-auto border border-[#e0e0e0]"
          {...portalProps}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2">
              <span className="text-[12px] text-[#828282]">Nenhuma opção disponível</span>
            </div>
          ) : (
            options.map(opt => {
              const checked = value.includes(opt.value)
              return (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 px-3 py-[9px] cursor-pointer"
                  style={{ backgroundColor: checked ? ORANGE_LIGHT : undefined }}
                  onMouseEnter={e => {
                    if (!checked) (e.currentTarget as HTMLElement).style.backgroundColor = ORANGE_LIGHT
                  }}
                  onMouseLeave={e => {
                    if (!checked) (e.currentTarget as HTMLElement).style.backgroundColor = ''
                  }}
                >
                  {/* Checkbox customizado — nunca azul */}
                  <span
                    className="shrink-0 flex items-center justify-center rounded-[3px]"
                    style={{
                      width: 15,
                      height: 15,
                      border: checked ? 'none' : '1.5px solid #bdbdbd',
                      backgroundColor: checked ? ORANGE : 'white',
                    }}
                  >
                    {checked && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path
                          d="M1 3.5L3.5 6L8 1"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(opt.value)}
                    className="sr-only"
                  />
                  <span
                    className="text-[13px]"
                    style={{ color: '#2a2a2a', fontWeight: checked ? 600 : 400 }}
                  >
                    {opt.label}
                  </span>
                </label>
              )
            })
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
