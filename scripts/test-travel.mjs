// Testa o tempo de trajeto sem rede e sem banco: período bloqueado, conflitos, edição, validação da API,
// mapeamento para as colunas, Ori (criar com trajeto, disponibilidade, alterar trajeto) e o texto do aviso de saída.
//   npm run test:travel
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";

register("./ts-alias-loader.mjs", pathToFileURL(path.join(import.meta.dirname, "/")));
const T = await import("@/lib/travel");
const { parseTaskDto, toDto, fromDto } = await import("@/lib/task-dto");
const M = await import("@/services/mappers");
const { normalizeItems } = await import("@/lib/server/gemini");
const { agendaSnapshot } = await import("@/lib/server/ori-chat");
const { applyAction, oriActionSchema, modelChanges, changesSchema } = await import("@/lib/ai/actions");
const { buildChangeProposal } = await import("@/lib/server/ori-actions");
const { buildMessage } = await import("@/lib/push/message");
const { scheduledMinutes } = await import("@/lib/task-utils");

let pass = 0, fail = 0;
const check = async (name, fn) => {
  try { await fn(); pass++; console.log(`  ok   ${name}`); }
  catch (e) { fail++; console.log(`  FALHOU ${name}\n         ${String(e.message).split("\n").join("\n         ")}`); }
};

const day = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const ev = (o) => ({ id: crypto.randomUUID(), title: "Consulta", kind: "compromisso", context: "pessoal", category: "Saúde", priority: "normal", status: "a-fazer", due: day("2026-10-20"), time: "15:00", end: "16:00", ...o });
const consulta = ev({ travelTo: 20, travelFrom: 80 });
const others = (...l) => T.occupantsOfTasks(l);
const probe = (o) => T.findConflicts(T.spanOfTask(ev({ id: "novo", title: "Novo", time: "14:50", end: "15:30", ...o })), "novo", others(consulta));

console.log("\nPeríodo bloqueado");
await check("15:00–16:00, ida 20, volta 80 → bloqueia 14:40–17:20", () => {
  const d = T.describe(T.spanOfTask(consulta));
  assert.equal(d.event, "15:00–16:00");
  assert.equal(d.blocked, "14:40–17:20");
  assert.equal(d.go, "14:40–15:00");
  assert.equal(d.back, "16:00–17:20");
  assert.equal(d.leaveAt, "14:40");
  assert.equal(T.blockedMinutes(T.spanOfTask(consulta)), 160);
});
await check("sem trajeto → só o horário do evento (como hoje)", () => {
  const d = T.describe(T.spanOfTask(ev()));
  assert.equal(d.blocked, "15:00–16:00");
  assert.equal(d.leaveAt, undefined);
  assert.equal(d.go, undefined);
  assert.equal(d.back, undefined);
});
await check("ida 0 / volta 30 → 15:00–16:30", () => {
  assert.equal(T.describe(T.spanOfTask(ev({ travelTo: 0, travelFrom: 30 }))).blocked, "15:00–16:30");
});
await check("ida 45 / volta 0 → 14:15–16:00", () => {
  const d = T.describe(T.spanOfTask(ev({ travelTo: 45, travelFrom: 0 })));
  assert.equal(d.blocked, "14:15–16:00");
  assert.equal(d.leaveAt, "14:15");
});
await check("editar horário → recalcula (16:00–17:00, 30/30 → 15:30–17:30)", () => {
  assert.equal(T.describe(T.spanOfTask({ ...consulta, time: "16:00", end: "17:00", travelTo: 30, travelFrom: 30 })).blocked, "15:30–17:30");
});
await check("editar só o trajeto → recalcula", () => {
  assert.equal(T.describe(T.spanOfTask({ ...consulta, travelTo: 10 })).blocked, "14:50–17:20");
  assert.equal(T.describe(T.spanOfTask({ ...consulta, travelFrom: 0 })).blocked, "14:40–16:00");
});
await check("trajeto só existe em compromisso/evento COM horário (tarefa e lembrete ignoram)", () => {
  assert.equal(T.spanOfTask(ev({ kind: "tarefa", travelTo: 20 })), null);
  assert.equal(T.spanOfTask(ev({ kind: "lembrete", travelTo: 20 })), null);
  assert.equal(T.spanOfTask(ev({ time: undefined, end: undefined, travelTo: 20 })), null);
  assert.deepEqual(T.travelOf(ev({ kind: "tarefa", travelTo: 20 })), { to: 0, from: 0 });
});
await check("passa da meia-noite: 22:30–23:30 + volta 80 termina às 00:50 (+1)", () => {
  assert.equal(T.describe(T.spanOfTask(ev({ time: "22:30", end: "23:30", travelFrom: 80 }))).blocked, "22:30–00:50 (+1)");
});
await check("formatação: 20 min · 1h · 1h20 · 2h15", () => {
  assert.deepEqual([20, 60, 80, 135].map(T.formatTravel), ["20 min", "1h", "1h20", "2h15"]);
});
await check("normalização: 0, vazio, negativo e lixo = sem trajeto; teto de 12 h", () => {
  assert.deepEqual([0, undefined, null, -5, NaN, "20"].map(T.cleanTravel), [undefined, undefined, undefined, undefined, undefined, undefined]);
  assert.equal(T.cleanTravel(20), 20);
  assert.equal(T.cleanTravel(5000), 720);
});
await check("carga do dia (Semana) inclui ida e volta: 60 min + 20 + 80 = 160", () => {
  assert.equal(scheduledMinutes([consulta]), 160);
  assert.equal(scheduledMinutes([ev()]), 60);
});

console.log("\nConflitos");
await check("14:50 → conflito com a IDA da Consulta, com a frase pedida", () => {
  const [c] = probe({});
  assert.equal(c.theirs, "ida");
  assert.equal(c.mine, "evento");
  assert.equal(c.title, "Consulta");
  assert.match(c.message, /^Esse horário entra em conflito com o deslocamento de ida da Consulta \(14:40–15:00\)\./);
  assert.match(c.message, /Também bate com Consulta \(15:00–16:00\)/, "e avisa que também bate com o próprio compromisso");
  assert.equal(probe({ time: "14:50", end: "15:00" })[0].message.includes("Também"), false, "14:50–15:00 só encosta na ida");
});
await check("16:30 → conflito com a VOLTA da Consulta", () => {
  const [c] = probe({ time: "16:30", end: "17:00" });
  assert.equal(c.theirs, "volta");
  assert.match(c.message, /deslocamento de volta da Consulta \(16:00–17:20\)/);
});
await check("14:10–14:40 e 17:20–18:00 não conflitam (encostar não é conflito)", () => {
  assert.equal(probe({ time: "14:10", end: "14:40" }).length, 0);
  assert.equal(probe({ time: "17:20", end: "18:00" }).length, 0);
});
await check("durante o compromisso → conflito com o compromisso", () => {
  const [c] = probe({ time: "15:30", end: "15:45" });
  assert.equal(c.theirs, "evento");
  assert.match(c.message, /^Esse horário entra em conflito com Consulta \(15:00–16:00\)/);
});
await check("o trajeto do NOVO compromisso também conta (travel × travel e travel × compromisso)", () => {
  const [c] = probe({ time: "14:30", end: "14:50" });
  assert.equal(c.theirs, "ida");
  // novo 13:00–14:00 com volta de 60 min termina 15:00: entra na ida da Consulta (travel × travel)
  const [d] = probe({ time: "13:00", end: "14:00", travelFrom: 60 });
  assert.equal(d.mine, "volta");
  assert.equal(d.theirs, "ida");
  assert.match(d.message, /se sobrepõe/);
  // novo depois da Consulta, com ida de 90 min que volta até o compromisso dela (travel × compromisso)
  const [e] = probe({ time: "17:20", end: "18:00", travelTo: 90 });
  assert.equal(e.mine, "ida");
  assert.equal(e.theirs, "evento");
  assert.match(e.message, /^O deslocamento de ida deste compromisso entra em conflito com Consulta/);
});
await check("sem trajeto nos dois lados → nenhum aviso novo (comportamento de sempre)", () => {
  const plain = T.occupantsOfTasks([ev()]);
  assert.equal(T.findConflicts(T.spanOfTask(ev({ id: "x", time: "15:30", end: "16:30" })), "x", plain).length, 0);
});
await check("itens concluídos, o próprio item e tarefas com horário não entram", () => {
  assert.equal(T.occupantsOfTasks([{ ...consulta, status: "concluido" }]).length, 0);
  assert.equal(T.occupantsOfTasks([ev({ kind: "tarefa", travelTo: 20 })]).length, 0);
  assert.equal(T.findConflicts(T.spanOfTask(consulta), consulta.id, others(consulta)).length, 0);
});
await check("excluir o compromisso → o trajeto some junto (nada sobra para conflitar)", () => {
  assert.equal(probe({}).length, 1);
  assert.equal(T.findConflicts(T.spanOfTask(ev({ id: "novo", time: "14:50", end: "15:30" })), "novo", others()).length, 0);
});
await check("editar o horário da Consulta → o conflito acompanha (16:00–17:00, 30/30 libera 14:50)", () => {
  const moved = { ...consulta, time: "16:00", end: "17:00", travelTo: 30, travelFrom: 30 };
  assert.equal(T.findConflicts(T.spanOfTask(ev({ id: "novo", time: "14:50", end: "15:30" })), "novo", others(moved)).length, 0);
  assert.equal(T.findConflicts(T.spanOfTask(ev({ id: "novo", time: "15:40", end: "16:10" })), "novo", others(moved)).length, 1);
});
await check("em outro dia não conflita", () => {
  assert.equal(probe({ due: day("2026-10-21") }).length, 0);
});

console.log("\nAPI (validação) e banco (mapeamento)");
const dtoOf = (o) => ({ ...toDto(ev(o)) });
await check("DTO ida/volta viaja e volta igual; 0 vira 'sem trajeto'", () => {
  const d = parseTaskDto(dtoOf({ travelTo: 20, travelFrom: 80 }));
  assert.equal(d.travelTo, 20);
  assert.equal(d.travelFrom, 80);
  const z = parseTaskDto({ ...dtoOf({}), travelTo: 0, travelFrom: 30 });
  assert.equal(z.travelTo, undefined);
  assert.equal(z.travelFrom, 30);
});
await check("DTO recusa trajeto negativo, fracionado, acima de 12 h ou texto", () => {
  for (const bad of [-1, 1.5, 721, "20"]) assert.throws(() => parseTaskDto({ ...dtoOf({}), travelTo: bad }), /trajeto/);
});
await check("DTO descarta trajeto de tarefa/lembrete e de item sem horário", () => {
  assert.equal(parseTaskDto({ ...dtoOf({ kind: "tarefa" }), travelTo: 20 }).travelTo, undefined);
  assert.equal(parseTaskDto({ ...dtoOf({ time: undefined, end: undefined }), travelTo: 20 }).travelTo, undefined);
});
await check("'na hora de sair' só vale com ida (e exclui o lembrete comum)", () => {
  const ok = parseTaskDto({ ...dtoOf({ travelTo: 20 }), reminderAtDeparture: true, reminderMinutes: 10 });
  assert.equal(ok.reminderAtDeparture, true);
  assert.equal(ok.reminderMinutes, undefined);
  const semIda = parseTaskDto({ ...dtoOf({}), reminderAtDeparture: true, reminderMinutes: 10 });
  assert.equal(semIda.reminderAtDeparture, undefined);
  assert.equal(semIda.reminderMinutes, 10);
});
const cats = new M.CategoryIndex([]);
await check("colunas do evento: travel_to/from_minutes, null quando não há; sem horário zera tudo", () => {
  const c = M.eventColumns(ev({ travelTo: 20, travelFrom: 80 }), cats);
  assert.equal(c.travel_to_minutes, 20);
  assert.equal(c.travel_from_minutes, 80);
  assert.equal(c.reminder_at_departure, false);
  const n = M.eventColumns(ev(), cats);
  assert.equal(n.travel_to_minutes, null);
  assert.equal(n.travel_from_minutes, null);
  const s = M.eventColumns(ev({ time: undefined, end: undefined, travelTo: 20, reminderAtDeparture: true }), cats);
  assert.equal(s.travel_to_minutes, null);
  assert.equal(s.reminder_at_departure, false);
});
await check("'na hora de sair' grava reminder_at_departure e zera reminder_minutes", () => {
  const c = M.eventColumns(ev({ travelTo: 20, reminderAtDeparture: true, reminderMinutes: 10 }), cats);
  assert.equal(c.reminder_at_departure, true);
  assert.equal(c.reminder_minutes, null);
  assert.equal(M.eventColumns(ev({ reminderAtDeparture: true }), cats).reminder_at_departure, false, "sem ida não há saída");
});
await check("linha do banco → item (ida 0 = sem ida) e tarefas não têm trajeto", () => {
  const row = { id: "1", event_type: "compromisso", title: "Consulta", context: "pessoal", category_id: null, client_project: null, topic: null, status: "a-fazer", waiting_on: null, priority: "normal", start_date: "2026-10-20", end_date: null, start_time: "15:00:00", end_time: "16:00:00", location: null, notes: null, completed_at: null, position: 0, travel_to_minutes: 0, travel_from_minutes: 80, reminder_at_departure: false };
  const t = M.eventFromRow(row, cats);
  assert.equal(t.travelTo, undefined);
  assert.equal(t.travelFrom, 80);
  const back = fromDto(toDto(t));
  assert.equal(back.travelFrom, 80);
  assert.ok(!("travel_to_minutes" in M.taskColumns(ev({ kind: "tarefa", travelTo: 20 }), cats)));
});

console.log("\nOri");
const categories = [{ name: "Saúde", context: "pessoal" }];
await check("Ori cria compromisso com trajeto por linguagem natural (ida 20, volta 1h20)", () => {
  const [it] = normalizeItems({ items: [{ type: "appointment", title: "Consulta", context: "pessoal", category: "Saúde", date: "2026-10-21", time: "15:00", endTime: "16:00", priority: "normal", travelToMinutes: 20, travelFromMinutes: 80 }] }, categories);
  assert.equal(it.travelTo, 20);
  assert.equal(it.travelFrom, 80);
  const d = T.describe(T.spanOfProposed(it));
  assert.equal(d.event, "15:00–16:00");
  assert.equal(d.blocked, "14:40–17:20");
});
await check("Ori: em tarefa/sem hora não há trajeto; 0 = sem", () => {
  const raw = (o) => ({ type: "appointment", title: "X", context: "pessoal", date: "2026-10-21", time: "15:00", priority: "normal", ...o });
  const [a, b, c, d] = normalizeItems({ items: [raw({}), raw({ type: "task", travelToMinutes: 20 }), raw({ time: null, travelToMinutes: 20 }), raw({ travelToMinutes: 0, travelFromMinutes: 30 })] }, categories);
  assert.equal(a.travelTo, undefined);
  assert.equal(b.travelTo, undefined);
  assert.equal(c.travelTo, undefined);
  assert.equal(d.travelTo, undefined);
  assert.equal(d.travelFrom, 30);
});
await check("Ori: item proposto sem fim usa o mesmo fim da tela (início + 1h) no período ocupado", () => {
  const [it] = normalizeItems({ items: [{ type: "appointment", title: "X", context: "pessoal", date: "2026-10-21", time: "15:00", priority: "normal", travelToMinutes: 20, travelFromMinutes: 80 }] }, categories);
  assert.equal(T.describe(T.spanOfProposed(it)).blocked, "14:40–17:20");
});
const dto = (t) => toDto(t);
const agenda = [dto(consulta), dto(ev({ title: "Reunião", time: "10:00", end: "11:00" }))];
await check("Ori enxerga o trajeto na agenda: 'ida 20 min · volta 1h20 · OCUPADO 14:40–17:20 (precisa sair às 14:40)'", () => {
  const snap = agendaSnapshot(agenda, new Date(Date.UTC(2026, 9, 20)));
  const l = snap.split("\n").find((x) => x.includes("Consulta"));
  assert.match(l, /ida 20 min · volta 1h20 · OCUPADO 14:40–17:20 \(precisa sair às 14:40\)/);
  const r = snap.split("\n").find((x) => x.includes("Reunião"));
  assert.doesNotMatch(r, /OCUPADO/);
});
await check("Ori: proposta nova que cai na ida da Consulta já vem com o aviso de conflito", () => {
  const [it] = normalizeItems({ items: [{ type: "appointment", title: "Dentista", context: "pessoal", date: "2026-10-20", time: "14:50", endTime: "15:20", priority: "normal" }] }, categories);
  const [withWarn] = T.attachConflicts([it], agenda);
  assert.equal(withWarn.conflicts.length, 1);
  assert.match(withWarn.conflicts[0], /deslocamento de ida da Consulta/);
  const [free] = T.attachConflicts([{ ...it, time: "10:00", endTime: "10:30" }], [dto(consulta)]);
  assert.equal(free.conflicts, undefined);
});
await check("Ori: editar trajeto de item existente (update com travelTo/travelFrom) e clearTravel", () => {
  const before = dto(consulta);
  const act = (changes) => oriActionSchema.parse({ action: "update", entityType: "appointment", entityId: before.id, changes: changesSchema.parse(modelChanges(changes)) });
  const a = applyAction(before, act({ travelTo: 30 }), { categories }).after;
  assert.equal(a.travelTo, 30);
  assert.equal(a.travelFrom, 80, "a volta não muda");
  assert.equal(T.describe(T.spanOfIso({ kind: a.kind, date: a.due, time: a.time, end: a.end, travelTo: a.travelTo, travelFrom: a.travelFrom })).blocked, "14:30–17:20");
  const z = applyAction(before, act({ travelTo: 0 }), { categories }).after;
  assert.equal(z.travelTo, undefined);
  const c = applyAction(before, act({ clearTravel: true }), { categories }).after;
  assert.equal(c.travelTo, undefined);
  assert.equal(c.travelFrom, undefined);
});
await check("Ori: reagendar mantém o trajeto; tirar o horário remove o trajeto; tarefa ignora", () => {
  const before = dto(consulta);
  const move = oriActionSchema.parse({ action: "reschedule", entityType: "appointment", entityId: before.id, changes: { time: "16:00" } });
  const m = applyAction(before, move, { categories }).after;
  assert.equal(m.travelTo, 20);
  assert.equal(m.time, "16:00");
  assert.equal(m.end, "17:00");
  const noTime = oriActionSchema.parse({ action: "update", entityType: "appointment", entityId: before.id, changes: { time: null } });
  const n = applyAction(before, noTime, { categories }).after;
  assert.equal(n.travelTo, undefined);
  assert.equal(n.travelFrom, undefined);
  const task = dto(ev({ kind: "tarefa", time: undefined, end: undefined }));
  const t = oriActionSchema.parse({ action: "update", entityType: "task", entityId: task.id, changes: { travelTo: 20 } });
  const r = applyAction(task, t, { categories });
  assert.equal(r.after.travelTo, undefined);
  assert.match(r.ignored[0], /trajeto/);
});
await check("Ori: pedido de alterar trajeto vira proposta com antes/depois", () => {
  const ref = consulta.id.slice(0, 8);
  const { proposal } = buildChangeProposal([{ action: "update", entityId: ref, selector: null, changes: { travelTo: 30 } }], [dto(consulta)], categories, "2026-10-20");
  assert.equal(proposal.entries.length, 1);
  assert.equal(proposal.entries[0].before.travelTo, 20);
  assert.equal(proposal.entries[0].after.travelTo, 30);
});

console.log("\nNotificação 'na hora de sair'");
await check("texto da Ori", () => {
  const n = { tag: "x", name: "Gabi", title: "Consulta", kind: "compromisso", minutes_before: 20, time: "15:00", at_departure: true };
  assert.equal(buildMessage(n).body, "Gabi, é hora de sair para “Consulta” às 15h.");
  assert.equal(buildMessage({ ...n, name: "" }).body, "É hora de sair para “Consulta” às 15h.");
  assert.match(buildMessage({ ...n, at_departure: false }).body, /começa em 20 minutos/);
});

console.log(`\n${fail ? "FALHOU" : "OK"}: ${pass} passaram, ${fail} falharam`);
process.exitCode = fail ? 1 : 0;
