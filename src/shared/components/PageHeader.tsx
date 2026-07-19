import React, { useState } from 'react'
import { AppIcon } from './AppIcon'
import { UserMenu } from './UserMenu'
import { WhatsNewPanel } from './WhatsNewPanel'

export interface PageHeaderProps {
  title: string
  breadcrumb?: string
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  userName?: string
  userEmail?: string
  userRole?: string
  onLogout?: () => void
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  breadcrumb,
  isSidebarOpen,
  onToggleSidebar,
  userName = 'Leon Kennedy',
  userEmail,
  userRole = 'Usuário',
  onLogout,
}) => {
  const ariaLabel = isSidebarOpen ? 'Recolher sidebar' : 'Expandir sidebar'
  const [newsOpen, setNewsOpen] = useState(false)

  return (
    <div className="flex w-full min-h-[78px] items-center justify-between px-6 py-3 bg-[#ffffff]">
      {/* Left: Toggle + Title/Breadcrumb */}
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={ariaLabel}
          title={ariaLabel}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors hover:bg-gray-100"
        >
          <AppIcon
            name="left_panel_close"
            size={24}
            className={`transition-transform duration-200 ${
              isSidebarOpen ? '' : 'rotate-180'
            }`}
          />
        </button>

        <div className="min-w-0">
          <p className="truncate text-[24px] font-bold text-[#0f3255]">
            {breadcrumb ? (
              <>
                <span className="font-normal">{breadcrumb} &gt; </span>
                <span>{title}</span>
              </>
            ) : (
              <span>{title}</span>
            )}
          </p>
        </div>
      </div>

      {/* Central area - flexible */}
      <div className="flex-1" />

      {/* Right: "O que há de novo?" + User Menu */}
      <div className="flex items-center gap-8">
        <button
          type="button"
          onClick={() => setNewsOpen(true)}
          className="inline-flex items-center gap-2 text-[#4a90e2] transition-colors hover:text-[#357abd]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <span className="text-[14px] font-medium">O que há de novo?</span>
        </button>

        <UserMenu
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          onLogout={onLogout}
        />
      </div>

      <WhatsNewPanel isOpen={newsOpen} onClose={() => setNewsOpen(false)} />
    </div>
  )
}