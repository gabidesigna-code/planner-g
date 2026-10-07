-- ============================================================================
-- gabi · banco para uso INDIVIDUAL (um único dono)
--
-- Sem usuários, sem login no banco e sem user_id. O app acessa estas tabelas SOMENTE
-- pelo servidor do Next.js, com a chave service_role (que fica só no servidor).
--
-- Segurança: o RLS fica LIGADO em todas as tabelas e SEM nenhuma policy, e as permissões
-- de anon/authenticated são removidas. Resultado: mesmo que alguém consiga a chave pública
-- (anon) do projeto, não lê nem grava nada. Só a service_role (que ignora o RLS) acessa.
--
-- Rode este arquivo inteiro uma vez no SQL Editor do Supabase.
-- (Se você já rodou as migrations antigas, com login, rode antes o reset_multiusuario.sql.)
-- ============================================================================

-- ---------------------------------------------------------------- utilitários
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- categories
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) > 0),
  context    text not null check (context in ('trabalho', 'pessoal')),
  color      text,
  icon       text,
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  unique (context, name)
);

-- ---------------------------------------------------------------- tasks (tarefas e lembretes)
create table public.tasks (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null default 'tarefa' check (kind in ('tarefa', 'lembrete')),
  title          text not null check (length(btrim(title)) > 0),
  context        text not null check (context in ('trabalho', 'pessoal')),
  category_id    uuid references public.categories (id) on delete set null,
  client_project text,
  topic          text,
  status         text not null default 'a-fazer'
                   check (status in ('a-fazer', 'em-andamento', 'aguardando', 'pronto', 'concluido')),
  waiting_on     text,
  priority       text not null default 'normal' check (priority in ('urgente', 'alta', 'normal', 'baixa')),
  date           date not null,
  time           time,
  due_date       date,
  notes          text,
  completed_at   timestamptz,
  position       double precision not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index tasks_date_idx     on public.tasks (date);
create index tasks_status_idx   on public.tasks (status);
create index tasks_position_idx on public.tasks (position);
create index tasks_category_idx on public.tasks (category_id);

create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- events (compromissos e eventos)
create table public.events (
  id             uuid primary key default gen_random_uuid(),
  event_type     text not null default 'compromisso' check (event_type in ('compromisso', 'evento')),
  title          text not null check (length(btrim(title)) > 0),
  context        text not null check (context in ('trabalho', 'pessoal')),
  category_id    uuid references public.categories (id) on delete set null,
  client_project text,
  topic          text,
  status         text not null default 'a-fazer'
                   check (status in ('a-fazer', 'em-andamento', 'aguardando', 'pronto', 'concluido')),
  waiting_on     text,
  priority       text not null default 'normal' check (priority in ('urgente', 'alta', 'normal', 'baixa')),
  start_date     date not null,
  end_date       date,
  start_time     time,
  end_time       time,
  location       text,
  notes          text,
  completed_at   timestamptz,
  position       double precision not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create index events_start_idx    on public.events (start_date);
create index events_status_idx   on public.events (status);
create index events_category_idx on public.events (category_id);

create trigger events_set_updated_at before update on public.events
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- subtasks (de uma tarefa OU de um evento)
create table public.subtasks (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid references public.tasks (id) on delete cascade,
  event_id   uuid references public.events (id) on delete cascade,
  title      text not null check (length(btrim(title)) > 0),
  completed  boolean not null default false,
  position   double precision not null default 0,
  created_at timestamptz not null default now(),
  check (num_nonnulls(task_id, event_id) = 1)
);

create index subtasks_task_idx  on public.subtasks (task_id);
create index subtasks_event_idx on public.subtasks (event_id);

-- ---------------------------------------------------------------- notes (nota rápida)
create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  content    text not null default '',
  converted  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_idx on public.notes (converted, updated_at desc);

create trigger notes_set_updated_at before update on public.notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- recurrences (1 regra por item)
create table public.recurrences (
  id           uuid primary key default gen_random_uuid(),
  entity_type  text not null check (entity_type in ('task', 'event')),
  entity_id    uuid not null,
  frequency    text not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  "interval"   integer not null default 1 check ("interval" >= 1),
  days_of_week smallint[],
  day_of_month smallint check (day_of_month between 1 and 31),
  start_date   date,
  end_date     date,
  created_at   timestamptz not null default now(),
  unique (entity_type, entity_id)
);

-- Ao apagar uma tarefa/evento, apaga a regra de repetição (relação sem FK)
create or replace function public.cleanup_recurrence()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  delete from public.recurrences
  where entity_type = (case tg_table_name when 'tasks' then 'task' else 'event' end)
    and entity_id = old.id;
  return old;
end;
$$;

create trigger tasks_cleanup_recurrence  after delete on public.tasks
  for each row execute function public.cleanup_recurrence();
create trigger events_cleanup_recurrence after delete on public.events
  for each row execute function public.cleanup_recurrence();

-- ---------------------------------------------------------------- preferences (uma única linha)
create table public.preferences (
  id           boolean primary key default true check (id),   -- só pode existir a linha "true"
  display_name text not null default 'Gabriela',
  theme_mode   text not null default 'system' check (theme_mode in ('light', 'dark', 'system')),
  palette      text not null default 'oliva-vinho' check (length(palette) between 1 and 64),
  timezone     text not null default 'America/Sao_Paulo',
  week_start   smallint not null default 1 check (week_start between 0 and 6),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger preferences_set_updated_at before update on public.preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- dados iniciais
insert into public.preferences (id) values (true) on conflict (id) do nothing;

insert into public.categories (name, context, position) values
  ('Fiscal',             'trabalho', 1),
  ('Financeiro',         'trabalho', 2),
  ('Clientes',           'trabalho', 3),
  ('Reuniões',           'trabalho', 4),
  ('Administrativo',     'trabalho', 5),
  ('Casa',               'pessoal',  1),
  ('Compras',            'pessoal',  2),
  ('Saúde',              'pessoal',  3),
  ('Família',            'pessoal',  4),
  ('Financeiro pessoal', 'pessoal',  5),
  ('Lazer',              'pessoal',  6)
on conflict (context, name) do nothing;

-- ---------------------------------------------------------------- segurança
-- RLS ligado e SEM policies: anon/authenticated não têm acesso a nada.
-- A service_role (usada só pelo servidor do Next.js) ignora o RLS.
alter table public.categories  enable row level security;
alter table public.tasks       enable row level security;
alter table public.events      enable row level security;
alter table public.subtasks    enable row level security;
alter table public.notes       enable row level security;
alter table public.recurrences enable row level security;
alter table public.preferences enable row level security;

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

-- Tabelas criadas no futuro também nascem fechadas para anon/authenticated
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

grant all on all tables in schema public to service_role;
