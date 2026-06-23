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

function getResetHtml(link: string): string {
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
      <h1>Bellog - Redefinir Senha</h1>
    </div>
    <div class="content">
      <p>Olá,</p>
      <p>Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha:</p>
      <a href="${link}" class="button">Redefinir minha senha</a>
      <p><strong>Este link expira em 1 hora</strong> por motivos de segurança.</p>
      <p>Se você não solicitou a redefinição, ignore este email — sua senha atual continua válida.</p>
    </div>
    <div class="footer">
      <p>Atenciosamente,<br>Equipe Bellog</p>
    </div>
  </div>
</body>
</html>
`
}

function getResetText(link: string): string {
  return `Bellog - Redefinir Senha

Olá,

Recebemos uma solicitação para redefinir sua senha.
Clique no link abaixo para criar uma nova senha:
${link}

Este link expira em 1 hora por motivos de segurança.
Se você não solicitou a redefinição, ignore este email — sua senha atual continua válida.

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Gera um link de recovery NATIVO do Supabase (sem enviar email pelo Supabase).
    // O link, ao ser clicado, estabelece uma sessão de recovery e redireciona para
    // /?reset_password (raiz; rotas profundas dão 404 no Vercel). NÃO troca a senha
    // agora — a senha atual segue válida até o usuário concluir.
    const baseUrl = (Deno.env.get('FRONTEND_URL') || 'http://localhost:5173').replace(/\/$/, '')
    const redirectTo = `${baseUrl}/?reset_password=1`

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: emailLower,
      options: { redirectTo },
    })

    // Usuário inexistente => generateLink falha; responde genérico (anti-enumeração)
    const actionLink = linkData?.properties?.action_link
    if (linkError || !actionLink) {
      console.log('[send-password-reset] generateLink falhou (usuário inexistente?):', linkError?.message)
      return genericOk()
    }

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
      body: getResetText(actionLink),
      html: getResetHtml(actionLink),
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
