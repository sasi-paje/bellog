-- Migration: Bloqueia registrar entrega em rota indisponível
-- Created: 2026-07-21
--
-- Trigger BEFORE INSERT em trx_route_invoice_delivery, aditivo. Impede gravar
-- uma entrega quando a rota foi inativada (is_active=false) ou cancelada/
-- abortada — caso o app do motorista tenha ficado com a tela aberta e dados
-- antigos após ação administrativa. Não altera a RPC register_invoice_delivery_result
-- existente (evita conflito com drift de produção).

create or replace function public.check_delivery_route_available()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_is_active boolean;
  v_status_id bigint;
  v_token text;
begin
  select is_active, id_route_delivery_status
    into v_is_active, v_status_id
    from public.trx_route
   where id = NEW.id_route and is_test = NEW.is_test;

  -- Rota inexistente/de outro ambiente ou inativada: bloqueia.
  if not found or v_is_active is not true then
    raise exception 'Esta rota não está mais disponível. Ela foi cancelada ou inativada pela operação.'
      using errcode = 'P0001';
  end if;

  -- Rota cancelada/abortada (ainda is_active=true): bloqueia.
  select lower(coalesce(name, '')) || '|' || lower(coalesce(code, ''))
    into v_token
    from public.ref_route_delivery_status
   where id = v_status_id;

  if v_token is not null
     and (v_token like '%cancel%' or v_token like '%abort%') then
    raise exception 'Esta rota não está mais disponível. Ela foi cancelada ou inativada pela operação.'
      using errcode = 'P0001';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_check_delivery_route_available on public.trx_route_invoice_delivery;
create trigger trg_check_delivery_route_available
  before insert on public.trx_route_invoice_delivery
  for each row execute function public.check_delivery_route_available();
