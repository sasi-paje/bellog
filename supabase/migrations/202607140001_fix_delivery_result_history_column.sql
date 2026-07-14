-- =====================================================
-- FIX: register_invoice_delivery_result quebra ao finalizar
-- entrega com o erro:
--   column "id_history_type" of relation "trx_route_history"
--   does not exist
--
-- Causa: a versão anterior da RPC (202606060001) tinha dois
-- branches para o histórico — um usando `event_type` e outro
-- usando `id_history_type`. NENHUM corresponde ao schema real
-- da tabela, que é:
--   id_route, id_route_history_type, title, description,
--   reference_name, event_at, metadata, is_test, is_active, ...
--
-- Como a coluna `event_type` não existe, a função caía no ELSE
-- que inseria `id_history_type` — coluna que também não existe —
-- e a transação inteira falhava (a entrega não era salva).
--
-- Correção: inserir o histórico usando o schema real (mesmo
-- padrão de register_route_stop_arrival). O insert de histórico
-- fica dentro de um bloco EXCEPTION para NUNCA derrubar o
-- salvamento da entrega, mesmo que o histórico falhe.
-- =====================================================

CREATE OR REPLACE FUNCTION public.register_invoice_delivery_result(
  p_id_route_invoice    bigint,
  p_id_delivery_type    bigint,
  p_id_reason           bigint          DEFAULT NULL,
  p_receipt_image_path  text            DEFAULT NULL,
  p_nfd_image_path      text            DEFAULT NULL,
  p_nfd_number          text            DEFAULT NULL,
  p_returned_box_quantity integer        DEFAULT NULL,
  p_returned_amount     numeric(12, 2)  DEFAULT NULL,
  p_observation         text            DEFAULT NULL,
  p_is_test             boolean         DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_route_id                bigint;
  v_invoice_id              bigint;
  v_result_status_id        bigint;
  v_releases_to_available   boolean;
  v_history_type_id         bigint;
  v_delivery_label          text;
BEGIN
  -- 1. Resolve route + invoice from the junction record
  SELECT id_route, id_fiscal_invoice
  INTO   v_route_id, v_invoice_id
  FROM   public.rel_route_invoice
  WHERE  id = p_id_route_invoice;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tentativa não encontrada';
  END IF;

  -- 2. Resolve delivery type metadata
  SELECT id_result_invoice_status, releases_to_available, name
  INTO   v_result_status_id, v_releases_to_available, v_delivery_label
  FROM   public.ref_delivery_reason_type
  WHERE  id = p_id_delivery_type;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tipo de entrega não encontrado';
  END IF;

  -- 3. Save delivery result
  INSERT INTO public.trx_route_invoice_delivery (
    id_route, id_fiscal_invoice, id_route_invoice,
    id_delivery_type, id_reason,
    receipt_image_path, nfd_image_path, nfd_number,
    returned_box_quantity, returned_amount, observation,
    delivered_at, is_test, is_active
  ) VALUES (
    v_route_id, v_invoice_id, p_id_route_invoice,
    p_id_delivery_type, p_id_reason,
    p_receipt_image_path, p_nfd_image_path, p_nfd_number,
    p_returned_box_quantity, p_returned_amount, p_observation,
    now(), p_is_test, true
  );

  -- 4. Update invoice status if applicable
  IF v_result_status_id IS NOT NULL THEN
    UPDATE public.trx_fiscal_invoice
    SET    id_fiscal_invoice_status = v_result_status_id,
           updated_at               = now()
    WHERE  id = v_invoice_id;
  END IF;

  -- 5. Release invoice from route if applicable
  IF v_releases_to_available THEN
    UPDATE public.rel_route_invoice
    SET    is_active       = false,
           released_at     = now(),
           release_reason  = 'DELIVERY_REGISTERED'
    WHERE  id = p_id_route_invoice;
  END IF;

  -- 6. Write history using the REAL schema. Never let a history
  --    failure roll back the delivery result above.
  BEGIN
    SELECT id
    INTO   v_history_type_id
    FROM   public.ref_route_history_type
    WHERE  code = 'ENTREGA_FINALIZADA'
      AND  is_active = true
    LIMIT 1;

    INSERT INTO public.trx_route_history (
      id_route,
      id_route_history_type,
      title,
      description,
      event_at,
      metadata,
      is_test,
      is_active
    ) VALUES (
      v_route_id,
      v_history_type_id,
      'Entrega finalizada',
      COALESCE('Entrega finalizada — ' || v_delivery_label, 'Entrega finalizada'),
      now(),
      jsonb_build_object(
        'event_type',       'DELIVERY_REGISTERED',
        'route_invoice_id', p_id_route_invoice,
        'invoice_id',       v_invoice_id,
        'delivery_type_id', p_id_delivery_type
      ),
      p_is_test,
      true
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'register_invoice_delivery_result: falha ao gravar histórico (ignorada): %', SQLERRM;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_invoice_delivery_result TO authenticated, anon;
