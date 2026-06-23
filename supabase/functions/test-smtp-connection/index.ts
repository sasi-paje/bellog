import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from '../_shared/smtp-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Testa a conexão SMTP (AWS SES) sem enviar email.
// Autorização: usuário autenticado e ativo em master_system_user.
// OBS: este projeto NÃO usa a tabela genérica `user_roles` — o controle de
// acesso fino (por página/ação) vive em rel_user_role_page (ver CLAUDE.md,
// "Arquitetura de Permissões"). Aqui exigimos apenas um usuário ativo válido;
// um gate mais granular pode ser somado quando o enforcement da Fase 3 existir.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Exigir JWT do usuário autenticado
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const token = authHeader.replace('Bearer ', '')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 2. Validar o token e descobrir o usuário do Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Autorização: precisa existir e estar ativo em master_system_user
    const { data: appUser, error: userError } = await supabase
      .from('master_system_user')
      .select('id, is_active')
      .eq('id_auth_user', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (userError || !appUser) {
      return new Response(
        JSON.stringify({ error: 'Access denied: active app user required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Validar secrets SMTP (sem expor valores)
    const smtpServer = Deno.env.get('SMTP_SERVER')
    const smtpPort = Deno.env.get('SMTP_PORT')
    const smtpUsername = Deno.env.get('SMTP_USERNAME')
    const smtpPassword = Deno.env.get('SMTP_PASSWORD')
    const smtpSender = Deno.env.get('SMTP_SENDER_EMAIL')

    if (!smtpServer || !smtpPort || !smtpUsername || !smtpPassword || !smtpSender) {
      return new Response(
        JSON.stringify({ success: false, error: 'SMTP configuration incomplete' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Testar conexão (handshake + AUTH, sem enviar email)
    const smtpClient = new SMTPClient({
      host: smtpServer,
      port: parseInt(smtpPort),
      username: smtpUsername,
      password: smtpPassword,
      from: smtpSender,
    })

    const ok = await smtpClient.testConnection()

    return new Response(
      JSON.stringify({
        success: ok,
        message: ok ? 'Conexão SMTP bem-sucedida' : 'Falha na conexão SMTP',
      }),
      { status: ok ? 200 : 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[test-smtp-connection] Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
