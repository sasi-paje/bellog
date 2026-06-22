/**
 * Hook useMobileAuth - Para acessar contexto de autenticação mobile
 */
import { useContext } from 'react'
import { AuthContext } from './mobile-auth.context'

export function useMobileAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useMobileAuth must be used within a MobileAuthProvider')
  }
  return context
}

export default useMobileAuth
