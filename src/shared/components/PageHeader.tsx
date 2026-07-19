import React, { useState, useEffect } from 'react'
import { AppIcon } from './AppIcon'
import { UserMenu } from './UserMenu'
import { WhatsNewPanel, WHATS_NEW } from './WhatsNewPanel'

// Chave do localStorage com a última novidade vista pelo usuário (por dispositivo)
const WHATS_NEW_SEEN_KEY = 'bellog_whatsnew_seen'
const LATEST_WHATS_NEW_ID = WHATS_NEW[0]?.id ?? ''

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
  const [hasUnread, setHasUnread] = useState(false)

  // Ao carregar: se a novidade mais recente ainda não foi vista neste
  // dispositivo, marca como não lida e abre o painel automaticamente para
  // informar o usuário sobre o que mudou após o deploy.
  useEffect(() => {
    if (!LATEST_WHATS_NEW_ID) return
    let seen: string | null = null
    try {
      seen = localStorage.getItem(WHATS_NEW_SEEN_KEY)
    } catch {
      /* localStorage indisponível — ignora */
    }
    if (seen !== LATEST_WHATS_NEW_ID) {
      setHasUnread(true)
      setNewsOpen(true)
    }
  }, [])

  const markWhatsNewSeen = () => {
    try {
      localStorage.setItem(WHATS_NEW_SEEN_KEY, LATEST_WHATS_NEW_ID)
    } catch {
      /* ignora */
    }
    setHasUnread(false)
  }

  const openNews = () => {
    setNewsOpen(true)
    markWhatsNewSeen()
  }

  const closeNews = () => {
    setNewsOpen(false)
    markWhatsNewSeen()
  }

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
          onClick={openNews}
          className="relative inline-flex items-center gap-2 text-[#4a90e2] transition-colors hover:text-[#357abd]"
        >
          <span className="relative inline-flex">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            {hasUnread && (
              <span
                className="absolute -right-[3px] -top-[3px] h-[8px] w-[8px] rounded-full bg-[#e8791a] ring-2 ring-white"
                aria-hidden="true"
              />
            )}
          </span>
          <span className="text-[14px] font-medium">O que há de novo?</span>
        </button>

        <UserMenu
          userName={userName}
          userEmail={userEmail}
          userRole={userRole}
          onLogout={onLogout}
        />
      </div>

      <WhatsNewPanel isOpen={newsOpen} onClose={closeNews} />
    </div>
  )
}