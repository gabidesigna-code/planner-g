// Testa o banco SEM precisar do Supabase: sobe um Postgres local (PGlite) que imita o que o Supabase traz
// pronto (papéis anon/authenticated/service_role, auth.users e auth.uid()) e aplica as migrations de verdade.
//
//   A) banco novo: RLS, isolamento entre contas (ler, criar, editar, apagar), cascatas, cadastro (trigger)
//   B) banco LEGADO (dados de antes do login): fase 1 → conta → claim_legacy_data.sql → fase 3, sem perder nada
//
// Uso: npm run test:db
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "supabase");
const MIGRATIONS = fs.readdirSync(path.join(root, "migrations")).filter((f) => f.endsWith(".sql")).sort();
const BASE = MIGRATIONS.filter((f) => f < "20261009000100"); // até a fase 1
const PHASE3 = MIGRATIONS.find((f) => f.includes("multiuser_constraints"));
const sql = (f, dir = "migrations") => fs.readFileSync(path.join(root, dir, f), "utf8");

let failed = false;
const step = async (label, fn) => {
  try { await fn(); console.log(`✓ ${label}`); }
  catch (e) { failed = true; console.log(`✗ ${label}: ${String(e.message).split("\n")[0]}`); }
};
const rejects = async (p, re, what) => {
  try { await p; } catch (e) { assert.match(String(e.message), re, `${what}: erro inesperado (${e.message})`); return; }
  assert.fail(`${what}: deveria ter sido recusado`);
};

/** Banco vazio com o que o Supabase já traz: papéis, auth.users e auth.uid(). */
async function makeDb() {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    -- no Supabase, tabelas novas em public já nascem acessíveis a esses papéis (as migrations fecham o que precisa)
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, created_at timestamptz not null default now());
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
  `);
  return db;
}
const apply = async (db, files) => { for (const f of files) await db.exec(sql(f)); };
const signup = async (db, email) => (await db.query("insert into auth.users (email) values ($1) returning id", [email])).rows[0].id;

/** Executa como a pessoa `uid` (papel authenticated + JWT com sub = uid), exatamente como o PostgREST faz. */
async function as(db, uid, fn) {
  await db.exec("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid]);
  try { return await fn(); }
  finally { await db.exec("reset role"); await db.query("select set_config('request.jwt.claim.sub', '', false)"); }
}
async function asAnon(db, fn) {
  await db.exec("set role anon");
  try { return await fn(); } finally { await db.exec("reset role"); }
}
const count = async (db, t) => Number((await db.query(`select count(*) n from public.${t}`)).rows[0].n);
const TABLES = ["categories", "tasks", "events", "subtasks", "notes", "recurrences", "preferences", "profiles", "ori_conversations", "ori_messages"];

// ======================================================================== A) banco novo
console.log("A) Banco novo, multiusuário");
{
  const db = await makeDb();
  let A, B;
  const T1 = "00000000-0000-4000-8000-0000000000a1";
  const E1 = "00000000-0000-4000-8000-0000000000e1";
  const C1 = "00000000-0000-4000-8000-0000000000c1";

  await step("migrations aplicam em ordem (base → important → fase 1 → fase 3)", async () => { await apply(db, MIGRATIONS); });
  await step("RLS ligada em TODAS as tabelas", async () => {
    const r = await db.query("select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity");
    assert.equal(r.rows.length, 0, "sem RLS: " + r.rows.map((x) => x.relname));
  });
  await step("policies existem só para authenticated, nunca para anon/public", async () => {
    const r = await db.query("select tablename, policyname, roles from pg_policies where schemaname = 'public'");
    assert.ok(r.rows.length >= 30, "poucas policies: " + r.rows.length);
    for (const p of r.rows) assert.deepEqual(p.roles, ["authenticated"], `${p.tablename}.${p.policyname}`);
    for (const t of ["tasks", "events", "categories", "notes", "preferences", "ori_conversations", "ori_messages", "subtasks", "recurrences"]) {
      const ops = (await db.query("select cmd from pg_policies where schemaname='public' and tablename=$1", [t])).rows.map((x) => x.cmd).sort();
      assert.deepEqual(ops, ["DELETE", "INSERT", "SELECT", "UPDATE"], `${t} precisa das 4 operações`);
    }
  });
  await step("anon (chave pública) não lê nem grava NADA", async () => {
    for (const t of TABLES) {
      await asAnon(db, async () => {
        await rejects(db.query(`select * from public.${t}`), /permission denied/, `anon lendo ${t}`);
        await rejects(db.query(`delete from public.${t}`), /permission denied/, `anon apagando ${t}`);
      });
    }
  });

  await step("cadastro (trigger): perfil, preferências e 11 categorias PRÓPRIAS por conta", async () => {
    A = await signup(db, "gabi@exemplo.com");
    B = await signup(db, "duda@exemplo.com");
    for (const u of [A, B]) {
      assert.equal(Number((await db.query("select count(*) n from public.profiles where id = $1 and display_name = ''", [u])).rows[0].n), 1);
      assert.equal(Number((await db.query("select count(*) n from public.preferences where user_id = $1", [u])).rows[0].n), 1);
      assert.equal(Number((await db.query("select count(*) n from public.categories where user_id = $1", [u])).rows[0].n), 11);
    }
    assert.equal(await count(db, "categories"), 22, "as categorias não podem ser compartilhadas");
  });

  await step("conta A grava dados (user_id vem do JWT) e os lê de volta", async () => {
    await as(db, A, async () => {
      await db.query("update public.profiles set display_name = 'Gabi' where id = $1", [A]);
      const cat = (await db.query("select id from public.categories where name = 'Fiscal'")).rows[0].id;
      await db.query("insert into public.tasks (id, title, context, date, category_id) values ($1, 'Tarefa da Gabi', 'trabalho', '2026-10-10', $2)", [T1, cat]);
      await db.query("insert into public.subtasks (task_id, title) values ($1, 'Sub da Gabi')", [T1]);
      await db.query("insert into public.recurrences (entity_type, entity_id, frequency) values ('task', $1, 'weekly')", [T1]);
      await db.query("insert into public.events (id, title, context, start_date, event_type) values ($1, 'Evento da Gabi', 'pessoal', '2026-10-10', 'compromisso')", [E1]);
      await db.query("insert into public.notes (content) values ('nota da Gabi')");
      await db.query("insert into public.ori_conversations (id, title) values ($1, 'Conversa da Gabi')", [C1]);
      await db.query("insert into public.ori_messages (conversation_id, role, content, meta) values ($1, 'user', 'oi ori', '{}'), ($1, 'ori', 'oi Gabi', '{\"proposal\":\"pending\"}')", [C1]);
      assert.equal((await db.query("select user_id from public.tasks where id = $1", [T1])).rows[0].user_id, A, "o dono deveria ser A");
      assert.equal(await count(db, "tasks"), 1);
      assert.equal(await count(db, "ori_messages"), 2);
    });
  });

  await step("conta B NÃO enxerga nada da A (todas as tabelas) e vê só as próprias categorias/perfil", async () => {
    await as(db, B, async () => {
      for (const t of ["tasks", "events", "subtasks", "notes", "recurrences", "ori_conversations", "ori_messages"]) assert.equal(await count(db, t), 0, t);
      assert.equal(await count(db, "categories"), 11);
      assert.equal(await count(db, "profiles"), 1);
      assert.equal(await count(db, "preferences"), 1);
      assert.equal((await db.query("select display_name from public.profiles")).rows[0].display_name, "", "o nome da A não vaza");
      assert.equal(Number((await db.query("select count(*) n from public.tasks where id = $1", [T1])).rows[0].n), 0, "consultar por ID da A não retorna nada");
    });
  });

  await step("UPDATE cruzado falha (0 linhas) e não muda nada", async () => {
    await as(db, B, async () => {
      for (const [t, set] of [["tasks", "title = 'invadida'"], ["events", "title = 'invadida'"], ["ori_conversations", "title = 'invadida'"], ["notes", "content = 'invadida'"], ["subtasks", "title = 'invadida'"], ["ori_messages", "content = 'invadida'"], ["recurrences", "frequency = 'daily'"]]) {
        const r = await db.query(`update public.${t} set ${set}`);
        assert.equal(r.affectedRows, 0, `B conseguiu editar ${t} da A`);
      }
      assert.equal((await db.query("update public.profiles set display_name = 'hack' where id = $1", [A])).affectedRows, 0);
    });
    await as(db, A, async () => {
      assert.equal((await db.query("select title from public.tasks where id = $1", [T1])).rows[0].title, "Tarefa da Gabi");
      assert.equal((await db.query("select display_name from public.profiles")).rows[0].display_name, "Gabi");
    });
  });

  await step("DELETE cruzado falha (0 linhas) e nada some", async () => {
    await as(db, B, async () => {
      for (const t of ["tasks", "events", "subtasks", "notes", "recurrences", "ori_messages", "ori_conversations"]) {
        assert.equal((await db.query(`delete from public.${t}`)).affectedRows, 0, `B apagou ${t} da A`);
      }
    });
    await as(db, A, async () => {
      assert.equal(await count(db, "tasks"), 1);
      assert.equal(await count(db, "ori_conversations"), 1);
      assert.equal(await count(db, "ori_messages"), 2);
    });
  });

  await step("INSERT com user_id de outra pessoa é recusado (o cliente não manda no dono)", async () => {
    await as(db, B, async () => {
      await rejects(db.query("insert into public.tasks (title, context, date, user_id) values ('forjada', 'pessoal', '2026-10-10', $1)", [A]), /row-level security/, "tarefa com user_id da A");
      await rejects(db.query("insert into public.notes (content, user_id) values ('forjada', $1)", [A]), /row-level security/, "nota");
      await rejects(db.query("insert into public.categories (name, context, user_id) values ('forjada', 'pessoal', $1)", [A]), /row-level security/, "categoria");
      await rejects(db.query("insert into public.ori_conversations (title, user_id) values ('forjada', $1)", [A]), /row-level security/, "conversa");
      await rejects(db.query("insert into public.profiles (id) values ($1)", [A]), /row-level security|duplicate key/, "perfil da A");
    });
  });

  await step("anexar a dados da A é recusado (subtarefa, recorrência, mensagem em objeto alheio)", async () => {
    await as(db, B, async () => {
      await rejects(db.query("insert into public.subtasks (task_id, title) values ($1, 'forjada')", [T1]), /row-level security/, "subtarefa na tarefa da A");
      await rejects(db.query("insert into public.subtasks (event_id, title) values ($1, 'forjada')", [E1]), /row-level security/, "subtarefa no evento da A");
      await rejects(db.query("insert into public.recurrences (entity_type, entity_id, frequency) values ('event', $1, 'daily')", [E1]), /row-level security/, "recorrência no evento da A");
      await rejects(db.query("insert into public.ori_messages (conversation_id, role, content) values ($1, 'user', 'forjada')", [C1]), /row-level security/, "mensagem na conversa da A");
    });
  });

  await step("não dá para 'passar' um registro próprio para outra pessoa (UPDATE user_id)", async () => {
    await as(db, A, async () => {
      await rejects(db.query("update public.tasks set user_id = $1 where id = $2", [B, T1]), /row-level security/, "doar tarefa");
      await rejects(db.query("update public.notes set user_id = $1", [B]), /row-level security/, "doar nota");
    });
    assert.equal((await db.query("select user_id from public.tasks where id = $1", [T1])).rows[0].user_id, A);
  });

  await step("conta B cria os próprios dados e a A continua sem vê-los", async () => {
    await as(db, B, async () => {
      await db.query("update public.profiles set display_name = 'Duda' where id = $1", [B]);
      await db.query("insert into public.tasks (title, context, date) values ('Tarefa da Duda', 'pessoal', '2026-10-11')");
      await db.query("insert into public.ori_conversations (id, title) values (gen_random_uuid(), 'Conversa da Duda')");
      assert.equal(await count(db, "tasks"), 1);
    });
    await as(db, A, async () => {
      assert.equal(await count(db, "tasks"), 1);
      assert.equal((await db.query("select title from public.tasks")).rows[0].title, "Tarefa da Gabi");
      assert.equal(await count(db, "ori_conversations"), 1);
      assert.equal((await db.query("select display_name from public.profiles")).rows[0].display_name, "Gabi");
    });
  });

  await step("categorias personalizadas não são compartilhadas (mesmo nome em contas diferentes)", async () => {
    await as(db, A, async () => { await db.query("insert into public.categories (name, context) values ('Só da Gabi', 'pessoal')"); });
    await as(db, B, async () => {
      assert.equal(Number((await db.query("select count(*) n from public.categories where name = 'Só da Gabi'")).rows[0].n), 0);
      await db.query("insert into public.categories (name, context) values ('Só da Gabi', 'pessoal')"); // mesmo nome, outra dona: permitido
    });
  });

  await step("mensagem nova atualiza a conversa; apagar a conversa leva as mensagens (só a dela)", async () => {
    await as(db, A, async () => {
      const before = (await db.query("select updated_at from public.ori_conversations where id = $1", [C1])).rows[0].updated_at;
      await new Promise((r) => setTimeout(r, 15));
      await db.query("insert into public.ori_messages (conversation_id, role, content) values ($1, 'user', 'mais uma')", [C1]);
      const after = (await db.query("select updated_at from public.ori_conversations where id = $1", [C1])).rows[0].updated_at;
      assert.ok(after > before, "updated_at deveria avançar");
    });
    await as(db, B, async () => { assert.equal((await db.query("delete from public.ori_conversations where id = $1", [C1])).affectedRows, 0); });
    await as(db, A, async () => {
      assert.equal(await count(db, "ori_messages"), 3);
      assert.equal((await db.query("delete from public.ori_conversations where id = $1", [C1])).affectedRows, 1);
      assert.equal(await count(db, "ori_messages"), 0, "mensagens deveriam sair em cascata");
      assert.equal(await count(db, "ori_conversations"), 0);
    });
  });

  await step("apagar a tarefa leva subtarefas (cascata) e a recorrência (trigger), por baixo do RLS", async () => {
    await as(db, A, async () => {
      assert.equal(await count(db, "subtasks"), 1);
      assert.equal(await count(db, "recurrences"), 1);
      await db.query("delete from public.tasks where id = $1", [T1]);
      assert.equal(await count(db, "subtasks"), 0);
      assert.equal(await count(db, "recurrences"), 0);
    });
  });

  await step("restrições de dados continuam valendo (título vazio, data final, subtarefa órfã, role inválido)", async () => {
    await as(db, A, async () => {
      await rejects(db.query("insert into public.tasks (title, context, date) values ('   ', 'trabalho', '2026-01-10')"), /check constraint/, "título vazio");
      await rejects(db.query("insert into public.events (title, context, start_date, end_date) values ('x', 'pessoal', '2026-01-10', '2026-01-05')"), /check constraint/, "fim antes do início");
      await rejects(db.query("insert into public.subtasks (title) values ('órfã')"), /check constraint/, "subtarefa sem pai");
      const c = (await db.query("insert into public.ori_conversations (title) values ('x') returning id")).rows[0].id;
      await rejects(db.query("insert into public.ori_messages (conversation_id, role, content) values ($1, 'admin', 'x')", [c]), /check constraint/, "role inválido");
      await rejects(db.query("update public.profiles set display_name = $1", ["x".repeat(41)]), /check constraint/, "nome longo");
    });
  });

  await step("important: falso por padrão e gravável (tarefas e eventos)", async () => {
    await as(db, A, async () => {
      await db.query("insert into public.tasks (title, context, date) values ('t', 'pessoal', current_date)");
      await db.query("insert into public.events (title, context, start_date) values ('e', 'pessoal', current_date)");
      for (const t of ["tasks", "events"]) {
        assert.equal((await db.query(`select bool_or(important) b from public.${t} where title in ('t','e')`)).rows[0].b, false);
        await db.query(`update public.${t} set important = true where title in ('t','e')`);
        assert.equal((await db.query(`select bool_and(important) b from public.${t} where title in ('t','e')`)).rows[0].b, true);
      }
    });
  });

  await step("fase 3: user_id é obrigatório e preferences tem uma linha por usuário", async () => {
    await rejects(db.query("insert into public.tasks (title, context, date, user_id) values ('x', 'pessoal', '2026-10-10', null)"), /not-null|null value/, "tarefa sem dono");
    assert.equal(await count(db, "preferences"), 2);
    await rejects(db.query("insert into public.preferences (user_id) values ($1)", [A]), /duplicate key|unique/, "2ª preferência da mesma conta");
    const cols = (await db.query("select column_name from information_schema.columns where table_name = 'preferences'")).rows.map((r) => r.column_name);
    assert.ok(!cols.includes("id") && !cols.includes("display_name"), "colunas antigas deveriam ter saído: " + cols);
  });

  await step("preferências e perfil: cada conta altera só as suas", async () => {
    await as(db, A, async () => { await db.query("update public.preferences set palette = 'monochrome', theme_mode = 'dark'"); });
    await as(db, B, async () => {
      assert.equal((await db.query("select palette from public.preferences")).rows[0].palette, "oliva-vinho");
      assert.equal((await db.query("update public.preferences set palette = 'hack' where user_id = $1", [A])).affectedRows, 0);
    });
  });

  await step("apagar a conta A leva TODOS os dados dela e não toca nos da B (cascata)", async () => {
    await db.query("delete from auth.users where id = $1", [A]);
    for (const t of ["categories", "tasks", "events", "subtasks", "notes", "recurrences", "preferences", "profiles", "ori_conversations", "ori_messages"]) {
      const col = t === "profiles" ? "id" : "user_id";
      assert.equal(Number((await db.query(`select count(*) n from public.${t} where ${col} = $1`, [A])).rows[0].n), 0, t);
    }
    await as(db, B, async () => { assert.equal(await count(db, "tasks"), 1); assert.equal(await count(db, "categories"), 12); });
  });

  await step("service_role segue com acesso total (manutenção pelo painel)", async () => {
    await db.exec("set role service_role");
    try { assert.ok((await db.query("select count(*) n from public.tasks")).rows[0].n >= 1); } finally { await db.exec("reset role"); }
  });
  await db.close();
}

// ======================================================================== B) banco legado
console.log("\nB) Banco LEGADO (dados de antes do login) → fase 1 → conta → claim → fase 3");
{
  const db = await makeDb();
  const OWNER = "gabi@exemplo.com";
  let owner, friend;
  const claimBlock = (email) => sql("claim_legacy_data.sql", "manual").match(/do \$\$[\s\S]*?end \$\$;/i)[0].replace("COLOQUE-AQUI-O-E-MAIL-DA-SUA-CONTA", email);

  await step("banco antigo (single-user) com dados reais de uso", async () => {
    await apply(db, ["20260107000000_single_user.sql", "20261008000000_important_and_display_name.sql"]);
    const cat = (await db.query("select id from public.categories where name = 'Fiscal'")).rows[0].id;
    await db.exec(`
      insert into public.tasks (id, title, context, date, category_id, important) values ('00000000-0000-4000-8000-0000000000b1', 'Enviar ISS', 'trabalho', '2026-10-10', '${cat}', true), ('00000000-0000-4000-8000-0000000000b2', 'Pagar cartão', 'pessoal', '2026-10-12', null, false);
      insert into public.subtasks (task_id, title) values ('00000000-0000-4000-8000-0000000000b1', 'conferir guia');
      insert into public.recurrences (entity_type, entity_id, frequency) values ('task', '00000000-0000-4000-8000-0000000000b1', 'monthly');
      insert into public.events (id, title, context, start_date, event_type) values ('00000000-0000-4000-8000-0000000000b3', 'Reunião FCA', 'trabalho', '2026-10-11', 'compromisso');
      insert into public.notes (content) values ('minha nota antiga');
      update public.preferences set palette = 'monochrome', theme_mode = 'dark';
    `);
  });

  await step("fase 1 aplica sem perder nada e o app antigo (service_role) continua funcionando", async () => {
    await apply(db, ["20261009000000_multiuser_schema.sql"]);
    assert.equal(await count(db, "tasks"), 2);
    assert.equal(await count(db, "categories"), 11);
    await db.exec("set role service_role");
    try {
      // o app antigo grava sem dono e faz upsert da linha única de preferências por id
      await db.query("insert into public.tasks (title, context, date) values ('criada pelo app antigo na janela', 'pessoal', '2026-10-13')");
      await db.query("insert into public.preferences (id, palette) values (true, 'monochrome') on conflict (id) do update set palette = excluded.palette");
      assert.equal(Number((await db.query("select count(*) n from public.preferences where id = true")).rows[0].n), 1);
    } finally { await db.exec("reset role"); }
    assert.equal(await count(db, "tasks"), 3);
  });

  await step("antes do claim: contas novas NÃO veem os dados antigos (nem as categorias antigas)", async () => {
    friend = await signup(db, "duda@exemplo.com");
    owner = await signup(db, OWNER);
    await as(db, friend, async () => {
      for (const t of ["tasks", "events", "subtasks", "notes", "recurrences"]) assert.equal(await count(db, t), 0, t);
      assert.equal(await count(db, "categories"), 11, "só as 11 próprias");
      assert.equal(Number((await db.query("select count(*) n from public.preferences where palette = 'monochrome'")).rows[0].n), 0);
    });
  });

  await step("fase 3 SE RECUSA a rodar com linhas sem dono (e nada muda)", async () => {
    await rejects(db.exec(sql(PHASE3)), /FASE 3 BLOQUEADA/, "fase 3 com órfãos");
    const nullable = (await db.query("select is_nullable from information_schema.columns where table_name = 'tasks' and column_name = 'user_id'")).rows[0].is_nullable;
    assert.equal(nullable, "YES");
    assert.equal(await count(db, "tasks"), 3);
  });

  await step("claim com e-mail inexistente falha e não altera nada", async () => {
    await rejects(db.exec(claimBlock("ninguem@exemplo.com")), /Não existe conta/, "e-mail errado");
    assert.equal(Number((await db.query("select count(*) n from public.tasks where user_id is null")).rows[0].n), 3);
  });

  await step("claim recusa conta que já tem dados próprios (não mistura)", async () => {
    await as(db, friend, async () => { await db.query("insert into public.tasks (title, context, date) values ('da Duda', 'pessoal', '2026-10-10')"); });
    await rejects(db.exec(claimBlock("duda@exemplo.com")), /já tem dados próprios/, "conta com dados");
    assert.equal(Number((await db.query("select count(*) n from public.tasks where user_id is null")).rows[0].n), 3);
    await db.exec("delete from public.tasks where title = 'da Duda'");
  });

  await step("claim entrega TUDO à conta certa, preserva ids/categorias/preferências e não deixa órfãos", async () => {
    const catBefore = (await db.query("select id from public.categories where user_id is null order by name")).rows.map((r) => r.id);
    await db.exec(claimBlock(OWNER));
    for (const t of ["categories", "tasks", "events", "subtasks", "notes", "recurrences", "preferences"]) {
      assert.equal(Number((await db.query(`select count(*) n from public.${t} where user_id is null`)).rows[0].n), 0, `${t} ainda tem órfãos`);
    }
    assert.equal(Number((await db.query("select count(*) n from public.tasks where user_id = $1", [owner])).rows[0].n), 3);
    assert.equal(Number((await db.query("select count(*) n from public.events where user_id = $1", [owner])).rows[0].n), 1);
    assert.equal(Number((await db.query("select count(*) n from public.subtasks where user_id = $1", [owner])).rows[0].n), 1);
    assert.equal(Number((await db.query("select count(*) n from public.recurrences where user_id = $1", [owner])).rows[0].n), 1);
    assert.equal(Number((await db.query("select count(*) n from public.notes where user_id = $1", [owner])).rows[0].n), 1);
    // as categorias da dona são as ANTIGAS (mesmos ids): tarefas continuam ligadas a elas
    const catAfter = (await db.query("select id from public.categories where user_id = $1 order by name", [owner])).rows.map((r) => r.id);
    assert.deepEqual(catAfter, catBefore, "as 11 categorias antigas deveriam ser as dela, sem duplicar");
    const iss = (await db.query("select c.name from public.tasks t join public.categories c on c.id = t.category_id where t.title = 'Enviar ISS'")).rows[0];
    assert.equal(iss.name, "Fiscal");
    // preferências antigas (paleta/modo) agora são dela, e só existe uma linha dela
    const prefs = (await db.query("select palette, theme_mode from public.preferences where user_id = $1", [owner])).rows;
    assert.deepEqual(prefs, [{ palette: "monochrome", theme_mode: "dark" }]);
    // o nome NÃO é copiado: a ori vai perguntar
    assert.equal((await db.query("select display_name from public.profiles where id = $1", [owner])).rows[0].display_name, "");
    // a outra conta continua intacta
    assert.equal(Number((await db.query("select count(*) n from public.categories where user_id = $1", [friend])).rows[0].n), 11);
    assert.equal(Number((await db.query("select count(*) n from public.tasks where user_id = $1", [friend])).rows[0].n), 0);
  });

  await step("depois do claim: a dona vê tudo; a outra conta continua sem ver nada dela", async () => {
    await as(db, owner, async () => { assert.equal(await count(db, "tasks"), 3); assert.equal(await count(db, "categories"), 11); assert.equal(await count(db, "notes"), 1); });
    await as(db, friend, async () => { assert.equal(await count(db, "tasks"), 0); assert.equal(await count(db, "notes"), 0); });
  });

  await step("fase 3 agora passa: user_id obrigatório, preferences por usuário", async () => {
    await db.exec(sql(PHASE3));
    const nullable = (await db.query("select is_nullable from information_schema.columns where table_name = 'tasks' and column_name = 'user_id'")).rows[0].is_nullable;
    assert.equal(nullable, "NO");
    assert.equal(await count(db, "preferences"), 2);
    await as(db, owner, async () => { assert.equal((await db.query("select palette from public.preferences")).rows[0].palette, "monochrome"); });
  });
  await db.close();
}

console.log(failed ? "\nFALHOU" : "\nOK: banco verificado (isolamento por usuário e migração dos dados antigos)");
process.exitCode = failed ? 1 : 0;
