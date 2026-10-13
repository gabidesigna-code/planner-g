-- ============================================================================
-- ora - TEMPO DE TRAJETO (parte 2 de 2): aviso "na hora de sair"
--
-- Recria private.dispatch_reminders() (a mesma da migration de lembretes) com UMA diferenca:
-- evento com reminder_at_departure = true avisa em  inicio - travel_to_minutes  (a hora de
-- sair), e o aviso leva at_departure = true para a Ori dizer "e hora de sair para ...".
-- Todo o resto (fuso por conta, unicidade por item + instante, fila com tolerancia de
-- 20 minutos, so contas com aparelho inscrito) continua igual.
--
-- Rode DEPOIS de 20261011000000_travel_time.sql. Pode rodar mais de uma vez.
-- ============================================================================

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
           false as leave,
           t.reminder_minutes as eff_mins,
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
           coalesce(e.reminder_at_departure, false),
           case when e.reminder_at_departure
                then coalesce(e.travel_to_minutes, 0)
                else e.reminder_minutes end,
           ((e.start_date + e.start_time)
              at time zone coalesce(z.tz, 'America/Sao_Paulo'))
    from public.events e
    left join zones z on z.user_id = e.user_id
    where (e.reminder_minutes is not null
           or e.reminder_at_departure)
      and e.start_time is not null
      and e.status <> 'concluido'
      and e.start_date between (p_now at time zone 'UTC')::date - 1
                           and (p_now at time zone 'UTC')::date + 8
  ),
  due as (
    select c.*, c.starts_at - make_interval(mins => c.eff_mins) as fire_at
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
           'minutes_before', d.eff_mins,
           'at_departure', d.leave,
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
