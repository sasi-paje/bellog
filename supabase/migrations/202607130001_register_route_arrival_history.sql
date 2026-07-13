-- Registra chegada ao cliente também em trx_route_history para exibir
-- o evento no histórico do modal de rota web.

insert into public.ref_route_history_type (
  code,
  name,
  description,
  display_order,
  is_active,
  is_test
)
values (
  'CLIENT_ARRIVAL',
  'Chegada ao Cliente',
  'Chegada ao Cliente',
  60,
  true,
  false
)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  is_active = true,
  updated_at = now();

drop function if exists public.register_route_stop_arrival(bigint, timestamptz, text, text, bigint);

create or replace function public.register_route_stop_arrival(
  p_id_route_stop bigint,
  p_arrived_at timestamptz,
  p_arrival_photo_path text,
  p_justification text default null,
  p_user_id bigint default null
)
returns public.trx_route_stop
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stop public.trx_route_stop;
  v_updated_stop public.trx_route_stop;
  v_history_type_id bigint;
  v_company_name text;
  v_title text;
begin
  select *
    into v_stop
  from public.trx_route_stop
  where id = p_id_route_stop
    and is_active = true
  for update;

  if not found then
    raise exception 'Parada da rota não encontrada.';
  end if;

  if v_stop.arrived_at is not null then
    if p_justification is null or length(trim(p_justification)) = 0 then
      raise exception 'Justificativa é obrigatória para alterar uma chegada já registrada.';
    end if;

    insert into public.trx_route_stop_arrival_history (
      id_route_stop,
      old_arrived_at,
      new_arrived_at,
      old_photo_path,
      new_photo_path,
      justification,
      created_by
    )
    values (
      v_stop.id,
      v_stop.arrived_at,
      p_arrived_at,
      v_stop.arrival_photo_path,
      p_arrival_photo_path,
      p_justification,
      p_user_id
    );
  end if;

  update public.trx_route_stop
  set
    arrived_at = p_arrived_at,
    arrival_photo_path = p_arrival_photo_path,
    arrival_observation = nullif(trim(coalesce(p_justification, '')), ''),
    updated_at = now(),
    updated_by = p_user_id
  where id = p_id_route_stop
  returning *
  into v_updated_stop;

  select id
    into v_history_type_id
  from public.ref_route_history_type
  where code = 'CLIENT_ARRIVAL'
    and is_active = true
  limit 1;

  select coalesce(trade_name, legal_name, concat('Cliente ', id::text))
    into v_company_name
  from public.master_person_company
  where id = v_updated_stop.id_company;

  v_title := case
    when nullif(trim(coalesce(v_company_name, '')), '') is null then 'Chegada ao Cliente'
    else 'Chegada ao Cliente — ' || v_company_name
  end;

  insert into public.trx_route_history (
    id_route,
    id_route_history_type,
    title,
    description,
    reference_name,
    event_at,
    metadata,
    is_test,
    created_by,
    updated_by
  )
  values (
    v_updated_stop.id_route,
    v_history_type_id,
    v_title,
    v_title,
    v_company_name,
    p_arrived_at,
    jsonb_build_object(
      'event_type', 'CLIENT_ARRIVAL',
      'id_route_stop', v_updated_stop.id,
      'company_id', v_updated_stop.id_company,
      'destination_name', v_company_name,
      'arrival_photo_path', p_arrival_photo_path,
      'justification', nullif(trim(coalesce(p_justification, '')), '')
    ),
    v_updated_stop.is_test,
    p_user_id,
    p_user_id
  );

  return v_updated_stop;
end;
$$;

revoke all on function public.register_route_stop_arrival(bigint, timestamptz, text, text, bigint) from public;

-- Backfill: chegadas já registradas antes desta migration também aparecem
-- no histórico web, sem duplicar eventos já criados.
insert into public.trx_route_history (
  id_route,
  id_route_history_type,
  title,
  description,
  reference_name,
  event_at,
  metadata,
  is_test,
  created_by,
  updated_by
)
select
  trs.id_route,
  rht.id,
  case
    when nullif(trim(coalesce(mpc.trade_name, mpc.legal_name, '')), '') is null then 'Chegada ao Cliente'
    else 'Chegada ao Cliente — ' || coalesce(mpc.trade_name, mpc.legal_name)
  end as title,
  case
    when nullif(trim(coalesce(mpc.trade_name, mpc.legal_name, '')), '') is null then 'Chegada ao Cliente'
    else 'Chegada ao Cliente — ' || coalesce(mpc.trade_name, mpc.legal_name)
  end as description,
  coalesce(mpc.trade_name, mpc.legal_name) as reference_name,
  trs.arrived_at,
  jsonb_build_object(
    'event_type', 'CLIENT_ARRIVAL',
    'id_route_stop', trs.id,
    'company_id', trs.id_company,
    'destination_name', coalesce(mpc.trade_name, mpc.legal_name),
    'arrival_photo_path', trs.arrival_photo_path,
    'backfilled', true
  ),
  trs.is_test,
  trs.updated_by,
  trs.updated_by
from public.trx_route_stop trs
join public.ref_route_history_type rht
  on rht.code = 'CLIENT_ARRIVAL'
left join public.master_person_company mpc
  on mpc.id = trs.id_company
where trs.arrived_at is not null
  and trs.is_active = true
  and not exists (
    select 1
    from public.trx_route_history trh
    where trh.id_route = trs.id_route
      and trh.id_route_history_type = rht.id
      and (
        trh.metadata ->> 'id_route_stop' = trs.id::text
        or (
          trh.event_at = trs.arrived_at
          and trh.metadata ->> 'company_id' = trs.id_company::text
        )
      )
  );
