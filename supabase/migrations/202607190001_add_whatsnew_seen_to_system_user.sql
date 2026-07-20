-- =====================================================
-- Novidades ("O que há de novo?") — rastreio por usuário
--
-- Guarda o id da última novidade vista por cada usuário (por email+is_test,
-- que é o elo do master_system_user com o Auth). Assim o aviso de novidade
-- segue o usuário em qualquer dispositivo, em vez de ficar só no localStorage.
-- =====================================================

ALTER TABLE public.master_system_user
  ADD COLUMN IF NOT EXISTS last_whatsnew_seen text;
