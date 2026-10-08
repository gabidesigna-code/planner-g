import { diffDays, toMin } from "@/lib/dates";
import { canBeOverdue, occursOn } from "@/lib/task-utils";
import type { Task } from "@/types";

/**
 * Saudação da ori no topo do "Hoje": duas linhas curtas, escolhidas de uma biblioteca de frases.
 *   1ª linha: cumprimento pelo horário local (manhã / tarde / noite), com o nome quando existe.
 *   2ª linha: UM comentário sobre a agenda, a partir de dados reais (ver `readSituation`).
 * Sem IA e sem rede: é rápido, previsível e de graça. A variação vem de sortear entre as frases
 * compatíveis, evitando repetir as últimas usadas.
 */

export type Period = "manha" | "tarde" | "noite";

/** 05h–11h59 manhã · 12h–17h59 tarde · o resto, noite */
export const periodOf = (hour: number): Period => (hour >= 5 && hour < 12 ? "manha" : hour >= 12 && hour < 18 ? "tarde" : "noite");

// ------------------------------------------------------------------ o que a ori "vê" na agenda

/** Em ordem de prioridade: atrasadas → compromisso próximo → importantes → dia cheio / quantidade → tranquilo. */
export type Situation =
  | { kind: "overdue"; n: number }
  | { kind: "next"; time: string }
  | { kind: "important"; n: number }
  | { kind: "busy"; n: number }
  | { kind: "count"; n: number }
  | { kind: "calm" };

/** A partir de quantos itens abertos hoje o dia conta como "cheio". */
export const BUSY_AT = 7;

/**
 * Olha a agenda inteira (não só o filtro Trabalho/Pessoal da tela) e devolve a ÚNICA coisa mais relevante agora.
 * Itens "aguardando" (esperando terceiros) e concluídos não contam, como na própria tela Hoje.
 */
export function readSituation(tasks: Task[], today: Date, now: Date): Situation {
  const active = tasks.filter((t) => t.status !== "concluido" && t.status !== "aguardando");
  const overdue = active.filter((t) => canBeOverdue(t) && diffDays(t.due, today) < 0).length;
  if (overdue > 0) return { kind: "overdue", n: overdue };

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todays = active.filter((t) => occursOn(t, today));
  const next = todays
    .filter((t) => (t.kind === "compromisso" || t.kind === "evento") && t.time && toMin(t.time) >= nowMin)
    .sort((a, b) => toMin(a.time!) - toMin(b.time!))[0];
  if (next) return { kind: "next", time: next.time! };

  const important = todays.filter((t) => t.important).length;
  if (important > 0) return { kind: "important", n: important };

  if (todays.length >= BUSY_AT) return { kind: "busy", n: todays.length };
  if (todays.length > 0) return { kind: "count", n: todays.length };
  return { kind: "calm" };
}

// ------------------------------------------------------------------ frases

/** "14:00" → "14h" · "10:30" → "10h30" · "09:00" → "9h" */
export function spokenTime(hm: string): string {
  const [h, m] = hm.split(":").map(Number);
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/** "às 14h", mas "à 1h" */
export const atTime = (hm: string) => `${Number(hm.split(":")[0]) === 1 ? "à" : "às"} ${spokenTime(hm)}`;

const WORDS = ["", "Uma", "Duas", "Três", "Quatro", "Cinco", "Seis", "Sete", "Oito", "Nove"];

/**
 * Marcadores: {n} número · {W} número por extenso, no início da frase ("Duas", "Três"…; 10+ vira dígito) ·
 * {t} horário ("14h") · {at} "às 14h" · {At} o mesmo, com maiúscula · {nome} o nome (a frase só vale com nome).
 */
type Phrase = { text: string; only?: Period[] };
const P = (text: string, only?: Period[]): Phrase => ({ text, only });

const GREETING: Record<Period, string[]> = {
  manha: [
    "Bom dia, {nome}!",
    "Oi, {nome}. Bom dia!",
    "Bom dia! Vamos ver como está seu dia?",
    "Bom dia, {nome}. O que temos por aqui hoje?",
    "{nome}, bom dia!",
    "Oi! Bom dia.",
    "Bom dia! Já dei uma olhada na sua agenda.",
  ],
  tarde: [
    "Boa tarde, {nome}!",
    "Oi, {nome}. Como está sua tarde?",
    "Boa tarde! Vamos ver o que ainda falta?",
    "{nome}, boa tarde!",
    "Boa tarde, {nome}. Como andam as coisas por aí?",
    "Oi! Boa tarde.",
  ],
  noite: [
    "Boa noite, {nome}!",
    "Oi, {nome}. Vamos fechar o dia?",
    "Boa noite! Vamos ver o que ficou pendente?",
    "{nome}, boa noite!",
    "Boa noite, {nome}. Como foi o dia?",
    "Oi! Boa noite.",
  ],
};

/** Segunda linha: um grupo por situação (e singular/plural quando o número muda a frase). */
const COMMENT: Record<string, Phrase[]> = {
  overdue1: [
    P("Tem 1 tarefa atrasada pedindo atenção."),
    P("Uma coisa ficou para trás."),
    P("Tem 1 pendência atrasada por aqui."),
    P("Antes de seguir, tem 1 item atrasado."),
  ],
  overdueN: [
    P("Tem {n} tarefas atrasadas pedindo atenção."),
    P("{W} coisas ficaram para trás."),
    P("Tem {n} pendências atrasadas por aqui."),
    P("Antes de seguir, tem {n} itens atrasados."),
  ],
  next: [
    P("Seu próximo compromisso é {at}."),
    P("{At} você tem seu próximo compromisso."),
    P("Tem compromisso chegando {at}."),
    P("Seu próximo horário marcado é {t}."),
  ],
  important1: [
    P("Você marcou 1 item como importante para hoje."),
    P("Tem 1 item importante no seu dia."),
    P("Hoje tem 1 item marcado como importante."),
  ],
  importantN: [
    P("Você marcou {n} itens como importantes para hoje."),
    P("Tem {n} itens importantes no seu dia."),
    P("Hoje tem {n} itens marcados como importantes."),
  ],
  busy: [
    P("Hoje está mais corrido."),
    P("Tem bastante coisa no seu dia."),
    P("Seu dia está cheio, então vamos por prioridade."),
    P("Hoje tem bastante coisa acontecendo."),
  ],
  count1: [
    P("Hoje só tem 1 coisa para resolver."),
    P("Tem 1 item no seu dia."),
    P("Ainda temos 1 coisa por aqui.", ["tarde", "noite"]),
    P("Hoje ficou 1 item na sua agenda.", ["tarde", "noite"]),
  ],
  countN: [
    P("Você tem {n} coisas para resolver hoje."),
    P("Tem {n} itens no seu dia."),
    P("Ainda temos {n} coisas por aqui.", ["tarde", "noite"]),
    P("Hoje ficaram {n} itens na sua agenda.", ["tarde", "noite"]),
  ],
  calm: [
    P("Seu dia está tranquilo por enquanto."),
    P("Pouca coisa por aqui hoje."),
    P("Hoje está mais leve."),
    P("Nada urgente te esperando agora."),
    P("Por hoje, não ficou nada pendente.", ["noite"]),
  ],
};

/** Grupo de frases da situação (separa singular de plural). */
export function commentGroup(s: Situation): string {
  switch (s.kind) {
    case "overdue": return s.n === 1 ? "overdue1" : "overdueN";
    case "important": return s.n === 1 ? "important1" : "importantN";
    case "count": return s.n === 1 ? "count1" : "countN";
    default: return s.kind;
  }
}

/** Frases do grupo que valem neste período. */
const commentsFor = (group: string, period: Period) => COMMENT[group].filter((p) => !p.only || p.only.includes(period));
/** Cumprimentos do período; sem nome, só os que não precisam dele. */
const greetingsFor = (period: Period, name: string) => GREETING[period].filter((g) => name || !g.includes("{nome}"));

const fill = (text: string, s: Situation, name: string) => {
  const n = "n" in s ? s.n : 0;
  const time = s.kind === "next" ? s.time : "";
  return text
    .replace("{nome}", name)
    .replace("{n}", String(n))
    .replace("{W}", n >= 1 && n <= 9 ? WORDS[n] : String(n))
    .replace("{At}", time ? atTime(time).replace(/^./, (c) => c.toUpperCase()) : "")
    .replace("{at}", time ? atTime(time) : "")
    .replace("{t}", time ? spokenTime(time) : "");
};

// ------------------------------------------------------------------ escolha e variação

/** O que foi sorteado: o texto-base das duas frases (guardado para não repetir nem trocar à toa). */
export interface Pick {
  /** período + grupo da segunda linha: se mudar, é hora de sortear de novo */
  key: string;
  /** texto-base da 1ª e da 2ª linha (com marcadores): identifica a frase mesmo se a lista mudar */
  a: string;
  b: string;
}

export const pickKey = (period: Period, s: Situation, name: string) => `${period}|${commentGroup(s)}|${name ? "n" : "-"}`;

/** Sorteia entre as frases compatíveis, fugindo das últimas usadas (`avoid`) quando há outras. */
export function choose(period: Period, s: Situation, name: string, avoid: { a?: string; b?: string } = {}, rand: () => number = Math.random): Pick {
  const first = greetingsFor(period, name);
  const second = commentsFor(commentGroup(s), period).map((p) => p.text);
  const from = (list: string[], not?: string) => {
    const options = list.filter((x) => x !== not);
    const pool = options.length ? options : list;
    return pool[Math.floor(rand() * pool.length) % pool.length];
  };
  return { key: pickKey(period, s, name), a: from(first, avoid.a), b: from(second, avoid.b) };
}

/** O Pick guardado ainda serve para esta situação? (mesmo período/grupo e as frases ainda existem) */
export const stillValid = (p: Pick, period: Period, s: Situation, name: string) =>
  p.key === pickKey(period, s, name) &&
  greetingsFor(period, name).includes(p.a) &&
  commentsFor(commentGroup(s), period).some((x) => x.text === p.b);

/** Texto final das duas linhas: a frase sorteada com os números/horário/nome ATUAIS. */
export function render(p: Pick, s: Situation, name: string): { line1: string; line2: string } {
  return { line1: fill(p.a, s, name), line2: fill(p.b, s, name) };
}
