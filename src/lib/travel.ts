import { isoDate, toMin } from "./dates";
import type { Task } from "@/types";
import type { ProposedItem } from "./ai/schema";

/**
 * Tempo de trajeto de compromissos/eventos com horário.
 *
 * O horário do compromisso continua sendo o real (início/fim). O trajeto é só um acréscimo ANTES (ida) e DEPOIS (volta),
 * independentes entre si. O período ocupado (ida + compromisso + volta) nunca é gravado: sai sempre desta conta,
 * então editar horário, duração ou trajeto recalcula tudo, e apagar o item apaga o trajeto junto.
 *
 * Tudo aqui é puro (sem React, sem servidor): a tela, a Ori e os testes usam as MESMAS funções.
 */

/** Maior trajeto aceito (12 h), igual ao limite do banco. */
export const MAX_TRAVEL_MINUTES = 720;
/** Duração assumida quando o item tem início mas não tem fim. */
export const DEFAULT_EVENT_MINUTES = 60;

/** Atalhos do seletor (em minutos). */
export const TRAVEL_QUICK = [10, 15, 20, 30, 45, 60] as const;

const pad = (n: number) => String(n).padStart(2, "0");

/** Normaliza um tempo de trajeto: inteiro de 1 a 720; qualquer outra coisa (vazio, 0, negativo, lixo) = sem trajeto. */
export function cleanTravel(v: unknown): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  const n = Math.round(v);
  return n >= 1 ? Math.min(n, MAX_TRAVEL_MINUTES) : undefined;
}

/** 20 → "20 min" · 60 → "1h" · 80 → "1h20" · 135 → "2h15" */
export function formatTravel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h}h${pad(m)}` : `${h}h`;
}

// ------------------------------------------------------------------ intervalos

/** O que a conta precisa saber de um item: dias como números absolutos (sem fuso) e horários "HH:MM". */
export interface TimeSpan {
  day: number;
  endDay?: number;
  time: string;
  end?: string;
  travelTo?: number;
  travelFrom?: number;
}

const dayNumber = (y: number, m: number, d: number) => Math.round(Date.UTC(y, m, d) / 86_400_000);
const dayOfIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return dayNumber(y, m - 1, d);
};

const isEventKind = (k: string) => k === "compromisso" || k === "evento";

/** Item do app → intervalo. null se não for compromisso/evento com horário (só eles têm trajeto e entram nos conflitos). */
export function spanOfTask(t: Pick<Task, "kind" | "due" | "endDate" | "time" | "end" | "travelTo" | "travelFrom">): TimeSpan | null {
  if (!isEventKind(t.kind) || !t.time) return null;
  return {
    day: dayOfIso(isoDate(t.due)),
    endDay: t.endDate ? dayOfIso(isoDate(t.endDate)) : undefined,
    time: t.time,
    end: t.end,
    travelTo: cleanTravel(t.travelTo),
    travelFrom: cleanTravel(t.travelFrom),
  };
}

/** Mesmo que spanOfTask, para quem trabalha com datas "AAAA-MM-DD" (rotas /api, Ori). */
export function spanOfIso(o: { kind: string; date: string; endDate?: string; time?: string; end?: string; travelTo?: number; travelFrom?: number }): TimeSpan | null {
  if (!isEventKind(o.kind) || !o.time) return null;
  return {
    day: dayOfIso(o.date),
    endDay: o.endDate ? dayOfIso(o.endDate) : undefined,
    time: o.time,
    end: o.end,
    travelTo: cleanTravel(o.travelTo),
    travelFrom: cleanTravel(o.travelFrom),
  };
}

/** Minutos absolutos (desde o dia 0): ida começa em goStart, compromisso vai de start a end, volta termina em backEnd. */
export interface Segments {
  goStart: number;
  start: number;
  end: number;
  backEnd: number;
}

export function segmentsOf(s: TimeSpan): Segments {
  const start = s.day * 1440 + toMin(s.time);
  const lastDay = s.endDay !== undefined && s.endDay > s.day ? s.endDay : s.day;
  let end = lastDay * 1440 + (s.end ? toMin(s.end) : toMin(s.time) + DEFAULT_EVENT_MINUTES);
  if (end <= start) end = start + DEFAULT_EVENT_MINUTES;
  return { goStart: start - (s.travelTo ?? 0), start, end, backEnd: end + (s.travelFrom ?? 0) };
}

/** Minutos de ida e volta de um item do app (zero se não for compromisso/evento com horário). */
export function travelOf(t: Pick<Task, "kind" | "time" | "travelTo" | "travelFrom">): { to: number; from: number } {
  if (!isEventKind(t.kind) || !t.time) return { to: 0, from: 0 };
  return { to: cleanTravel(t.travelTo) ?? 0, from: cleanTravel(t.travelFrom) ?? 0 };
}

export const hasTravel = (s: TimeSpan | null) => !!s && !!(s.travelTo || s.travelFrom);

/** Hora do dia (HH:MM) de um minuto absoluto. */
const clock = (abs: number) => {
  const m = ((abs % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
};

/** "14:40–17:20" (com "+1" depois da hora quando termina no dia seguinte). */
export function rangeLabel(from: number, to: number): string {
  const next = Math.floor(to / 1440) - Math.floor(from / 1440);
  return `${clock(from)}–${clock(to)}${next > 0 ? ` (+${next})` : ""}`;
}

/** Os três trechos, já como texto: o compromisso, e (se houver) ida e volta. */
export function describe(s: TimeSpan) {
  const g = segmentsOf(s);
  return {
    event: rangeLabel(g.start, g.end),
    blocked: rangeLabel(g.goStart, g.backEnd),
    /** hora de sair (início − ida) */
    leaveAt: s.travelTo ? clock(g.goStart) : undefined,
    goStart: clock(g.goStart),
    backEnd: clock(g.backEnd),
    go: s.travelTo ? rangeLabel(g.goStart, g.start) : undefined,
    back: s.travelFrom ? rangeLabel(g.end, g.backEnd) : undefined,
  };
}

/** Minutos que o item ocupa de verdade na agenda: compromisso + ida + volta. */
export function blockedMinutes(s: TimeSpan): number {
  const g = segmentsOf(s);
  return g.backEnd - g.goStart;
}

/**
 * O trecho do item ((ida | volta) ou o compromisso) que o dia `day` enxerga, em minutos do dia (0–1440), para desenhar.
 * Só desenha trajeto em item de um dia só; o que passa da meia-noite é cortado na borda do dia.
 */
export function dayParts(s: TimeSpan): { goStart: number; start: number; end: number; backEnd: number } | null {
  if (s.endDay !== undefined && s.endDay > s.day) return null;
  const g = segmentsOf(s);
  const base = s.day * 1440;
  const clip = (n: number) => Math.max(0, Math.min(1440, n - base));
  return { goStart: clip(g.goStart), start: clip(g.start), end: clip(g.end), backEnd: clip(g.backEnd) };
}

// ------------------------------------------------------------------ conflitos

export type Part = "ida" | "evento" | "volta";

export interface Conflict {
  /** id do outro item */
  id: string;
  title: string;
  /** qual trecho do item que está sendo criado/editado bate… */
  mine: Part;
  /** …com qual trecho do outro item */
  theirs: Part;
  /** o trecho do outro item, ex.: "14:40–15:00" */
  range: string;
  /** frase pronta para mostrar */
  message: string;
}

/** Item que pode entrar em conflito (compromisso/evento com horário, em aberto). */
export interface Occupant {
  id: string;
  title: string;
  span: TimeSpan;
}

const parts = (g: Segments): { part: Part; from: number; to: number }[] =>
  [
    { part: "ida" as const, from: g.goStart, to: g.start },
    { part: "evento" as const, from: g.start, to: g.end },
    { part: "volta" as const, from: g.end, to: g.backEnd },
  ].filter((p) => p.to > p.from);

const overlaps = (a: { from: number; to: number }, b: { from: number; to: number }) => a.from < b.to && b.from < a.to;

const way = (p: Part) => (p === "ida" ? "de ida" : "de volta");

/** Como chamar o trecho do OUTRO item numa frase. */
const theirLabel = (p: Part, title: string, range: string) => (p === "evento" ? `${title} (${range})` : `o deslocamento ${way(p)} da ${title} (${range})`);

/**
 * Prioridade: (1) o compromisso que está sendo criado/editado bate com algo do outro; (2) o trajeto dele bate com o compromisso
 * do outro; (3) só trajeto × trajeto. Dentro do mesmo grau, vale o que acontece primeiro no tempo.
 */
const tier = (mine: Part, theirs: Part) => (mine === "evento" ? 0 : theirs === "evento" ? 1 : 2);

function sentence(t: number, mine: Part, theirs: Part, title: string, range: string, more: string[]): string {
  if (t === 0) return `Esse horário entra em conflito com ${theirLabel(theirs, title, range)}.${more.length ? ` Também bate com ${more.join(" e ")}.` : ""}`;
  if (t === 1) return `O deslocamento ${way(mine)} deste compromisso entra em conflito com ${title} (${range}).`;
  return `O deslocamento ${way(mine)} deste compromisso se sobrepõe ao deslocamento ${way(theirs)} da ${title} (${range}).`;
}

/**
 * Conflitos de `mine` com os outros itens, considerando ida e volta. Um aviso por item (o mais sério).
 * Sem trajeto em nenhum dos dois lados, não avisa nada: o comportamento de quem não usa trajeto continua o de sempre.
 */
export function findConflicts(mine: TimeSpan | null, selfId: string | undefined, others: Occupant[]): Conflict[] {
  if (!mine) return [];
  const mineParts = parts(segmentsOf(mine));
  const out: (Conflict & { t: number; at: number })[] = [];
  for (const o of others) {
    if (o.id === selfId) continue;
    if (!hasTravel(mine) && !hasTravel(o.span)) continue;
    const hits: { a: Part; b: Part; from: number; to: number; at: number; t: number }[] = [];
    for (const a of mineParts) {
      for (const b of parts(segmentsOf(o.span))) {
        if (overlaps(a, b)) hits.push({ a: a.part, b: b.part, from: b.from, to: b.to, at: Math.max(a.from, b.from), t: tier(a.part, b.part) });
      }
    }
    if (!hits.length) continue;
    const t = Math.min(...hits.map((h) => h.t));
    const best = hits.filter((h) => h.t === t).sort((x, y) => x.at - y.at);
    const [h, ...rest] = best;
    const more = t === 0 ? rest.map((r) => theirLabel(r.b, o.title, rangeLabel(r.from, r.to))) : [];
    const range = rangeLabel(h.from, h.to);
    out.push({ id: o.id, title: o.title, mine: h.a, theirs: h.b, range, message: sentence(t, h.a, h.b, o.title, range, more), t, at: h.at });
  }
  return out.sort((x, y) => x.t - y.t || x.at - y.at).map(({ t: _t, at: _at, ...c }) => c);
}

const open = (status: string) => status !== "concluido";

/** Itens da agenda (app) que ocupam horário. */
export function occupantsOfTasks(tasks: Task[]): Occupant[] {
  const out: Occupant[] = [];
  for (const t of tasks) {
    const span = open(t.status) ? spanOfTask(t) : null;
    if (span) out.push({ id: t.id, title: t.title, span });
  }
  return out;
}

/** Itens da agenda no formato das rotas /api (datas "AAAA-MM-DD"). */
export function occupantsOfDtos(dtos: { id: string; title: string; kind: string; status: string; due: string; endDate?: string; time?: string; end?: string; travelTo?: number; travelFrom?: number }[]): Occupant[] {
  const out: Occupant[] = [];
  for (const d of dtos) {
    const span = open(d.status) ? spanOfIso({ kind: d.kind, date: d.due, endDate: d.endDate, time: d.time, end: d.end, travelTo: d.travelTo, travelFrom: d.travelFrom }) : null;
    if (span) out.push({ id: d.id, title: d.title, span });
  }
  return out;
}

/** Item proposto pela Ori (ainda não salvo) → intervalo. O fim padrão é o mesmo que a tela usa ao salvar (início + 1h). */
export function spanOfProposed(it: Pick<ProposedItem, "type" | "date" | "time" | "endTime" | "travelTo" | "travelFrom">): TimeSpan | null {
  if (!it.time) return null;
  const end = it.endTime ?? `${pad(Math.floor(Math.min(toMin(it.time) + DEFAULT_EVENT_MINUTES, 23 * 60 + 59) / 60))}:${pad(Math.min(toMin(it.time) + DEFAULT_EVENT_MINUTES, 23 * 60 + 59) % 60)}`;
  return spanOfIso({ kind: it.type === "appointment" ? "compromisso" : it.type === "event" ? "evento" : "tarefa", date: it.date, time: it.time, end, travelTo: it.travelTo, travelFrom: it.travelFrom });
}

/** Preenche `conflicts` de cada item proposto, comparando com a agenda real (nada é gravado). */
export function attachConflicts(items: ProposedItem[], tasks: Parameters<typeof occupantsOfDtos>[0]): ProposedItem[] {
  const others = occupantsOfDtos(tasks);
  return items.map((it) => {
    const found = findConflicts(spanOfProposed(it), undefined, others);
    return found.length ? { ...it, conflicts: found.map((c) => c.message) } : it;
  });
}

/** O item `t` (já com as alterações) bate com o quê? */
export const conflictsOfTask = (t: Task, tasks: Task[]): Conflict[] => findConflicts(spanOfTask(t), t.id, occupantsOfTasks(tasks));
