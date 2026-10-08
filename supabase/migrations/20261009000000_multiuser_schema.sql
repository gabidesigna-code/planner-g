-- ============================================================================
-- ora · MULTIUSUÁRIO, FASE 1 de 3 (aditiva: não apaga nem altera nenhum dado)
--
-- O que faz:
--   • cria `profiles` (um por conta: nome que a ori usa) e as tabelas da ori (conversas e mensagens);
--   • adiciona `user_id` (ANULÁVEL nesta fase) em todas as tabelas pessoais, com chave estrangeira e índices;
--   • troca as chaves únicas globais por chaves únicas POR USUÁRIO (categorias) e libera várias linhas de
--     preferências (hoje só cabia uma);
--   • cria o trigger de cadastro: cada conta nova ganha perfil, preferências e categorias padrão PRÓPRIAS;
--   • liga o RLS com policies por usuário (user_id = auth.uid()) para SELECT, INSERT, UPDATE e DELETE;
--   • habilita o Realtime nas tabelas que a tela acompanha.
--
-- Seus dados atuais (sem dono, user_id nulo) continuam no banco, intactos, e ficam INVISÍVEIS para qualquer
-- conta pelo RLS, até a fase 2 (supabase/manual/claim_legacy_data.sql) entregá-los à sua conta.
-- O app antigo (que usa a chave service_role) continua funcionando até você publicar o app novo.
--
-- Ordem completa:
--   1) rode ESTE arquivo;  2) publique o app novo e crie a sua conta;
--   3) rode supabase/manual/claim_legacy_data.sql;  4) rode 20261009000100_multiuser_constraints.sql.
-- É idempotente: pode rodar mais de uma vez.
-- ============================================================================

-- ---------------------------------------------------------------- perfil (1 por conta)
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 40),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- user_id nas tabelas pessoais (anulável por enquanto)
-- O default auth.uid() preenche o dono automaticamente quando a própria pessoa grava (JWT dela).
-- (Adicionar a coluna e só depois o default evita reescrever as linhas antigas avaliando o default.)
do $$
declare t text;
begin
  foreach t in array array['categories', 'tasks', 'events', 'subtasks', 'notes', 'recurrences', 'preferences'] loop
    execute format('alter table public.%I add column if not exists user_id uuid references auth.users (id) on delete cascade', t);
    execute format('alter table public.%I alter column user_id set default auth.uid()', t);
    execute format('create index if not exists %I on public.%I (user_id)', t || '_user_idx', t);
  end loop;
end $$;

create index if not exists tasks_user_date_idx  on public.tasks  (user_id, date);
create index if not exists events_user_date_idx on public.events (user_id, start_date);
create index if not exists notes_user_updated_idx      on public.notes  (user_id, converted, updated_at desc);

-- ---------------------------------------------------------------- categorias: únicas POR USUÁRIO
alter table public.categories drop constraint if exists categories_context_name_key;
create unique index if not exists categories_user_context_name_key on public.categories (user_id, context, name);

-- ---------------------------------------------------------------- preferências: uma linha POR USUÁRIO
-- A linha antiga (id = true, sem dono) continua existindo até ser entregue à sua conta.
alter table public.preferences drop constraint if exists preferences_pkey;
alter table public.preferences alter column id drop not null;
alter table public.preferences alter column id drop default;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'preferences_id_key') then
    alter table public.preferences add constraint preferences_id_key unique (id); -- o app antigo ainda faz upsert por id
  end if;
end $$;
create unique index if not exists preferences_user_key on public.preferences (user_id);

-- ---------------------------------------------------------------- ori: conversas e mensagens
create table if not exists public.ori_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text not null default 'Nova conversa' check (length(btrim(title)) > 0 and length(title) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ori_conversations_user_idx on public.ori_conversations (user_id, updated_at desc);

create table if not exists public.ori_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ori_conversations (id) on delete cascade,
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role            text not null check (role in ('user', 'ori')),
  content         text not null check (length(content) between 1 and 8000),
  -- propostas da ori (itens, alterações, escolhas) e o que a usuária decidiu: tudo que a tela precisa para reabrir a conversa igual
  meta            jsonb not null default '{}'::jsonb check (octet_length(meta::text) <= 400000),
  created_at      timestamptz not null default now()
);
create index if not exists ori_messages_conv_idx on public.ori_messages (conversation_id, created_at, id);
create index if not exists ori_messages_user_idx on public.ori_messages (user_id);

-- updated_at da conversa = hora da última mensagem (ordena a lista e dispara o Realtime). Calculado a partir da
-- mensagem, e não de now(), para a importação de conversas antigas manter a ordem original.
create or replace function public.touch_ori_conversation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.ori_conversations set updated_at = greatest(updated_at, new.created_at) where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists ori_messages_touch on public.ori_messages;
create trigger ori_messages_touch after insert on public.ori_messages
  for each row execute function public.touch_ori_conversation();

-- ---------------------------------------------------------------- cadastro: perfil, preferências e categorias PRÓPRIAS
create or replace function public.seed_default_categories(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.categories (user_id, name, context, position) values
    (p_user, 'Fiscal',             'trabalho', 1),
    (p_user, 'Financeiro',         'trabalho', 2),
    (p_user, 'Clientes',           'trabalho', 3),
    (p_user, 'Reuniões',           'trabalho', 4),
    (p_user, 'Administrativo',     'trabalho', 5),
    (p_user, 'Casa',               'pessoal',  1),
    (p_user, 'Compras',            'pessoal',  2),
    (p_user, 'Saúde',              'pessoal',  3),
    (p_user, 'Família',            'pessoal',  4),
    (p_user, 'Financeiro pessoal', 'pessoal',  5),
    (p_user, 'Lazer',              'pessoal',  6)
  on conflict (user_id, context, name) do nothing;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  insert into public.preferences (user_id) values (new.id) on conflict (user_id) do nothing;
  perform public.seed_default_categories(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- RLS: cada pessoa só enxerga e mexe no que é dela
-- Tabelas com user_id direto: a mesma regra nas quatro operações.
do $$
declare t text;
begin
  foreach t in array array['categories', 'tasks', 'events', 'notes', 'preferences', 'ori_conversations'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t || '_delete', t);
  end loop;
end $$;

-- profiles: a chave é o próprio id da conta; ninguém apaga perfil (só some junto com a conta)
alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- subtarefas: do próprio dono E presas a uma tarefa/evento que também é dele
alter table public.subtasks enable row level security;
drop policy if exists subtasks_select on public.subtasks;
drop policy if exists subtasks_insert on public.subtasks;
drop policy if exists subtasks_update on public.subtasks;
drop policy if exists subtasks_delete on public.subtasks;
create policy subtasks_select on public.subtasks for select to authenticated using (user_id = (select auth.uid()));
create policy subtasks_insert on public.subtasks for insert to authenticated with check (
  user_id = (select auth.uid())
  and (task_id  is null or exists (select 1 from public.tasks  p where p.id = task_id  and p.user_id = (select auth.uid())))
  and (event_id is null or exists (select 1 from public.events p where p.id = event_id and p.user_id = (select auth.uid())))
);
create policy subtasks_update on public.subtasks for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (task_id  is null or exists (select 1 from public.tasks  p where p.id = task_id  and p.user_id = (select auth.uid())))
    and (event_id is null or exists (select 1 from public.events p where p.id = event_id and p.user_id = (select auth.uid())))
  );
create policy subtasks_delete on public.subtasks for delete to authenticated using (user_id = (select auth.uid()));

-- recorrências: do próprio dono E de uma tarefa/evento que também é dele (a relação é por tipo + id, sem FK)
alter table public.recurrences enable row level security;
drop policy if exists recurrences_select on public.recurrences;
drop policy if exists recurrences_insert on public.recurrences;
drop policy if exists recurrences_update on public.recurrences;
drop policy if exists recurrences_delete on public.recurrences;
create policy recurrences_select on public.recurrences for select to authenticated using (user_id = (select auth.uid()));
create policy recurrences_insert on public.recurrences for insert to authenticated with check (
  user_id = (select auth.uid())
  and case entity_type
        when 'task'  then exists (select 1 from public.tasks  p where p.id = entity_id and p.user_id = (select auth.uid()))
        else              exists (select 1 from public.events p where p.id = entity_id and p.user_id = (select auth.uid()))
      end
);
create policy recurrences_update on public.recurrences for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and case entity_type
          when 'task'  then exists (select 1 from public.tasks  p where p.id = entity_id and p.user_id = (select auth.uid()))
          else              exists (select 1 from public.events p where p.id = entity_id and p.user_id = (select auth.uid()))
        end
  );
create policy recurrences_delete on public.recurrences for delete to authenticated using (user_id = (select auth.uid()));

-- mensagens da ori: do próprio dono E de uma conversa que também é dele
alter table public.ori_messages enable row level security;
drop policy if exists ori_messages_select on public.ori_messages;
drop policy if exists ori_messages_insert on public.ori_messages;
drop policy if exists ori_messages_update on public.ori_messages;
drop policy if exists ori_messages_delete on public.ori_messages;
create policy ori_messages_select on public.ori_messages for select to authenticated using (user_id = (select auth.uid()));
create policy ori_messages_insert on public.ori_messages for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.ori_conversations c where c.id = conversation_id and c.user_id = (select auth.uid()))
);
create policy ori_messages_update on public.ori_messages for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.ori_conversations c where c.id = conversation_id and c.user_id = (select auth.uid()))
  );
create policy ori_messages_delete on public.ori_messages for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- permissões
-- anon continua sem NADA. authenticated só opera por baixo do RLS acima. service_role segue com acesso total
-- (o app novo NÃO a usa; fica para manutenção feita por você no painel).
grant select, insert, update, delete on
  public.categories, public.tasks, public.events, public.subtasks, public.notes, public.recurrences,
  public.preferences, public.ori_conversations, public.ori_messages
  to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant all on all tables in schema public to service_role;

revoke all on function public.seed_default_categories(uuid) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------- Realtime (só se o projeto tiver a publicação do Supabase)
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['tasks', 'events', 'subtasks', 'categories', 'profiles', 'preferences', 'ori_conversations', 'ori_messages'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
      -- sem isto, avisos de exclusão só trariam a chave primária e não passariam no filtro por user_id
      execute format('alter table public.%I replica identity full', t);
    end loop;
  end if;
end $$;

-- ---------------------------------------------------------------- projeto NOVO (virgem): descarta só os padrões sem dono
-- A migration inicial semeia 11 categorias e 1 linha de preferências sem dono. Num projeto que nunca teve uso
-- elas só atrapalhariam (cada conta ganha as suas no cadastro). Só são removidas se TODAS as condições valerem:
--   • não existe nenhuma tarefa, evento, subtarefa, nota ou recorrência;
--   • as categorias sem dono são exatamente as 11 padrão (nenhuma criada/renomeada por você);
--   • a linha de preferências nunca foi alterada.
-- Se o seu banco tem qualquer dado (é o seu caso), este bloco não faz NADA.
do $$
declare
  v_defaults constant text[] := array[
    'trabalho:Fiscal', 'trabalho:Financeiro', 'trabalho:Clientes', 'trabalho:Reuniões', 'trabalho:Administrativo',
    'pessoal:Casa', 'pessoal:Compras', 'pessoal:Saúde', 'pessoal:Família', 'pessoal:Financeiro pessoal', 'pessoal:Lazer'];
begin
  if not exists (select 1 from public.tasks) and not exists (select 1 from public.events)
     and not exists (select 1 from public.subtasks) and not exists (select 1 from public.notes)
     and not exists (select 1 from public.recurrences)
     and (select count(*) from public.categories where user_id is null) = 11
     and not exists (select 1 from public.categories where user_id is null and (context || ':' || name) <> all (v_defaults))
     and not exists (select 1 from public.preferences where user_id is null and created_at <> updated_at) then
    delete from public.categories where user_id is null;
    delete from public.preferences where user_id is null;
  end if;
end $$;
