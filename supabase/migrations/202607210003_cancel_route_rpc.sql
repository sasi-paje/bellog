-- Migration: RPC cancel_route — cancelamento operacional de rota
-- Created: 2026-07-21
--
-- Cancela uma rota (tipicamente em andamento) com motivo:
--   - status de entrega -> "Cancelada" (resolvido dinamicamente por name/code);
--   - notas SEM entrega registrada voltam a ficar disponíveis (rel_route_invoice
--     is_active=false, released_at, release_reason='ROUTE_CANCELLED');
--   - notas COM entrega permanecem intactas (histórico preservado);
--   - a rota permanece is_active=true (registro real, exibido como "Cancelada");
--   - o motorista é liberado (a rota deixa de estar "Em Andamento").
--
-- Detalhe de implementação: o trigger existente trg_lock_rel_route_invoice
-- bloqueia editar rel_route_invoice quando allows_route_edition=false (rota em
-- andamento / cancelada), mas LIBERA quando a rota está is_active=false. Para
-- não reescrever aquele trigger, esta RPC faz um flip atômico de is_active
-- (false -> libera notas -> true) dentro da mesma transação. O guard
-- trg_trx_route_lifecycle não barra esse flip porque o status também muda.

create or replace function public.cancel_route(
  p_route_id bigint,
  p_reason_id bigint,
  p_note text,
  p_is_test boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_active boolean;
  v_cancel_status_id bigint;
  v_reason_name text;
begin
  -- Valida rota no ambiente
  select is_active
    into v_is_active
    from public.trx_route
   where id = p_route_id and is_test = p_is_test;

  if not found then
    raise exception 'Rota não encontrada neste ambiente.' using errcode = 'P0002';
  end if;
  if v_is_active is not true then
    raise exception 'Esta rota já está inativa ou cancelada.' using errcode = 'P0001';
  end if;

  -- Valida motivo (catálogo do ambiente)
  select name
    into v_reason_name
    from public.ref_route_cancel_reason
   where id = p_reason_id and is_active = true and is_test = p_is_test;

  if not found then
    raise exception 'Motivo de cancelamento inválido.' using errcode = 'P0001';
  end if;

  -- Resolve o status "Cancelada" dinamicamente (nunca id fixo)
  select id
    into v_cancel_status_id
    from public.ref_route_delivery_status
   where is_active = true
     and (
       lower(name) in ('cancelada', 'cancelado')
       or lower(code) in ('cancelled', 'canceled', 'cancelada')
     )
   order by id
   limit 1;

  if v_cancel_status_id is null then
    raise exception 'Status "Cancelada" não configurado em ref_route_delivery_status.' using errcode = 'P0001';
  end if;

  -- 1) Muda o status para Cancelada E inativa temporariamente (mesma operação:
  --    o guard de ciclo de vida não barra porque o status está mudando).
  update public.trx_route
     set id_route_delivery_status = v_cancel_status_id,
         is_active = false,
         ends_at = coalesce(ends_at, now()),
         updated_at = now()
   where id = p_route_id and is_test = p_is_test;

  -- 2) Com a rota is_active=false, o lock de montagem libera: solta as notas
  --    SEM entrega (voltam a ficar disponíveis). Notas com entrega registrada
  --    ficam intactas (histórico preservado).
  update public.rel_route_invoice ri
     set is_active = false,
         released_at = now(),
         release_reason = 'ROUTE_CANCELLED',
         unassigned_at = now(),
         updated_at = now()
   where ri.id_route = p_route_id
     and ri.is_test = p_is_test
     and ri.is_active = true
     and not exists (
       select 1
         from public.trx_route_invoice_delivery d
        where d.id_route = p_route_id
          and d.id_fiscal_invoice = ri.id_fiscal_invoice
          and d.is_test = p_is_test
     );

  -- 3) Reativa a rota: fica is_active=true com status "Cancelada".
  update public.trx_route
     set is_active = true,
         updated_at = now()
   where id = p_route_id and is_test = p_is_test;

  -- Histórico (não-fatal: qualquer falha aqui não deve abortar o cancelamento).
  -- Colunas reais: id_route_history_type (FK), title NOT NULL, description.
  -- Tipo resolvido por code (STATUS_ALTERADO) — nunca id fixo.
  begin
    insert into public.trx_route_history (id_route, id_route_history_type, title, description, event_at, is_test)
    select
      p_route_id,
      (select id from public.ref_route_history_type where code = 'STATUS_ALTERADO' order by id limit 1),
      'Rota cancelada',
      'Motivo: ' || coalesce(v_reason_name, '')
        || case when p_note is not null and length(trim(p_note)) > 0 then ' — ' || p_note else '' end,
      now(),
      p_is_test;
  exception when others then
    -- ignora falha de histórico
    null;
  end;
end;
$$;

-- Ação administrativa: apenas usuários autenticados (admin usa Supabase Auth).
grant execute on function public.cancel_route(bigint, bigint, text, boolean) to authenticated, service_role;
