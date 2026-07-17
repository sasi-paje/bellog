-- =====================================================
-- FIX: save_user_role_with_permissions falha ao criar/editar cargo com
--   ERROR 42702: column reference "name" is ambiguous
--
-- Causa: a função declara RETURNS TABLE(id bigint, name text, code text, ...).
-- Esses nomes de coluna de saída passam a existir como variáveis no escopo
-- PL/pgSQL. Nos EXISTS de verificação de duplicidade, referências não
-- qualificadas a `name` (e `id`) ficam ambíguas entre a variável de saída e a
-- coluna de master_user_role → Postgres aborta com 42702 e o cargo não é criado.
--
-- Correção: qualificar as colunas com alias da tabela (mur.*) nos EXISTS.
-- Nada mais muda (mesma assinatura, mesmo retorno, mesmas regras).
-- =====================================================

CREATE OR REPLACE FUNCTION public.save_user_role_with_permissions(
  p_role_id        integer,
  p_name           text,
  p_code           text,
  p_is_test        boolean,
  p_permission_ids integer[]
)
RETURNS TABLE(id bigint, name text, code text, is_active boolean, is_test boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cargo_id     bigint;
  v_trimmed_name text;
  v_view_id      integer;
  v_final_ids    integer[];
  v_invalid_cnt  integer;
BEGIN
  v_trimmed_name := trim(p_name);

  IF v_trimmed_name = '' OR v_trimmed_name IS NULL THEN
    RAISE EXCEPTION 'Informe o nome do cargo.';
  END IF;

  IF p_role_id IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.master_user_role mur
      WHERE  mur.name    = v_trimmed_name
        AND  mur.is_test = p_is_test
    ) THEN
      RAISE EXCEPTION 'Já existe um cargo cadastrado com este nome.';
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.master_user_role mur
      WHERE  mur.name    = v_trimmed_name
        AND  mur.is_test = p_is_test
        AND  mur.id      != p_role_id
    ) THEN
      RAISE EXCEPTION 'Já existe outro cargo cadastrado com este nome.';
    END IF;
  END IF;

  SELECT msp.id INTO v_view_id
  FROM   public.master_system_permission msp
  WHERE  msp.code      = 'VIEW'
    AND  msp.is_active = true
    AND  msp.is_test   = false
  LIMIT 1;

  IF v_view_id IS NULL THEN
    RAISE EXCEPTION 'Permissão padrão Visualizar não encontrada.';
  END IF;

  SELECT ARRAY(
    SELECT DISTINCT unnest(COALESCE(p_permission_ids, ARRAY[]::integer[]) || ARRAY[v_view_id])
  ) INTO v_final_ids;

  SELECT COUNT(*) INTO v_invalid_cnt
  FROM   unnest(v_final_ids) AS pid
  WHERE  pid NOT IN (
    SELECT msp.id FROM public.master_system_permission msp
    WHERE  msp.is_active = true AND msp.is_test = false
  );

  IF v_invalid_cnt > 0 THEN
    RAISE EXCEPTION 'Uma ou mais permissões inválidas ou inativas foram enviadas.';
  END IF;

  IF p_role_id IS NULL THEN
    INSERT INTO public.master_user_role (name, code, is_active, is_test)
    VALUES (v_trimmed_name, p_code, true, p_is_test)
    RETURNING master_user_role.id INTO v_cargo_id;
  ELSE
    UPDATE public.master_user_role mur
    SET    name       = v_trimmed_name,
           updated_at = now()
    WHERE  mur.id      = p_role_id
      AND  mur.is_test = p_is_test
    RETURNING mur.id INTO v_cargo_id;

    IF v_cargo_id IS NULL THEN
      RAISE EXCEPTION 'Cargo não encontrado.';
    END IF;
  END IF;

  DELETE FROM public.master_user_role_permission WHERE role_id = v_cargo_id;

  INSERT INTO public.master_user_role_permission (role_id, permission_id)
  SELECT v_cargo_id, pid FROM unnest(v_final_ids) AS pid;

  -- Propagar ações para todos os usuários ativos deste Cargo
  PERFORM public.sync_users_actions_by_role(v_cargo_id::integer, p_is_test);

  RETURN QUERY
    SELECT r.id, r.name, r.code, r.is_active, r.is_test
    FROM   public.master_user_role r
    WHERE  r.id = v_cargo_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_user_role_with_permissions(integer, text, text, boolean, integer[]) TO anon;
GRANT EXECUTE ON FUNCTION public.save_user_role_with_permissions(integer, text, text, boolean, integer[]) TO authenticated;

SELECT pg_notify('pgrst', 'reload schema');
