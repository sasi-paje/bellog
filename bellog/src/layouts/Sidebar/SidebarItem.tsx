import React from 'react'

export interface SidebarItemProps {
  item: {
    id: string
    label: string
    icon?: React.ReactNode
    isActive?: boolean
  }
  isActive: boolean
  onClick: () => void
  showLabel?: boolean
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ item, isActive, onClick, showLabel = true }) => {
  return (
    <button
      onClick={onClick}
      className="flex w-full h-[40px] items-center justify-center p-[8px] relative"
    >
      <div
        className={`
          flex flex-[1_0_0] gap-3 h-[32px] items-center px-[8px] relative
          ${isActive ? 'bg-white/20 rounded-[4px]' : 'hover:bg-white/10'}
        `}
      >
        {item.icon && (
          <div className={`flex items-center relative shrink-0 ${isActive ? 'text-white' : 'text-white/80'}`}>
            {item.icon}
          </div>
        )}
        {showLabel && (
          <span
            className={`
              font-semibold text-[14px] whitespace-nowrap
              ${isActive ? 'text-white' : 'text-white/80'}
            `}
          >
            {item.label}
          </span>
        )}
      </div>
    </button>
  )
}
