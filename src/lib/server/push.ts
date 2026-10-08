import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import webpush from "web-push";
import { z } from "zod";
import { isPushEndpoint } from "@/lib/push/endpoints";
import { buildMessage } from "@/lib/push/message";

/**
 * Envio de Web Push. Roda SÓ no servidor: a chave privada (VAPID_PRIVATE_KEY) nunca vai ao navegador.
 * Quem decide QUEM avisar e QUANDO é o banco (private.dispatch_reminders); aqui só se monta o texto da Ori e se
 * entrega para os serviços de push. Esta rota não lê nem grava nada na agenda.
 */

export interface Subscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Pedido do banco: uma lista de avisos, cada um com os aparelhos da conta dona do item. */
export const sendRequestSchema = z.object({
  notifications: z
    .array(
      z.object({
        tag: z.string().min(1).max(100),
        name: z.string().max(80),
        title: z.string().max(300),
        kind: z.string().max(20),
        minutes_before: z.number().int().min(0).max(10_080),
        time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d/),
        subscriptions: z
          .array(z.object({ endpoint: z.string().max(2048), p256dh: z.string().max(256), auth: z.string().max(128) }))
          .max(20),
      }),
    )
    .max(100),
});
export type SendRequest = z.infer<typeof sendRequestSchema>;

export interface SendResult {
  sent: number;
  failed: number;
  /** aparelhos que não existem mais (404/410): o banco os apaga */
  gone: string[];
}

export type SendFn = (sub: Subscription, payload: string) => Promise<unknown>;

export const vapidConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);

/** Entrega real (biblioteca web-push, criptografia e VAPID). */
export function realSend(): SendFn {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  return (sub, payload) =>
    webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, {
      TTL: 1800, // se o aparelho estiver desligado, o aviso vale por 30 min e depois é descartado
      urgency: "high",
    });
}

/** Monta o texto da ori e envia a cada aparelho. Nunca lança: devolve o que deu certo, o que falhou e o que sumiu. */
export async function sendAll(req: SendRequest, send: SendFn): Promise<SendResult> {
  const result: SendResult = { sent: 0, failed: 0, gone: [] };
  const jobs: { sub: Subscription; payload: string }[] = [];
  for (const n of req.notifications) {
    const msg = buildMessage(n);
    const payload = JSON.stringify({ title: msg.title, body: msg.body, tag: msg.tag, url: "/" });
    for (const sub of n.subscriptions) {
      if (!isPushEndpoint(sub.endpoint)) { result.failed++; continue; } // nunca chama endereço que não seja de serviço de push
      jobs.push({ sub, payload });
    }
  }
  for (let i = 0; i < jobs.length; i += 10) {
    const settled = await Promise.allSettled(jobs.slice(i, i + 10).map((j) => send(j.sub, j.payload)));
    settled.forEach((s, k) => {
      if (s.status === "fulfilled") return void result.sent++;
      result.failed++;
      const status = (s.reason as { statusCode?: number } | undefined)?.statusCode;
      if (status === 404 || status === 410) result.gone.push(jobs[i + k].sub.endpoint);
    });
  }
  return result;
}

/** Envia uma mensagem já pronta (usado pelo botão "Enviar teste" em Você). */
export async function sendRaw(subs: Subscription[], msg: { title: string; body: string; tag: string }, send: SendFn): Promise<SendResult> {
  const result: SendResult = { sent: 0, failed: 0, gone: [] };
  const payload = JSON.stringify({ ...msg, url: "/" });
  const valid = subs.filter((x) => isPushEndpoint(x.endpoint));
  const settled = await Promise.allSettled(valid.map((x) => send(x, payload)));
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") return void result.sent++;
    result.failed++;
    const status = (r.reason as { statusCode?: number } | undefined)?.statusCode;
    if (status === 404 || status === 410) result.gone.push(valid[i].endpoint);
  });
  return result;
}

/** Compara o segredo enviado pelo banco com o configurado, sem vazar informação pelo tempo de resposta. */
export function secretMatches(header: string | null): boolean {
  const expected = process.env.PUSH_CRON_SECRET;
  if (!expected || expected.length < 16 || !header) return false;
  const given = header.replace(/^Bearer\s+/i, "");
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

