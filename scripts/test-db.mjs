// Testa o banco SEM precisar do Supabase: sobe um Postgres local (PGlite), aplica as migrations
// de supabase/migrations e roda supabase/tests/access_control.sql.
// Uso: npm run test:db
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "supabase");
const db = new PGlite();

// Simula o que o Supabase já traz pronto: os papéis do projeto
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  -- no Supabase, tabelas novas em public já nascem acessíveis a esses papéis (a migration fecha anon/authenticated)
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
`);

let failed = false;
const step = async (label, fn) => {
  try { await fn(); console.log(`✓ ${label}`); }
  catch (e) { failed = true; console.log(`✗ ${label}: ${e.message}`); }
};

const migrations = fs.readdirSync(path.join(root, "migrations")).filter((f) => f.endsWith(".sql")).sort();
for (const f of migrations) await step(`migration ${f}`, () => db.exec(fs.readFileSync(path.join(root, "migrations", f), "utf8")));

await step("RLS ligada em todas as tabelas", async () => {
  const r = await db.query(`select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity`);
  if (r.rows.length) throw new Error("sem RLS: " + r.rows.map((x) => x.relname).join(", "));
});

await step("nenhuma policy liberando acesso (só a service_role entra)", async () => {
  const r = await db.query(`select tablename, policyname from pg_policies where schemaname = 'public'`);
  if (r.rows.length) throw new Error("há policies: " + r.rows.map((x) => `${x.tablename}.${x.policyname}`).join(", "));
});

await step("acesso restrito à service_role (access_control.sql)", async () => {
  const res = await db.exec(fs.readFileSync(path.join(root, "tests", "access_control.sql"), "utf8"));
  const last = res.filter((r) => r.rows && r.rows.length).pop();
  if (!last || !String(last.resultado ?? last.rows[0].resultado).startsWith("OK")) throw new Error("o teste não terminou com OK");
});

await step("important: coluna em tasks e events, falso por padrão", async () => {
  await db.exec("insert into public.tasks (title, context, date) values ('t', 'pessoal', current_date)");
  await db.exec("insert into public.events (title, context, start_date) values ('e', 'pessoal', current_date)");
  for (const t of ["tasks", "events"]) {
    const r = await db.query(`select important from public.${t}`);
    if (r.rows.length !== 1 || r.rows[0].important !== false) throw new Error(t + ": esperava important = false");
    await db.exec(`update public.${t} set important = true`);
    if ((await db.query(`select important from public.${t}`)).rows[0].important !== true) throw new Error(t + ": não gravou important");
  }
});

await step("display_name sem nome fixo para novas instalações (a linha existente é mantida)", async () => {
  const d = await db.query("select column_default from information_schema.columns where table_name = 'preferences' and column_name = 'display_name'");
  if (!/^''/.test(d.rows[0].column_default)) throw new Error("padrão ainda é " + d.rows[0].column_default);
  const row = await db.query("select display_name from public.preferences");
  if (row.rows[0].display_name !== "Gabriela") throw new Error("a linha existente foi alterada: " + row.rows[0].display_name);
});

console.log(failed ? "\nFALHOU" : "\nOK: banco verificado");
await db.close();
process.exitCode = failed ? 1 : 0;
