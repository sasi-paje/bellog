-- =====================================================
-- ref_whats_new — conteúdo do painel "O que há de novo?"
--
-- Permite publicar novidades sem deploy: basta inserir uma linha.
-- Leitura pública (anon/authenticated) via RLS; escrita só por SQL/service_role.
-- `pages`: telas em que a novidade aparece ('{all}' = todas).
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ref_whats_new (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tag           text        NOT NULL,                       -- "Novo" | "Melhoria" | "Correção"
  title         text        NOT NULL,
  body          text        NOT NULL,
  pages         text[]      NOT NULL DEFAULT '{all}',        -- telas alvo; {all} = todas
  published_at  date        NOT NULL,                        -- data exibida / ordenação
  is_active     boolean     NOT NULL DEFAULT true,
  is_test       boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_ref_whats_new_lookup
  ON public.ref_whats_new (is_test, is_active, published_at DESC);

-- RLS: leitura de registros ativos para anon/authenticated (escrita só service_role)
ALTER TABLE public.ref_whats_new ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ref_whats_new_read_active ON public.ref_whats_new;
CREATE POLICY ref_whats_new_read_active
  ON public.ref_whats_new
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Seed inicial: novidades atuais, para os dois ambientes (is_test true/false)
INSERT INTO public.ref_whats_new (tag, title, body, pages, published_at, is_test)
SELECT s.tag, s.title, s.body, s.pages, s.published_at, t.is_test
FROM (VALUES
  ('Novo',      'Central de novidades',
   'Sempre que uma nova funcionalidade ou correção for publicada, você será avisado por aqui automaticamente.',
   ARRAY['all'],                                   DATE '2026-07-19'),
  ('Novo',      'Filtro avançado de rotas',
   'Agora é possível combinar múltiplos critérios — área, motorista e status de entrega — em uma única busca.',
   ARRAY['routes'],                                DATE '2026-07-15'),
  ('Melhoria',  'Registros por página',
   'Escolha exibir 20, 50 ou 100 registros por página diretamente na barra de ferramentas.',
   ARRAY['routes','notes','routes-by-notes'],      DATE '2026-07-02'),
  ('Melhoria',  'Exibir rotas inativas',
   'Um novo controle permite alternar a visibilidade de rotas desativadas na listagem.',
   ARRAY['routes'],                                DATE '2026-06-24'),
  ('Correção',  'Exportação para PDF',
   'Corrigido o corte de colunas ao exportar a listagem de rotas em modo paisagem.',
   ARRAY['routes'],                                DATE '2026-06-10')
) AS s(tag, title, body, pages, published_at)
CROSS JOIN (VALUES (true), (false)) AS t(is_test);
