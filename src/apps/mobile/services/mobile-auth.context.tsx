/**
 * MobileAuthContext - Contexto global para autenticação de motoristas mobile
 *
 * Fluxo:
 * 1. Extrai sasi-token da URL
 * 2. Chama ExternalProviderApi.getMe()
 * 3. Extrai email de customProps
 * 4. Busca motorista no banco via DriverRepository
 * 5. Cria sessão mobile
 *
 * IMPORTANTE: Este contexto NÃO usa Supabase Auth.
 * Somente autenticação via token SASI externo.
 *
 * Enterprise features:
 * - StrictMode double-invoke protection via authInProgress ref
 * - AbortController to cancel in-flight auth requests
 * - Auth locking to prevent duplicate concurrent auth attempts
 */

import React, { createContext, useReducer, useCallback, useRef } from 'react'
import { mobileAuthService } from './mobile-auth.service'
import { hasSasiToken } from './external-provider.api'
import type { AuthSession, AuthError, AuthState } from './types'

interface AuthContextValue extends AuthState {
  authenticate: () => Promise<void>
  logout: () => void
  clearError: () => void
  hasToken: boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: AuthSession }
  | { type: 'AUTH_ERROR'; payload: AuthError }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' }

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: false,
  error: null,
  session: null,
  driver: null,
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true, error: null }
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        error: null,
        session: action.payload,
        driver: action.payload.driver,
      }
    case 'AUTH_ERROR':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        error: action.payload,
        session: null,
        driver: null,
      }
    case 'AUTH_LOGOUT':
      return { ...initialState }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    default:
      return state
  }
}

export const MobileAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(authReducer, initialState)
  const hasToken = hasSasiToken()

  const authAbortController = useRef<AbortController | null>(null)
  const authInProgress = useRef(false)

  const authenticate = useCallback(async () => {
    if (authInProgress.current) return

    authInProgress.current = true

    if (authAbortController.current) {
      authAbortController.current.abort()
    }
    authAbortController.current = new AbortController()

    if (!hasToken) {
      authInProgress.current = false
      dispatch({
        type: 'AUTH_ERROR',
        payload: { code: 'NO_TOKEN', message: 'Token de acesso não fornecido' },
      })
      return
    }

    dispatch({ type: 'AUTH_START' })

    try {
      const session = await mobileAuthService.authenticate(
        authAbortController.current.signal
      )
      dispatch({ type: 'AUTH_SUCCESS', payload: session })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        authInProgress.current = false
        return
      }

      const error = mobileAuthService.isUnauthorizedError(err as Record<string, unknown>)
        ? (err as Record<string, unknown>)
        : {
            code: (err as Record<string, unknown>)?.code || 'UNKNOWN',
            message: (err as Record<string, unknown>)?.message || 'Erro desconhecido',
            details: (err as Record<string, unknown>)?.details,
          }
      dispatch({ type: 'AUTH_ERROR', payload: error as AuthError })
    } finally {
      authInProgress.current = false
    }
  }, [hasToken])

  const logout = useCallback(() => {
    if (authAbortController.current) {
      authAbortController.current.abort()
    }
    authInProgress.current = false
    dispatch({ type: 'AUTH_LOGOUT' })

    const url = new URL(window.location.href)
    url.searchParams.delete('sasi-token')
    window.history.replaceState({}, '', url.pathname + url.search)
  }, [])

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' })
  }, [])

  const value: AuthContextValue = {
    ...state,
    authenticate,
    logout,
    clearError,
    hasToken,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export type { MobileAuthProviderProps } from './types'
