import React, { createContext, useContext, useEffect, useState } from 'react'
import { fetchUserPermissions, UserPermissions } from './api/permissions.service'

export type PermissionAction = 'view' | 'create' | 'edit' | 'activate' | 'inactivate'

// currentPage (AdminApp) → code de master_system_page
export const PAGE_CODE_BY_ROUTE: Record<string, string> = {
  dashboard: 'DASHBOARD',
  routes: 'ROUTES',
  notes: 'NOTES',
  'routes-by-notes': 'ROUTES_BY_NOTES',
  'assign-notes': 'ASSIGN_NOTES',
  users: 'USERS',
  vehicles: 'SETTINGS_VEHICLES',
  'settings-home': 'SETTINGS',
  'settings-vehicles': 'SETTINGS_VEHICLES',
  'settings-suppliers': 'SETTINGS_SUPPLIERS',
  'settings-cargos': 'SETTINGS_ROLES',
  'settings-recusas': 'SETTINGS_REFUSALS',
  'settings-abortadas': 'SETTINGS_ABORTED',
  'settings-destinos': 'SETTINGS_DESTINATIONS',
  'settings-motoristas': 'SETTINGS_DRIVERS',
}

// id do item da Sidebar → code de master_system_page
export const PAGE_CODE_BY_SIDEBAR: Record<string, string> = {
  dashboard: 'DASHBOARD',
  rotas: 'ROUTES',
  notas: 'NOTES',
  'rotas-notas': 'ROUTES_BY_NOTES',
  'atribuir-notas': 'ASSIGN_NOTES',
  usuarios: 'USERS',
  configuracoes: 'SETTINGS',
}

interface PermissionsCtx {
  loading: boolean
  hasConfig: boolean
  /** true se o usuário pode a ação na página. Sem config → sempre true. */
  can: (pageCode: string | undefined, action?: PermissionAction) => boolean
}

const Ctx = createContext<PermissionsCtx>({
  loading: true,
  hasConfig: false,
  can: () => true,
})

export const usePermissions = () => useContext(Ctx)

export const PermissionsProvider = ({
  email,
  children,
}: {
  email?: string
  children: React.ReactNode
}) => {
  const [perms, setPerms] = useState<UserPermissions>({ hasConfig: false, pages: {} })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchUserPermissions(email || '')
      .then((p) => {
        if (!cancelled) setPerms(p)
      })
      .catch(() => {
        if (!cancelled) setPerms({ hasConfig: false, pages: {} })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [email])

  const can: PermissionsCtx['can'] = (pageCode, action = 'view') => {
    // Enquanto carrega, ou usuário sem permissões configuradas → acesso total.
    if (loading || !perms.hasConfig) return true
    if (!pageCode) return true // página não mapeada → não bloqueia
    const p = perms.pages[pageCode]
    if (!p) return false // usuário configurado e página não atribuída → bloqueia
    switch (action) {
      case 'create':
        return p.can_create
      case 'edit':
        return p.can_edit
      case 'activate':
        return p.can_activate
      case 'inactivate':
        return p.can_inactivate
      case 'view':
      default:
        return p.can_view
    }
  }

  return <Ctx.Provider value={{ loading, hasConfig: perms.hasConfig, can }}>{children}</Ctx.Provider>
}
