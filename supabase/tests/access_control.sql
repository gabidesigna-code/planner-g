-- ============================================================================
-- gabi · teste de acesso ao banco (single user)
--
-- Como rodar: cole TUDO no SQL Editor do Supabase e execute. Ele confere que:
--   - a chave pública (anon) e usuários logados (authenticated) NÃO acessam nenhuma tabela;
--   - só a service_role (o servidor do app) lê e grava;
--   - restrições e triggers funcionam.
-- No fim desfaz tudo (ROLLBACK). Se algo estiver errado, para com "FALHA: ...".
-- Sucesso: o último resultado é "OK: acesso restrito à service_role".
-- ============================================================================

begin;

-- ---------------------------------------------------------------- dados iniciais
do $$
begin
  if (select count(*) from public.categories) < 11 then raise exception 'FALHA: categorias padrão não foram criadas'; end if;
  if (select count(*) from public.preferences) <> 1 then raise exception 'FALHA: deveria existir exatamente 1 linha de preferências'; end if;
end $$;

-- ---------------------------------------------------------------- service_role: acesso total
set local role service_role;

insert into public.tasks (id, title, context, date, category_id)
select '00000000-0000-4000-8000-0000000000a1', 'Tarefa de teste', 'trabalho', '2026-01-10', c.id
from public.categories c where c.name = 'Fiscal' and c.context = 'trabalho';
insert into public.subtasks (task_id, title) values ('00000000-0000-4000-8000-0000000000a1', 'Subtarefa');
insert into public.recurrences (entity_type, entity_id, frequency) values ('task', '00000000-0000-4000-8000-0000000000a1', 'weekly');
insert into public.events (id, title, context, start_date, start_time, end_time, event_type)
values ('00000000-0000-4000-8000-0000000000e1', 'Compromisso de teste', 'pessoal', '2026-01-10', '09:00', '10:00', 'compromisso');
insert into public.notes (content) values ('nota de teste');
update public.preferences set palette = 'monochrome', theme_mode = 'dark';

do $$
begin
  if (select count(*) from public.tasks) <> 1 then raise exception 'FALHA: service_role deveria enxergar a tarefa'; end if;
  if (select palette from public.preferences) <> 'monochrome' then raise exception 'FALHA: service_role deveria editar as preferências'; end if;
end $$;

-- ---------------------------------------------------------------- anon e authenticated: nada
do $$
declare
  r text;
  t text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    foreach t in array array['tasks', 'events', 'subtasks', 'notes', 'categories', 'recurrences', 'preferences'] loop
      execute format('set local role %I', r);
      begin
        execute format('select count(*) from public.%I', t);
        raise exception 'FALHA: % conseguiu LER %', r, t;
      exception when insufficient_privilege then null;
      end;
      begin
        if t = 'notes' then execute 'insert into public.notes (content) values (''forjada'')'; end if;
        if t = 'categories' then execute 'insert into public.categories (name, context) values (''forjada'', ''pessoal'')'; end if;
        if t = 'preferences' then execute 'update public.preferences set palette = ''forjada'''; end if;
        if t in ('notes', 'categories', 'preferences') then raise exception 'FALHA: % conseguiu GRAVAR em %', r, t; end if;
      exception when insufficient_privilege then null;
      end;
      reset role;
    end loop;
  end loop;
end $$;

-- ---------------------------------------------------------------- restrições e triggers
set local role service_role;

do $$
begin
  begin
    insert into public.tasks (title, context, date) values ('   ', 'trabalho', '2026-01-10');
    raise exception 'FALHA: título vazio deveria ser recusado';
  exception when check_violation then null;
  end;
  begin
    insert into public.events (title, context, start_date, end_date) values ('x', 'pessoal', '2026-01-10', '2026-01-05');
    raise exception 'FALHA: data final anterior à inicial deveria ser recusada';
  exception when check_violation then null;
  end;
  begin
    insert into public.subtasks (title) values ('órfã');
    raise exception 'FALHA: subtarefa sem pai deveria ser recusada';
  exception when check_violation then null;
  end;
  begin
    insert into public.preferences (id) values (false);
    raise exception 'FALHA: só pode existir uma linha de preferências';
  exception when check_violation or unique_violation then null;
  end;

  -- apagar a tarefa leva subtarefas (cascata) e a regra de repetição (trigger)
  delete from public.tasks where id = '00000000-0000-4000-8000-0000000000a1';
  if (select count(*) from public.subtasks) <> 0 then raise exception 'FALHA: subtarefas deveriam sair em cascata'; end if;
  if (select count(*) from public.recurrences) <> 0 then raise exception 'FALHA: a recorrência deveria sair junto'; end if;
end $$;

reset role;
select 'OK: acesso restrito à service_role' as resultado;

rollback;
