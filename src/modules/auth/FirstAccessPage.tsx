import { useState, useMemo } from 'react'
import { AppIcon } from '../../shared/components'
import bellogLogoLogin from '../../shared/icons/brand/bellog-logo-login.png'
import { LoginIllustration } from '../../shared/icons'
import { supabase } from '../../lib/supabase'

interface FirstAccessPageProps {
  user: { id: string; email: string; full_name: string; temp_password?: string }
  onComplete: (user: { id: string; email: string; full_name: string }) => void
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

export const FirstAccessPage = ({ user, onComplete, onCancel }: FirstAccessPageProps) => {
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [tempPassword, setTempPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showTempPassword, setShowTempPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showPasswordRules, setShowPasswordRules] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  // Verifica se as senhas não coincidem (para mostrar erro)
  const passwordsDoNotMatch = useMemo(() => {
    return confirmPassword && newPassword && newPassword !== confirmPassword
  }, [newPassword, confirmPassword])

  // Verifica se o formulário está válido
  const canSubmit = useMemo(() => {
    return tempPassword && isPasswordValid && passwordsMatch && !loading
  }, [tempPassword, isPasswordValid, passwordsMatch, loading])

  const handleSubmit = async () => {
    if (!canSubmit) return

    // Validar senha temporária
    if (tempPassword !== user.temp_password) {
      setError('Senha temporária incorreta')
      return
    }

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
      // Persiste a nova senha e limpa as flags de primeiro acesso
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        data: { needs_password_change: false, temp_password: null },
      })

      if (updateError) {
        throw new Error(updateError.message)
      }

      console.log('[FirstAccess] Password updated for user:', user.email)
      setStep('success')
    } catch (err) {
      console.error('[FirstAccess] Error:', err)
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
        {/* Left Panel - White */}
        <div className="flex flex-col justify-center w-1/2 bg-white px-[114px] py-[42px]">
          <div className="flex flex-col gap-[32px] w-[487px] mx-auto">
            {/* Logo */}
            <div className="w-full flex justify-center">
              <div className="w-[400px] h-[160px] flex items-center justify-center">
                <img src={bellogLogoLogin} alt="Bellog Logo" className="w-full h-full" />
              </div>
            </div>

            {/* Title */}
            <p
              className="font-medium text-[26px] text-center w-full"
              style={{ fontFamily: 'Inter, sans-serif', color: COLORS.primary }}
            >
              Bem-vindo ao Sistema
            </p>

            {/* Success Message */}
            <div className="flex flex-col items-center gap-8 mt-4">
              <p
                className="text-[14px] text-center w-full"
                style={{ fontFamily: 'Inter, sans-serif', color: COLORS.text }}
              >
                Sua senha foi atualizada. Por favor, entre novamente no sistema com o seu acesso.
              </p>

              {/* Success Icon */}
              <div className="w-[158px] h-[158px] flex items-center justify-center">
                <AppIcon name="check_circle" size={158} color={COLORS.success} />
              </div>

              {/* Button */}
              <button
                type="button"
                onClick={onCancel}
                className="flex items-center justify-center h-[45px] px-4 rounded-[4px] w-full bg-[#4077d9] cursor-pointer hover:opacity-90"
              >
                <span
                  className="font-bold text-[14px] text-white"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Voltar para Acessos
                </span>
              </button>
            </div>

            {/* Footer Links */}
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

        {/* Right Panel - Dark Blue with Circle */}
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

  // Tela de formulário
  return (
    <div className="flex min-h-screen">
      {/* Left Panel - White */}
      <div className="flex flex-col justify-center w-1/2 bg-white px-[114px] py-[42px]">
        <div className="flex flex-col gap-[18px] w-[487px] mx-auto">
          {/* Logo */}
          <div className="w-full flex justify-center mb-4">
            <div className="w-[400px] h-[160px] flex items-center justify-center">
              <img src={bellogLogoLogin} alt="Bellog Logo" className="w-full h-full" />
            </div>
          </div>

          {/* Title */}
          <p
            className="font-medium text-[26px] text-center w-full"
            style={{ fontFamily: 'Inter, sans-serif', color: COLORS.primary }}
          >
            Bem-vindo ao Sistema
          </p>

          {/* Form */}
          <div className="flex flex-col gap-8 w-full mt-4">
            {renderPasswordInput(
              tempPassword,
              setTempPassword,
              'Insira sua senha temporária',
              'Senha temporária',
              showTempPassword,
              () => setShowTempPassword(!showTempPassword)
            )}

            <div className="flex flex-col gap-6 relative">
              {renderPasswordInput(
                newPassword,
                setNewPassword,
                'Insira sua senha',
                'Nova Senha',
                showNewPassword,
                () => setShowNewPassword(!showNewPassword),
                undefined,
                undefined,
                () => setShowPasswordRules(true),
                () => setShowPasswordRules(false)
              )}

              {/* Tooltip de regras da senha */}
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
                  {/* Triângulo/ponteiro do tooltip */}
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

          {/* Error */}
          {error && (
            <p
              className="text-[14px] text-center w-full"
              style={{ fontFamily: 'Inter, sans-serif', color: COLORS.error }}
            >
              {error}
            </p>
          )}

          {/* Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`flex items-center justify-center h-[45px] px-4 rounded-[4px] w-full mt-4 ${
              canSubmit
                ? 'bg-[#4077d9] cursor-pointer hover:opacity-90'
                : 'bg-[#919191] opacity-50 cursor-not-allowed'
            }`}
          >
            <span
              className="font-bold text-[14px] text-white"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {loading ? 'Processando...' : 'Confirmar'}
            </span>
          </button>

          {/* Footer Links */}
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

      {/* Right Panel - Dark Blue with Circle */}
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