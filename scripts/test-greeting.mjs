// Testa a saudação da ori (frases, variação, segunda linha contextual). Sem rede, sem navegador.
//   npm run test:greeting
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";

register("./ts-alias-loader.mjs", pathToFileURL(path.join(import.meta.dirname, "/")));
const G = await import("@/lib/ori-greeting");

const day = (offset = 0) => { const d = new Date(2026, 9, 8 + offset); d.setHours(0, 0, 0, 0); return d; };
const today = day(0);
const at = (h, m = 0) => { const d = new Date(today); d.setHours(h, m); return d; };
let n = 0;
const task = (o) => ({ id: String(++n), title: "t", context: "trabalho", kind: "tarefa", category: "Outros", priority: "normal", status: "a-fazer", due: today, ...o });

let pass = 0, fail = 0;
const check = (name, fn) => { try { fn(); pass++; console.log(`  ok   ${name}`); } catch (e) { fail++; console.log(`  FALHOU ${name}\n         ${String(e.message).split("\n").join("\n         ")}`); } };
// mulberry32: gerador determinístico com boa distribuição mesmo com sementes seguidas
const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

console.log("\nSaudação da ori");

check("período pelo horário local", () => {
  const p = G.periodOf;
  assert.deepEqual([4, 5, 11, 12, 17, 18, 23, 0].map(p), ["noite", "manha", "manha", "tarde", "tarde", "noite", "noite", "noite"]);
});

check("horário falado: 14h, 10h30, 9h, à 1h", () => {
  assert.equal(G.spokenTime("14:00"), "14h");
  assert.equal(G.spokenTime("10:30"), "10h30");
  assert.equal(G.spokenTime("09:00"), "9h");
  assert.equal(G.atTime("14:00"), "às 14h");
  assert.equal(G.atTime("01:15"), "à 1h15");
});

check("prioridade 1: atrasadas vencem tudo (compromisso, importantes, quantidade)", () => {
  const s = G.readSituation([
    task({ due: day(-2) }), task({ due: day(-1), kind: "lembrete" }),
    task({ kind: "compromisso", time: "15:00" }), task({ important: true }),
  ], today, at(9));
  assert.deepEqual(s, { kind: "overdue", n: 2 });
});

check("compromisso não conta como atrasado (só tarefa/lembrete atrasam)", () => {
  const s = G.readSituation([task({ kind: "compromisso", due: day(-1), time: "10:00" })], today, at(9));
  assert.equal(s.kind, "calm");
});

check("prioridade 2: próximo compromisso de hoje (o mais cedo ainda por vir)", () => {
  const s = G.readSituation([
    task({ kind: "compromisso", time: "08:00" }), // já passou
    task({ kind: "compromisso", time: "16:30" }), task({ kind: "evento", time: "14:00" }),
    task({ important: true }),
  ], today, at(10));
  assert.deepEqual(s, { kind: "next", time: "14:00" });
});

check("compromisso que já passou ou lembrete com hora não viram próximo compromisso", () => {
  const s = G.readSituation([task({ kind: "compromisso", time: "08:00" }), task({ kind: "lembrete", time: "15:00" })], today, at(10));
  assert.equal(s.kind, "count");
});

check("prioridade 3: itens importantes de hoje", () => {
  const s = G.readSituation([task({ important: true }), task({ important: true }), task()], today, at(10));
  assert.deepEqual(s, { kind: "important", n: 2 });
});

check("importante em outro dia não conta", () => {
  assert.equal(G.readSituation([task({ important: true, due: day(2) })], today, at(10)).kind, "calm");
});

check("prioridade 4: quantidade de hoje; dia cheio a partir de 7", () => {
  const six = Array.from({ length: 6 }, () => task());
  assert.deepEqual(G.readSituation(six, today, at(10)), { kind: "count", n: 6 });
  assert.deepEqual(G.readSituation([...six, task()], today, at(10)), { kind: "busy", n: 7 });
});

check("prioridade 5: agenda tranquila (concluídos e aguardando não contam)", () => {
  const s = G.readSituation([task({ status: "concluido" }), task({ status: "aguardando" }), task({ status: "aguardando", due: day(-3) })], today, at(10));
  assert.deepEqual(s, { kind: "calm" });
});

check("a segunda linha é UMA frase, com números/horário reais da agenda", () => {
  const cases = [
    [{ kind: "overdue", n: 3 }, /3|Três/], [{ kind: "next", time: "10:30" }, /10h30/],
    [{ kind: "important", n: 2 }, /2/], [{ kind: "count", n: 4 }, /4/],
  ];
  for (const [s, re] of cases) {
    for (let seed = 1; seed < 30; seed++) {
      const pick = G.choose("tarde", s, "Gabi", {}, rng(seed));
      const { line2 } = G.render(pick, s, "Gabi");
      assert.match(line2, re, line2);
      assert.ok(!line2.includes("{") && !line2.includes("\n"), line2);
    }
  }
});

check("singular e plural corretos (1 tarefa atrasada / 2 tarefas atrasadas)", () => {
  const one = { kind: "overdue", n: 1 };
  for (let seed = 1; seed < 40; seed++) {
    const t = G.render(G.choose("manha", one, "", {}, rng(seed)), one, "").line2;
    assert.ok(!/\b1 (tarefas|itens|pendências)\b/.test(t) && !/Duas|Três/.test(t), t);
  }
  const two = { kind: "overdue", n: 2 };
  const all = new Set();
  for (let seed = 1; seed < 80; seed++) all.add(G.render(G.choose("manha", two, "", {}, rng(seed)), two, "").line2);
  assert.ok([...all].some((t) => t.startsWith("Duas coisas ficaram para trás")), [...all].join(" | "));
  assert.ok([...all].every((t) => !/\b2 (tarefa|item|pendência)\b/.test(t)));
});

check("sem nome: nenhuma frase fica com marcador, vírgula solta ou espaço duplo", () => {
  for (const period of ["manha", "tarde", "noite"]) {
    const s = { kind: "calm" };
    for (let seed = 1; seed < 80; seed++) {
      const { line1 } = G.render(G.choose(period, s, "", {}, rng(seed)), s, "");
      assert.ok(!line1.includes("{") && !/\s,|,\s*[.!?]|  /.test(line1), line1);
    }
  }
});

check("com nome: o nome vem da preferência (Gabi/Duda), nunca fixo", () => {
  const s = { kind: "calm" };
  for (const name of ["Gabi", "Duda"]) {
    const lines = new Set();
    for (let seed = 1; seed < 200; seed++) lines.add(G.render(G.choose("manha", s, name, {}, rng(seed)), s, name).line1);
    assert.ok([...lines].some((l) => l.includes(name)));
    assert.ok([...lines].every((l) => !l.includes(name === "Gabi" ? "Duda" : "Gabi") && !l.includes("Gabriela")));
  }
});

check("variação: as frases compatíveis aparecem (não escolhe sempre a primeira)", () => {
  for (const period of ["manha", "tarde", "noite"]) {
    const s = { kind: "count", n: 4 };
    const a = new Set(), b = new Set();
    for (let seed = 1; seed < 400; seed++) { const p = G.choose(period, s, "Gabi", {}, rng(seed)); a.add(p.a); b.add(p.b); }
    assert.ok(a.size >= 5, `${period}: só ${a.size} saudações`);
    assert.ok(b.size >= 2, `${period}: só ${b.size} comentários`);
  }
});

check("não repete a última frase (1ª nem 2ª linha) quando há alternativa", () => {
  const s = { kind: "calm" };
  let prev = G.choose("tarde", s, "Gabi", {}, rng(1));
  for (let seed = 2; seed < 300; seed++) {
    const next = G.choose("tarde", s, "Gabi", { a: prev.a, b: prev.b }, rng(seed));
    assert.notEqual(next.a, prev.a);
    assert.notEqual(next.b, prev.b);
    prev = next;
  }
});

check("frases só de tarde/noite não aparecem de manhã (Hoje ficaram…)", () => {
  const s = { kind: "count", n: 4 };
  for (let seed = 1; seed < 200; seed++) {
    const { line2 } = G.render(G.choose("manha", s, "Gabi", {}, rng(seed)), s, "Gabi");
    assert.ok(!/ficaram|Ainda temos/.test(line2), line2);
  }
});

check("a frase sorteada fica a mesma quando só o número muda; troca se virar singular ou mudar o período", () => {
  const four = { kind: "count", n: 4 }, three = { kind: "count", n: 3 }, one = { kind: "count", n: 1 };
  const pick = G.choose("tarde", four, "Gabi", {}, rng(7));
  assert.ok(G.stillValid(pick, "tarde", three, "Gabi"));
  assert.notEqual(G.render(pick, four, "Gabi").line2, G.render(pick, three, "Gabi").line2);
  assert.ok(!G.stillValid(pick, "tarde", one, "Gabi"), "1 item usa frases no singular");
  assert.ok(!G.stillValid(pick, "noite", four, "Gabi"), "mudou o período do dia");
  assert.ok(!G.stillValid(pick, "tarde", { kind: "calm" }, "Gabi"), "mudou o tipo de comentário");
  assert.ok(!G.stillValid(pick, "tarde", four, ""), "sem nome as frases são outras");
});

check("nenhuma frase é longa demais (curtas, cabem em uma linha de celular)", () => {
  for (const period of ["manha", "tarde", "noite"]) {
    for (const s of [{ kind: "overdue", n: 12 }, { kind: "next", time: "10:30" }, { kind: "important", n: 3 }, { kind: "busy", n: 9 }, { kind: "count", n: 5 }, { kind: "calm" }]) {
      for (let seed = 1; seed < 60; seed++) {
        const r = G.render(G.choose(period, s, "Gabriela", {}, rng(seed)), s, "Gabriela");
        assert.ok(r.line1.length <= 52 && r.line2.length <= 52, `${r.line1} / ${r.line2}`);
      }
    }
  }
});

console.log(`\n${pass} ok, ${fail} falharam.`);
process.exit(fail ? 1 : 0);
