-- ============================================================
-- Fix: save_user_page_access_from_role.p_user_id deve ser BIGINT
--
-- master_system_user.id e rel_user_role_page.id_user são bigint,
-- mas a função declarava p_user_id text, causando:
--   "operator does not exist: bigint = text"
-- nas comparações id = p_user_id (linha 115) e id_user = p_user_id.
--
-- CREATE OR REPLACE não troca tipo de argumento (cria overload),
-- então removemos a versão antiga (text) antes de recriar.
-- ============================================================

DROP FUNCTION IF EXISTS public.save_user_page_access_from_role(text, integer, integer[], boolean);

CREATE OR REPLACE FUNCTION public.save_user_page_access_from_role(
  p_user_id  bigint,
  p_role_id  integer,
  p_page_ids integer[],
  p_is_test  boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_view       boolean;
  v_can_create     boolean;
  v_can_edit       boolean;
  v_can_update     boolean;
  v_can_activate   boolean;
  v_can_inactivate boolean;
  v_invalid_pages  integer;
BEGIN
  -- Validar usuário no mesmo ambiente
  IF NOT EXISTS (
    SELECT 1 FROM public.master_system_user
    WHERE  id      = p_user_id
      AND  is_test = p_is_test
  ) THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;

  -- Validar cargo (existe, ativo, mesmo ambiente)
  IF NOT EXISTS (
    SELECT 1 FROM public.master_user_role
    WHERE  id        = p_role_id
      AND  is_test   = p_is_test
      AND  is_active = true
  ) THEN
    RAISE EXCEPTION 'Cargo não encontrado ou inativo.';
  END IF;

  -- Validar páginas somente quando o array não está vazio
  IF cardinality(COALESCE(p_page_ids, ARRAY[]::integer[])) > 0 THEN
    SELECT COUNT(*) INTO v_invalid_pages
    FROM   unnest(p_page_ids) AS pid
    WHERE  pid NOT IN (
      SELECT id FROM public.master_system_page
      WHERE  is_active = true
        AND  is_test   = p_is_test
    );

    IF v_invalid_pages > 0 THEN
      RAISE EXCEPTION 'Uma ou mais páginas inválidas ou inativas foram enviadas.';
    END IF;
  END IF;

  -- Calcular can_* das permissões do Cargo
  SELECT
    bool_or(p.code IN ('VIEW', 'CREATE', 'UPDATE', 'ACTIVATE', 'INACTIVATE')),
    bool_or(p.code = 'CREATE'),
    bool_or(p.code = 'UPDATE'),
    bool_or(p.code = 'UPDATE'),
    bool_or(p.code = 'ACTIVATE'),
    bool_or(p.code = 'INACTIVATE')
  INTO v_can_view, v_can_create, v_can_edit, v_can_update, v_can_activate, v_can_inactivate
  FROM   public.master_user_role_permission rup
  JOIN   public.master_system_permission p
    ON   p.id        = rup.permission_id
    AND  p.is_active = true
    AND  p.is_test   = false
  WHERE  rup.role_id = p_role_id;

  v_can_view       := COALESCE(v_can_view,       false);
  v_can_create     := COALESCE(v_can_create,     false);
  v_can_edit       := COALESCE(v_can_edit,       false);
  v_can_update     := COALESCE(v_can_update,     false);
  v_can_activate   := COALESCE(v_can_activate,   false);
  v_can_inactivate := COALESCE(v_can_inactivate, false);

  -- Substituir acesso anterior do usuário neste ambiente
  DELETE FROM public.rel_user_role_page
  WHERE  id_user = p_user_id
    AND  is_test = p_is_test;

  -- Inserir páginas com ações calculadas (nada a inserir se array vazio)
  IF cardinality(COALESCE(p_page_ids, ARRAY[]::integer[])) > 0 THEN
    INSERT INTO public.rel_user_role_page (
      id_user, id_system_page,
      can_view, can_create, can_edit, can_update, can_activate, can_inactivate,
      is_active, is_test
    )
    SELECT
      p_user_id,
      pid,
      v_can_view, v_can_create, v_can_edit, v_can_update, v_can_activate, v_can_inactivate,
      true,
      p_is_test
    FROM unnest(p_page_ids) AS pid;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_user_page_access_from_role(bigint, integer, integer[], boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.save_user_page_access_from_role(bigint, integer, integer[], boolean) TO authenticated;

SELECT pg_notify('pgrst', 'reload schema');
