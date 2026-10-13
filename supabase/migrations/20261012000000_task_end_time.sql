-- ============================================================================
-- ora - HORARIO FINAL EM TAREFAS
--
-- Compromissos e eventos (events) ja guardam inicio e fim. Tarefas e lembretes (tasks) so tinham o
-- inicio (time), entao o "fim" digitado no painel nunca era gravado e sumia ao reler do banco.
-- Esta migration adiciona tasks.end_time. Sem policies novas: a coluna fica na mesma linha de
-- tasks e segue o RLS por user_id. Linhas existentes ficam com end_time nulo (sem fim), como hoje.
-- Pode rodar mais de uma vez.
-- ============================================================================

alter table public.tasks add column if not exists end_time time;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tasks_end_after_start') then
    alter table public.tasks add constraint tasks_end_after_start
      check (end_time is null or (time is not null and end_time > time));
  end if;
end $$;
