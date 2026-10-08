// Supabase DE TESTE, local e descartável (nada a ver com o seu projeto real):
//   • "GoTrue": cadastro, login, refresh, usuário, logout, recuperação de senha, PKCE e admin (criar/apagar conta);
//   • "PostgREST": só o subconjunto de consultas que o app usa (select/insert/upsert/update/delete, filtros, embed de
//     subtasks e contagem de mensagens), executado num Postgres de verdade (PGlite) com as migrations do projeto e o RLS REAL:
//     cada requisição roda como o papel `authenticated` com o `sub` do JWT, exatamente como o PostgREST faz.
// Serve para rodar o app e os testes de ponta a ponta sem um projeto Supabase. NÃO emula Realtime (a releitura
// periódica do app cobre a sincronia nos testes).
//
//   node scripts/fake-supabase.mjs                  → http://localhost:54399
//   FAKE_CONFIRM_EMAIL=1 node scripts/fake-supabase.mjs   → cadastro exige confirmar o e-mail (link no /__fake/outbox)
//
// Para apontar o app para ele:
//   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54399 NEXT_PUBLIC_SUPABASE_ANON_KEY=fake-anon npm run dev
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const PORT = Number(process.env.FAKE_PORT || 54399);
const CONFIRM = process.env.FAKE_CONFIRM_EMAIL === "1";
const SERVICE_KEY = "fake-service-role";
const SECRET = "fake-jwt-secret-only-for-local-tests-0123456789";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "supabase", "migrations");

// ------------------------------------------------------------------ banco
const db = new PGlite();
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, created_at timestamptz not null default now());
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
`);
// imita o pg_net (net.http_post + net._http_response) para o disparo de lembretes
await db.exec(`
  create schema net;
  create table net.calls (id bigserial primary key, url text, body jsonb, headers jsonb, handled boolean not null default false);
  create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
    returns bigint language plpgsql as $$ declare i bigint; begin insert into net.calls (url, body, headers) values (url, body, headers) returning id into i; return i; end $$;
  create table net._http_response (id bigint primary key, status_code int, content text, timed_out boolean, error_msg text, created timestamptz default now());
`);
for (const f of fs.readdirSync(root).filter((x) => x.endsWith(".sql")).sort()) await db.exec(fs.readFileSync(path.join(root, f), "utf8"));
const PUSH_URL = process.env.FAKE_PUSH_URL || "http://localhost:3100/api/push/send";
const PUSH_SECRET = process.env.FAKE_PUSH_SECRET || "segredo-de-teste-0123456789abcdef";
await db.query("insert into private.app_config (key, value) values ('push_url', $1), ('push_secret', $2) on conflict (key) do update set value = excluded.value", [PUSH_URL, PUSH_SECRET]);

// ------------------------------------------------------------------ JWT (HS256)
const b64 = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
const sign = (payload) => {
  const head = b64({ alg: "HS256", typ: "JWT" });
  const body = b64(payload);
  return `${head}.${body}.${crypto.createHmac("sha256", SECRET).update(`${head}.${body}`).digest("base64url")}`;
};
function verify(token) {
  const [h, b, s] = String(token || "").split(".");
  if (!h || !b || !s) return null;
  const ok = crypto.createHmac("sha256", SECRET).update(`${h}.${b}`).digest("base64url");
  if (s.length !== ok.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(ok))) return null;
  const p = JSON.parse(Buffer.from(b, "base64url").toString());
  return p.exp && p.exp < Date.now() / 1000 ? null : p;
}

// ------------------------------------------------------------------ Auth (GoTrue)
const users = new Map(); // id -> { id, email, password, confirmed, created_at }
const refreshTokens = new Map(); // token -> userId
const codes = new Map(); // código PKCE/confirmação -> userId
const outbox = []; // e-mails "enviados"

const publicUser = (u) => ({ id: u.id, aud: "authenticated", role: "authenticated", email: u.email, email_confirmed_at: u.confirmed ? u.created_at : null, created_at: u.created_at, app_metadata: { provider: "email" }, user_metadata: {}, identities: [{ identity_id: u.id, id: u.id, user_id: u.id, provider: "email" }] });
function session(u) {
  const now = Math.floor(Date.now() / 1000);
  const refresh = crypto.randomUUID();
  refreshTokens.set(refresh, u.id);
  return { access_token: sign({ sub: u.id, email: u.email, role: "authenticated", aud: "authenticated", iat: now, exp: now + 3600 }), token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: refresh, user: publicUser(u) };
}
const authErr = (res, status, error_code, msg) => send(res, status, { code: status, error_code, msg });

async function createUser(email, password, confirmed) {
  const id = crypto.randomUUID();
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]); // o trigger cria perfil, preferências e categorias
  const u = { id, email, password, confirmed, created_at: new Date().toISOString() };
  users.set(id, u);
  return u;
}
const byEmail = (email) => [...users.values()].find((u) => u.email === String(email).toLowerCase());

async function handleAuth(req, res, url, body) {
  const route = url.pathname.replace("/auth/v1", "");
  // como no Supabase real: a chave secreta pode vir só em `apikey` (formato novo, sem JWT)
  const bearer = (req.headers.authorization ?? "").replace(/^Bearer /, "") || String(req.headers.apikey ?? "");

  if (route === "/signup" && req.method === "POST") {
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return authErr(res, 400, "validation_failed", "Unable to validate email address: invalid format");
    if ((body.password ?? "").length < 6) return authErr(res, 422, "weak_password", "Password should be at least 6 characters.");
    const existing = byEmail(email);
    if (existing) {
      if (CONFIRM) return send(res, 200, { ...publicUser(existing), identities: [] }); // o Supabase não revela que o e-mail existe
      return authErr(res, 422, "user_already_exists", "User already registered");
    }
    const u = await createUser(email, body.password, !CONFIRM);
    if (CONFIRM) {
      const code = crypto.randomUUID();
      codes.set(code, u.id);
      outbox.push({ to: email, type: "confirm", code, redirect: body.redirect_to ?? null });
      return send(res, 200, publicUser(u));
    }
    return send(res, 200, session(u));
  }
  if (route === "/token" && req.method === "POST") {
    const grant = url.searchParams.get("grant_type");
    if (grant === "password") {
      const u = byEmail(body.email);
      if (!u || u.password !== body.password) return authErr(res, 400, "invalid_credentials", "Invalid login credentials");
      if (!u.confirmed) return authErr(res, 400, "email_not_confirmed", "Email not confirmed");
      return send(res, 200, session(u));
    }
    if (grant === "refresh_token") {
      const id = refreshTokens.get(body.refresh_token);
      const u = id && users.get(id);
      if (!u) return authErr(res, 400, "refresh_token_not_found", "Invalid Refresh Token: Refresh Token Not Found");
      refreshTokens.delete(body.refresh_token);
      return send(res, 200, session(u));
    }
    if (grant === "pkce") {
      const id = codes.get(body.auth_code);
      const u = id && users.get(id);
      if (!u) return authErr(res, 400, "flow_state_not_found", "invalid flow state, no valid flow state found");
      codes.delete(body.auth_code);
      u.confirmed = true;
      return send(res, 200, session(u));
    }
  }
  if (route === "/user") {
    const claims = verify(bearer);
    const u = claims && users.get(claims.sub);
    if (!u) return authErr(res, 401, "bad_jwt", "invalid JWT: unable to parse or verify signature");
    if (req.method === "PUT") {
      if (body.password) u.password = body.password;
    }
    return send(res, 200, publicUser(u));
  }
  if (route === "/logout") {
    for (const [t, id] of refreshTokens) if (id === verify(bearer)?.sub) refreshTokens.delete(t);
    res.writeHead(204, cors());
    return res.end();
  }
  if (route === "/recover" && req.method === "POST") {
    const u = byEmail(body.email);
    if (u) {
      const code = crypto.randomUUID();
      codes.set(code, u.id);
      outbox.push({ to: u.email, type: "recovery", code, redirect: url.searchParams.get("redirect_to") });
    }
    return send(res, 200, {});
  }
  // administração (service role): criar e apagar contas de teste
  if (route === "/admin/users" && req.method === "POST") {
    if (bearer !== SERVICE_KEY) return authErr(res, 401, "not_admin", "User not allowed");
    const u = await createUser(String(body.email).toLowerCase(), body.password, true);
    return send(res, 200, publicUser(u));
  }
  const del = route.match(/^\/admin\/users\/([0-9a-f-]+)$/);
  if (del && req.method === "DELETE") {
    if (bearer !== SERVICE_KEY) return authErr(res, 401, "not_admin", "User not allowed");
    await db.query("delete from auth.users where id = $1", [del[1]]);
    users.delete(del[1]);
    return send(res, 200, {});
  }
  return authErr(res, 404, "not_found", `rota de auth não emulada: ${req.method} ${route}`);
}

// ------------------------------------------------------------------ REST (PostgREST, subconjunto)
const ident = (s) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(s)) throw Object.assign(new Error(`identificador inválido: ${s}`), { status: 400 });
  return `"${s}"`;
};
const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);

function splitTop(s) {
  const out = [];
  let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur); cur = ""; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

/** select=*,subtasks(*)  |  select=id,title,ori_messages(count) */
function selectList(select, table) {
  if (!select) return `t.*`;
  return splitTop(select).map((item) => {
    const emb = item.match(/^([a-z_]+)\((.*)\)$/);
    if (!emb) return item === "*" ? "t.*" : `t.${ident(item)}`;
    const [, rel, inner] = emb;
    if (rel === "subtasks") {
      const fk = table === "events" ? "event_id" : "task_id";
      return `(select coalesce(json_agg(s order by s.position), '[]'::json) from public.subtasks s where s.${fk} = t.id) as subtasks`;
    }
    if (rel === "ori_messages" && inner === "count") {
      return `(select json_build_array(json_build_object('count', count(*))) from public.ori_messages m where m.conversation_id = t.id) as ori_messages`;
    }
    throw Object.assign(new Error(`embed não emulado: ${item}`), { status: 400 });
  }).join(", ");
}

function where(params, args) {
  const conds = [];
  for (const [key, raw] of params) {
    if (RESERVED.has(key)) continue;
    const m = raw.match(/^(not\.)?([a-z]+)\.(.*)$/s);
    if (!m) throw Object.assign(new Error(`filtro inválido: ${key}=${raw}`), { status: 400 });
    const [, not, op, val] = m;
    const col = `t.${ident(key)}`;
    let c;
    if (op === "is") c = `${col} is ${val === "null" ? "null" : val}`;
    else if (op === "in") { args.push(val.replace(/^\(|\)$/g, "").split(",").map((x) => x.replace(/^"|"$/g, ""))); c = `${col}::text = any($${args.length}::text[])`; }
    else if (["eq", "neq", "gt", "gte", "lt", "lte"].includes(op)) {
      args.push(val);
      const sym = { eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=" }[op];
      c = op === "eq" || op === "neq" ? `${col}::text ${sym} $${args.length}` : `${col} ${sym} $${args.length}::${op.startsWith("g") || op.startsWith("l") ? "timestamptz" : "text"}`;
    } else throw Object.assign(new Error(`operador não emulado: ${op}`), { status: 400 });
    conds.push(not ? `not (${c})` : c);
  }
  return conds.length ? ` where ${conds.join(" and ")}` : "";
}

function orderBy(params) {
  const o = params.get("order");
  if (!o) return "";
  return " order by " + o.split(",").map((p) => { const [c, d] = p.split("."); return `t.${ident(c)} ${d === "desc" ? "desc nulls last" : "asc"}`; }).join(", ");
}

async function handleRpc(req, res, url, body) {
  const fn = ident(url.pathname.replace("/rest/v1/rpc/", ""));
  const bearer = (req.headers.authorization ?? "").replace(/^Bearer /, "");
  const claims = verify(bearer);
  const role = claims?.role === "authenticated" ? "authenticated" : "anon";
  const keys = Object.keys(body ?? {});
  const args = keys.map((k) => body[k]);
  const call = `select public.${fn}(${keys.map((k, i) => `${ident(k)} => $${i + 1}`).join(", ")}) as r`;
  const out = await db.transaction(async (tx) => {
    await tx.query(`set local role ${role}`);
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [claims?.sub ?? ""]);
    return (await tx.query(call, args)).rows[0]?.r ?? null;
  });
  return send(res, 200, out);
}

async function handleRest(req, res, url, body) {
  if (url.pathname.startsWith("/rest/v1/rpc/")) return handleRpc(req, res, url, body);
  const table = url.pathname.replace("/rest/v1/", "");
  const tableId = ident(table);
  const bearer = (req.headers.authorization ?? "").replace(/^Bearer /, "");
  const claims = verify(bearer);
  const role = bearer === SERVICE_KEY ? "service_role" : claims?.role === "authenticated" ? "authenticated" : "anon";
  const sub = claims?.sub ?? "";
  const prefer = String(req.headers.prefer ?? "");
  const wantRows = prefer.includes("return=representation");
  const asObject = String(req.headers.accept ?? "").includes("vnd.pgrst.object");
  const params = url.searchParams;
  const args = [];
  let cte = ""; // comando que modifica dados precisa ficar no topo da consulta (CTE)
  let q;
  const proj = selectList(params.get("select"), table);

  if (req.method === "GET") {
    const range = String(req.headers.range ?? "").match(/^(\d+)-(\d+)$/);
    let lim = params.get("limit") ? ` limit ${Number(params.get("limit"))}` : "";
    let off = params.get("offset") ? ` offset ${Number(params.get("offset"))}` : "";
    if (range) { lim = ` limit ${Number(range[2]) - Number(range[1]) + 1}`; off = ` offset ${Number(range[1])}`; }
    q = `select ${proj} from public.${tableId} t${where(params, args)}${orderBy(params)}${lim}${off}`;
  } else if (req.method === "POST") {
    const rows = Array.isArray(body) ? body : [body];
    const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    args.push(JSON.stringify(rows));
    const conflict = params.get("on_conflict");
    const colList = cols.map(ident).join(", ");
    let onConflict = "";
    if (conflict) {
      const target = conflict.split(",").map(ident).join(", ");
      if (prefer.includes("ignore-duplicates")) onConflict = ` on conflict (${target}) do nothing`;
      else if (prefer.includes("merge-duplicates")) {
        const set = cols.filter((c) => !conflict.split(",").includes(c)).map((c) => `${ident(c)} = excluded.${ident(c)}`);
        onConflict = set.length ? ` on conflict (${target}) do update set ${set.join(", ")}` : ` on conflict (${target}) do nothing`;
      }
    }
    cte = `with res as (insert into public.${tableId} (${colList}) select ${colList} from json_populate_recordset(null::public.${tableId}, $1::json)${onConflict} returning *)`;
    q = `select ${proj} from res t`;
  } else if (req.method === "PATCH") {
    const cols = Object.keys(body);
    args.push(JSON.stringify(body));
    const w = where(params, args);
    cte = `with res as (update public.${tableId} t set ${cols.map((c) => `${ident(c)} = r.${ident(c)}`).join(", ")} from (select * from json_populate_record(null::public.${tableId}, $1::json)) r${w} returning t.*)`;
    q = `select ${proj} from res t`;
  } else if (req.method === "DELETE") {
    cte = `with res as (delete from public.${tableId} t${where(params, args)} returning t.*)`;
    q = `select ${proj} from res t`;
  } else throw Object.assign(new Error("método não emulado"), { status: 405 });

  const rows = await db.transaction(async (tx) => {
    await tx.query(`set local role ${role}`);
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [sub]);
    return (await tx.query(`${cte} select coalesce(json_agg(x), '[]'::json) as j from (${q}) x`, args)).rows[0].j;
  });

  const status = req.method === "POST" ? 201 : wantRows || req.method === "GET" ? 200 : 204;
  if (req.method !== "GET" && !wantRows) { res.writeHead(status === 200 ? 204 : status, cors()); return res.end(); }
  if (asObject) {
    if (rows.length !== 1) return send(res, 406, { code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `The result contains ${rows.length} rows`, hint: null });
    return send(res, status, rows[0]);
  }
  return send(res, status, rows);
}

// ------------------------------------------------------------------ servidor
function cors() {
  return { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, apikey, content-type, x-client-info, x-supabase-api-version, prefer, range, accept, accept-profile, content-profile", "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS", "access-control-expose-headers": "content-range" };
}
function send(res, status, data) {
  res.writeHead(status, { ...cors(), "content-type": "application/json" });
  res.end(JSON.stringify(data));
}
const STATUS = { "42501": 403, "23505": 409, "23503": 409, "23502": 400, "23514": 400, "22P02": 400, "22007": 400 };

http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") { res.writeHead(204, cors()); return res.end(); }
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    if (url.pathname === "/__fake/outbox") return send(res, 200, outbox);
    if (url.pathname === "/__fake/cron") {
      // equivale a UM minuto do pg_cron: roda o disparo (no horario "now", se informado) e faz o que o pg_net faria
      const now = body.now ?? new Date().toISOString();
      const count = (await db.query("select private.dispatch_reminders($1::timestamptz) n", [now])).rows[0].n;
      const calls = (await db.query("select id, url, body, headers from net.calls where not handled order by id")).rows;
      const results = [];
      for (const c of calls) {
        let status = null, text = "", err = null;
        try {
          const r = await fetch(c.url, { method: "POST", headers: c.headers, body: JSON.stringify(c.body) });
          status = r.status; text = await r.text();
        } catch (e) { err = String(e); }
        await db.query("insert into net._http_response (id, status_code, content, error_msg) values ($1, $2, $3, $4)", [c.id, status, text, err]);
        await db.query("update net.calls set handled = true where id = $1", [c.id]);
        results.push({ status, text });
      }
      return send(res, 200, { dispatched: count, results });
    }
    if (url.pathname.startsWith("/auth/v1/")) return await handleAuth(req, res, url, body);
    if (url.pathname.startsWith("/rest/v1/")) return await handleRest(req, res, url, body);
    return send(res, 404, { message: "não emulado: " + url.pathname });
  } catch (e) {
    const status = e.status ?? STATUS[e.code] ?? 400;
    console.error("[fake-supabase]", e.code ?? "", e.message);
    send(res, status, { code: e.code ?? "PGRST000", message: e.message, details: e.detail ?? null, hint: null });
  }
}).listen(PORT, () => console.log(`fake-supabase em http://localhost:${PORT} (confirmação de e-mail: ${CONFIRM ? "ligada" : "desligada"})`));
