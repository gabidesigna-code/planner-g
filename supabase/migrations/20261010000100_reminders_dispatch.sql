-- ============================================================================
-- ora - LEMBRETES (parte 2 de 2): disparo agendado
--
-- private.dispatch_reminders() roda a cada minuto (agendada por um passo manual: veja
-- supabase/manual/schedule_reminders.sql). Ela:
--   - acha os itens com lembrete que chegaram na hora de avisar, usando o FUSO de cada
--     conta (preferences.timezone, padrao America/Sao_Paulo);
--   - ignora itens concluidos, sem horario e de contas sem nenhum aparelho inscrito;
--   - grava cada aviso em private.reminder_deliveries (chave unica por item + instante),
--     o que garante que NUNCA sai duas vezes, mesmo que a funcao rode em paralelo;
--   - chama o app (rota /api/push/send, protegida por segredo) com os dados do aviso.
-- Se o app responder com erro, o aviso volta para a fila (ate 20 minutos de tolerancia).
-- Se o item mudar de horario, de lembrete, for apagado ou concluido, nada precisa ser
-- cancelado: a funcao sempre recalcula a partir dos dados atuais.
--
-- Nada aqui e acessivel pela API publica (schema private, sem permissao para anon/authenticated).
-- Pode rodar mais de uma vez. Escrito sem acentos e com linhas curtas.
-- ============================================================================

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.app_config (
  key   text primary key,
  value text not null
);
revoke all on private.app_config from public, anon, authenticated;

create table if not exists private.reminder_deliveries (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  entity_type text not null check (entity_type in ('task', 'event')),
  entity_id   uuid not null,
  fire_at     timestamptz not null,
  request_id  bigint,
  created_at  timestamptz not null default now(),
  unique (entity_type, entity_id, fire_at)
);
create index if not exists reminder_deliveries_created_idx
  on private.reminder_deliveries (created_at);
create index if not exists reminder_deliveries_request_idx
  on private.reminder_deliveries (request_id);
revoke all on private.reminder_deliveries from public, anon, authenticated;

create or replace function private.dispatch_reminders(
  p_now timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
  v_payload jsonb;
  v_n integer := 0;
  v_req bigint;
begin
  select value into v_url from private.app_config where key = 'push_url';
  select value into v_secret from private.app_config where key = 'push_secret';
  if v_url is null or v_secret is null then
    raise exception 'push nao configurado em private.app_config';
  end if;

  begin
    delete from private.reminder_deliveries d
    using net._http_response r
    where d.request_id = r.id
      and d.fire_at > p_now - interval '20 minutes'
      and (r.error_msg is not null
           or r.timed_out
           or r.status_code is null
           or r.status_code >= 500);
  exception when others then
    null;
  end;

  delete from private.reminder_deliveries
    where fire_at < p_now - interval '7 days';
  delete from public.push_subscriptions
    where updated_at < p_now - interval '120 days';

  with zones as (
    select p.user_id,
           case when exists (select 1 from pg_catalog.pg_timezone_names z
                             where z.name = p.timezone)
                then p.timezone else 'America/Sao_Paulo' end as tz
    from public.preferences p
  ),
  cand as (
    select 'task'::text as entity_type, t.id, t.user_id, t.title,
           t.kind::text as kind, t.reminder_minutes as mins,
           t.time as at_time,
           ((t.date + t.time)
              at time zone coalesce(z.tz, 'America/Sao_Paulo')) as starts_at
    from public.tasks t
    left join zones z on z.user_id = t.user_id
    where t.reminder_minutes is not null
      and t.time is not null
      and t.status <> 'concluido'
      and t.date between (p_now at time zone 'UTC')::date - 1
                     and (p_now at time zone 'UTC')::date + 8
    union all
    select 'event'::text, e.id, e.user_id, e.title,
           e.event_type::text, e.reminder_minutes,
           e.start_time,
           ((e.start_date + e.start_time)
              at time zone coalesce(z.tz, 'America/Sao_Paulo'))
    from public.events e
    left join zones z on z.user_id = e.user_id
    where e.reminder_minutes is not null
      and e.start_time is not null
      and e.status <> 'concluido'
      and e.start_date between (p_now at time zone 'UTC')::date - 1
                           and (p_now at time zone 'UTC')::date + 8
  ),
  due as (
    select c.*, c.starts_at - make_interval(mins => c.mins) as fire_at
    from cand c
  ),
  fresh as (
    insert into private.reminder_deliveries
      (user_id, entity_type, entity_id, fire_at)
    select d.user_id, d.entity_type, d.id, d.fire_at
    from due d
    where d.fire_at <= p_now
      and d.fire_at > p_now - interval '20 minutes'
      and exists (select 1 from public.push_subscriptions s
                  where s.user_id = d.user_id)
    order by d.fire_at
    limit 100
    on conflict (entity_type, entity_id, fire_at) do nothing
    returning entity_type, entity_id, user_id, fire_at
  )
  select jsonb_agg(jsonb_build_object(
           'tag', d.id,
           'name', coalesce(pr.display_name, ''),
           'title', d.title,
           'kind', d.kind,
           'minutes_before', d.mins,
           'time', to_char(d.at_time, 'HH24:MI'),
           'subscriptions', (
             select jsonb_agg(jsonb_build_object(
                      'endpoint', s.endpoint,
                      'p256dh', s.p256dh,
                      'auth', s.auth))
             from public.push_subscriptions s
             where s.user_id = d.user_id)))
  into v_payload
  from fresh f
  join due d on d.entity_type = f.entity_type
            and d.id = f.entity_id
            and d.fire_at = f.fire_at
  left join public.profiles pr on pr.id = d.user_id;

  if v_payload is not null then
    v_n := jsonb_array_length(v_payload);
    v_req := net.http_post(
      url := v_url,
      body := jsonb_build_object('notifications', v_payload),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_secret),
      timeout_milliseconds := 20000);
    update private.reminder_deliveries
      set request_id = v_req
      where request_id is null;
  end if;

  return v_n;
end;
$$;

revoke all on function private.dispatch_reminders(timestamptz)
  from public, anon, authenticated;

create or replace function public.prune_push_subscriptions(
  p_secret text,
  p_endpoints text[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
  v_n integer;
begin
  select value into v_secret from private.app_config where key = 'push_secret';
  if v_secret is null or p_secret is distinct from v_secret then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  delete from public.push_subscriptions where endpoint = any (p_endpoints);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.prune_push_subscriptions(text, text[])
  from public;
grant execute on function public.prune_push_subscriptions(text, text[])
  to anon, authenticated;
