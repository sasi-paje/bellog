import React, { useState, useEffect } from 'react'
import { AppIcon } from './AppIcon'
import { UserMenu } from './UserMenu'
import { WhatsNewPanel } from './WhatsNewPanel'
import { whatsNewService } from '../../features/whats-new/api/whats-new.service'
import { useWhatsNew } from '../../hooks/useWhatsNew'

// Fallback local (quando não há email): mapa JSON { tela: idVisto }
const WHATS_NEW_SEEN_KEY = 'bellog_whatsnew_seen'

const readLocalSeen = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(WHATS_NEW_SEEN_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {}
  } catch {
    return {}
  }
}

const writeLocalSeen = (map: Record<string, string>) => {
  try {
    localStorage.setItem(WHATS_NEW_SEEN_KEY, JSON.stringify(map))
  } catch {
    /* ignora */
  }
}

export interface PageHeaderProps {
  title: string
  breadcrumb?: string
  isSidebarOpen: boolean
  onToggleSidebar: () => void
  userName?: string
  userEmail?: string
  userRole?: string
  onLogout?: () => void
  /** Chave da tela — filtra as novidades para mostrar só as dela. */
  page?: string
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
  page,
}) => {
  const ariaLabel = isSidebarOpen ? 'Recolher sidebar' : 'Expandir sidebar'
  const [newsOpen, setNewsOpen] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)

  // Novidades desta tela (mais recente primeiro) e a chave de "visto" por tela.
  const pageKey = page || 'global'
  const whatsNewItems = useWhatsNew(page)
  const latestVisibleId = whatsNewItems[0]?.id ?? ''

  // Ao carregar/trocar de tela: se a novidade mais recente DESTA tela ainda não
  // foi vista, marca como não lida e abre o painel automaticamente. "Visto" é por
  // usuário (banco) e por tela, com fallback para localStorage.
  useEffect(() => {
    if (!latestVisibleId) {
      setHasUnread(false)
      return
    }
    let cancelled = false

    const check = async () => {
      const seenDb = userEmail ? (await whatsNewService.getSeenMap(userEmail))[pageKey] : undefined
      const seenLocal = readLocalSeen()[pageKey]
      if (cancelled) return
      const alreadySeen = seenDb === latestVisibleId || seenLocal === latestVisibleId
      if (!alreadySeen) {
        setHasUnread(true)
        setNewsOpen(true)
      } else {
        setHasUnread(false)
      }
    }

    check()
    return () => {
      cancelled = true
    }
  }, [userEmail, pageKey, latestVisibleId])

  const markWhatsNewSeen = () => {
    if (!latestVisibleId) {
      setHasUnread(false)
      return
    }
    if (userEmail) {
      void whatsNewService.setSeen(userEmail, pageKey, latestVisibleId)
    }
    writeLocalSeen({ ...readLocalSeen(), [pageKey]: latestVisibleId })
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

      <WhatsNewPanel isOpen={newsOpen} onClose={closeNews} page={page} items={whatsNewItems} />
    </div>
  )
}