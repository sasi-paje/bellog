-- =============================================================
-- MIGRATION: Atribuir Notas — finalização de produção
-- Executar no SQL Editor do Supabase
-- =============================================================

-- -------------------------------------------------------------
-- PASSO 1: Diagnóstico — verificar status iniciais existentes
-- Execute esta query PRIMEIRO para ver o estado atual
-- -------------------------------------------------------------
SELECT id, code, name, description, is_active, is_test, is_initial
FROM public.ref_route_status
ORDER BY id;

SELECT id, code, name, description, is_active, is_test, is_initial, allows_route_edition
FROM public.ref_route_delivery_status
ORDER BY id;

-- -------------------------------------------------------------
-- PASSO 2: Garantir status inicial da ROTA
-- Se não existir nenhum registro com is_initial = true AND is_active = true AND is_test = false,
-- ajustar o registro existente mais adequado (ex: "Pendente")
-- Adaptar o WHERE conforme o id real encontrado no PASSO 1
-- -------------------------------------------------------------

-- Exemplo: se "Pendente" tem is_initial = false, corrigir:
-- UPDATE public.ref_route_status
-- SET is_initial = true, is_active = true
-- WHERE LOWER(description) LIKE '%pendente%' OR LOWER(name) LIKE '%pendente%';

-- Ou se não existir nenhum registro is_test = false:
-- UPDATE public.ref_route_status
-- SET is_test = false
-- WHERE is_initial = true AND is_active = true;

-- -------------------------------------------------------------
-- PASSO 3: Garantir status inicial da ENTREGA
-- Mesmo raciocínio para ref_route_delivery_status
-- allows_route_edition = true para status iniciais (ainda pode editar)
-- -------------------------------------------------------------

-- Exemplo:
-- UPDATE public.ref_route_delivery_status
-- SET is_initial = true, is_active = true, allows_route_edition = true
-- WHERE LOWER(description) LIKE '%pendente%' OR LOWER(name) LIKE '%pendente%';

-- -------------------------------------------------------------
-- PASSO 4: Corrigir índice único de bloqueio de nota
-- -------------------------------------------------------------
DROP INDEX IF EXISTS public.ux_rel_route_invoice_active_invoice_test;

CREATE UNIQUE INDEX IF NOT EXISTS ux_rel_route_invoice_blocking_invoice_test
ON public.rel_route_invoice (id_fiscal_invoice, is_test)
WHERE is_active = true
  AND released_at IS NULL;

-- -------------------------------------------------------------
-- PASSO 5: Criar RPC update_route_from_assign_notes
-- Adaptar tipos de ID (INTEGER vs UUID) conforme schema real do banco
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_route_from_assign_notes(
  p_route_id          BIGINT,
  p_departure_date    DATE        DEFAULT NULL,
  p_id_route_responsible INTEGER  DEFAULT NULL,
  p_id_driver         BIGINT      DEFAULT NULL,
  p_area              TEXT        DEFAULT NULL,
  p_assistant         TEXT[]      DEFAULT NULL,
  p_invoice_ids       BIGINT[]    DEFAULT '{}',
  p_is_test           BOOLEAN     DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_route              RECORD;
  v_delivery_status    RECORD;
  v_invoice_id         BIGINT;
  v_prev_rel_id        BIGINT;
  v_next_attempt       INT;
  v_now                TIMESTAMPTZ := NOW();
BEGIN
  -- 1. Buscar rota existente
  SELECT * INTO v_route
  FROM public.trx_route
  WHERE id = p_route_id
    AND is_active = true
    AND is_test = p_is_test;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rota % não encontrada ou inativa', p_route_id;
  END IF;

  -- 2. Verificar se montagem pode ser alterada
  IF v_route.id_route_delivery_status IS NOT NULL THEN
    SELECT * INTO v_delivery_status
    FROM public.ref_route_delivery_status
    WHERE id::TEXT = v_route.id_route_delivery_status::TEXT
      AND is_active = true;

    IF FOUND AND NOT v_delivery_status.allows_route_edition THEN
      RAISE EXCEPTION 'Rota em andamento. A montagem não pode mais ser alterada.';
    END IF;
  END IF;

  -- 3. Validar responsável (se informado)
  IF p_id_route_responsible IS NOT NULL THEN
    PERFORM 1 FROM public.ref_route_responsible
    WHERE id = p_id_route_responsible AND is_active = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Responsável % inativo ou não encontrado', p_id_route_responsible;
    END IF;
  END IF;

  -- 4. Validar motorista (se informado)
  IF p_id_driver IS NOT NULL THEN
    PERFORM 1 FROM public.master_person_driver
    WHERE id::BIGINT = p_id_driver
      AND is_active = true
      AND is_test = p_is_test;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Motorista % inativo ou não encontrado', p_id_driver;
    END IF;
  END IF;

  -- 5. Verificar notas bloqueadas em outra rota
  IF array_length(p_invoice_ids, 1) > 0 THEN
    IF EXISTS (
      SELECT 1
      FROM public.rel_route_invoice ri
      WHERE ri.id_fiscal_invoice::BIGINT = ANY(p_invoice_ids)
        AND ri.is_active = true
        AND ri.released_at IS NULL
        AND ri.is_test = p_is_test
        AND ri.id_route::BIGINT <> p_route_id
    ) THEN
      RAISE EXCEPTION 'Uma ou mais notas estão bloqueadas em outra rota ativa';
    END IF;
  END IF;

  -- 6. Atualizar dados da rota
  UPDATE public.trx_route
  SET
    departure_date       = COALESCE(p_departure_date, departure_date),
    id_route_responsible = COALESCE(p_id_route_responsible, id_route_responsible),
    id_driver            = CASE WHEN p_id_driver IS NOT NULL THEN p_id_driver ELSE id_driver END,
    area                 = COALESCE(p_area, area),
    assistant            = COALESCE(p_assistant, assistant),
    updated_at           = v_now
  WHERE id = p_route_id
    AND is_test = p_is_test;

  -- 7. Desativar notas que saíram da montagem
  UPDATE public.rel_route_invoice
  SET
    is_active     = false,
    unassigned_at = v_now,
    updated_at    = v_now
  WHERE id_route::BIGINT = p_route_id
    AND is_test = p_is_test
    AND is_active = true
    AND released_at IS NULL
    AND NOT (id_fiscal_invoice::BIGINT = ANY(p_invoice_ids));

  -- 8. Reativar notas que voltaram para a montagem
  UPDATE public.rel_route_invoice
  SET
    is_active     = true,
    assigned_at   = v_now,
    unassigned_at = NULL,
    updated_at    = v_now
  WHERE id_route::BIGINT = p_route_id
    AND is_test = p_is_test
    AND is_active = false
    AND (id_fiscal_invoice::BIGINT = ANY(p_invoice_ids));

  -- 9. Inserir notas novas (com attempt_number e id_previous_route_invoice)
  FOREACH v_invoice_id IN ARRAY p_invoice_ids
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.rel_route_invoice
      WHERE id_route::BIGINT = p_route_id
        AND id_fiscal_invoice::BIGINT = v_invoice_id
        AND is_test = p_is_test
    ) THEN
      -- Calcular próxima tentativa para esta nota
      SELECT COALESCE(MAX(attempt_number), 0) + 1, MAX(id)
      INTO v_next_attempt, v_prev_rel_id
      FROM public.rel_route_invoice
      WHERE id_fiscal_invoice::BIGINT = v_invoice_id
        AND is_test = p_is_test;

      INSERT INTO public.rel_route_invoice (
        id_route,
        id_fiscal_invoice,
        assigned_at,
        attempt_number,
        id_previous_route_invoice,
        is_test,
        is_active
      ) VALUES (
        p_route_id,
        v_invoice_id,
        v_now,
        v_next_attempt,
        v_prev_rel_id,
        p_is_test,
        true
      );
    END IF;
  END LOOP;

END;
$$;

-- Permissão para o role anon/authenticated chamar via Supabase
GRANT EXECUTE ON FUNCTION public.update_route_from_assign_notes TO anon;
GRANT EXECUTE ON FUNCTION public.update_route_from_assign_notes TO authenticated;

-- =============================================================
-- VERIFICAÇÃO FINAL
-- =============================================================
-- Checar que status iniciais existem para p_is_test = false (produção):
SELECT
  'ref_route_status' AS tabela,
  COUNT(*) AS total_iniciais_prod
FROM public.ref_route_status
WHERE is_initial = true AND is_active = true AND is_test = false
UNION ALL
SELECT
  'ref_route_delivery_status',
  COUNT(*)
FROM public.ref_route_delivery_status
WHERE is_initial = true AND is_active = true AND is_test = false;

-- Resultado esperado: ambas as linhas com COUNT >= 1
-- Se alguma retornar 0, executar os UPDATEs do PASSO 2/3 acima
