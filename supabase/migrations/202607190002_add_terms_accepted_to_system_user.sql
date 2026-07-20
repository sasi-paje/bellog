-- =====================================================
-- Aceite do Termo de Uso por usuário
--
-- Guarda quando o usuário aceitou o Termo de Uso (por email+is_test, elo do
-- master_system_user com o Auth). NULL = ainda não aceitou → o sistema exibe o
-- modal de aceite no login/primeiro acesso.
-- =====================================================

ALTER TABLE public.master_system_user
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
