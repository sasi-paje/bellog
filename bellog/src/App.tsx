import { useState, useEffect } from 'react'
import { MainLayout } from './layouts'
import {
  SettingsHomePage,
  SupplierPage,
  CargosPage,
  RecusasPage,
  AbortadasPage,
  DestinosPage,
  MotoristasPage,
} from './modules/settings'
import { RoutesPage } from './modules/routes'
import { NotesPage } from './modules/notes'
import { AssignNotesPage } from './modules/assign-notes'
import { CargasPage } from './modules/cargas'
import { VehiclesPage } from './modules/vehicles'

type AppPage = 'settings-home' | 'settings-vehicles' | 'settings-suppliers' | 'settings-cargos' | 'settings-recusas' | 'settings-abortadas' | 'settings-destinos' | 'settings-motoristas' | 'routes' | 'notes' | 'assign-notes' | 'cargas' | 'vehicles'

// Safe localStorage getter
const getInitialPage = (): AppPage => {
  try {
    const saved = localStorage.getItem('bellog-current-page')
    if (saved && [
      'settings-home',
      'settings-vehicles',
      'settings-suppliers',
      'settings-cargos',
      'settings-recusas',
      'settings-abortadas',
      'settings-destinos',
      'settings-motoristas',
      'routes',
      'notes',
      'assign-notes',
      'cargas',
      'vehicles',
    ].includes(saved)) {
      return saved as AppPage
    }
  } catch {
    // localStorage not available
  }
  return 'settings-home'
}

function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>(getInitialPage)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  // Persistir a página atual no localStorage quando mudar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bellog-current-page', currentPage)
    }
  }, [currentPage])

  const handleNavigation = (page: AppPage) => {
    setCurrentPage(page)
  }

  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const sidebarProps = {
    isSidebarOpen,
    onToggleSidebar: handleToggleSidebar,
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'cargas':
        return <CargasPage {...sidebarProps} />
      case 'routes':
        return <RoutesPage {...sidebarProps} />
      case 'notes':
        return <NotesPage {...sidebarProps} />
      case 'assign-notes':
        return <AssignNotesPage {...sidebarProps} />
      case 'vehicles':
        return <VehiclesPage {...sidebarProps} />
      case 'settings-vehicles':
        return <VehiclesPage {...sidebarProps} />
      case 'settings-suppliers':
        return <SupplierPage {...sidebarProps} onBack={() => setCurrentPage('settings-home')} />
      case 'settings-cargos':
        return <CargosPage {...sidebarProps} onBack={() => setCurrentPage('settings-home')} />
      case 'settings-recusas':
        return <RecusasPage {...sidebarProps} onBack={() => setCurrentPage('settings-home')} />
      case 'settings-abortadas':
        return <AbortadasPage {...sidebarProps} onBack={() => setCurrentPage('settings-home')} />
      case 'settings-destinos':
        return <DestinosPage {...sidebarProps} onBack={() => setCurrentPage('settings-home')} />
      case 'settings-motoristas':
        return <MotoristasPage {...sidebarProps} onBack={() => setCurrentPage('settings-home')} />
      case 'settings-home':
      default:
        return <SettingsHomePage {...sidebarProps} onNavigate={handleNavigation} />
    }
  }

  return (
    <MainLayout
      currentPage={currentPage}
      onNavigate={handleNavigation}
    >
      {renderPage()}
    </MainLayout>
  )
}

export default App
