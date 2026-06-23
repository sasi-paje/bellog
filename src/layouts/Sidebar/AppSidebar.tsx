import React from 'react'
import { SidebarItem } from './SidebarItem'
import { AppIcon } from '../../shared/components'

type SidebarMenuItem = {
  id: string
  label: string
  icon?: React.ReactNode
  isActive?: boolean
}

export interface AppSidebarProps {
  isOpen?: boolean
  logo?: React.ReactNode
  collapsedLogo?: React.ReactNode
  dashboardItem?: SidebarMenuItem
  menuItems?: SidebarMenuItem[]
  footerItems: SidebarMenuItem[]
  version?: string
  copyright?: string
  poweredBy?: string
  poweredByLogo?: React.ReactNode
  onItemClick?: (section: string, itemId: string) => void
  onToggle?: () => void
  activeItemId?: string
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  isOpen = true,
  logo,
  collapsedLogo,
  dashboardItem,
  menuItems = [],
  footerItems = [],
  version,
  copyright,
  poweredBy,
  poweredByLogo,
  onItemClick,
  onToggle,
  activeItemId,
}) => {
  const sidebarWidth = isOpen ? 'w-[200px]' : 'w-[48px]'
  const currentLogo = isOpen ? logo : (collapsedLogo ?? logo)

  return (
    <aside
      className={`flex h-screen flex-col overflow-hidden bg-[#161A36] ${sidebarWidth} min-w-[48px] transition-all duration-300`}
    >
      {/* Topo / Logo / Toggle */}
      <div className="px-[8px] pt-[16px] pb-[12px]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-h-[54px] flex-1 items-center justify-center overflow-hidden">
            {currentLogo ? (
              <div
                className={`flex items-center justify-center overflow-hidden transition-all duration-300 ${
                  isOpen ? 'h-[54px] w-[149px]' : 'h-[27px] w-[27px]'
                }`}
              >
                {currentLogo}
              </div>
            ) : null}
          </div>

          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              aria-label={isOpen ? 'Recolher sidebar' : 'Expandir sidebar'}
              className="flex h-8 w-8 items-center justify-center rounded text-white transition-colors hover:bg-white/10"
            >
              <AppIcon
                name="left_panel_close"
                size={20}
                className={`transition-transform duration-300 ${isOpen ? '' : 'rotate-180'}`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Dashboard isolado */}
      <div className="px-[8px]">
        {dashboardItem && (
          <SidebarItem
            item={dashboardItem}
            isActive={activeItemId === dashboardItem.id || !!dashboardItem.isActive}
            onClick={() => onItemClick?.('dashboard', dashboardItem.id)}
            showLabel={isOpen}
          />
        )}
      </div>

      {/* Espaço entre dashboard e grupo principal */}
      <div className="h-[32px]" />

      {/* Grupo principal */}
      <div className="flex flex-col gap-[8px] px-[8px]">
        {menuItems.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            isActive={activeItemId === item.id || !!item.isActive}
            onClick={() => onItemClick?.('menu', item.id)}
            showLabel={isOpen}
          />
        ))}
      </div>

      {/* Espaço flexível central */}
      <div className="flex-[1_0_0]" />

      {/* Rodapé: itens */}
      <div className="flex flex-col gap-[8px] px-[8px] pb-[8px]">
        {footerItems.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            isActive={activeItemId === item.id || !!item.isActive}
            onClick={() => onItemClick?.('footer', item.id)}
            showLabel={isOpen}
          />
        ))}
      </div>

      {/* Versão / copyright */}
      {isOpen && (version || copyright) && (
        <div className="px-[8px] pb-[8px]">
          <div className="flex min-h-[24px] items-center">
            <div className="flex flex-col text-[10px] leading-none text-[#5d7fa0] whitespace-nowrap">
              {version ? <p>{version}</p> : null}
              {copyright ? <p>{copyright}</p> : null}
            </div>
          </div>
        </div>
      )}

      {/* Powered by */}
      {(poweredBy || poweredByLogo) && (
        <div
          className={`mt-auto flex h-[32px] items-center border-t border-[#5d7fa0] ${
            isOpen ? 'px-[16px]' : 'justify-center px-[8px]'
          }`}
        >
          <div className="flex items-center gap-[8px]">
            {poweredByLogo ? (
              <div className="flex h-4 w-4 items-center justify-center">{poweredByLogo}</div>
            ) : null}

            {isOpen && poweredBy ? (
              <span className="text-[10px] leading-4 whitespace-nowrap text-white">
                {poweredBy}
              </span>
            ) : null}
          </div>
        </div>
      )}
    </aside>
  )
}