-- ============================================================================
-- ora · correção: apagar uma conta (ou uma tarefa) falhava com
--   "permission denied for table recurrences"
--
-- O trigger que apaga a regra de repetição de uma tarefa/evento (cleanup_recurrence) rodava com os direitos de
-- QUEM apagava. Quando o serviço de login (Supabase Auth) apaga uma conta, a cascata apaga as tarefas dela, o trigger
-- dispara e esse papel não tem acesso à tabela recurrences: a exclusão inteira era desfeita.
--
-- Agora o trigger roda com os direitos do dono da função (security definer). Segurança: ele só apaga as recorrências
-- do item que está sendo apagado (entity_type + entity_id, ids únicos); não recebe nada de fora.
--
-- Pode rodar mais de uma vez. Não altera dados.
-- ============================================================================

create or replace function public.cleanup_recurrence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.recurrences
  where entity_type = (case tg_table_name when 'tasks' then 'task' else 'event' end)
    and entity_id = old.id;
  return old;
end;
$$;

-- só o trigger a usa; ninguém precisa chamá-la diretamente
revoke all on function public.cleanup_recurrence() from public, anon, authenticated;
