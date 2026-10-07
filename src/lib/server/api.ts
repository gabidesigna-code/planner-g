import "server-only";
import { requireAccess } from "./access";
import { ConfigError } from "./supabase-admin";
import { ValidationError } from "@/lib/task-dto";

export class NotFoundError extends Error {}

const NO_STORE = { "cache-control": "no-store" };
const MAX_BODY = 256 * 1024;

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
 * Envolve um handler de rota: aplica a proteção de acesso, converte o retorno em JSON
 * e traduz erros (sem vazar detalhes internos para o navegador).
 */
export function route<Ctx = unknown>(handler: (request: Request, ctx: Ctx) => Promise<Response | object>) {
  return async (request: Request, ctx: Ctx): Promise<Response> => {
    try {
      const denied = requireAccess(request);
      if (denied) return denied;
      const out = await handler(request, ctx);
      return out instanceof Response ? out : json(out);
    } catch (e) {
      if (e instanceof ValidationError) return json({ error: e.message }, 400);
      if (e instanceof NotFoundError) return json({ error: e.message }, 404);
      if (e instanceof ConfigError) return json({ error: "db_not_configured" }, 503);
      console.error("[api]", request.method, new URL(request.url).pathname, e);
      return json({ error: "Erro interno." }, 500);
    }
  };
}
