-- ============================================================================
-- ora - LEMBRETES: ligar o agendamento (passo MANUAL, feito por voce no Supabase)
--
-- Antes: rode as migrations 20261010000000 e 20261010000100 e publique o app com as
-- variaveis de notificacao na Vercel (ver supabase/README.md).
--
-- Rode cada PASSO em uma execucao separada, com NADA selecionado no editor.
-- ============================================================================


-- PASSO 1: no painel, Database > Extensions: ative "pg_net" e "pg_cron".
--          (nao e SQL; so confira que os dois aparecem como ativados)


-- PASSO 2: endereco do app e segredo.
-- Troque COLE-O-SEGREDO-AQUI pelo MESMO valor da variavel PUSH_CRON_SECRET da Vercel.
insert into private.app_config (key, value) values
  ('push_url', 'https://useora.vercel.app/api/push/send'),
  ('push_secret', 'COLE-O-SEGREDO-AQUI')
on conflict (key) do update set value = excluded.value;


-- PASSO 3: agendar a cada minuto.
select cron.schedule(
  'ora-reminders',
  '* * * * *',
  'select private.dispatch_reminders()'
);


-- PASSO 4 (conferir): deve mostrar 1 linha, com active = true.
select jobid, jobname, schedule, active
from cron.job
where jobname = 'ora-reminders';


-- Depois de alguns minutos, para ver se esta rodando (sem erros):
--   select status, return_message, start_time
--   from cron.job_run_details
--   order by start_time desc limit 5;
--
-- Para ver as ultimas respostas do app (200 = entregue ao servico de push):
--   select id, status_code, error_msg, created
--   from net._http_response
--   order by created desc limit 5;
--
-- Para desligar os lembretes:
--   select cron.unschedule('ora-reminders');
