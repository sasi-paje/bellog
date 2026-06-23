import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from '../_shared/smtp-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InviteUserRequest {
  email: string
  full_name: string
  id_user_role?: string
  // Ambiente do solicitante (getEnvironment() !== 'production' no front).
  // Necessário porque a edge function não tem como saber o ambiente sozinha,
  // e a linha em master_system_user precisa nascer com o is_test correto para
  // que o saveUserPageAccessFromRole(isTest) seguinte encontre o usuário.
  is_test?: boolean
}

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Senha temporária descartável: o usuário define a senha real pelo link do convite.
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  let pw = ''
  for (const b of bytes) pw += chars[b % chars.length]
  return pw + 'aZ9#' // garante variedade para a política de senha
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getInviteHtml(fullName: string, inviteLink: string): string {
  const name = escapeHtml(fullName)
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #e67c26; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 8px; margin-top: 20px; }
    .button { display: inline-block; background-color: #e67c26; color: #ffffff !important;
              padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Bellog - Convite de Acesso</h1>
    </div>
    <div class="content">
      <p>Olá <strong>${name}</strong>,</p>
      <p>Você foi convidado para acessar o sistema Bellog.</p>
      <p>Clique no botão abaixo para definir sua senha e acessar:</p>
      <a href="${inviteLink}" class="button">Definir Senha</a>
      <p><strong>Este link expira em breve</strong> por motivos de segurança.</p>
      <p>Se você não esperava este convite, ignore este email.</p>
    </div>
    <div class="footer">
      <p>Atenciosamente,<br>Equipe Bellog</p>
    </div>
  </div>
</body>
</html>
`
}

function getInviteText(fullName: string, inviteLink: string): string {
  return `Bellog - Convite de Acesso

Olá ${fullName},

Você foi convidado para acessar o sistema Bellog.

Clique no link abaixo para definir sua senha e acessar:
${inviteLink}

Este link expira em breve por motivos de segurança.

Se você não esperava este convite, ignore este email.

Atenciosamente,
Equipe Bellog`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  let authUserId: string | null = null // para rollback
  let committed = false // usuário já provisionado (não fazer rollback)

  try {
    // 1. Exigir JWT do solicitante
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Authorization required' }, 401)
    }
    const token = authHeader.replace('Bearer ', '')

    // 2. Validar o token e obter o usuário do Auth
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !caller) {
      return json({ error: 'Invalid or expired token' }, 401)
    }

    // 3. Autorização: solicitante precisa ser um usuário ativo do sistema.
    //    Este projeto NÃO usa a tabela genérica user_roles nem tem tier de admin.
    //    O gate fino (can_create na página de Usuários via rel_user_role_page) é
    //    trabalho da Fase 3 (ver CLAUDE.md, "Arquitetura de Permissões") e depende
    //    do code da página de Usuários, que não está confirmado no repositório.
    const { data: callerUser, error: callerError } = await supabase
      .from('master_system_user')
      .select('id, is_active')
      .eq('id_auth_user', caller.id)
      .eq('is_active', true)
      .maybeSingle()

    if (callerError || !callerUser) {
      return json({ error: 'Access denied: active app user required' }, 403)
    }

    // 4. Validar e sanitizar payload (previne injeção de cabeçalho SMTP/MIME)
    const body: InviteUserRequest = await req.json()
    const email = (body.email || '').trim().toLowerCase()
    const fullName = (body.full_name || '').replace(/[\r\n]+/g, ' ').trim()
    const id_user_role = body.id_user_role
    const isTest = body.is_test === true // ausente => produção (escolha estrita)

    if (!email || !fullName) {
      return json({ error: 'Email and full_name are required' }, 400)
    }
    // Rejeita CR/LF e emails malformados (RCPT TO / cabeçalho To: são CRLF-delimitados)
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (/[\r\n]/.test(email) || !emailRe.test(email)) {
      return json({ error: 'Email inválido' }, 400)
    }

    // 5. Validar secrets SMTP antes de criar o usuário (falha cedo, sem órfãos)
    const smtpServer = Deno.env.get('SMTP_SERVER')
    const smtpPort = Deno.env.get('SMTP_PORT')
    const smtpUsername = Deno.env.get('SMTP_USERNAME')
    const smtpPassword = Deno.env.get('SMTP_PASSWORD')
    const smtpSender = Deno.env.get('SMTP_SENDER_EMAIL')

    if (!smtpServer || !smtpPort || !smtpUsername || !smtpPassword || !smtpSender) {
      return json({ error: 'SMTP configuration incomplete' }, 500)
    }

    // 6. Criar usuário no Supabase Auth (confirmado, com senha temporária descartável)
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: generateTempPassword(),
      email_confirm: true,
      user_metadata: { full_name: fullName, needs_password_change: true },
    })

    if (createError || !created?.user) {
      return json({ error: createError?.message || 'Falha ao criar usuário' }, 400)
    }
    authUserId = created.user.id

    // 7. Registrar em master_system_user e obter o id (usado pelo front para
    //    salvar o acesso às páginas). Upsert por id_auth_user (idempotente).
    const { data: appUser, error: insertError } = await supabase
      .from('master_system_user')
      .upsert(
        {
          id_auth_user: created.user.id,
          full_name: fullName,
          email,
          id_user_role: id_user_role || null,
          is_active: true,
          is_test: isTest,
        },
        { onConflict: 'id_auth_user' }
      )
      .select('id')
      .single()

    if (insertError || !appUser) {
      try { await supabase.auth.admin.deleteUser(created.user.id) } catch (_) {}
      return json({ error: insertError?.message || 'Falha ao registrar usuário' }, 500)
    }
    committed = true

    // 8. Link de convite (usuário define a senha) — mesmo padrão do send-password-reset
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'
    const inviteLink = `${frontendUrl}/reset-password?token=${created.user.id}&email=${encodeURIComponent(email)}`

    // 9. Enviar email de convite via SMTP (AWS SES). Falha de email NÃO desfaz o
    //    provisionamento — o usuário já existe e o admin pode reenviar.
    let emailSent = true
    try {
      const smtp = new SMTPClient({
        host: smtpServer,
        port: parseInt(smtpPort),
        username: smtpUsername,
        password: smtpPassword,
        from: smtpSender,
      })
      await smtp.sendEmail({
        to: email,
        subject: 'Bellog - Convite de Acesso',
        body: getInviteText(fullName, inviteLink),
        html: getInviteHtml(fullName, inviteLink),
      })
    } catch (mailError) {
      console.error('[invite-user] Falha ao enviar email de convite:', mailError)
      emailSent = false
    }

    // 10. user_id = master_system_user.id (o front usa para saveUserPageAccessFromRole)
    return json(
      {
        success: true,
        user_id: appUser.id,
        email_sent: emailSent,
        message: emailSent
          ? 'Convite enviado com sucesso'
          : 'Usuário criado, mas houve falha no envio do email de convite',
      },
      200
    )
  } catch (error: any) {
    console.error('[invite-user] Error:', error)
    // Rollback apenas se ainda não provisionamos (evita apagar usuário utilizável)
    if (authUserId && !committed) {
      try { await supabase.auth.admin.deleteUser(authUserId) } catch (_) {}
    }
    return json({ error: error.message }, 500)
  }
})
