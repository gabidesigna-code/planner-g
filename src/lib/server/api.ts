import "server-only";
import { requireAccess } from "./access";
import { ConfigError, getAuth, type Auth } from "./supabase";
import { ValidationError } from "@/lib/task-dto";

export class NotFoundError extends Error {}
export class ConflictError extends Error {}

const NO_STORE = { "cache-control": "no-store" };
const MAX_BODY = 512 * 1024;

export const json = (data: unknown, status = 200) => Response.json(data, { status, headers: NO_STORE });

/** Lê o corpo JSON com limite de tamanho. */
export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > MAX_BODY) throw new ValidationError("Corpo grande demais.");
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new ValidationError("JSON inválido.");
  }
}

/**
 * Envolve um handler de rota PROTEGIDO: confere a origem (escritas), identifica a pessoa pela sessão
 * (cookie verificado no Supabase Auth; sem sessão = 401) e entrega `{ db, userId }`. O `db` já fala com o banco
 * COMO ESSA PESSOA, então o RLS vale. O dono de qualquer registro é sempre `userId`: nenhuma rota aceita
 * `user_id` vindo do navegador.
 */
export function authed<Ctx = unknown>(handler: (request: Request, auth: Auth, ctx: Ctx) => Promise<Response | object>) {
  return async (request: Request, ctx: Ctx): Promise<Response> => {
    try {
      const denied = requireAccess(request);
      if (denied) return denied;
      const auth = await getAuth();
      if (!auth) return json({ error: "auth" }, 401);
      const out = await handler(request, auth, ctx);
      return out instanceof Response ? out : json(out);
    } catch (e) {
      if (e instanceof ValidationError) return json({ error: e.message }, 400);
      if (e instanceof NotFoundError) return json({ error: e.message }, 404);
      if (e instanceof ConflictError) return json({ error: e.message }, 409);
      if (e instanceof ConfigError) return json({ error: "db_not_configured" }, 503);
      console.error("[api]", request.method, new URL(request.url).pathname, e);
      return json({ error: "Erro interno." }, 500);
    }
  };
}
