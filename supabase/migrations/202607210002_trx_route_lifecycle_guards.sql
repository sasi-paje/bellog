-- Migration: Guards de ciclo de vida da rota (trx_route)
-- Created: 2026-07-21
--
-- Trigger BEFORE UPDATE em trx_route, aditivo (não altera triggers existentes):
--   (1) Iniciar rota sem notas: transição para "Em Andamento" exige >= 1 nota
--       ativa em rel_route_invoice. Espelha a validação do app/serviço.
--   (2) Inativar rota em andamento: bloqueia is_active true->false quando o
--       status atual é "Em Andamento", EXCETO quando o mesmo UPDATE também
--       muda o status (é o caso do cancel_route, que transiciona para
--       "Cancelada"). Assim o "Inativar" puro é barrado, mas o cancelamento
--       operacional passa.
--
-- Resolução de status sempre dinâmica por name/code (nunca id fixo) — os ids
-- variam entre ambientes.

create or replace function public.check_trx_route_lifecycle()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_old_token text;
  v_new_token text;
  v_note_count integer;
begin
  if TG_OP <> 'UPDATE' then
    return NEW;
  end if;

  -- (1) Bloquear INICIAR rota sem notas
  if NEW.id_route_delivery_status is distinct from OLD.id_route_delivery_status then
    select lower(coalesce(name, '')) || '|' || lower(coalesce(code, ''))
      into v_new_token
      from public.ref_route_delivery_status
     where id = NEW.id_route_delivery_status;

    if v_new_token is not null
       and (v_new_token like '%andamento%' or v_new_token like '%in_progress%') then
      select count(*)
        into v_note_count
        from public.rel_route_invoice
       where id_route = NEW.id
         and is_active = true
         and is_test = NEW.is_test;

      if coalesce(v_note_count, 0) = 0 then
        raise exception 'Não é possível iniciar esta rota. Adicione pelo menos uma nota antes de iniciar o percurso.'
          using errcode = 'P0001';
      end if;
    end if;
  end if;

  -- (2) Bloquear INATIVAR rota em andamento (a menos que o status esteja
  --     mudando na mesma operação — cancelamento/abortagem).
  if OLD.is_active = true and NEW.is_active = false
     and NEW.id_route_delivery_status = OLD.id_route_delivery_status then
    select lower(coalesce(name, '')) || '|' || lower(coalesce(code, ''))
      into v_old_token
      from public.ref_route_delivery_status
     where id = OLD.id_route_delivery_status;

    if v_old_token is not null
       and (v_old_token like '%andamento%' or v_old_token like '%in_progress%') then
      raise exception 'Uma rota em andamento não pode ser inativada. Finalize ou cancele a operação antes de continuar.'
        using errcode = 'P0001';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_trx_route_lifecycle on public.trx_route;
create trigger trg_trx_route_lifecycle
  before update on public.trx_route
  for each row execute function public.check_trx_route_lifecycle();
