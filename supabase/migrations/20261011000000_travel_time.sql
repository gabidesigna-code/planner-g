-- ============================================================================
-- ora - TEMPO DE TRAJETO nos compromissos/eventos (parte 1 de 2)
--
-- O que faz (so na tabela events; tarefas e lembretes nao tem trajeto):
--   - travel_to_minutes:   minutos de ida ANTES do inicio (vazio ou 0 = sem ida)
--   - travel_from_minutes: minutos de volta DEPOIS do fim (vazio ou 0 = sem volta)
--   - reminder_at_departure: avisar "na hora de sair" (inicio - ida), em vez de usar
--     reminder_minutes
-- Ida e volta sao independentes. O periodo ocupado (ida + compromisso + volta) NAO e
-- gravado: o app calcula sempre a partir do horario e dos tempos, entao editar o horario
-- ou o trajeto recalcula tudo e apagar o evento apaga o trajeto junto.
--
-- RLS: nada a mudar. As colunas ficam na mesma linha de events e herdam as politicas por
-- user_id que ja existem.
--
-- Nao altera nenhum dado existente. Pode rodar mais de uma vez.
-- Escrito sem acentos e com linhas curtas para colar no painel.
-- ============================================================================

alter table public.events
  add column if not exists travel_to_minutes integer
  check (travel_to_minutes between 0 and 720);

alter table public.events
  add column if not exists travel_from_minutes integer
  check (travel_from_minutes between 0 and 720);

alter table public.events
  add column if not exists reminder_at_departure boolean
  not null default false;

-- trajeto e aviso de saida so fazem sentido em evento com horario
alter table public.events
  drop constraint if exists events_travel_needs_time;
alter table public.events
  add constraint events_travel_needs_time check (
    start_time is not null
    or (coalesce(travel_to_minutes, 0) = 0
        and coalesce(travel_from_minutes, 0) = 0
        and not reminder_at_departure)
  );
