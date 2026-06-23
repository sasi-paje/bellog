import { useState, useMemo, useEffect } from 'react'
import { AppIcon } from '../../shared/components'
import bellogLogoLogin from '../../shared/icons/brand/bellog-logo-login.png'
import { LoginIllustration } from '../../shared/icons'
import { supabase } from '../../lib/supabase'

interface ForgotPasswordPageProps {
  /** true quando aberto pelo link de reset (?reset_password): a sessão de
   *  recovery já foi estabelecida pelo callback; aqui só definimos a nova senha. */
  standalone?: boolean
  onComplete: () => void
  onCancel: () => void
}

// Cores do design system
const COLORS = {
  primary: '#0f3255',
  secondary: '#4077d9',
  success: '#27ae60',
  error: '#eb5757',
  placeholder: '#bdbdbd',
  text: '#2a2a2a',
  orange: '#e67c26',
  darkBlue: '#0a2540',
}

// Regras de senha
const PASSWORD_RULES = [
  { key: 'length', label: '8 caracteres (não mais que 64)', validate: (p: string) => p.length >= 8 && p.length <= 64 },
  { key: 'uppercase', label: '1 letra maiúscula', validate: (p: string) => /[A-Z]/.test(p) },
  { key: 'lowercase', label: '1 letra minúscula', validate: (p: string) => /[a-z]/.test(p) },
  { key: 'number', label: '1 número', validate: (p: string) => /[0-9]/.test(p) },
  { key: 'special', label: 'Pelo menos 1 caractere especial', validate: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
]

export const ForgotPasswordPage = ({ standalone, onComplete, onCancel }: ForgotPasswordPageProps) => {
  const [step, setStep] = useState<'email' | 'form' | 'success'>(standalone ? 'form' : 'email')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showPasswordRules, setShowPasswordRules] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Validação das regras de senha
  const passwordValidations = useMemo(() => {
    return PASSWORD_RULES.map(rule => ({
      ...rule,
      valid: rule.validate(newPassword),
    }))
  }, [newPassword])

  // Verifica se a senha é válida
  const isPasswordValid = useMemo(() => {
    return passwordValidations.every(v => v.valid)
  }, [passwordValidations])

  // Verifica se as senhas coincidem
  const passwordsMatch = useMemo(() => {
    return newPassword && confirmPassword && newPassword === confirmPassword
  }, [newPassword, confirmPassword])

  // Verifica se as senhas não coincidem
  const passwordsDoNotMatch = useMemo(() => {
    return confirmPassword && newPassword && newPassword !== confirmPassword
  }, [newPassword, confirmPassword])

  // Verifica se o formulário está válido
  const canSubmitEmail = useMemo(() => {
    return email && !loading
  }, [email, loading])

  const canSubmitPassword = useMemo(() => {
    return isPasswordValid && passwordsMatch && !loading
  }, [isPasswordValid, passwordsMatch, loading])

  // Enviar e-mail de redefinição
  const handleSendEmail = async () => {
    if (!canSubmitEmail) return

    setLoading(true)
    setError(null)

    try {
      // Usa nossa edge function (AWS SES / template Bellog), não o mailer do Supabase
      const { error: fnError } = await supabase.functions.invoke('send-password-reset', {
        body: { email },
      })

      if (fnError) {
        console.error('[ForgotPassword] Reset email error:', fnError)
        throw new Error(fnError.message)
      }

      console.log('[ForgotPassword] Reset solicitado para:', email)
      setSuccessMessage('E-mail de redefinição enviado! Verifique sua caixa de entrada.')
      setStep('success')
    } catch (err) {
      console.error('[ForgotPassword] Error:', err)
      setError(err instanceof Error ? err.message : 'Erro ao processar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Definir nova senha
  const handleSubmitPassword = async () => {
    if (!canSubmitPassword) return

    if (newPassword !== confirmPassword) {
      setError('As senhas não conferem')
      return
    }

    if (!isPasswordValid) {
      setError('A senha não atende aos requisitos')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // A sessão de recovery foi estabelecida pelo callback do link; aqui só
      // definimos a nova senha e limpamos as flags de troca obrigatória.
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
        data: { needs_password_change: false, temp_password: null },
      })

      if (authError) {
        console.error('[ForgotPassword] Update password error:', authError)
        throw new Error(authError.message)
      }

      console.log('[ForgotPassword] Password updated successfully')
      setStep('success')
    } catch (err) {
      console.error('[ForgotPassword] Error:', err)
      setError(err instanceof Error ? err.message : 'Erro ao processar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const renderPasswordInput = (
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    label: string,
    show: boolean,
    setShow: () => void,
    hasError?: boolean,
    errorMessage?: string,
    onFocus?: () => void,
    onBlur?: () => void
  ) => (
    <div className="flex flex-col gap-2 w-full">
      <label
        className="font-semibold text-[14px]"
        style={{ fontFamily: 'Inter, sans-serif', color: COLORS.primary }}
      >
        {label}
      </label>
      <div
        className={`bg-white border border-solid h-[45px] items-center justify-center px-4 rounded-[5px] w-full flex gap-1 ${hasError ? 'border-[#eb5757]' : ''}`}
        style={{ borderColor: hasError ? COLORS.error : COLORS.primary }}
      >
        <div className="flex items-center justify-center w-6 h-6">
          <AppIcon name="lock" size={24} color={COLORS.primary} />
        </div>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setError(null)
          }}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-[14px]"
          style={{
            fontFamily: 'Inter, sans-serif',
            color: value ? COLORS.text : COLORS.placeholder,
          }}
          disabled={loading}
        />
        <button
          type="button"
          onClick={setShow}
          className="flex items-center justify-center w-6 h-6"
        >
          <AppIcon
            name={show ? 'visibility_off' : 'visibility'}
            size={24}
            color={COLORS.primary}
          />
        </button>
      </div>
      {errorMessage && (
        <span className="text-[12px]" style={{ color: COLORS.error }}>
          {errorMessage}
        </span>
      )}
    </div>
  )

  // Tela de sucesso
  if (step === 'success') {
    return (
      <div className="flex min-h-screen">
        <div className="flex flex-col justify-center w-1/2 bg-white px-[114px] py-[42px]">
          <div className="flex flex-col gap-[32px] w-[487px] mx-auto">
            <div className="w-full flex justify-center">
              <div className="w-[400px] h-[160px] flex items-center justify-center">
                <img src={bellogLogoLogin} alt="Bellog Logo" className="w-full h-full" />
              </div>
            </div>

            <p
              className="font-medium text-[26px] text-center w-full"
              style={{ fontFamily: 'Inter, sans-serif', color: COLORS.primary }}
            >
              E-mail Enviado
            </p>

            <div className="flex flex-col items-center gap-8 mt-4">
              <p
                className="text-[14px] text-center w-full"
                style={{ fontFamily: 'Inter, sans-serif', color: COLORS.text }}
              >
                {successMessage || 'Verifique sua caixa de entrada para redefinir sua senha.'}
              </p>

              <div className="w-[158px] h-[158px] flex items-center justify-center">
                <AppIcon name="check_circle" size={158} color={COLORS.success} />
              </div>

              <button
                type="button"
                onClick={onCancel}
                className="flex items-center justify-center h-[45px] px-4 rounded-[4px] w-full bg-[#4077d9] cursor-pointer hover:opacity-90"
              >
                <span
                  className="font-bold text-[14px] text-white"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Voltar para Login
                </span>
              </button>
            </div>

            <div className="flex justify-between w-full mt-8 pt-8">
              <button
                type="button"
                className="flex items-center justify-center h-[45px] px-4 rounded-[4px]"
                onClick={() => alert('Termos de Uso')}
              >
                <span
                  className="font-bold text-[14px]"
                  style={{ fontFamily: 'Inter, sans-serif', color: '#1e558b' }}
                >
                  Termos de Uso
                </span>
              </button>
              <button
                type="button"
                className="flex items-center justify-center h-[45px] px-4 rounded-[4px]"
                onClick={() => alert('Política de Privacidade')}
              >
                <span
                  className="font-bold text-[14px]"
                  style={{ fontFamily: 'Inter, sans-serif', color: '#1e558b' }}
                >
                  Política de Privacidade
                </span>
              </button>
            </div>
          </div>
        </div>

        <div
          className="flex items-center justify-center w-1/2 relative overflow-hidden"
          style={{ backgroundColor: COLORS.darkBlue }}
        >
          <div
            className="absolute rounded-full"
            style={{
              width: '664px',
              height: '664px',
              backgroundColor: COLORS.orange,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
          <img
            src={LoginIllustration}
            alt="Bellog Illustration"
            className="relative z-10 w-[300px] h-auto"
          />
        </div>
      </div>
    )
  }

  // Tela de formulário (nova senha)
  if (step === 'form') {
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
              style={{ fontFamily: 'Inter, sans-serif', color: COLORS.primary }}
            >
              Nova Senha
            </p>

            <p
              className="text-[14px] text-center w-full"
              style={{ fontFamily: 'Inter, sans-serif', color: COLORS.text }}
            >
              Crie uma nova senha segura
            </p>

            <div className="flex flex-col gap-6 w-full mt-4">
              <div className="flex flex-col gap-6 relative">
                {renderPasswordInput(
                  newPassword,
                  setNewPassword,
                  'Insira sua nova senha',
                  'Nova Senha',
                  showNewPassword,
                  () => setShowNewPassword(!showNewPassword),
                  undefined,
                  undefined,
                  () => setShowPasswordRules(true),
                  () => setShowPasswordRules(false)
                )}

                {showPasswordRules && (
                  <div
                    className="absolute left-0 top-full mt-2 z-50 bg-white border border-[#bdbdbd] rounded-[4px] p-4 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]"
                    style={{ width: '300px' }}
                  >
                    <p className="text-[10px] font-normal mb-2" style={{ color: 'rgba(0,0,0,0.75)', fontFamily: 'Inter, sans-serif' }}>
                      Sua senha deve conter:
                    </p>
                    <ul className="flex flex-col gap-1">
                      {passwordValidations.map((rule) => (
                        <li
                          key={rule.key}
                          className="text-[12px] list-disc ml-4"
                          style={{
                            color: rule.valid ? COLORS.success : COLORS.error,
                            fontFamily: 'Inter, sans-serif',
                          }}
                        >
                          {rule.label}
                        </li>
                      ))}
                    </ul>
                    <div
                      className="absolute -top-2 left-8 w-4 h-4 bg-white border-l border-t border-[#bdbdbd]"
                      style={{ transform: 'rotate(45deg)' }}
                    />
                  </div>
                )}
              </div>

              {renderPasswordInput(
                confirmPassword,
                setConfirmPassword,
                'Insira sua senha novamente',
                'Confirmar Nova Senha',
                showConfirmPassword,
                () => setShowConfirmPassword(!showConfirmPassword),
                passwordsDoNotMatch || false,
                passwordsDoNotMatch ? 'Senhas não coincidem' : undefined
              )}
            </div>

            {error && (
              <p
                className="text-[14px] text-center w-full"
                style={{ fontFamily: 'Inter, sans-serif', color: COLORS.error }}
              >
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleSubmitPassword}
              disabled={!canSubmitPassword}
              className={`flex items-center justify-center h-[45px] px-4 rounded-[4px] w-full mt-4 ${
                canSubmitPassword
                  ? 'bg-[#4077d9] cursor-pointer hover:opacity-90'
                  : 'bg-[#919191] opacity-50 cursor-not-allowed'
              }`}
            >
              <span
                className="font-bold text-[14px] text-white"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {loading ? 'Processando...' : 'Salvar Nova Senha'}
              </span>
            </button>

            <div className="flex justify-center w-full mt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center justify-center h-[45px] px-4 rounded-[4px]"
              >
                <span
                  className="font-bold text-[14px]"
                  style={{ fontFamily: 'Inter, sans-serif', color: COLORS.primary }}
                >
                  Voltar para Login
                </span>
              </button>
            </div>

            <div className="flex justify-between w-full mt-8 pt-8">
              <button
                type="button"
                className="flex items-center justify-center h-[45px] px-4 rounded-[4px]"
                onClick={() => alert('Termos de Uso')}
              >
                <span
                  className="font-bold text-[14px]"
                  style={{ fontFamily: 'Inter, sans-serif', color: '#1e558b' }}
                >
                  Termos de Uso
                </span>
              </button>
              <button
                type="button"
                className="flex items-center justify-center h-[45px] px-4 rounded-[4px]"
                onClick={() => alert('Política de Privacidade')}
              >
                <span
                  className="font-bold text-[14px]"
                  style={{ fontFamily: 'Inter, sans-serif', color: '#1e558b' }}
                >
                  Política de Privacidade
                </span>
              </button>
            </div>
          </div>
        </div>

        <div
          className="flex items-center justify-center w-1/2 relative overflow-hidden"
          style={{ backgroundColor: COLORS.darkBlue }}
        >
          <div
            className="absolute rounded-full"
            style={{
              width: '664px',
              height: '664px',
              backgroundColor: COLORS.orange,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
          <img
            src={LoginIllustration}
            alt="Bellog Illustration"
            className="relative z-10 w-[300px] h-auto"
          />
        </div>
      </div>
    )
  }

  // Tela inicial - solicitação de e-mail
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
            style={{ fontFamily: 'Inter, sans-serif', color: COLORS.primary }}
          >
            Esqueceu sua senha?
          </p>

          <p
            className="text-[14px] text-center w-full"
            style={{ fontFamily: 'Inter, sans-serif', color: COLORS.text }}
          >
            Informe seu e-mail e enviaremos um link para redefinir sua senha
          </p>

          <div className="flex flex-col gap-2 w-full mt-4">
            <label
              className="font-semibold text-[14px]"
              style={{ fontFamily: 'Inter, sans-serif', color: COLORS.primary }}
            >
              E-mail
            </label>
            <div
              className="bg-white border border-solid h-[45px] items-center justify-center px-4 rounded-[5px] w-full flex gap-1"
              style={{ borderColor: COLORS.primary }}
            >
              <div className="flex items-center justify-center w-6 h-6">
                <AppIcon name="person" size={24} color={COLORS.primary} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError(null)
                }}
                placeholder="Insira seu e-mail"
                className="flex-1 bg-transparent outline-none text-[14px]"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  color: email ? COLORS.text : COLORS.placeholder,
                }}
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <p
              className="text-[14px] text-center w-full"
              style={{ fontFamily: 'Inter, sans-serif', color: COLORS.error }}
            >
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleSendEmail}
            disabled={!canSubmitEmail}
            className={`flex items-center justify-center h-[45px] px-4 rounded-[4px] w-full mt-4 ${
              canSubmitEmail
                ? 'bg-[#4077d9] cursor-pointer hover:opacity-90'
                : 'bg-[#919191] opacity-50 cursor-not-allowed'
            }`}
          >
            <span
              className="font-bold text-[14px] text-white"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {loading ? 'Enviando...' : 'Enviar E-mail'}
            </span>
          </button>

          <div className="flex justify-center w-full mt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center justify-center h-[45px] px-4 rounded-[4px]"
            >
              <span
                className="font-bold text-[14px]"
                style={{ fontFamily: 'Inter, sans-serif', color: COLORS.primary }}
              >
                Voltar para Login
              </span>
            </button>
          </div>

          <div className="flex justify-between w-full mt-8 pt-8">
            <button
              type="button"
              className="flex items-center justify-center h-[45px] px-4 rounded-[4px]"
              onClick={() => alert('Termos de Uso')}
            >
              <span
                className="font-bold text-[14px]"
                style={{ fontFamily: 'Inter, sans-serif', color: '#1e558b' }}
              >
                Termos de Uso
              </span>
            </button>
            <button
              type="button"
              className="flex items-center justify-center h-[45px] px-4 rounded-[4px]"
              onClick={() => alert('Política de Privacidade')}
            >
              <span
                className="font-bold text-[14px]"
                style={{ fontFamily: 'Inter, sans-serif', color: '#1e558b' }}
              >
                Política de Privacidade
              </span>
            </button>
          </div>
        </div>
      </div>

      <div
        className="flex items-center justify-center w-1/2 relative overflow-hidden"
        style={{ backgroundColor: COLORS.darkBlue }}
      >
        <div
          className="absolute rounded-full"
          style={{
            width: '664px',
            height: '664px',
            backgroundColor: COLORS.orange,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
        <img
          src={LoginIllustration}
          alt="Bellog Illustration"
          className="relative z-10 w-[300px] h-auto"
        />
      </div>
    </div>
  )
}
