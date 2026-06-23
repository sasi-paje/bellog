/**
 * AdminApp - Aplicação Web Admin
 *
 * Autenticação via Supabase Auth
 * NÃO usa token SASI, NÃO usa MobileAuthProvider
 */

import React, { useState, useEffect } from 'react'
import { MainLayout } from '../../layouts'
import { LoginPage } from '../../modules/auth/LoginPage'
import { FirstAccessPage } from '../../modules/auth/FirstAccessPage'
import { ForgotPasswordPage } from '../../modules/auth/ForgotPasswordPage'
import { LoadingGate } from '../../shared/components/LoadingGate'
import {
  SettingsHomePage,
  SupplierPage,
  CargosPage,
  RecusasPage,
  AbortadasPage,
  DestinosPage,
  MotoristasPage,
} from '../../modules/settings'
import { RoutesPage, RoutesByNotesPage } from '../../modules/routes'
import { NotesPage } from '../../modules/notes'
import { AssignNotesPage } from '../../modules/assign-notes'
import { VehiclesPage } from '../../modules/vehicles'
import { UsersPage } from '../../modules/users'
import { supabase } from '../../lib/supabase'

type AppPage =
  | 'settings-home'
  | 'settings-vehicles'
  | 'settings-suppliers'
  | 'settings-cargos'
  | 'settings-recusas'
  | 'settings-abortadas'
  | 'settings-destinos'
  | 'settings-motoristas'
  | 'routes'
  | 'routes-by-notes'
  | 'notes'
  | 'assign-notes'
  | 'vehicles'
  | 'users'

const getInitialPage = (): AppPage => {
  try {
    const saved = localStorage.getItem('bellog-current-page')
    if (saved && [
      'settings-home', 'settings-vehicles', 'settings-suppliers', 'settings-cargos',
      'settings-recusas', 'settings-abortadas', 'settings-destinos', 'settings-motoristas',
      'routes', 'routes-by-notes', 'notes', 'assign-notes', 'vehicles', 'users',
    ].includes(saved)) {
      return saved as AppPage
    }
  } catch {
    // localStorage not available
  }
  return 'settings-home'
}

export const AdminApp: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<AppPage>(getInitialPage)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [user, setUser] = useState<{
    id: string
    email: string
    full_name: string
    needs_password_change?: boolean
    temp_password?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFirstAccess, setShowFirstAccess] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [isAuthCallback, setIsAuthCallback] = useState(false)

  const isSupabaseCallback = window.location.pathname === '/reset-password' &&
    (window.location.hash.includes('access_token') || window.location.hash.includes('refresh_token'))

  // Link do convite (Opção B): /?first_access=<email> abre o primeiro acesso
  // direto na raiz (rotas profundas dão 404 no Vercel, sem fallback de SPA).
  const firstAccessEmail = new URLSearchParams(window.location.search).get('first_access')

  useEffect(() => {
    if (isSupabaseCallback) {
      setIsAuthCallback(true)
      setShowForgotPassword(true)
    }
  }, [])

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          const fullName = session.user.user_metadata?.full_name ||
                           session.user.email?.split('@')[0] || 'Usuário'
          const needsPasswordChange = session.user.user_metadata?.needs_password_change === true
          const tempPassword = session.user.user_metadata?.temp_password

          if (needsPasswordChange) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              full_name: fullName,
              needs_password_change: true,
              temp_password: tempPassword,
            })
            setShowFirstAccess(true)
          } else {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              full_name: fullName,
            })
          }
        }
      } catch (err) {
        console.error('[AdminApp] Auth check error:', err)
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [])

  useEffect(() => {
    if (user) {
      localStorage.setItem('bellog-current-page', currentPage)
    }
  }, [currentPage, user])

  const handleNavigation = (page: AppPage) => setCurrentPage(page)
  const handleToggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)

  const handleLogin = (userData: typeof user) => {
    if (userData?.needs_password_change) {
      setUser(userData)
      setShowFirstAccess(true)
    } else {
      setUser(userData)
      setCurrentPage('settings-home')
    }
  }

  const handleFirstAccessComplete = (userData: { id: string; email: string; full_name: string }) => {
    setUser({ ...userData, needs_password_change: false })
    setShowFirstAccess(false)
    setCurrentPage('settings-home')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setCurrentPage('settings-home')
  }

  const handleForgotPasswordComplete = () => {
    if (isAuthCallback) {
      window.location.hash = ''
      window.location.pathname = '/'
      setIsAuthCallback(false)
    }
    setShowForgotPassword(false)
    setUser(null)
  }

  const handleForgotPasswordCancel = () => {
    if (isAuthCallback) {
      window.location.hash = ''
      window.location.pathname = '/'
      setIsAuthCallback(false)
    }
    setShowForgotPassword(false)
  }

  if (firstAccessEmail !== null) {
    return (
      <FirstAccessPage
        standalone
        inviteEmail={firstAccessEmail}
        onComplete={() => { window.location.href = '/' }}
        onCancel={() => { window.location.href = '/' }}
      />
    )
  }

  if (isAuthCallback || showForgotPassword) {
    return (
      <ForgotPasswordPage
        onComplete={handleForgotPasswordComplete}
        onCancel={handleForgotPasswordCancel}
      />
    )
  }

  if (loading) {
    return (
      <LoadingGate isLoading={true}>
        <div />
      </LoadingGate>
    )
  }

  if (!user) {
    return (
      <LoginPage
        onLogin={handleLogin}
        onForgotPassword={() => setShowForgotPassword(true)}
      />
    )
  }

  if (showFirstAccess && user) {
    return (
      <FirstAccessPage
        user={user}
        onComplete={handleFirstAccessComplete}
        onCancel={() => {
          setShowFirstAccess(false)
          supabase.auth.signOut()
          setUser(null)
        }}
      />
    )
  }

  const sidebarProps = {
    isSidebarOpen,
    onToggleSidebar: handleToggleSidebar,
    userName: user.full_name,
    userEmail: user.email,
    userRole: 'Usuário',
    onLogout: handleLogout,
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'routes':
        return <RoutesPage {...sidebarProps} />
      case 'routes-by-notes':
        return <RoutesByNotesPage {...sidebarProps} />
      case 'notes':
        return <NotesPage {...sidebarProps} />
      case 'assign-notes':
        return <AssignNotesPage {...sidebarProps} />
      case 'vehicles':
        return <VehiclesPage {...sidebarProps} />
      case 'users':
        return <UsersPage {...sidebarProps} />
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
    <MainLayout currentPage={currentPage} onNavigate={handleNavigation}>
      {renderPage()}
    </MainLayout>
  )
}

export default AdminApp