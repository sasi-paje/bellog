/**
 * MobileApp - Aplicação Mobile para Motoristas
 *
 * Autenticação via token SASI na URL
 * NÃO usa Supabase Auth, NÃO usa LoginPage
 *
 * Fluxo:
 * 1. Extrai sasi-token da URL
 * 2. Chama ExternalProviderApi.getMe()
 * 3. Extrai email de customProps
 * 4. Busca motorista no banco via DriverRepository
 * 5. Cria sessão e libera páginas
 */

import React, { useEffect, useState } from 'react'
import { MobileAuthProvider, useMobileAuth } from './services'
import { MyRoutesPage } from '../../modules/my-routes/pages/MyRoutesPage'
import { DeliveryPage } from '../../modules/delivery/pages/DeliveryPage'
import { ArrivalClientPage } from '../../modules/arrival-client'

type MobilePage = 'my-routes' | 'delivery' | 'arrival-client'

const getCurrentPage = (): MobilePage => {
  const pathname = window.location.pathname
  if (pathname.startsWith('/chegada') || pathname.startsWith('/arrival-client')) return 'arrival-client'
  return pathname.startsWith('/delivery') ? 'delivery' : 'my-routes'
}

const LoadingScreen: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-[#ECEDFB]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-[#e67c26] border-t-transparent rounded-full animate-spin" />
      <p className="text-[#231f20] text-[16px] font-medium">Autenticando...</p>
    </div>
  </div>
)

const ErrorScreen: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center h-screen bg-[#ECEDFB] p-4">
    <div className="bg-white rounded-[8px] p-6 max-w-[320px] w-full shadow-[4px_4px_4px_0px_rgba(0,0,0,0.25)]">
      <h2 className="text-[#231f20] text-[18px] font-bold mb-2">Erro de Autenticação</h2>
      <p className="text-[#4c4c4c] text-[14px] mb-4">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="w-full h-[45px] bg-[#e67c26] text-white font-bold rounded-[4px]"
      >
        Tentar Novamente
      </button>
    </div>
  </div>
)

const NoTokenScreen: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-[#ECEDFB] p-4">
    <div className="bg-white rounded-[8px] p-6 max-w-[320px] w-full shadow-[4px_4px_4px_0px_rgba(0,0,0,0.25)]">
      <h2 className="text-[#231f20] text-[18px] font-bold mb-2">Acesso não autorizado</h2>
      <p className="text-[#4c4c4c] text-[14px]">
        Token de acesso não fornecido. Acesse através do link correto com o parâmetro sasi-token.
      </p>
    </div>
  </div>
)

const MobileAppContent: React.FC = () => {
  const {
    isAuthenticated,
    isLoading,
    error,
    driver,
    authenticate,
  } = useMobileAuth()

  const [currentPage, setCurrentPage] = useState<MobilePage>(getCurrentPage)

  useEffect(() => {
    setCurrentPage(getCurrentPage())
  }, [])

  useEffect(() => {
    authenticate()
  }, [authenticate])

  const navigateTo = (page: MobilePage, routeId?: string) => {
    const basePath = page === 'delivery'
      ? '/delivery'
      : page === 'arrival-client'
        ? '/chegada'
        : '/my-routes'

    const params = new URLSearchParams()
    const currentParams = new URLSearchParams(window.location.search)
    const token = currentParams.get('sasi-token')

    if (token) params.set('sasi-token', token)
    if (routeId) params.set('routeId', routeId)

    const query = params.toString()
    const newUrl = query ? `${basePath}?${query}` : basePath
    window.history.pushState({}, '', newUrl)
    setCurrentPage(page)
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  if (error) {
    return <ErrorScreen message={error.message} onRetry={authenticate} />
  }

  if (!isAuthenticated || !driver) {
    return <NoTokenScreen />
  }

  if (currentPage === 'delivery') {
    return <DeliveryPage onBack={() => navigateTo('my-routes')} onFinish={(data) => console.log('Delivery:', data)} />
  }

  if (currentPage === 'arrival-client') {
    const routeId = new URLSearchParams(window.location.search).get('routeId')
    return <ArrivalClientPage routeId={routeId} onBack={() => navigateTo('my-routes')} />
  }

  return (
    <MyRoutesPage
      onBack={() => navigateTo('my-routes')}
      onNavigate={(page) => {
        if (page === 'delivery') navigateTo('delivery')
      }}
      onArrivalClient={(routeId) => {
        navigateTo('arrival-client', routeId)
      }}
    />
  )
}

export const MobileApp: React.FC = () => (
  <MobileAuthProvider>
    <MobileAppContent />
  </MobileAuthProvider>
)

export default MobileApp
