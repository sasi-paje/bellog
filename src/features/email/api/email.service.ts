import { supabase } from '../../../lib/supabase'

export interface EmailServiceResponse {
  success: boolean
  message?: string
  error?: string
}

export interface InviteUserRequest {
  email: string
  full_name: string
  id_user_role?: string
  /** Ambiente do solicitante (getEnvironment() !== 'production'). A edge function
   *  precisa disso para criar a linha em master_system_user com o is_test correto. */
  is_test?: boolean
}

export interface InviteUserResponse extends EmailServiceResponse {
  user_id?: string
  /** false quando o usuário foi criado mas o email de convite não pôde ser enviado. */
  email_sent?: boolean
}

/**
 * Convida um novo usuário.
 * Cria a conta no Supabase Auth + master_system_user e envia email de convite via AWS SES.
 */
export const inviteUser = async (data: InviteUserRequest): Promise<InviteUserResponse> => {
  try {
    const { data: result, error } = await supabase.functions.invoke('invite-user', {
      body: data,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      message: result?.message || 'Convite enviado com sucesso',
      user_id: result?.user_id,
      email_sent: result?.email_sent,
    }
  } catch (e: any) {
    return { success: false, error: e?.message || 'Erro ao convidar usuário' }
  }
}

/**
 * Reenvia convite / envia link de redefinição de senha.
 * Chama send-password-reset que gera novo link de recovery via AWS SES.
 */
export const resendInvite = async (email: string): Promise<EmailServiceResponse> => {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-password-reset', {
      body: { email },
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: true,
      message: result?.message || 'Convite reenviado com sucesso',
    }
  } catch (e: any) {
    return { success: false, error: e?.message || 'Erro ao reenviar convite' }
  }
}

/**
 * Testa a conexão SMTP (AWS SES) sem enviar email.
 * Requer usuário autenticado e ativo (master_system_user). Uso: admin/diagnóstico.
 */
export const testSmtpConnection = async (): Promise<EmailServiceResponse> => {
  try {
    const { data: result, error } = await supabase.functions.invoke('test-smtp-connection', {
      body: {},
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return {
      success: result?.success ?? false,
      message: result?.message,
      error: result?.error,
    }
  } catch (e: any) {
    return { success: false, error: e?.message || 'Erro ao testar conexão SMTP' }
  }
}

