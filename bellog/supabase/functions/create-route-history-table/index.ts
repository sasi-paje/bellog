// supabase/functions/create-route-history-table/index.ts
// Edge Function para criar a tabela de histórico de rotas

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Criar tabela usando supabase-js admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Executar SQL de criação da tabela
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS trx_route_history (
        id BIGSERIAL PRIMARY KEY,
        id_route BIGINT NOT NULL REFERENCES trx_route(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        event_label VARCHAR(100) NOT NULL,
        event_description TEXT,
        event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metadata JSONB,
        is_test BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_by BIGINT,
        updated_at TIMESTAMPTZ,
        updated_by BIGINT
      );

      CREATE INDEX IF NOT EXISTS idx_route_history_route ON trx_route_history(id_route);
      CREATE INDEX IF NOT EXISTS idx_route_history_date ON trx_route_history(event_at);
    `

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ query: createTableSQL }),
    })

    if (!response.ok) {
      // Tentar via endpoint alternativo
      const altResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Prefer': 'params=single-object',
        },
        body: JSON.stringify({}),
      })

      // Retornar instruções para criar manualmente
      return new Response(
        JSON.stringify({
          message: 'Tabela não existe. Use o SQL: CREATE TABLE trx_route_history (id BIGSERIAL PRIMARY KEY, id_route BIGINT NOT NULL, event_type VARCHAR(50) NOT NULL, event_label VARCHAR(100) NOT NULL, event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), is_test BOOLEAN DEFAULT false, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW())',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Tabela trx_route_history criada com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})