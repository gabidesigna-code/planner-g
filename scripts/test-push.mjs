// Testa a parte de notificações que não depende de rede nem de navegador: texto da Ori, validação dos endereços de
// push (anti-SSRF), envio com falhas, segredo da rota. Sem rede.
//   npm run test:push
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";

register("./ts-alias-loader.mjs", pathToFileURL(path.join(import.meta.dirname, "/")));
const { buildMessage, humanMinutes } = await import("@/lib/push/message");
const { isPushEndpoint } = await import("@/lib/push/endpoints");
const P = await import("@/lib/server/push");
const R = await import("@/lib/reminders");

let pass = 0, fail = 0;
const check = async (name, fn) => {
  try { await fn(); pass++; console.log(`  ok   ${name}`); }
  catch (e) { fail++; console.log(`  FALHOU ${name}\n         ${String(e.message).split("\n").join("\n         ")}`); }
};
const n = (o) => ({ tag: "id1", name: "Gabi", title: "Reunião da FCA", kind: "compromisso", minutes_before: 10, time: "14:00", ...o });

console.log("\nTexto das notificações (a Ori avisando)");
await check("compromisso 10 min antes (exemplo do pedido)", () => {
  assert.deepEqual(buildMessage(n()), { title: "Ori", body: "Gabi, seu compromisso “Reunião da FCA” começa em 10 minutos.", tag: "id1" });
});
await check("compromisso na hora, sem nome", () => {
  assert.equal(buildMessage(n({ name: "", title: "Consulta", minutes_before: 0 })).body, "Seu compromisso “Consulta” começa agora.");
});
await check("tarefa na hora com verbo no infinitivo: 'Hora de pagar cartão.'", () => {
  assert.equal(buildMessage(n({ kind: "tarefa", title: "Pagar cartão", minutes_before: 0, name: "" })).body, "Hora de pagar cartão.");
  assert.equal(buildMessage(n({ kind: "tarefa", title: "Pagar cartão", minutes_before: 0 })).body, "Gabi, hora de pagar cartão.");
});
await check("tarefa sem verbo no começo: 'Agora: “…”'", () => {
  assert.equal(buildMessage(n({ kind: "tarefa", title: "Fatura do cartão", minutes_before: 0, name: "" })).body, "Agora: “Fatura do cartão”.");
});
await check("tempos: 5 min, 30 min, 1 hora, 2 horas, 1 h 30", () => {
  assert.equal(humanMinutes(5), "5 minutos");
  assert.equal(humanMinutes(1), "1 minuto");
  assert.equal(humanMinutes(60), "1 hora");
  assert.equal(humanMinutes(120), "2 horas");
  assert.equal(humanMinutes(90), "1 h 30 min");
  assert.match(buildMessage(n({ kind: "tarefa", title: "Enviar ISS", minutes_before: 60 })).body, /^Gabi, “Enviar ISS” é em 1 hora\.$/);
});
await check("1 dia antes fala do horário ('amanhã às 14h')", () => {
  assert.equal(buildMessage(n({ minutes_before: 1440 })).body, "Gabi, amanhã às 14h: seu compromisso “Reunião da FCA”.");
  assert.equal(buildMessage(n({ kind: "tarefa", title: "Enviar DAS", minutes_before: 1440, time: "09:30", name: "" })).body, "Amanhã às 9h30: “Enviar DAS”.");
});
await check("evento usa 'evento'; título longo é cortado; corpo curto", () => {
  assert.match(buildMessage(n({ kind: "evento", title: "Treinamento" })).body, /seu evento “Treinamento”/);
  const long = buildMessage(n({ title: "x".repeat(200) })).body;
  assert.ok(long.length < 130 && long.includes("…"), long);
});
await check("lembretes por opção: nomes e valores batem com o pedido", () => {
  assert.deepEqual(R.REMINDER_OPTIONS.map((o) => o.minutes), [null, 0, 5, 10, 15, 30, 60, 120, 1440]);
  assert.deepEqual(R.REMINDER_OPTIONS.map((o) => o.label), ["Sem lembrete", "Na hora", "5 min antes", "10 min antes", "15 min antes", "30 min antes", "1 hora antes", "2 horas antes", "1 dia antes"]);
  assert.equal(R.reminderLabel(10), "10 min antes");
  assert.equal(R.reminderLabel(null), "");
});

console.log("\nEndereços de push (só serviços dos navegadores)");
await check("aceita Chrome/Android, Firefox, Safari/iOS e Edge/Windows", () => {
  for (const u of ["https://fcm.googleapis.com/fcm/send/abc", "https://updates.push.services.mozilla.com/wpush/v2/abc", "https://web.push.apple.com/QAbc", "https://wns2-par02p.notify.windows.com/w/?token=abc"]) assert.equal(isPushEndpoint(u), true, u);
});
await check("recusa tudo que possa fazer o servidor chamar outro lugar (SSRF)", () => {
  for (const u of ["http://fcm.googleapis.com/x", "https://localhost/x", "https://127.0.0.1/x", "https://169.254.169.254/latest/meta-data", "https://fcm.googleapis.com.evil.com/x", "https://evil.com/fcm.googleapis.com", "https://user:pw@fcm.googleapis.com/x", "https://fcm.googleapis.com:8443/x", "ftp://fcm.googleapis.com/x", "not a url", "", null, 42]) assert.equal(isPushEndpoint(u), false, String(u));
});

console.log("\nEnvio");
const subs = (...eps) => eps.map((endpoint) => ({ endpoint, p256dh: "p", auth: "a" }));
const FCM = (id) => `https://fcm.googleapis.com/fcm/send/${id}`;
await check("envia a cada aparelho com o texto da Ori; conta os envios", async () => {
  const sent = [];
  const r = await P.sendAll({ notifications: [{ ...n(), subscriptions: subs(FCM("a"), FCM("b")) }] }, async (s, payload) => { sent.push([s.endpoint, JSON.parse(payload)]); });
  assert.deepEqual({ sent: r.sent, failed: r.failed, gone: r.gone }, { sent: 2, failed: 0, gone: [] });
  assert.equal(sent.length, 2);
  assert.deepEqual(sent[0][1], { title: "Ori", body: "Gabi, seu compromisso “Reunião da FCA” começa em 10 minutos.", tag: "id1", url: "/" });
});
await check("aparelho que não existe mais (404/410) vai para 'gone'; erro comum só conta como falha", async () => {
  const r = await P.sendAll({ notifications: [{ ...n(), subscriptions: subs(FCM("ok"), FCM("gone410"), FCM("gone404"), FCM("erro500")) }] }, async (s) => {
    if (s.endpoint.endsWith("gone410")) throw Object.assign(new Error("gone"), { statusCode: 410 });
    if (s.endpoint.endsWith("gone404")) throw Object.assign(new Error("nf"), { statusCode: 404 });
    if (s.endpoint.endsWith("erro500")) throw Object.assign(new Error("boom"), { statusCode: 500 });
  });
  assert.equal(r.sent, 1);
  assert.equal(r.failed, 3);
  assert.deepEqual(r.gone.sort(), [FCM("gone404"), FCM("gone410")]);
});
await check("endereço fora da lista NUNCA é chamado", async () => {
  let called = 0;
  const r = await P.sendAll({ notifications: [{ ...n(), subscriptions: subs("https://evil.example/x", "http://169.254.169.254/x", FCM("ok")) }] }, async () => { called++; });
  assert.equal(called, 1);
  assert.equal(r.failed, 2);
});
await check("muitos avisos: todos são enviados, em lotes", async () => {
  const notifications = Array.from({ length: 40 }, (_, i) => ({ ...n({ tag: `t${i}` }), subscriptions: subs(FCM(`d${i}`)) }));
  let inflight = 0, peak = 0, total = 0;
  const r = await P.sendAll({ notifications }, async () => { inflight++; peak = Math.max(peak, inflight); await new Promise((ok) => setTimeout(ok, 5)); inflight--; total++; });
  assert.equal(r.sent, 40);
  assert.equal(total, 40);
  assert.ok(peak <= 10, `no máximo 10 ao mesmo tempo (foi ${peak})`);
});
await check("sendRaw (teste) envia a mensagem pronta e identifica aparelhos sumidos", async () => {
  const r = await P.sendRaw(subs(FCM("a"), FCM("gone")), { title: "Ori", body: "Tudo certo.", tag: "teste" }, async (s) => { if (s.endpoint.endsWith("gone")) throw Object.assign(new Error("g"), { statusCode: 410 }); });
  assert.deepEqual({ sent: r.sent, failed: r.failed, gone: r.gone }, { sent: 1, failed: 1, gone: [FCM("gone")] });
});

console.log("\nValidação do pedido e segredo");
await check("o pedido do banco é validado (campos, limites, horário)", () => {
  const ok = { notifications: [{ ...n(), subscriptions: subs(FCM("a")) }] };
  assert.equal(P.sendRequestSchema.safeParse(ok).success, true);
  assert.equal(P.sendRequestSchema.safeParse({ notifications: [{ ...ok.notifications[0], minutes_before: -1 }] }).success, false);
  assert.equal(P.sendRequestSchema.safeParse({ notifications: [{ ...ok.notifications[0], time: "25:99" }] }).success, false);
  assert.equal(P.sendRequestSchema.safeParse({ notifications: Array(101).fill(ok.notifications[0]) }).success, false);
  assert.equal(P.sendRequestSchema.safeParse({}).success, false);
});
await check("segredo da rota: sem configuração, curto ou errado = recusa; certo (com ou sem Bearer) = aceita", () => {
  delete process.env.PUSH_CRON_SECRET;
  assert.equal(P.secretMatches("Bearer qualquer-coisa-longa-123456"), false, "sem segredo configurado");
  process.env.PUSH_CRON_SECRET = "curto";
  assert.equal(P.secretMatches("Bearer curto"), false, "segredo curto demais");
  process.env.PUSH_CRON_SECRET = "segredo-bem-longo-0123456789";
  assert.equal(P.secretMatches(null), false);
  assert.equal(P.secretMatches("Bearer errado-errado-errado-1"), false);
  assert.equal(P.secretMatches("Bearer segredo-bem-longo-0123456789"), true);
  assert.equal(P.secretMatches("segredo-bem-longo-0123456789"), true);
});

console.log(`\n${pass} ok, ${fail} falharam.`);
process.exit(fail ? 1 : 0);
