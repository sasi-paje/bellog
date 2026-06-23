/**
 * Bellog Bootstrap
 *
 * Arquitetura simples:
 * - main.tsx detecta rota mobile e renderiza AdminApp ou MobileApp
 * - AdminApp trata todos os outros casos, incluindo callbacks de auth
 */

import React, { Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

import { AppErrorBoundary } from './shared/components/AppErrorBoundary'
import { AdminApp } from './apps/admin/App'
import { MobileApp } from './apps/mobile/App'

const isMobilePath = (pathname: string): boolean => {
  return pathname.startsWith('/my-routes')
    || pathname.startsWith('/delivery')
    || pathname.startsWith('/chegada')
    || pathname.startsWith('/arrival-client')
}

const getMobilePathFromQuery = (): string | null => {
  const params = new URLSearchParams(window.location.search)
  const page = params.get('page')
  if (page === 'my-routes') return '/my-routes'
  if (page === 'delivery') return '/delivery'
  return null
}

const handleLegacyUrl = () => {
  if (window.location.pathname === '/' && window.location.search.includes('page=')) {
    const mobilePath = getMobilePathFromQuery()
    if (mobilePath) {
      const params = new URLSearchParams(window.location.search)
      params.delete('page')
      const token = params.get('sasi-token')
      const newUrl = token ? `${mobilePath}?sasi-token=${token}` : mobilePath
      window.history.replaceState({}, '', newUrl)
    }
  }
}

const AppRouter: React.FC = () => {
  handleLegacyUrl()

  const pathname = window.location.pathname

  if (isMobilePath(pathname)) {
    return <MobileApp />
  }

  return <AdminApp />
}

const InitialLoading = () => (
  <div className="flex items-center justify-center min-h-screen bg-[#ECEDFB]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-[#e67c26] border-t-transparent rounded-full animate-spin" />
      <span className="text-[#231f20] text-[16px] font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
        Carregando Bellog...
      </span>
    </div>
  </div>
)

const Root: React.FC = () => (
  <AppErrorBoundary>
    <Suspense fallback={<InitialLoading />}>
      <AppRouter />
    </Suspense>
  </AppErrorBoundary>
)

const bootstrap = () => {
  const container = document.getElementById('root')
  if (!container) return

  const root = createRoot(container)
  root.render(
    <React.StrictMode>
      <Root />
    </React.StrictMode>
  )
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap)
} else {
  bootstrap()
}
