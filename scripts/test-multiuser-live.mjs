// Teste de ISOLAMENTO entre contas, contra um Supabase de verdade (o seu projeto) ou o de teste local.
// Cria DUAS contas descartáveis, tenta o acesso cruzado direto pela API do banco (PostgREST, como um atacante faria,
// sem passar pelo app) e APAGA as contas no fim (os dados delas saem em cascata). Não toca nos seus dados.
//
//   Pré-requisito: as migrations 20261009000000 (fase 1) já rodadas no projeto.
//   Variáveis (as 3 só para este script; a service_role NÃO vai para o app):
//     NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//   Uso:  npm run test:live      (lê o .env.local)
//   Contra o Supabase de teste local:
//     NEXT_PUBLIC_SUPABASE_URL=http://localhost:54399 NEXT_PUBLIC_SUPABASE_ANON_KEY=fake-anon SUPABASE_SERVICE_ROLE_KEY=fake-service-role npm run test:live
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const envFile = path.join(import.meta.dirname, "..", ".env.local");
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
const URL_ = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
const ANON = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "").trim();
const SERVICE = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
if (!URL_ || !ANON || !SERVICE) {
  console.log("Faltam NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY (esta só para criar/apagar as contas de teste).");
  process.exit(1);
}

const call = async (method, p, { token, body, prefer } = {}) => {
  const res = await fetch(`${URL_}${p}`, {
    method,
    headers: { apikey: ANON, authorization: `Bearer ${token ?? ANON}`, "content-type": "application/json", ...(prefer ? { prefer } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
};
const admin = (method, p, body) => fetch(`${URL_}/auth/v1/admin${p}`, { method, headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));
const rest = (method, table, opts) => call(method, `/rest/v1/${table}`, opts);

let pass = 0, fail = 0;
const check = async (name, fn) => {
  try { await fn(); pass++; console.log(`  ok   ${name}`); }
  catch (e) { fail++; console.log(`  FALHOU ${name}\n         ${String(e.message).split("\n")[0]}`); }
};
const denied = (r) => r.status === 401 || r.status === 403 || (r.status >= 400 && r.status < 500);

const stamp = Date.now();
const made = [];
async function newUser(label) {
  const email = `teste-isolamento-${label}-${stamp}@exemplo.com`;
  const password = `Senha-${randomUUID()}`;
  const c = await admin("POST", "/users", { email, password, email_confirm: true });
  assert.equal(c.status, 200, `não consegui criar a conta de teste (${c.status}): confira a service_role`);
  made.push(c.json.id);
  const t = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: ANON, "content-type": "application/json" }, body: JSON.stringify({ email, password }) }).then((r) => r.json());
  assert.ok(t.access_token, "não consegui entrar com a conta de teste");
  return { id: c.json.id, token: t.access_token };
}

console.log(`\nIsolamento entre contas em ${URL_}`);
try {
  const A = await newUser("a");
  const B = await newUser("b");
  const T1 = randomUUID(), C1 = randomUUID();

  await check("cada conta nasce com perfil, preferências e 11 categorias próprias", async () => {
    for (const u of [A, B]) {
      assert.equal((await rest("GET", `profiles?select=id`, { token: u.token })).json.length, 1);
      assert.equal((await rest("GET", `preferences?select=user_id`, { token: u.token })).json.length, 1);
      assert.equal((await rest("GET", `categories?select=id`, { token: u.token })).json.length, 11);
    }
  });
  await check("A grava dados (sem informar user_id: o banco usa a sessão)", async () => {
    assert.ok([200, 201].includes((await rest("POST", "tasks", { token: A.token, body: { id: T1, title: "Tarefa da A", context: "pessoal", date: "2026-10-10" }, prefer: "return=representation" })).status));
    assert.ok([200, 201].includes((await rest("POST", "ori_conversations", { token: A.token, body: { id: C1, title: "Conversa da A" } })).status));
    assert.ok([200, 201].includes((await rest("POST", "ori_messages", { token: A.token, body: { conversation_id: C1, role: "user", content: "oi" } })).status));
    const mine = (await rest("GET", `tasks?select=user_id&id=eq.${T1}`, { token: A.token })).json;
    assert.equal(mine[0]?.user_id, A.id, "o dono deveria ser a A");
  });
  await check("B não enxerga nada da A (tarefas, conversas, mensagens), nem pedindo pelo id", async () => {
    for (const t of ["tasks", "ori_conversations", "ori_messages", "events", "notes", "subtasks", "recurrences"]) assert.equal((await rest("GET", `${t}?select=*`, { token: B.token })).json.length, 0, t);
    assert.equal((await rest("GET", `tasks?select=*&id=eq.${T1}`, { token: B.token })).json.length, 0);
    assert.equal((await rest("GET", `profiles?select=*&id=eq.${A.id}`, { token: B.token })).json.length, 0);
  });
  await check("UPDATE cruzado não altera nada", async () => {
    const r = await rest("PATCH", `tasks?id=eq.${T1}`, { token: B.token, body: { title: "INVADIDA" }, prefer: "return=representation" });
    assert.ok(Array.isArray(r.json) ? r.json.length === 0 : denied(r), JSON.stringify(r));
    assert.equal((await rest("GET", `tasks?select=title&id=eq.${T1}`, { token: A.token })).json[0].title, "Tarefa da A");
  });
  await check("DELETE cruzado não apaga nada", async () => {
    await rest("DELETE", `tasks?id=eq.${T1}`, { token: B.token });
    await rest("DELETE", `ori_conversations?id=eq.${C1}`, { token: B.token });
    assert.equal((await rest("GET", `tasks?select=id&id=eq.${T1}`, { token: A.token })).json.length, 1);
    assert.equal((await rest("GET", `ori_conversations?select=id&id=eq.${C1}`, { token: A.token })).json.length, 1);
  });
  await check("INSERT com user_id da outra conta é recusado", async () => {
    assert.ok(denied(await rest("POST", "tasks", { token: B.token, body: { title: "forjada", context: "pessoal", date: "2026-10-10", user_id: A.id } })));
    assert.ok(denied(await rest("POST", "notes", { token: B.token, body: { content: "forjada", user_id: A.id } })));
  });
  await check("anexar a dados da outra conta é recusado (mensagem na conversa dela)", async () => {
    assert.ok(denied(await rest("POST", "ori_messages", { token: B.token, body: { conversation_id: C1, role: "user", content: "invadindo" } })));
    assert.ok(denied(await rest("POST", "subtasks", { token: B.token, body: { task_id: T1, title: "forjada" } })));
  });
  await check("não dá para doar um registro para outra conta (UPDATE user_id)", async () => {
    const r = await rest("PATCH", `tasks?id=eq.${T1}`, { token: A.token, body: { user_id: B.id } });
    assert.ok(denied(r), JSON.stringify(r));
  });
  await check("sem login (só a chave pública) não lê nem grava nada", async () => {
    for (const t of ["tasks", "events", "categories", "preferences", "profiles", "ori_conversations", "ori_messages", "notes"]) assert.ok(denied(await rest("GET", `${t}?select=*`)), `${t} aberto para anon`);
    assert.ok(denied(await rest("POST", "tasks", { body: { title: "x", context: "pessoal", date: "2026-10-10" } })));
  });
} finally {
  for (const id of made) await admin("DELETE", `/users/${id}`);
  console.log(`\nContas de teste apagadas (${made.length}).`);
}
console.log(`${pass} ok, ${fail} falharam`);
process.exit(fail ? 1 : 0);
