/**
 * Tipos para a autenticação mobile de motoristas via SASI
 */

export interface SasiProfile {
  id: string | number
  name?: string
  email?: string
  customProps?: {
    email?: string
    phone?: string
    code?: string
    isTestTeam?: boolean
    [key: string]: unknown
  }
  profileProps?: {
    name?: string
    email?: string
    phone?: string
  }
  [key: string]: unknown
}

export interface AuthSession {
  driver: AuthenticatedDriver
  sasiProfileId: string | number
  authenticatedAt: string
  expiresAt?: string
}

export interface AuthenticatedDriver {
  id: string
  name: string | null
  email: string | null
  tax_id: string | null
  phone: string | null
  license_number: string | null
  is_active: boolean
  is_test: boolean
}

export interface AuthError {
  code: AuthErrorCode
  message: string
  details?: Record<string, unknown>
}

export type AuthErrorCode =
  | 'missing-token'
  | 'auth-failed'
  | 'profile-failed'
  | 'profile-id-missing'
  | 'load-failed'
  | 'UNKNOWN'

export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  error: AuthError | null
  session: AuthSession | null
  driver: AuthenticatedDriver | null
}

export interface MobileAuthProviderProps {
  children: React.ReactNode
}
