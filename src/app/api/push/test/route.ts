import { authed, json } from "@/lib/server/api";
import { realSend, sendRaw, vapidConfigured, type Subscription } from "@/lib/server/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** "Enviar teste": manda uma notificação de exemplo só para os aparelhos da conta logada. */
export const POST = authed(async (_request, { db, userId }) => {
  if (!vapidConfigured()) return json({ error: "As notificações ainda não estão configuradas no servidor." }, 503);
  const [{ data: subs, error }, { data: profile }] = await Promise.all([
    db.from("push_subscriptions").select("endpoint,p256dh,auth").eq("user_id", userId),
    db.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
  ]);
  if (error) throw new Error(error.message);
  if (!subs?.length) return json({ error: "Nenhum aparelho ativado nesta conta ainda." }, 409);
  const name = (profile?.display_name as string | undefined)?.trim();
  const result = await sendRaw(subs as Subscription[], { title: "Ori", body: `${name ? `${name}, tudo` : "Tudo"} certo: é assim que eu vou te avisar.`, tag: "teste" }, realSend());
  return json({ sent: result.sent, failed: result.failed });
});
