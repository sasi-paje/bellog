// Feature Permissions - carrega as permissões do usuário logado (Fase 3)
import { supabase, IS_TEST } from '../../../lib/supabase'

export interface PagePerms {
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_activate: boolean
  can_inactivate: boolean
}

export interface UserPermissions {
  /** true se o usuário tem permissões configuradas (linhas em rel_user_role_page). */
  hasConfig: boolean
  /** mapa por code de master_system_page → permissões. */
  pages: Record<string, PagePerms>
}

const EMPTY: UserPermissions = { hasConfig: false, pages: {} }

/**
 * Lê as permissões do usuário (por email+is_test, elo do master_system_user).
 * Retorna hasConfig=false quando o usuário não tem nenhuma página configurada —
 * nesse caso o enforcement trata como acesso total (retrocompatível), evitando
 * travar usuários ainda não configurados.
 */
export async function fetchUserPermissions(email: string): Promise<UserPermissions> {
  const emailLower = (email || '').trim().toLowerCase()
  if (!emailLower) return EMPTY

  const { data: userRow, error: userErr } = await supabase
    .from('master_system_user')
    .select('id')
    .eq('email', emailLower)
    .eq('is_test', IS_TEST)
    .maybeSingle<{ id: number }>()

  if (userErr || !userRow?.id) return EMPTY

  const [relRes, pagesRes] = await Promise.all([
    supabase
      .from('rel_user_role_page')
      .select('id_system_page, can_view, can_create, can_edit, can_activate, can_inactivate')
      .eq('id_user', userRow.id),
    supabase.from('master_system_page').select('id, code'),
  ])

  const rows = (relRes.data || []) as Array<{
    id_system_page: number
    can_view: boolean | null
    can_create: boolean | null
    can_edit: boolean | null
    can_activate: boolean | null
    can_inactivate: boolean | null
  }>

  if (relRes.error || rows.length === 0) return EMPTY

  const codeById = new Map<number, string>(
    ((pagesRes.data || []) as Array<{ id: number; code: string }>).map((p) => [p.id, p.code])
  )

  const pages: Record<string, PagePerms> = {}
  for (const r of rows) {
    const code = codeById.get(r.id_system_page)
    if (!code) continue
    pages[code] = {
      can_view: !!r.can_view,
      can_create: !!r.can_create,
      can_edit: !!r.can_edit,
      can_activate: !!r.can_activate,
      can_inactivate: !!r.can_inactivate,
    }
  }

  return { hasConfig: true, pages }
}
