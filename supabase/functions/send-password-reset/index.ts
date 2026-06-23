import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from '../_shared/smtp-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting: 3 requests por email a cada 5 minutos
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 5 * 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 3

function isRateLimited(email: string): boolean {
  const now = Date.now()
  const key = email.toLowerCase()
  const record = rateLimitMap.get(key)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return false
  }
  if (record.count >= MAX_REQUESTS_PER_WINDOW) return true
  record.count++
  return false
}

// Senha temporária descartável (o usuário define a definitiva no primeiro acesso).
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  let pw = ''
  for (const b of bytes) pw += chars[b % chars.length]
  return pw + 'aZ9#'
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getResetHtml(email: string, tempPassword: string, link: string): string {
  const safeEmail = escapeHtml(email)
  const safePw = escapeHtml(tempPassword)
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
    .creds { background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px;
             padding: 16px; margin: 20px 0; font-family: monospace; word-break: break-all; }
    .button { display: inline-block; background-color: #e67c26; color: #ffffff !important;
              padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Bellog - Redefinir Senha</h1>
    </div>
    <div class="content">
      <p>Olá,</p>
      <p>Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para definir uma nova senha — você vai precisar da senha temporária a seguir.</p>
      <div class="creds">
        <div><strong>Email:</strong> ${safeEmail}</div>
        <div><strong>Senha temporária:</strong> ${safePw}</div>
      </div>
      <a href="${link}" class="button">Redefinir minha senha</a>
      <p>Se você não solicitou a redefinição, ignore este email — sua senha anterior deixou de valer apenas se você concluir o processo acima.</p>
    </div>
    <div class="footer">
      <p>Atenciosamente,<br>Equipe Bellog</p>
    </div>
  </div>
</body>
</html>
`
}

function getResetText(email: string, tempPassword: string, link: string): string {
  return `Bellog - Redefinir Senha

Olá,

Recebemos uma solicitação para redefinir sua senha.
Clique no link abaixo para definir uma nova senha — você vai precisar da senha temporária a seguir.

Redefinir minha senha: ${link}
Email: ${email}
Senha temporária: ${tempPassword}

Se você não solicitou a redefinição, ignore este email.

Atenciosamente,
Equipe Bellog`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Resposta genérica (previne enumeração de usuários)
  const responseMessage = 'Se este email existir, um link de redefinição será enviado'
  const genericOk = () =>
    new Response(
      JSON.stringify({ success: true, message: responseMessage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  try {
    const { email } = await req.json()
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const emailLower = String(email).trim().toLowerCase()

    if (isRateLimited(emailLower)) {
      return new Response(
        JSON.stringify({ error: 'Muitas tentativas. Tente novamente mais tarde.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verificar se o usuário existe (sem revelar)
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers()
    const user = (!userError && userData?.users)
      ? userData.users.find(u => u.email?.toLowerCase() === emailLower)
      : null

    if (!user) {
      console.log('[send-password-reset] Usuário não encontrado:', emailLower)
      return genericOk()
    }

    // Validar SMTP (sem vazar detalhe ao cliente)
    const smtpServer = Deno.env.get('SMTP_SERVER')
    const smtpPort = Deno.env.get('SMTP_PORT')
    const smtpUsername = Deno.env.get('SMTP_USERNAME')
    const smtpPassword = Deno.env.get('SMTP_PASSWORD')
    const smtpSender = Deno.env.get('SMTP_SENDER_EMAIL')

    if (!smtpServer || !smtpPort || !smtpUsername || !smtpPassword || !smtpSender) {
      console.error('[send-password-reset] SMTP configuration incomplete')
      return genericOk()
    }

    // Gerar senha temporária e marcar troca obrigatória (mesmo fluxo do convite)
    const tempPassword = generateTempPassword()
    const { error: updError } = await supabase.auth.admin.updateUserById(user.id, {
      password: tempPassword,
      user_metadata: {
        ...user.user_metadata,
        needs_password_change: true,
        temp_password: tempPassword,
      },
    })

    if (updError) {
      console.error('[send-password-reset] Falha ao atualizar usuário:', updError)
      return genericOk()
    }

    // Link para a tela de primeiro acesso (raiz + query; rotas profundas dão 404 no Vercel)
    const baseUrl = (Deno.env.get('FRONTEND_URL') || 'http://localhost:5173').replace(/\/$/, '')
    const link = `${baseUrl}/?first_access=${encodeURIComponent(emailLower)}`

    const smtpClient = new SMTPClient({
      host: smtpServer,
      port: parseInt(smtpPort),
      username: smtpUsername,
      password: smtpPassword,
      from: smtpSender,
    })

    await smtpClient.sendEmail({
      to: emailLower,
      subject: 'Bellog - Redefinir Senha',
      body: getResetText(emailLower, tempPassword, link),
      html: getResetHtml(emailLower, tempPassword, link),
    })

    console.log('[send-password-reset] Email enviado para:', emailLower)
    return genericOk()
  } catch (error: any) {
    console.error('[send-password-reset] Error:', error)
    // Sempre genérico em caso de erro (anti-enumeração)
    return new Response(
      JSON.stringify({ success: true, message: 'Se este email existir, um link de redefinição será enviado' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
