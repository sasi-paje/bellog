-- Migration: Adiciona o status de entrega "Cancelada" (produção não o tinha)
-- Created: 2026-07-21
--
-- Produção só tinha Pendente / Em Andamento / Finalizada. O fluxo de
-- "Cancelar Rota" (RPC cancel_route) precisa do status "Cancelada".
-- allows_route_edition=false (rota cancelada não permite editar montagem).
-- Convenção observada em produção: code = name.

insert into public.ref_route_delivery_status (code, name, description, display_order, is_active, is_test, allows_route_edition)
select 'Cancelada', 'Cancelada', 'Rota cancelada pela operação', 4, true, false, false
where not exists (
  select 1 from public.ref_route_delivery_status
   where lower(name) in ('cancelada', 'cancelado')
      or lower(code) in ('cancelled', 'canceled', 'cancelada')
);
