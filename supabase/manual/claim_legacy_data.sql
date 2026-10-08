-- ============================================================================
-- ora · MULTIUSUÁRIO, FASE 2 de 3: entregar os dados antigos à SUA conta
--
-- Quando rodar: depois da fase 1 (20261009000000_multiuser_schema.sql), de publicar o app novo e de
-- CRIAR A SUA CONTA no app (tela "Criar conta"). Nenhum UUID é inventado: o script acha o seu id
-- em auth.users pelo e-mail que você escrever abaixo.
--
-- Como rodar no SQL Editor do Supabase (3 passos, cada um é uma execução separada):
--   PASSO 1  Confira      → mostra a sua conta e quantas linhas antigas existem.   (não altera nada)
--   PASSO 2  Aplique      → troque o e-mail e rode. Tudo acontece numa transação: ou entrega tudo, ou nada.
--   PASSO 3  Valide       → deve mostrar zero linhas sem dono e os totais na sua conta.
--
-- O que o PASSO 2 faz (nunca apaga seus dados antigos):
--   • a conta nova nasceu com categorias padrão e preferências padrão (trigger de cadastro). Como a sua conta
--     ainda está vazia (ele confere), essas cópias são trocadas pelas ANTIGAS, que são as suas de verdade;
--   • atribui à sua conta: categorias, tarefas, eventos, subtarefas, notas, recorrências e as preferências
--     (paleta e modo claro/escuro) que já existiam;
--   • confere no fim que nada ficou sem dono; se algo falhar, desfaz tudo.
-- O nome ("Como a ori deve te chamar?") NÃO é copiado: a ori vai te perguntar no primeiro acesso.
-- As conversas da ori ficavam só no navegador; o app oferece importá-las (ver README).
-- ============================================================================


-- ============================== PASSO 1 · CONFIRA (não altera nada) ==============================
select
  (select count(*) from auth.users)                                   as contas_existentes,
  (select count(*) from public.tasks       where user_id is null)     as tarefas_sem_dono,
  (select count(*) from public.events      where user_id is null)     as eventos_sem_dono,
  (select count(*) from public.subtasks    where user_id is null)     as subtarefas_sem_dono,
  (select count(*) from public.categories  where user_id is null)     as categorias_sem_dono,
  (select count(*) from public.notes       where user_id is null)     as notas_sem_dono,
  (select count(*) from public.recurrences where user_id is null)     as recorrencias_sem_dono,
  (select count(*) from public.preferences where user_id is null)     as preferencias_sem_dono;

select id as seu_user_id, email, created_at from auth.users order by created_at;


-- ============================== PASSO 2 · APLIQUE (troque o e-mail!) ==============================
do $$
declare
  v_email text := 'COLOQUE-AQUI-O-E-MAIL-DA-SUA-CONTA';   -- <<< EDITE AQUI
  v_uid   uuid;
begin
  select id into v_uid from auth.users where lower(email) = lower(btrim(v_email));
  if v_uid is null then
    raise exception 'Não existe conta com o e-mail "%". Crie a conta no app primeiro (e confira o e-mail digitado).', v_email;
  end if;

  -- a conta precisa estar VAZIA (só o que o cadastro cria): senão há risco de misturar dados
  if exists (select 1 from public.tasks where user_id = v_uid)
     or exists (select 1 from public.events where user_id = v_uid)
     or exists (select 1 from public.notes where user_id = v_uid)
     or exists (select 1 from public.ori_conversations where user_id = v_uid) then
    raise exception 'A conta % já tem dados próprios. Por segurança nada foi alterado. Use uma conta recém-criada.', v_email;
  end if;

  -- troca as cópias padrão criadas no cadastro pelas suas antigas (a conta está vazia: nada aponta para elas)
  if exists (select 1 from public.categories where user_id is null) then
    delete from public.categories where user_id = v_uid;
  end if;
  if exists (select 1 from public.preferences where user_id is null) then
    delete from public.preferences where user_id = v_uid;
  end if;

  update public.categories  set user_id = v_uid where user_id is null;
  update public.tasks       set user_id = v_uid where user_id is null;
  update public.events      set user_id = v_uid where user_id is null;
  update public.subtasks    set user_id = v_uid where user_id is null;
  update public.notes       set user_id = v_uid where user_id is null;
  update public.recurrences set user_id = v_uid where user_id is null;
  update public.preferences set user_id = v_uid where user_id is null;

  -- se não existiam categorias/preferências antigas, a conta continua completa
  if not exists (select 1 from public.categories where user_id = v_uid) then
    perform public.seed_default_categories(v_uid);
  end if;
  insert into public.preferences (user_id) values (v_uid) on conflict (user_id) do nothing;

  -- validação final: nada pode ter ficado sem dono (se falhar, a transação inteira é desfeita)
  if exists (select 1 from public.tasks where user_id is null)
     or exists (select 1 from public.events where user_id is null)
     or exists (select 1 from public.subtasks where user_id is null)
     or exists (select 1 from public.categories where user_id is null)
     or exists (select 1 from public.notes where user_id is null)
     or exists (select 1 from public.recurrences where user_id is null)
     or exists (select 1 from public.preferences where user_id is null) then
    raise exception 'Validação falhou: ainda há linhas sem dono. Nada foi alterado.';
  end if;
end $$;


-- ============================== PASSO 3 · VALIDE ==============================
select
  (select count(*) from public.tasks       where user_id is null) as tarefas_sem_dono,
  (select count(*) from public.events      where user_id is null) as eventos_sem_dono,
  (select count(*) from public.subtasks    where user_id is null) as subtarefas_sem_dono,
  (select count(*) from public.categories  where user_id is null) as categorias_sem_dono,
  (select count(*) from public.notes       where user_id is null) as notas_sem_dono,
  (select count(*) from public.recurrences where user_id is null) as recorrencias_sem_dono,
  (select count(*) from public.preferences where user_id is null) as preferencias_sem_dono;

select u.email,
  (select count(*) from public.tasks       t where t.user_id = u.id) as tarefas,
  (select count(*) from public.events      e where e.user_id = u.id) as eventos,
  (select count(*) from public.subtasks    s where s.user_id = u.id) as subtarefas,
  (select count(*) from public.categories  c where c.user_id = u.id) as categorias,
  (select count(*) from public.notes       n where n.user_id = u.id) as notas,
  (select count(*) from public.recurrences r where r.user_id = u.id) as recorrencias
from auth.users u order by u.created_at;
