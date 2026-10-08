-- ============================================================================
-- ora · MULTIUSUARIO, FASE 3 de 3 (restricoes finais)
--
-- So rode DEPOIS de entregar os dados antigos a sua conta (supabase/manual/claim_legacy_data.sql).
-- Este arquivo se recusa a rodar se sobrar qualquer linha sem dono: nesse caso nada e alterado.
--
-- O que faz:
--   - user_id passa a ser OBRIGATORIO em todas as tabelas pessoais;
--   - preferences fica com uma linha por usuario (chave = user_id) e perde as colunas antigas
--     id (singleton) e display_name (o nome agora vive em profiles).
--
-- Escrito com linhas curtas, sem acentos e sem comentarios no meio do codigo,
-- para sobreviver a copiar e colar no SQL Editor.
-- ============================================================================

do $$
declare
  t text;
  n bigint;
begin
  foreach t in array array['categories', 'tasks', 'events', 'subtasks',
                           'notes', 'recurrences', 'preferences'] loop
    execute format('select count(*) from public.%I where user_id is null', t)
      into n;
    if n > 0 then
      raise exception 'FASE 3 BLOQUEADA: % linha(s) sem dono em %. Nada alterado.', n, t;
    end if;
  end loop;
end $$;

alter table public.categories  alter column user_id set not null;
alter table public.tasks       alter column user_id set not null;
alter table public.events      alter column user_id set not null;
alter table public.subtasks    alter column user_id set not null;
alter table public.notes       alter column user_id set not null;
alter table public.recurrences alter column user_id set not null;
alter table public.preferences alter column user_id set not null;

alter table public.preferences drop constraint if exists preferences_id_key;
alter table public.preferences drop constraint if exists preferences_id_check;
alter table public.preferences drop column if exists id;
alter table public.preferences drop column if exists display_name;
drop index if exists public.preferences_user_key;
alter table public.preferences add primary key (user_id);
