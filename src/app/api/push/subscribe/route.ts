import { z } from "zod";
import { authed, json, readJson } from "@/lib/server/api";
import { isPushEndpoint } from "@/lib/push/endpoints";
import { ValidationError } from "@/lib/task-dto";

export const dynamic = "force-dynamic";

const subscribeSchema = z.object({
  endpoint: z.string().max(2048),
  keys: z.object({ p256dh: z.string().min(10).max(256), auth: z.string().min(8).max(128) }),
  deviceName: z.string().trim().max(80).optional(),
});

/**
 * Registra este aparelho para a conta LOGADA (a conta vem da sessão, nunca do corpo). Se o navegador já estava ligado a
 * outra conta, passa para esta. Só aceita endereços de serviços de push dos navegadores.
 */
export const POST = authed(async (request, { db }) => {
  const body = subscribeSchema.safeParse(await readJson(request));
  if (!body.success || !isPushEndpoint(body.data.endpoint)) throw new ValidationError("Inscrição de notificação inválida.");
  const { endpoint, keys, deviceName } = body.data;
  const { error } = await db.rpc("register_push_subscription", { p_endpoint: endpoint, p_p256dh: keys.p256dh, p_auth: keys.auth, p_device: deviceName ?? null });
  if (error) throw new Error(error.message);
  return json({ ok: true });
});

/** Remove a inscrição deste aparelho (ao sair da conta ou desativar). Só apaga se for da conta logada (RLS). */
export const DELETE = authed(async (request, { db }) => {
  const body = z.object({ endpoint: z.string().max(2048) }).safeParse(await readJson(request));
  if (!body.success) throw new ValidationError("Endereço inválido.");
  const { error } = await db.from("push_subscriptions").delete().eq("endpoint", body.data.endpoint);
  if (error) throw new Error(error.message);
  return json({ ok: true });
});
