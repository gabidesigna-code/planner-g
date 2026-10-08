// Testa as ações da ori sobre itens existentes (editar, concluir, reabrir, reagendar, apagar).
//   npm run test:ori           → parte determinística (sem rede): validação Zod, resolução do item, antes/depois, lote
//   npm run test:ori -- --live → além disso, conversa de verdade com o Gemini (usa GEMINI_API_KEY do .env.local)
// Usa uma agenda SINTÉTICA: não lê nem grava nada no Supabase.
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";
import assert from "node:assert/strict";

register("./ts-alias-loader.mjs", pathToFileURL(path.join(import.meta.dirname, "/")));
const envFile = path.join(import.meta.dirname, "..", ".env.local");
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const { addDaysIso, oriActionSchema, applyAction, sameGuarded } = await import("@/lib/ai/actions");
const { buildChangeProposal, buildChoices, resolveRef, taskRef } = await import("@/lib/server/ori-actions");
const { chatWithOri } = await import("@/lib/server/ori-chat");
const { todayInSaoPaulo } = await import("@/lib/server/gemini");
const { toTurns } = await import("@/lib/ai/chat-turns");

const LIVE = process.argv.includes("--live");
const T = todayInSaoPaulo();
const iso = (d) => d.toISOString().slice(0, 10);
const today = iso(T);
const plus = (n) => addDaysIso(today, n);

const categories = [
  { name: "Fiscal", context: "trabalho" }, { name: "Financeiro", context: "trabalho" }, { name: "Reuniões", context: "trabalho" },
  { name: "Casa", context: "pessoal" }, { name: "Compras", context: "pessoal" }, { name: "Saúde", context: "pessoal" }, { name: "Finanças", context: "pessoal" },
];

const mk = (o) => ({ id: crypto.randomUUID(), kind: "tarefa", context: "trabalho", category: "Outros", priority: "normal", status: "a-fazer", due: today, ...o });
const nextDay = (dom) => { // próximo dia `dom` do mês (como "dia 21")
  const [y, m, d] = today.split("-").map(Number);
  const mm = d <= dom ? m : m + 1;
  return `${new Date(Date.UTC(y, mm - 1, 1)).getUTCFullYear()}-${String(((mm - 1) % 12) + 1).padStart(2, "0")}-${String(dom).padStart(2, "0")}`;
};

const buildAgenda = () => [
  mk({ title: "Reunião FCA", kind: "compromisso", client: "FCA", category: "Reuniões", due: plus(1), time: "14:00", end: "15:00" }),
  mk({ title: "Reunião Confian", kind: "compromisso", client: "Confian", category: "Reuniões", due: plus(1), time: "10:00", end: "11:00" }),
  mk({ title: "Reunião Confian", kind: "compromisso", client: "Confian", category: "Reuniões", due: plus(2), time: "15:00", end: "16:00" }),
  mk({ title: "Pagar cartão", context: "pessoal", category: "Finanças", due: nextDay(20) }),
  mk({ title: "Enviar ISS Transmartins", client: "Transmartins", category: "Fiscal", due: today }),
  mk({ title: "Comprar ração", context: "pessoal", category: "Compras", due: plus(3) }),
  mk({ title: "Conciliação FCA", client: "FCA", category: "Financeiro", due: plus(2) }),
  mk({ title: "Ligar para o contador da Delta", client: "Delta", category: "Fiscal", due: plus(-1), status: "concluido", doneAt: new Date().toISOString() }),
  mk({ title: "Enviar DAS Alfa", client: "Alfa", category: "Fiscal", due: plus(-3) }),
  mk({ title: "Revisar folha Beta", client: "Beta", category: "Financeiro", due: plus(-2) }),
  mk({ title: "Marcar dentista", context: "pessoal", category: "Saúde", due: plus(-1) }),
];

let pass = 0, fail = 0;
const check = (name, fn) => Promise.resolve().then(fn).then(
  () => { pass++; console.log(`  ok   ${name}`); },
  (e) => { fail++; console.log(`  FALHOU ${name}\n         ${String(e.message).split("\n").join("\n         ")}`); },
);

// ------------------------------------------------------------------ determinístico
console.log("\nParte determinística (sem rede)");
{
  const tasks = buildAgenda();
  const byTitle = (t, i = 0) => tasks.filter((x) => x.title === t)[i];
  const build = (actions, userText = "", pick) => buildChangeProposal(actions, tasks, categories, today, { userText, pick });

  await check("update de horário mantém a duração e mostra antes/depois", () => {
    const fca = byTitle("Reunião FCA");
    const { proposal } = build([{ action: "update", entityId: taskRef(fca.id), changes: { time: "15:00" } }]);
    const e = proposal.entries[0];
    assert.equal(e.before.time, "14:00");
    assert.equal(e.after.time, "15:00");
    assert.equal(e.after.end, "16:00");
    assert.equal(e.action.entityType, "appointment");
    assert.equal(proposal.destructive, false);
  });

  await check("referência inventada / id inexistente é descartada (nunca vira alteração)", () => {
    const r = build([{ action: "delete", entityId: "deadbeef" }, { action: "complete", entityId: "zzzz" }]);
    assert.equal(r.proposal, null);
    assert.equal(r.invalid, 2);
  });

  await check("reschedule aceita o id inteiro e a referência curta", () => {
    const p = byTitle("Pagar cartão");
    const a = build([{ action: "reschedule", entityId: p.id, changes: { date: plus(5) } }]).proposal.entries[0];
    const b = build([{ action: "reschedule", entityId: taskRef(p.id), changes: { date: plus(5) } }]).proposal.entries[0];
    assert.equal(a.after.due, plus(5));
    assert.deepEqual(a.action, b.action);
  });

  await check("campo inválido do modelo (data impossível, prioridade inventada) derruba a ação", () => {
    const p = byTitle("Pagar cartão");
    const r = build([
      { action: "update", entityId: p.id, changes: { date: "2026-02-31" } },
      { action: "update", entityId: p.id, changes: { priority: "máxima" } },
      { action: "update", entityId: p.id, changes: { campoNovo: "x" } },
    ]);
    assert.equal(r.proposal, null);
    assert.equal(r.invalid, 3);
  });

  await check("update sem nenhuma mudança é descartado", () => {
    const p = byTitle("Pagar cartão");
    assert.equal(build([{ action: "update", entityId: p.id, changes: { title: null, date: null } }]).proposal, null);
  });

  await check("complete / reopen no estado errado viram 'sem mudança', não ação", () => {
    const concl = tasks.find((t) => t.status === "concluido");
    const r = build([{ action: "complete", entityId: taskRef(concl.id) }, { action: "reopen", entityId: taskRef(byTitle("Comprar ração").id) }]);
    assert.equal(r.proposal.entries.length, 0);
    assert.equal(r.proposal.skipped.length, 2);
  });

  await check("reopen de item concluído propõe voltar para 'a-fazer'", () => {
    const concl = tasks.find((t) => t.status === "concluido");
    const e = build([{ action: "reopen", entityId: taskRef(concl.id) }]).proposal.entries[0];
    assert.equal(e.after.status, "a-fazer");
    assert.equal(e.before.status, "concluido");
  });

  await check("delete: destrutivo, mostra o item exato e after = null", () => {
    const p = byTitle("Comprar ração");
    const { proposal } = build([{ action: "delete", entityId: taskRef(p.id) }]);
    assert.equal(proposal.destructive, true);
    assert.equal(proposal.entries[0].before.id, p.id);
    assert.equal(proposal.entries[0].after, null);
  });

  await check("delete com 'changes' é rejeitado pelo schema (sem carona)", () => {
    const p = byTitle("Comprar ração");
    const bad = oriActionSchema.safeParse({ action: "delete", entityType: "task", entityId: p.id, changes: { title: "x" } });
    assert.equal(bad.success, false);
    const ok = oriActionSchema.safeParse({ action: "reschedule", entityType: "task", entityId: p.id, changes: { title: "x" } });
    assert.equal(ok.success, false, "reschedule só muda data/horário");
  });

  await check("seletor 'overdue' pega SÓ tarefas/lembretes em aberto atrasados, na agenda inteira", () => {
    const r = build([{ action: "reschedule", selector: { scope: "overdue" }, changes: { date: plus(1) } }]);
    assert.deepEqual(r.proposal.entries.map((e) => e.before.title).sort(), ["Enviar DAS Alfa", "Marcar dentista", "Revisar folha Beta"]);
    assert.ok(r.proposal.entries.every((e) => e.after.due === plus(1)));
    assert.equal(r.proposal.destructive, false);
  });

  await check("'apaga todas as tarefas' vira lista destrutiva (nada é executado no servidor)", () => {
    const r = build([{ action: "delete", selector: { scope: "all", kind: "tarefa" } }]);
    assert.equal(r.proposal.destructive, true);
    assert.equal(r.proposal.entries.length, tasks.filter((t) => t.kind === "tarefa").length);
  });

  await check("mudar contexto reajusta categoria/cliente (categorias são por contexto)", () => {
    const iss = byTitle("Enviar ISS Transmartins");
    const e = build([{ action: "update", entityId: iss.id, changes: { context: "pessoal" } }]).proposal.entries[0];
    assert.equal(e.after.context, "pessoal");
    assert.equal(e.after.category, "Outros");
    assert.equal(e.after.client, undefined);
  });

  await check("categoria inexistente não é aplicada (e é avisada)", () => {
    const iss = byTitle("Enviar ISS Transmartins");
    const { after, ignored } = applyAction(iss, { action: "update", entityType: "task", entityId: iss.id, changes: { category: "Inventada", priority: "alta" } }, { categories });
    assert.equal(after.category, "Fiscal");
    assert.equal(after.priority, "alta");
    assert.equal(ignored.length, 1);
  });

  await check("tirar o horário remove também o fim; observação é acrescentada, não substituída", () => {
    const fca = { ...byTitle("Reunião FCA"), note: "Levar balanço" };
    const { after } = applyAction(fca, { action: "update", entityType: "appointment", entityId: fca.id, changes: { time: null, appendNote: "Sala 2" } }, { categories });
    assert.equal(after.time, undefined);
    assert.equal(after.end, undefined);
    assert.equal(after.note, "Levar balanço\nSala 2");
  });

  await check("mover compromisso de vários dias desloca o fim junto", () => {
    const ev = mk({ kind: "evento", title: "Treinamento", due: plus(2), endDate: plus(4) });
    const { after } = applyAction(ev, { action: "reschedule", entityType: "event", entityId: ev.id, changes: { date: plus(5) } }, { categories });
    assert.equal(after.due, plus(5));
    assert.equal(after.endDate, plus(7));
  });

  await check("dois pedidos para o mesmo item: só o primeiro entra", () => {
    const p = byTitle("Comprar ração");
    const r = build([{ action: "complete", entityId: taskRef(p.id) }, { action: "delete", entityId: taskRef(p.id) }]);
    assert.equal(r.proposal.entries.length, 1);
    assert.equal(r.proposal.skipped.length, 1);
  });

  await check("item que mudou depois da prévia não passa na conferência de execução", () => {
    const fca = byTitle("Reunião FCA");
    const e = build([{ action: "update", entityId: fca.id, changes: { time: "15:00" } }]).proposal.entries[0];
    assert.equal(sameGuarded(fca, e.before), true);
    assert.equal(sameGuarded({ ...fca, time: "09:00" }, e.before), false);
  });

  await check("itens com título igual aparecem como 'parecidos' para conferência", () => {
    const c1 = byTitle("Reunião Confian", 0);
    const e = build([{ action: "update", entityId: c1.id, changes: { time: "16:00" } }], "muda a reunião da Confian de amanhã pra 16h").proposal.entries[0];
    assert.equal(e.similar.length, 1);
    assert.notEqual(e.similar[0].id, c1.id);
  });

  await check("TRAVA: dois itens parecidos e a frase não diz qual → pergunta (não adivinha)", () => {
    const [a, b] = [byTitle("Reunião Confian", 0), byTitle("Reunião Confian", 1)]; // amanhã 10h e depois de amanhã 15h
    const act = (t, time = "16:00") => [{ action: "reschedule", entityId: taskRef(t.id), changes: { time } }];
    for (const t of [a, b]) {
      const r = build(act(t), "muda a reunião da Confian pra 16h");
      assert.equal(r.proposal, null, "não podia propor");
      assert.equal(r.ambiguous.candidates.length, 2);
    }
  });

  await check("TRAVA: a frase aponta o dia / o horário / o dia da semana → segue com o item certo", () => {
    const [a, b] = [byTitle("Reunião Confian", 0), byTitle("Reunião Confian", 1)];
    const act = (t, time = "16:00") => [{ action: "reschedule", entityId: taskRef(t.id), changes: { time } }];
    assert.equal(build(act(a), "muda a reunião da Confian de amanhã pra 16h").proposal.entries[0].before.id, a.id);
    assert.equal(build(act(b), "muda a reunião da Confian de depois de amanhã pra 16h").proposal.entries[0].before.id, b.id);
    assert.equal(build(act(b), "muda a das 15h pra 16h").proposal.entries[0].before.id, b.id);
    assert.equal(build(act(a), "muda a das 10h pra 16h").proposal.entries[0].before.id, a.id);
    const dia = Number(b.due.slice(8)); // pelo número do dia
    assert.equal(build(act(b), `muda a reunião da Confian do dia ${dia} pra 16h`).proposal.entries[0].before.id, b.id);
  });

  await check("TRAVA: se o modelo escolheu o item errado para a frase, não passa", () => {
    const [a, b] = [byTitle("Reunião Confian", 0), byTitle("Reunião Confian", 1)];
    const act = (t, time = "16:00") => [{ action: "reschedule", entityId: taskRef(t.id), changes: { time } }];
    assert.ok(build(act(b), "muda a das 10h pra 16h").ambiguous, "frase fala das 10h, o modelo escolheu a das 15h");
    assert.ok(build(act(a), "muda a de depois de amanhã pra 16h").ambiguous);
  });

  await check("TRAVA: o NOVO horário pedido não conta como apontar o item (pra 15h ≠ a das 15h)", () => {
    const [a, b] = [byTitle("Reunião Confian", 0), byTitle("Reunião Confian", 1)];
    const r = build([{ action: "reschedule", entityId: taskRef(b.id), changes: { time: "15:00", date: a.due } }], "muda a reunião da Confian pra 15h");
    assert.ok(r.ambiguous, "15h é o destino, não identifica a reunião das 15h");
  });

  await check("TRAVA: tocar num dos botões ('qual deles?') resolve, mesmo se o modelo escolheu o outro", () => {
    const [a, b] = [byTitle("Reunião Confian", 0), byTitle("Reunião Confian", 1)];
    const r = build([{ action: "reschedule", entityId: taskRef(a.id), changes: { time: "16:00" } }], "Reunião Confian — sex 15:00", taskRef(b.id));
    assert.equal(r.proposal.entries[0].before.id, b.id);
  });

  await check("TRAVA: lote (selector) e item sem parecido não são afetados", () => {
    assert.ok(build([{ action: "reschedule", selector: { scope: "overdue" }, changes: { date: plus(1) } }]).proposal);
    assert.ok(build([{ action: "delete", entityId: taskRef(byTitle("Comprar ração").id) }], "apaga comprar ração").proposal);
  });

  await check("choices: só vale com 2+ itens reais; ids falsos são ignorados", () => {
    const [a, b] = [byTitle("Reunião Confian", 0), byTitle("Reunião Confian", 1)];
    assert.equal(buildChoices([taskRef(a.id), taskRef(b.id)], tasks).length, 2);
    assert.equal(buildChoices([taskRef(a.id), "00000000"], tasks).length, 0);
    assert.equal(resolveRef("a", tasks), null);
  });

  await check("lote acima de 100 é cortado em 100 e avisado", () => {
    const many = Array.from({ length: 130 }, (_, i) => mk({ title: `Tarefa ${i}`, due: plus(-5) }));
    const r = buildChangeProposal([{ action: "reschedule", selector: { scope: "overdue" }, changes: { date: plus(1) } }], many, categories, today);
    assert.equal(r.proposal.entries.length, 100);
    assert.equal(r.proposal.truncated, true);
  });
}

// ------------------------------------------------------------------ ao vivo (Gemini)
if (!LIVE) {
  console.log(`\n${pass} ok, ${fail} falharam. (Use --live para testar a conversa com o Gemini.)`);
  process.exit(fail ? 1 : 0);
}

console.log("\nParte ao vivo (Gemini real, agenda sintética)");
if (!process.env.GEMINI_API_KEY) { console.log("  sem GEMINI_API_KEY no .env.local"); process.exit(1); }

const ctxFor = (tasks) => ({ ownerName: "Gabriela", categories, tasks });
/** Uma conversa: igual ao navegador, a ori recebe `toTurns` (com as notas de memória) e a agenda atual. */
function chat(tasks) {
  const messages = [];
  const state = { tasks, messages };
  state.say = async (text, pick) => {
    await new Promise((r) => setTimeout(r, 4500)); // respeita o limite por minuto do Gemini
    messages.push({ id: crypto.randomUUID(), role: "user", text, at: Date.now(), ...(pick ? { pick } : {}) });
    const res = await chatWithOri(toTurns(messages), ctxFor(state.tasks));
    messages.push({
      id: crypto.randomUUID(), role: "ori", text: res.reply, at: Date.now(),
      ...(res.changes ? { changes: res.changes, changeStatus: "pending" } : {}),
      ...(res.choices ? { choices: res.choices } : {}),
    });
    console.log(`     > "${text}"\n     ori: ${res.reply.replace(/\n/g, " ")}`);
    if (res.changes) for (const e of res.changes.entries.slice(0, 4)) console.log(`       [${e.action.action}] ${e.before.title} ${e.before.due} ${e.before.time ?? ""} → ${e.after ? `${e.after.due} ${e.after.time ?? ""} ${e.after.status} ${e.after.priority}` : "(excluir)"}`);
    if (res.changes && res.changes.entries.length > 4) console.log(`       … +${res.changes.entries.length - 4}`);
    if (res.choices) console.log(`       escolhas: ${res.choices.map((c) => `${c.title} ${c.due} ${c.time ?? ""}`).join(" | ")}`);
    return res;
  };
  /** Simula o "Confirmar" da tela: aplica o `after` na agenda e marca a proposta como executada. */
  state.confirm = () => {
    const m = [...messages].reverse().find((x) => x.changes);
    for (const e of m.changes.entries) {
      state.tasks = e.after ? state.tasks.map((t) => (t.id === e.before.id ? e.after : t)) : state.tasks.filter((t) => t.id !== e.before.id);
      if (e.action.action === "complete") state.tasks = state.tasks.map((t) => (t.id === e.before.id ? { ...t, doneAt: new Date().toISOString() } : t));
    }
    m.changeStatus = "done";
  };
  return state;
}
const only = (res) => { assert.ok(res.changes, `sem proposta. resposta: ${res.reply}`); assert.equal(res.changes.entries.length, 1, `esperava 1 item, veio ${res.changes.entries.length}`); return res.changes.entries[0]; };

{
  const tasks = buildAgenda();
  const id = (title, i = 0) => tasks.filter((t) => t.title === title)[i].id;

  await check("1. 'muda a reunião da FCA de amanhã das 14h para 15h'", async () => {
    const r = await chat(tasks).say("muda a reunião da FCA de amanhã das 14h para 15h");
    const e = only(r);
    assert.equal(e.before.id, id("Reunião FCA"));
    assert.equal(e.after.time, "15:00");
    assert.equal(e.after.due, plus(1));
    assert.ok(["update", "reschedule"].includes(e.action.action));
  });

  await check("2. 'passa a tarefa de pagar cartão pro dia 21'", async () => {
    const e = only(await chat(tasks).say("passa a tarefa de pagar cartão pro dia 21"));
    assert.equal(e.before.id, id("Pagar cartão"));
    assert.equal(e.after.due, nextDay(21));
  });

  await check("3. 'marca o ISS da Transmartins como concluído'", async () => {
    const e = only(await chat(tasks).say("marca o ISS da Transmartins como concluído"));
    assert.equal(e.before.id, id("Enviar ISS Transmartins"));
    assert.equal(e.action.action, "complete");
    assert.equal(e.after.status, "concluido");
  });

  await check("4. 'reabre a tarefa que acabei de concluir' (concluída na própria conversa)", async () => {
    const c = chat(tasks);
    only(await c.say("marca o ISS da Transmartins como concluído"));
    c.confirm();
    const e = only(await c.say("reabre a tarefa que acabei de concluir"));
    assert.equal(e.before.id, id("Enviar ISS Transmartins"));
    assert.equal(e.action.action, "reopen");
    assert.equal(e.after.status, "a-fazer");
  });

  await check("5. 'apaga comprar ração' (propõe, nunca executa; item exato)", async () => {
    const r = await chat(tasks).say("apaga comprar ração");
    const e = only(r);
    assert.equal(e.before.id, id("Comprar ração"));
    assert.equal(e.action.action, "delete");
    assert.equal(r.changes.destructive, true);
    assert.ok(!/(apaguei|exclu[ií]\b|já apag)/i.test(r.reply), `a resposta não pode dizer que já apagou: ${r.reply}`);
  });

  await check("6. 'muda a prioridade da conciliação FCA para urgente'", async () => {
    const e = only(await chat(tasks).say("muda a prioridade da conciliação FCA para urgente"));
    assert.equal(e.before.id, id("Conciliação FCA"));
    assert.equal(e.after.priority, "urgente");
  });

  await check("7. referência: 'muda ela pra amanhã' depois de falar de uma tarefa", async () => {
    const c = chat(tasks);
    await c.say("quando vence a conciliação da FCA?");
    const e = only(await c.say("muda ela pra amanhã"));
    assert.equal(e.before.id, id("Conciliação FCA"));
    assert.equal(e.after.due, plus(1));
  });

  await check("7b. referência: 'apaga essa' / 'marca como concluída' / 'passa pra sexta'", async () => {
    const c = chat(tasks);
    await c.say("me fala da tarefa de pagar cartão");
    const a = only(await c.say("apaga essa"));
    assert.equal(a.before.id, id("Pagar cartão"));
    assert.equal(a.action.action, "delete");
    const c2 = chat(tasks);
    await c2.say("me fala da tarefa de comprar ração");
    const b = only(await c2.say("marca como concluída"));
    assert.equal(b.before.id, id("Comprar ração"));
    assert.equal(b.action.action, "complete");
  });

  await check("8. dois itens parecidos → pergunta qual (não adivinha)", async () => {
    const c = chat(tasks);
    const r = await c.say("muda a reunião da Confian pra 16h");
    assert.equal(r.changes, undefined, "não podia propor alteração sem saber qual");
    assert.ok(r.choices && r.choices.length === 2, `esperava 2 escolhas, veio ${r.choices?.length ?? 0}. resposta: ${r.reply}`);
    // escolhe a de sexta/depois de amanhã e a ori segue com o item certo
    const alvo = id("Reunião Confian", 1);
    const e = only(await c.say("Reunião Confian — a de 15h", alvo.slice(0, 8)));
    assert.equal(e.before.id, alvo);
    assert.equal(e.after.time, "16:00");
  });

  await check("9. 'apaga todas as tarefas' → lista tudo e exige confirmação (não executa)", async () => {
    const r = await chat(tasks).say("apaga todas as tarefas");
    assert.ok(r.changes, `sem proposta. resposta: ${r.reply}`);
    assert.equal(r.changes.destructive, true);
    assert.ok(r.changes.entries.length >= 5, `lista curta demais: ${r.changes.entries.length}`);
    assert.ok(r.changes.entries.every((e) => e.action.action === "delete" && e.after === null));
  });

  await check("10. 'passa tudo que está atrasado para amanhã' (lote)", async () => {
    const r = await chat(tasks).say("passa tudo que está atrasado para amanhã");
    assert.ok(r.changes, `sem proposta. resposta: ${r.reply}`);
    assert.deepEqual(r.changes.entries.map((e) => e.before.title).sort(), ["Enviar DAS Alfa", "Marcar dentista", "Revisar folha Beta"]);
    assert.ok(r.changes.entries.every((e) => e.after.due === plus(1)));
  });

  await check("11. conversa comum não gera alteração", async () => {
    const r = await chat(tasks).say("o que ainda falta hoje?");
    assert.equal(r.changes, undefined);
    assert.equal(r.choices, undefined);
  });

  await check("12. pedido para item que não existe → não inventa", async () => {
    const r = await chat(tasks).say("apaga a tarefa de renovar o seguro do carro");
    assert.equal(r.changes, undefined, `não existe essa tarefa, mas propôs: ${JSON.stringify(r.changes?.entries.map((e) => e.before.title))}`);
  });
}

console.log(`\n${pass} ok, ${fail} falharam.`);
process.exit(fail ? 1 : 0);
