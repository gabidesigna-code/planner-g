import { fromIso, isoDate } from "@/lib/dates";
import type { Context, Kind, Priority, Recurrence, Status, Task } from "@/types";

/**
 * Formato do item que trafega entre o navegador e as rotas /api.
 * Datas de calendário viajam como "AAAA-MM-DD" (sem fuso) e instantes como ISO.
 */
export interface TaskDto {
  id: string;
  kind: Kind;
  title: string;
  context: Context;
  category: string;
  topic?: string;
  due: string;
  endDate?: string;
  time?: string;
  end?: string;
  location?: string;
  client?: string;
  priority: Priority;
  important?: boolean;
  reminderMinutes?: number;
  status: Status;
  note?: string;
  waitingOn?: string;
  recurrence?: Recurrence;
  subtasks?: { id: string; title: string; done: boolean }[];
  doneAt?: string;
  position?: number;
}

export function toDto(t: Task): TaskDto {
  return {
    id: t.id, kind: t.kind, title: t.title, context: t.context, category: t.category, topic: t.topic,
    due: isoDate(t.due), endDate: t.endDate ? isoDate(t.endDate) : undefined,
    time: t.time, end: t.end, location: t.location, client: t.client,
    priority: t.priority, important: t.important || undefined, reminderMinutes: t.reminderMinutes, status: t.status, note: t.note, waitingOn: t.waitingOn, recurrence: t.recurrence,
    subtasks: t.subtasks?.map((s) => ({ id: s.id, title: s.title, done: s.done })),
    doneAt: t.doneAt ? t.doneAt.toISOString() : undefined,
    position: t.position,
  };
}

export function fromDto(d: TaskDto): Task {
  return {
    id: d.id, kind: d.kind, title: d.title, context: d.context, category: d.category, topic: d.topic,
    due: fromIso(d.due), endDate: d.endDate ? fromIso(d.endDate) : undefined,
    time: d.time, end: d.end, location: d.location, client: d.client,
    priority: d.priority, important: d.important || undefined, reminderMinutes: d.reminderMinutes, status: d.status, note: d.note, waitingOn: d.waitingOn, recurrence: d.recurrence,
    subtasks: d.subtasks?.map((s) => ({ id: s.id, title: s.title, done: s.done })),
    doneAt: d.doneAt ? new Date(d.doneAt) : undefined,
    position: d.position,
  };
}

// ----------------------------------------------------------------- validação (servidor)

export class ValidationError extends Error {}

const KINDS = ["tarefa", "compromisso", "lembrete", "evento"];
const CONTEXTS = ["trabalho", "pessoal"];
const PRIORITIES = ["urgente", "alta", "normal", "baixa"];
const STATUSES = ["a-fazer", "em-andamento", "aguardando", "pronto", "concluido"];
const RECURRENCES = ["none", "daily", "weekly", "monthly", "yearly"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;

const bad = (msg: string): never => {
  throw new ValidationError(msg);
};

function str(v: unknown, field: string, max: number, required = false): string | undefined {
  if (v === undefined || v === null || v === "") {
    if (required) bad(`${field} é obrigatório`);
    return undefined;
  }
  if (typeof v !== "string") bad(`${field} deve ser texto`);
  const s = v as string;
  if (s.length > max) bad(`${field} é longo demais`);
  if (required && !s.trim()) bad(`${field} é obrigatório`);
  return s;
}

function oneOf<T extends string>(v: unknown, list: string[], field: string): T {
  if (typeof v !== "string" || !list.includes(v)) bad(`${field} inválido`);
  return v as T;
}

function day(v: unknown, field: string, required = false): string | undefined {
  const s = str(v, field, 10, required);
  if (s === undefined) return undefined;
  if (!DAY.test(s) || Number.isNaN(Date.parse(`${s}T00:00:00Z`))) bad(`${field} inválida`);
  return s;
}

function hm(v: unknown, field: string): string | undefined {
  const s = str(v, field, 5);
  if (s === undefined) return undefined;
  if (!HM.test(s)) bad(`${field} inválido`);
  return s;
}

/** Confere o que chega do navegador (a chave do servidor ignora o RLS, então a borda precisa ser rigorosa). */
export function parseTaskDto(input: unknown): TaskDto {
  if (!input || typeof input !== "object") bad("corpo inválido");
  const o = input as Record<string, unknown>;
  const id = str(o.id, "id", 36, true)!;
  if (!UUID.test(id)) bad("id inválido");

  const subs = o.subtasks;
  if (subs !== undefined && (!Array.isArray(subs) || subs.length > 200)) bad("subtarefas inválidas");
  const subtasks = (subs as unknown[] | undefined)?.map((s) => {
    const so = (s ?? {}) as Record<string, unknown>;
    const sid = str(so.id, "id da subtarefa", 36, true)!;
    if (!UUID.test(sid)) bad("id da subtarefa inválido");
    if (typeof so.done !== "boolean") bad("estado da subtarefa inválido");
    return { id: sid, title: str(so.title, "título da subtarefa", 300, true)!, done: so.done as boolean };
  });

  const doneAt = str(o.doneAt, "doneAt", 40);
  if (doneAt && Number.isNaN(Date.parse(doneAt))) bad("doneAt inválido");
  if (o.important !== undefined && typeof o.important !== "boolean") bad("importante inválido");
  if (o.reminderMinutes !== undefined && o.reminderMinutes !== null && (!Number.isInteger(o.reminderMinutes) || (o.reminderMinutes as number) < 0 || (o.reminderMinutes as number) > 10_080)) bad("lembrete inválido");
  if (o.position !== undefined && (typeof o.position !== "number" || !Number.isFinite(o.position))) bad("position inválida");

  return {
    id,
    kind: oneOf<Kind>(o.kind, KINDS, "tipo"),
    title: str(o.title, "título", 500, true)!,
    context: oneOf<Context>(o.context, CONTEXTS, "contexto"),
    category: str(o.category, "categoria", 100) ?? "Outros",
    topic: str(o.topic, "tópico", 200),
    due: day(o.due, "data", true)!,
    endDate: day(o.endDate, "data final"),
    time: hm(o.time, "horário"),
    end: hm(o.end, "horário final"),
    location: str(o.location, "local", 300),
    client: str(o.client, "cliente", 200),
    priority: oneOf<Priority>(o.priority, PRIORITIES, "prioridade"),
    important: o.important === true ? true : undefined,
    reminderMinutes: typeof o.reminderMinutes === "number" ? o.reminderMinutes : undefined,
    status: oneOf<Status>(o.status, STATUSES, "status"),
    note: str(o.note, "observações", 10_000),
    waitingOn: str(o.waitingOn, "aguardando", 200),
    recurrence: o.recurrence === undefined ? undefined : oneOf<Recurrence>(o.recurrence, RECURRENCES, "recorrência"),
    subtasks: subtasks?.length ? subtasks : undefined,
    doneAt,
    position: o.position as number | undefined,
  };
}
