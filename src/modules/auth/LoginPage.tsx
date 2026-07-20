import { useState } from 'react'
import { AppIcon, PdfViewerModal } from '../../shared/components'
import bellogLogoLogin from '../../shared/icons/brand/bellog-logo-login.png'
import { LoginIllustration } from '../../shared/icons'
import { supabase, IS_TEST } from '../../lib/supabase'

interface LoginPageProps {
  onLogin: (user: { id: string; email: string; full_name: string; needs_password_change?: boolean; temp_password?: string }) => void
  onForgotPassword: () => void
}

const PRIMARY = '#0f3255'
const SECONDARY = '#4077d9'
const PRIMARY_LIGHT = '#1e558b'
const PLACEHOLDER_COLOR = '#bdbdbd'
const BORDER_COLOR = '#0f3255'
const DARK_BLUE = '#0a2540'
const ORANGE_CIRCLE = '#e67c26'

export const LoginPage = ({ onLogin, onForgotPassword }: LoginPageProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [pdfModal, setPdfModal] = useState<{ title: string; url: string } | null>(null)

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Por favor, preencha o e-mail e a senha')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        throw new Error(authError.message)
      }

      if (data.user) {
        const fullName = data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Usuário'
        const needsPasswordChange = data.user.user_metadata?.needs_password_change === true

        const isTest = IS_TEST
        const emailLower = (data.user.email || '').toLowerCase()
        const nowIso = new Date().toISOString()
        // O elo com o Auth é o email (master_system_user não tem id_auth_user).
        // Localiza por (email, is_test); atualiza last_login_at ou cria se não existir.
        const { data: existingUser } = await supabase
          .from('master_system_user')
          .select('id')
          .eq('email', emailLower)
          .eq('is_test', isTest)
          .maybeSingle()

        const { error: syncError } = existingUser
          ? await supabase
              .from('master_system_user')
              .update({ full_name: fullName, last_login_at: nowIso })
              .eq('id', existingUser.id)
          : await supabase
              .from('master_system_user')
              .insert({ email: emailLower, full_name: fullName, is_active: true, is_test: isTest, last_login_at: nowIso })

        if (syncError) {
          console.error('[LoginPage] Sync error:', syncError)
        }

        onLogin({
          id: data.user.id,
          email: data.user.email || '',
          full_name: fullName,
          needs_password_change: needsPasswordChange,
          temp_password: data.user.user_metadata?.temp_password,
        })
      }
    } catch (err) {
      console.error('[LoginPage] Login error:', err)
      setError('E-mail ou senha incorretos')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin()
    }
  }

  if (showForgotPassword) {
    return (
      <ForgotPasswordPage
        onComplete={() => setShowForgotPassword(false)}
        onCancel={() => setShowForgotPassword(false)}
      />
    )
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex flex-col justify-center w-1/2 bg-white px-[114px] py-[42px]">
        <div className="flex flex-col gap-[18px] w-[487px] mx-auto">
          <div className="w-full flex justify-center mb-4">
            <div className="w-[400px] h-[160px] flex items-center justify-center">
              <img src={bellogLogoLogin} alt="Bellog Logo" className="w-full h-full" />
            </div>
          </div>

          <p
            className="font-medium text-[26px] text-center w-full"
            style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY }}
          >
            Bem-vindo ao Sistema
          </p>

          <div className="flex flex-col gap-[8px] w-full mt-4">
            <label
              className="font-semibold text-[14px]"
              style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY }}
            >
              Email
            </label>
            <div
              className="bg-white border border-solid h-[45px] items-center justify-center px-[16px] rounded-[5px] w-full flex gap-[4px]"
              style={{ borderColor: BORDER_COLOR }}
            >
              <div className="flex items-center justify-center size-[24px]">
                <AppIcon name="person" size={24} color={PRIMARY} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError(null)
                }}
                onKeyPress={handleKeyPress}
                placeholder="Insira seu e-mail"
                className="flex-1 bg-transparent outline-none text-[14px]"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  color: email ? '#2a2a2a' : PLACEHOLDER_COLOR,
                }}
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex flex-col gap-[8px] w-full">
            <label
              className="font-semibold text-[14px]"
              style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY }}
            >
              Senha
            </label>
            <div
              className="bg-white border border-solid h-[45px] items-center justify-center px-[16px] rounded-[5px] w-full flex gap-[4px]"
              style={{ borderColor: BORDER_COLOR }}
            >
              <div className="flex items-center justify-center size-[24px]">
                <AppIcon name="lock" size={24} color={PRIMARY} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError(null)
                }}
                onKeyPress={handleKeyPress}
                placeholder="Insira sua senha"
                className="flex-1 bg-transparent outline-none text-[14px]"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  color: password ? '#2a2a2a' : PLACEHOLDER_COLOR,
                }}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="flex items-center justify-center size-[24px]"
              >
                <AppIcon
                  name={showPassword ? 'visibility_off' : 'visibility'}
                  size={24}
                  color={PRIMARY}
                />
              </button>
            </div>
          </div>

          <p
            className="font-medium text-[14px] text-right w-full cursor-pointer"
            style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_LIGHT }}
            onClick={onForgotPassword}
          >
            Esqueceu sua senha?
          </p>

          {error && (
            <p
              className="text-[14px] text-center w-full"
              style={{ fontFamily: 'Inter, sans-serif', color: '#d32f2f' }}
            >
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] w-full bg-[#4077d9] mt-2"
          >
            <span
              className="font-bold text-[14px] text-white"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </span>
          </button>

          <div className="flex items-center justify-between w-full mt-8 pt-8">
            <button
              type="button"
              className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] border-0"
              onClick={() => setPdfModal({ title: 'Termos de Uso', url: '/termos-de-uso.pdf' })}
            >
              <span
                className="font-bold text-[14px]"
                style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_LIGHT }}
              >
                Termos de Uso
              </span>
            </button>
            <button
              type="button"
              className="flex items-center justify-center h-[45px] px-[8px] py-[2px] rounded-[4px] border-0"
              onClick={() => setPdfModal({ title: 'Política de Privacidade', url: '/politica-de-privacidade.pdf' })}
            >
              <span
                className="font-bold text-[14px]"
                style={{ fontFamily: 'Inter, sans-serif', color: PRIMARY_LIGHT }}
              >
                Política de Privacidade
              </span>
            </button>
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-center w-1/2 relative overflow-hidden"
        style={{ backgroundColor: DARK_BLUE }}
      >
        <div
          className="absolute rounded-full"
          style={{
            width: '664px',
            height: '664px',
            backgroundColor: ORANGE_CIRCLE,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />

        <img
          src={LoginIllustration}
          alt="Bellog Illustration"
          className="relative z-10 w-[400px] h-auto"
        />
      </div>

      <PdfViewerModal
        isOpen={pdfModal !== null}
        title={pdfModal?.title || ''}
        url={pdfModal?.url || ''}
        onClose={() => setPdfModal(null)}
      />
    </div>
  )
}
