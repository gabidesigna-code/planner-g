-- ============================================================================
-- ora - LEMBRETES (parte 1 de 2): campo do lembrete + inscricoes de notificacao
--
-- O que faz:
--   - reminder_minutes em tasks e events: minutos ANTES do horario do item em que a ori
--     avisa (0 = na hora, vazio = sem lembrete). Nao altera nenhum dado existente.
--   - push_subscriptions: um registro por navegador/aparelho inscrito, sempre ligado a uma
--     conta (user_id), com RLS: cada pessoa so ve e mexe nas proprias inscricoes.
--   - register_push_subscription(): registra a inscricao do aparelho para a conta LOGADA.
--     Se o mesmo navegador ja estava ligado a outra conta, passa para a conta atual (assim
--     os avisos de uma pessoa nunca continuam chegando no aparelho que outra passou a usar).
--
-- Pode rodar mais de uma vez. Escrito sem acentos e com linhas curtas para colar no painel.
-- ============================================================================

alter table public.tasks
  add column if not exists reminder_minutes integer
  check (reminder_minutes between 0 and 10080);

alter table public.events
  add column if not exists reminder_minutes integer
  check (reminder_minutes between 0 and 10080);

create index if not exists tasks_reminder_idx
  on public.tasks (date) where reminder_minutes is not null;
create index if not exists events_reminder_idx
  on public.events (start_date) where reminder_minutes is not null;

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
              references auth.users (id) on delete cascade,
  endpoint    text not null unique
              check (length(endpoint) between 10 and 2048),
  p256dh      text not null check (length(p256dh) <= 256),
  auth        text not null check (length(auth) <= 128),
  device_name text check (length(device_name) <= 80),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

drop trigger if exists push_subscriptions_set_updated_at
  on public.push_subscriptions;
create trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select on public.push_subscriptions;
drop policy if exists push_subscriptions_insert on public.push_subscriptions;
drop policy if exists push_subscriptions_update on public.push_subscriptions;
drop policy if exists push_subscriptions_delete on public.push_subscriptions;

create policy push_subscriptions_select on public.push_subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy push_subscriptions_insert on public.push_subscriptions
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy push_subscriptions_update on public.push_subscriptions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy push_subscriptions_delete on public.push_subscriptions
  for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.push_subscriptions
  to authenticated;
grant all on public.push_subscriptions to service_role;

create or replace function public.register_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_device text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  insert into public.push_subscriptions as s
    (user_id, endpoint, p256dh, auth, device_name)
  values (v_uid, p_endpoint, p_p256dh, p_auth, p_device)
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        device_name = coalesce(excluded.device_name, s.device_name),
        updated_at = now();
end;
$$;

revoke all on function public.register_push_subscription(text, text, text, text)
  from public, anon;
grant execute on function public.register_push_subscription(text, text, text, text)
  to authenticated;
