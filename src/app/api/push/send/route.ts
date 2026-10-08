import { createClient } from "@supabase/supabase-js";
import { json, readJson } from "@/lib/server/api";
import { realSend, secretMatches, sendAll, sendRequestSchema, vapidConfigured } from "@/lib/server/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Entrega os lembretes que o BANCO decidiu enviar (private.dispatch_reminders, agendado a cada minuto pelo pg_cron).
 * Protegida por um segredo compartilhado (PUSH_CRON_SECRET): sem ele, ninguém consegue acionar. Esta rota não
 * acessa a agenda de ninguém: recebe prontos o nome, o título, o horário e os aparelhos, e só monta o texto e entrega.
 */
export async function POST(request: Request) {
  if (!secretMatches(request.headers.get("authorization"))) return json({ error: "forbidden" }, 401);
  if (!vapidConfigured()) return json({ error: "push_not_configured" }, 503);

  const parsed = sendRequestSchema.safeParse(await readJson(request).catch(() => null));
  if (!parsed.success) return json({ error: "invalid_body" }, 400);

  const result = await sendAll(parsed.data, realSend());

  // aparelhos que não existem mais: o banco apaga (chamada protegida pelo mesmo segredo)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (result.gone.length && url && anon) {
    const db = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    await db.rpc("prune_push_subscriptions", { p_secret: process.env.PUSH_CRON_SECRET, p_endpoints: result.gone }).then(() => void 0, () => void 0);
  }
  return json({ sent: result.sent, failed: result.failed, gone: result.gone.length });
}
