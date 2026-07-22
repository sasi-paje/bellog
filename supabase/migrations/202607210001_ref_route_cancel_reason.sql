-- Migration: Motivos de cancelamento de ROTA (ref_route_cancel_reason)
-- Created: 2026-07-21
--
-- Catálogo dos motivos exibidos no modal "Cancelar Rota" (admin). Diferente de
-- ref_delivery_reason (que é resultado de ENTREGA de nota) e de ref_abortadas
-- (legado). Segue o padrão ref_*: is_active + is_test + auditoria.

create table if not exists public.ref_route_cancel_reason (
  id bigint generated always as identity not null,
  code text not null,
  name text not null,
  description text null,
  sort_order integer null,
  is_active boolean not null default true,
  is_test boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone null,
  constraint ref_route_cancel_reason_pkey primary key (id),
  constraint ref_route_cancel_reason_code_test_key unique (code, is_test)
) TABLESPACE pg_default;

do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at') then
    execute 'drop trigger if exists trg_ref_route_cancel_reason_updated_at on public.ref_route_cancel_reason';
    execute 'create trigger trg_ref_route_cancel_reason_updated_at before update on public.ref_route_cancel_reason for each row execute function set_updated_at()';
  end if;
end$$;

-- Seed para os dois ambientes (produção: is_test=false; teste: is_test=true).
-- Idempotente via ON CONFLICT (code, is_test).
insert into public.ref_route_cancel_reason (code, name, description, sort_order, is_test)
values
  ('VEHICLE_PROBLEM',     'Problema com o veículo',        null, 1, false),
  ('DRIVER_UNAVAILABLE',  'Indisponibilidade do motorista', null, 2, false),
  ('ASSEMBLY_ERROR',      'Erro na montagem',              null, 3, false),
  ('ROUTE_CREATED_WRONG', 'Rota criada incorretamente',    null, 4, false),
  ('OTHER',               'Outro motivo',                  null, 5, false),
  ('VEHICLE_PROBLEM',     'Problema com o veículo',        null, 1, true),
  ('DRIVER_UNAVAILABLE',  'Indisponibilidade do motorista', null, 2, true),
  ('ASSEMBLY_ERROR',      'Erro na montagem',              null, 3, true),
  ('ROUTE_CREATED_WRONG', 'Rota criada incorretamente',    null, 4, true),
  ('OTHER',               'Outro motivo',                  null, 5, true)
on conflict (code, is_test) do nothing;
