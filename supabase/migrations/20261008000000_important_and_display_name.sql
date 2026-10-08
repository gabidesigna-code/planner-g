-- ============================================================================
-- ora · "importante" nos itens + nome de exibição sem valor fixo
--
-- 1. tasks.important / events.important: marca o item como importante (estrela no app, ação de
--    deslizar no celular). Vale para tarefas, lembretes, compromissos e eventos; sincroniza entre aparelhos.
-- 2. preferences.display_name deixa de ter "Gabriela" como padrão: novas instalações começam sem nome
--    (a ori só usa o nome quando ele existe). A linha que já existe NÃO é alterada.
--
-- É idempotente: pode rodar mais de uma vez. Rode no SQL Editor do Supabase ANTES de publicar o app novo.
-- ============================================================================

alter table public.tasks  add column if not exists important boolean not null default false;
alter table public.events add column if not exists important boolean not null default false;

alter table public.preferences alter column display_name set default '';

-- Para mudar o nome que a ori usa na saudação (exemplo):
--   update public.preferences set display_name = 'Gabi' where id = true;
