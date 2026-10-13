// Testa as duas correções: erros do Gemini (cada status vira a mensagem certa, sem rede) e edição de horário/duração.
//   npm run test:fixes
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";

register("./ts-alias-loader.mjs", pathToFileURL(path.join(import.meta.dirname, "/")));
process.env.GEMINI_API_KEY = "teste";
const { geminiGenerate, AiError } = await import("@/lib/server/gemini");
const { applyTimeEdit } = await import("@/lib/time-edit");

let pass = 0, fail = 0;
const check = async (name, fn) => {
  try { await fn(); pass++; console.log(`  ok   ${name}`); }
  catch (e) { fail++; console.log(`  FALHOU ${name}\n         ${String(e.message).split("\n").join("\n         ")}`); }
};

// ---- Gemini: fetch falso
const realFetch = globalThis.fetch, realErr = console.error;
const queue = [];
let calls = 0;
globalThis.fetch = async () => { calls++; const r = queue.shift(); if (r instanceof Error) throw r; return r; };
console.error = () => {};
const ok = (obj) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }), { status: 200 });
const fail_ = (status, msg = "x") => new Response(JSON.stringify({ error: { status: "S", message: msg } }), { status });
const run = async (...responses) => { calls = 0; queue.length = 0; queue.push(...responses); try { return { v: await geminiGenerate({ system: "s", contents: [], schema: {} }) }; } catch (e) { return { e }; } };

console.log("Gemini");
await check("200 devolve o JSON", async () => { assert.deepEqual((await run(ok({ a: 1 }))).v, { a: 1 }); });
await check("503 uma vez e depois 200: tenta de novo e funciona", async () => { const r = await run(fail_(503), ok({ a: 1 })); assert.deepEqual(r.v, { a: 1 }); assert.equal(calls, 2); });
await check("500 uma vez e depois 200: também tenta de novo", async () => { const r = await run(fail_(500), ok({ a: 1 })); assert.deepEqual(r.v, { a: 1 }); });
await check("503 duas vezes: 'muita demanda' (não 'indisponível')", async () => { const r = await run(fail_(503), fail_(503)); assert.equal(r.e.status, 503); assert.match(r.e.message, /muita demanda/); });
await check("429: limite de uso, sem repetir", async () => { const r = await run(fail_(429)); assert.equal(r.e.status, 429); assert.match(r.e.message, /Limite/); assert.equal(calls, 1); });
await check("404: modelo indisponível", async () => { assert.match((await run(fail_(404))).e.message, /modelo/); });
await check("403: chave recusada", async () => { assert.match((await run(fail_(403))).e.message, /chave/); });
await check("400: pedido recusado (não culpa a chave)", async () => { const m = (await run(fail_(400))).e.message; assert.match(m, /pedido/); assert.doesNotMatch(m, /GEMINI_API_KEY/); });
await check("502 duas vezes: erro com o código, não a frase genérica", async () => { const m = (await run(fail_(502), fail_(502))).e.message; assert.match(m, /\(502\)/); assert.doesNotMatch(m, /indisponível agora/); });
await check("rede cai: 'não consegui falar'", async () => { const r = await run(new TypeError("fetch failed")); assert.match(r.e.message, /falar com a ori/); });
await check("timeout: 'demorou demais'", async () => { const r = await run(new DOMException("t", "TimeoutError")); assert.match(r.e.message, /demorou/); });
await check("resposta vazia / JSON ruim têm mensagens próprias", async () => {
  assert.match((await run(new Response(JSON.stringify({ candidates: [] }), { status: 200 }))).e.message, /não devolveu/);
  assert.match((await run(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{x" }] } }] }), { status: 200 }))).e.message, /ilegível/);
});
await check("todos são AiError (a rota mostra a mensagem certa)", async () => { assert.ok((await run(fail_(500), fail_(500))).e instanceof AiError); });
globalThis.fetch = realFetch; console.error = realErr;

// ---- Horário
console.log("Horário/duração");
const edit = (cur, f, v) => applyTimeEdit(cur, f, v);
await check("08:00–11:30 → fim 09:00", () => assert.deepEqual(edit({ time: "08:00", end: "11:30" }, "end", "09:00"), { patch: { time: "08:00", end: "09:00" } }));
await check("08:00–09:00 → fim 12:00 (aumentar)", () => assert.deepEqual(edit({ time: "08:00", end: "09:00" }, "end", "12:00").patch, { time: "08:00", end: "12:00" }));
await check("início 08:00 → 07:30 mantendo o fim", () => assert.deepEqual(edit({ time: "08:00", end: "09:00" }, "time", "07:30").patch, { time: "07:30", end: "09:00" }));
await check("só o fim muda; só o início muda", () => {
  assert.equal(edit({ time: "08:00", end: "09:00" }, "end", "09:30").patch.time, "08:00");
  assert.equal(edit({ time: "08:00", end: "09:00" }, "time", "08:30").patch.end, "09:00");
});
await check("início passa do fim: o fim acompanha mantendo a duração", () => assert.deepEqual(edit({ time: "08:00", end: "09:00" }, "time", "10:00").patch, { time: "10:00", end: "11:00" }));
await check("fim menor que o início: recusa com aviso e não grava", () => {
  assert.deepEqual(edit({ time: "08:00", end: "11:30" }, "end", "07:00"), { error: "O fim precisa ser depois do início." });
  assert.ok("error" in edit({ time: "08:00", end: "11:30" }, "end", "08:00"));
});
await check("evento de vários dias aceita fim 'menor' (termina em outro dia)", () => assert.ok(edit({ time: "20:00", end: "21:00", multiDay: true }, "end", "08:00").patch));
await check("valor parcial (campo vazio durante a digitação) não grava nada", () => {
  assert.equal(edit({ time: "08:00", end: "11:30" }, "end", "09:"), null);
  assert.equal(edit({ time: "08:00", end: "11:30" }, "time", "0"), null);
});
await check("valor igual ao salvo não grava de novo", () => assert.equal(edit({ time: "08:00", end: "09:00" }, "end", "09:00"), null));
await check("apagar o fim limpa só o fim; apagar o início limpa início e fim", () => {
  assert.deepEqual(edit({ time: "08:00", end: "09:00" }, "end", "").patch, { time: "08:00", end: undefined });
  assert.deepEqual(edit({ time: "08:00", end: "09:00" }, "time", "").patch, { time: undefined, end: undefined });
});
await check("sem início não dá para pôr fim", () => assert.equal(edit({}, "end", "10:00"), null));

console.log(`\n${pass} ok, ${fail} falhas`);
process.exit(fail ? 1 : 0);
