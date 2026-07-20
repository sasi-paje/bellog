import React from 'react'
import { usePermissions } from './PermissionsContext'

const NoAccess = () => (
  <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#fdece0]">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#c9661a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </div>
    <h2 className="text-[20px] font-bold text-[#0f3255]">Sem permissão</h2>
    <p className="max-w-[420px] text-[14px] text-[#6b7080]">
      Você não tem permissão para acessar esta página. Fale com um administrador
      se precisar de acesso.
    </p>
  </div>
)

/**
 * Envolve a página atual e bloqueia a renderização quando o usuário não tem
 * permissão de visualização (can_view) para a página. Usuários sem permissões
 * configuradas têm acesso total (ver PermissionsProvider).
 */
export const PageGuard = ({
  pageCode,
  children,
  ...rest
}: {
  pageCode?: string
  children: React.ReactNode
  [key: string]: unknown
}) => {
  const { can } = usePermissions()
  if (!can(pageCode, 'view')) return <NoAccess />
  // O MainLayout injeta o contexto da sidebar (isSidebarOpen/onToggleSidebar)
  // via cloneElement no seu filho — repassa para a página para não quebrar o
  // toggle da sidebar.
  if (React.isValidElement(children) && Object.keys(rest).length > 0) {
    const el = children as React.ReactElement
    return React.cloneElement(el, { ...(el.props as object), ...rest })
  }
  return <>{children}</>
}
