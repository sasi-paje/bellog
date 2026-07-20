import React, {
  ReactElement,
  ReactNode,
  cloneElement,
  isValidElement,
  useState,
} from 'react'
import { AppSidebar } from './Sidebar'
import { AppIcon } from '../shared/components'
import { usePermissions, PAGE_CODE_BY_SIDEBAR } from '../features/permissions'

// brand
import bellogLogo from '../shared/icons/brand/bellog-logo.svg'
import bellogLogoMini from '../shared/icons/brand/bellog-logo-mini.svg'
import sasiLogo from '../shared/icons/brand/sasi-logo.svg'

type AppPage = string
type NavigateFn = (page: AppPage) => void

interface MainLayoutProps {
  children: ReactNode
  currentPage: string
  onNavigate?: NavigateFn
}

type SidebarContextProps = {
  isSidebarOpen: boolean
  onToggleSidebar: () => void
}

export const MainLayout = ({
  children,
  currentPage,
  onNavigate,
}: MainLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const { can } = usePermissions()

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev)
  }

  const handleSidebarItemClick = (_section: string, itemId: string) => {
    if (!onNavigate) return

    const pageMap: Record<string, string> = {
      dashboard: 'dashboard',
      rotas: 'routes',
      notas: 'notes',
      'rotas-notas': 'routes-by-notes',
      'atribuir-notas': 'assign-notes',
      usuarios: 'users',
      configuracoes: 'settings-home',
    }

    const nextPage = pageMap[itemId]
    if (nextPage) onNavigate(nextPage)
  }

  const dashboardItem = {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <AppIcon name="dashboard" size={24} />,
    isActive: currentPage === 'dashboard',
  }

  const menuItems = [
    {
      id: 'rotas',
      label: 'Rotas',
      icon: <AppIcon name="road" size={24} />,
      isActive: currentPage === 'routes',
    },
    {
      id: 'notas',
      label: 'Notas',
      icon: <AppIcon name="contract" size={24} />,
      isActive: currentPage === 'notes',
    },
    {
      id: 'rotas-notas',
      label: 'Notas por Rota',
      icon: <AppIcon name="event_list" size={24} />,
      isActive: currentPage === 'routes-by-notes',
    },
    {
      id: 'atribuir-notas',
      label: 'Atribuir Notas',
      icon: <AppIcon name="dataset_linked" size={24} />,
      isActive: currentPage === 'assign-notes',
    },
  ]

  const footerItems = [
    {
      id: 'usuarios',
      label: 'Usuários',
      icon: <AppIcon name="group" size={24} />,
      isActive: currentPage === 'users',
    },
    {
      id: 'configuracoes',
      label: 'Configurações',
      icon: <AppIcon name="settings" size={24} />,
      isActive: currentPage.startsWith('settings'),
    },
  ]

  const sidebarContext: SidebarContextProps = {
    isSidebarOpen,
    onToggleSidebar: handleToggleSidebar,
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar
        isOpen={isSidebarOpen}
        logo={
          <img
            src={bellogLogo}
            alt="Bellog Logo"
            className="h-full w-full object-contain"
          />
        }
        collapsedLogo={
          <img
            src={bellogLogoMini}
            alt="Bellog Logo Mini"
            className="h-full w-full object-contain"
          />
        }
        dashboardItem={dashboardItem}
        menuItems={menuItems.filter((i) => can(PAGE_CODE_BY_SIDEBAR[i.id], 'view'))}
        footerItems={footerItems.filter((i) => can(PAGE_CODE_BY_SIDEBAR[i.id], 'view'))}
        version="v.2.01"
        copyright="Copyright © 2025 SASI LTDA"
        poweredBy="Powered by SASI"
        poweredByLogo={
          <img
            src={sasiLogo}
            alt="SASI Logo"
            className="h-full w-full object-contain"
          />
        }
        onItemClick={handleSidebarItemClick}
        activeItemId={currentPage}
      />

      <main className="flex h-screen flex-1 flex-col overflow-hidden bg-white">
        {isValidElement(children)
          ? cloneElement(children, {
              ...(children.props || {}),
              ...sidebarContext,
            })
          : children}
      </main>
    </div>
  )
}
