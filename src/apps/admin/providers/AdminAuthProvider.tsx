/**
 * AdminAuthContext - Contexto de autenticação para Admin App
 *
 * Usa Supabase Auth para gerenciamento de sessão admin.
 * NÃO deve ser usado pelo Mobile App.
 */

import React, { createContext, useEffect, useState, useCallback } from 'react'
import { supabase, IS_TEST } from '../../../lib/supabase'

export interface AdminUser {
  id: string
  email: string
  full_name: string
  needs_password_change?: boolean
  temp_password?: string
}

interface AdminAuthContextValue {
  user: AdminUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkSession: () => Promise<void>
}

export const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const fullName = session.user.user_metadata?.full_name ||
                         session.user.email?.split('@')[0] ||
                         'Usuário'
        const needsPasswordChange = session.user.user_metadata?.needs_password_change === true
        const tempPassword = session.user.user_metadata?.temp_password

        setUser({
          id: session.user.id,
          email: session.user.email || '',
          full_name: fullName,
          needs_password_change: needsPasswordChange,
          temp_password: tempPassword,
        })
      } else {
        setUser(null)
      }
    } catch (err) {
      console.error('[AdminAuthProvider] Session check error:', err)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AdminAuthProvider] Auth state change:', event, !!session)

      if (session?.user) {
        const fullName = session.user.user_metadata?.full_name ||
                         session.user.email?.split('@')[0] ||
                         'Usuário'
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          full_name: fullName,
          needs_password_change: session.user.user_metadata?.needs_password_change === true,
        })
      } else {
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [checkSession])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) throw error

      if (data.user) {
        const fullName = data.user.user_metadata?.full_name ||
                         data.user.email?.split('@')[0] ||
                         'Usuário'

        // Sync user to master_system_user (elo com o Auth é o email — sem id_auth_user).
        // Localiza por (email, is_test); atualiza last_login_at ou cria se não existir.
        const isTest = IS_TEST
        const emailLower = (data.user.email || '').toLowerCase()
        const nowIso = new Date().toISOString()
        const { data: existingUser } = await supabase
          .from('master_system_user')
          .select('id')
          .eq('email', emailLower)
          .eq('is_test', isTest)
          .maybeSingle()

        if (existingUser) {
          await supabase
            .from('master_system_user')
            .update({ full_name: fullName, last_login_at: nowIso })
            .eq('id', existingUser.id)
        } else {
          await supabase
            .from('master_system_user')
            .insert({ email: emailLower, full_name: fullName, is_active: true, is_test: isTest, last_login_at: nowIso })
        }

        setUser({
          id: data.user.id,
          email: data.user.email || '',
          full_name: fullName,
          needs_password_change: data.user.user_metadata?.needs_password_change === true,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        checkSession,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  )
}

export const useAdminAuth = () => {
  const context = React.useContext(AdminAuthContext)
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider')
  }
  return context
}