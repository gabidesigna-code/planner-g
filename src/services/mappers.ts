import { fromIso, isoDate } from "@/lib/dates";
import {
  NO_CATEGORY,
  type Category, type Context, type Kind, type Priority, type Recurrence, type Status, type Subtask, type Task,
} from "@/types";

/**
 * Tradução entre o modelo do app (um `Task` único, com `kind`) e as tabelas:
 *   tarefa, lembrete        → tasks
 *   compromisso, evento     → events
 * Subtarefas e recorrência vivem em tabelas próprias.
 */

export interface SubtaskRow {
  id: string;
  task_id: string | null;
  event_id: string | null;
  title: string;
  completed: boolean;
  position: number;
}

export interface TaskRow {
  id: string;
  kind: "tarefa" | "lembrete";
  title: string;
  context: Context;
  category_id: string | null;
  client_project: string | null;
  topic: string | null;
  status: Status;
  waiting_on: string | null;
  priority: Priority;
  important?: boolean;
  reminder_minutes?: number | null;
  date: string;
  time: string | null;
  notes: string | null;
  completed_at: string | null;
  position: number;
  subtasks?: SubtaskRow[];
}

export interface EventRow {
  id: string;
  event_type: "compromisso" | "evento";
  title: string;
  context: Context;
  category_id: string | null;
  client_project: string | null;
  topic: string | null;
  status: Status;
  waiting_on: string | null;
  priority: Priority;
  important?: boolean;
  reminder_minutes?: number | null;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  completed_at: string | null;
  position: number;
  subtasks?: SubtaskRow[];
}

export interface RecurrenceRow {
  entity_type: "task" | "event";
  entity_id: string;
  frequency: Exclude<Recurrence, "none">;
}

export interface CategoryRow {
  id: string;
  name: string;
  context: Context;
  color: string | null;
  icon: string | null;
  position: number;
}

export const isEventKind = (k: Kind) => k === "compromisso" || k === "evento";
export const tableFor = (k: Kind) => (isEventKind(k) ? "events" : "tasks");
export const entityTypeFor = (k: Kind) => (isEventKind(k) ? "event" : "task");

/** "09:00:00" → "09:00" */
const hm = (t: string | null | undefined) => (t ? t.slice(0, 5) : undefined);

/** Índice das categorias do usuário (nome ⇄ id). "Outros" = sem categoria. */
export class CategoryIndex {
  private byId = new Map<string, Category>();
  private byKey = new Map<string, Category>();

  constructor(cats: Category[] = []) {
    for (const c of cats) {
      this.byId.set(c.id, c);
      this.byKey.set(`${c.context}:${c.name}`, c);
    }
  }
  nameFor(id: string | null): string {
    return (id && this.byId.get(id)?.name) || NO_CATEGORY;
  }
  idFor(name: string, context: Context): string | null {
    if (!name || name === NO_CATEGORY) return null;
    return this.byKey.get(`${context}:${name}`)?.id ?? null;
  }
}

export const categoryFromRow = (r: CategoryRow): Category => ({
  id: r.id, name: r.name, context: r.context, color: r.color ?? undefined, icon: r.icon ?? undefined,
});

const subtasksFromRows = (rows: SubtaskRow[] | undefined): Subtask[] | undefined => {
  if (!rows?.length) return undefined;
  return [...rows].sort((a, b) => a.position - b.position).map((s) => ({ id: s.id, title: s.title, done: s.completed }));
};

export function taskFromRow(r: TaskRow, cats: CategoryIndex, recurrence?: Recurrence): Task {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    context: r.context,
    category: cats.nameFor(r.category_id),
    topic: r.topic ?? undefined,
    due: fromIso(r.date),
    time: hm(r.time),
    client: r.client_project ?? undefined,
    priority: r.priority,
    important: r.important || undefined,
    reminderMinutes: r.reminder_minutes ?? undefined,
    status: r.status,
    note: r.notes ?? undefined,
    waitingOn: r.waiting_on ?? undefined,
    recurrence,
    subtasks: subtasksFromRows(r.subtasks),
    doneAt: r.completed_at ? new Date(r.completed_at) : undefined,
    position: r.position,
  };
}

export function eventFromRow(r: EventRow, cats: CategoryIndex, recurrence?: Recurrence): Task {
  return {
    id: r.id,
    kind: r.event_type,
    title: r.title,
    context: r.context,
    category: cats.nameFor(r.category_id),
    topic: r.topic ?? undefined,
    due: fromIso(r.start_date),
    endDate: r.end_date ? fromIso(r.end_date) : undefined,
    time: hm(r.start_time),
    end: hm(r.end_time),
    location: r.location ?? undefined,
    client: r.client_project ?? undefined,
    priority: r.priority,
    important: r.important || undefined,
    reminderMinutes: r.reminder_minutes ?? undefined,
    status: r.status,
    note: r.notes ?? undefined,
    waitingOn: r.waiting_on ?? undefined,
    recurrence,
    subtasks: subtasksFromRows(r.subtasks),
    doneAt: r.completed_at ? new Date(r.completed_at) : undefined,
    position: r.position,
  };
}

/** Colunas editáveis de uma tarefa/lembrete (sem o id). */
export function taskColumns(t: Task, cats: CategoryIndex) {
  return {
    kind: t.kind as "tarefa" | "lembrete",
    title: t.title.trim(),
    context: t.context,
    category_id: cats.idFor(t.category, t.context),
    client_project: t.client ?? null,
    topic: t.topic ?? null,
    status: t.status,
    waiting_on: t.waitingOn ?? null,
    priority: t.priority,
    important: !!t.important,
    reminder_minutes: t.time ? (t.reminderMinutes ?? null) : null,
    date: isoDate(t.due),
    time: t.time ?? null,
    notes: t.note ?? null,
    completed_at: t.doneAt ? t.doneAt.toISOString() : null,
    position: t.position ?? 0,
  };
}

/** Colunas editáveis de um compromisso/evento (sem o id). */
export function eventColumns(t: Task, cats: CategoryIndex) {
  return {
    event_type: t.kind as "compromisso" | "evento",
    title: t.title.trim(),
    context: t.context,
    category_id: cats.idFor(t.category, t.context),
    client_project: t.client ?? null,
    topic: t.topic ?? null,
    status: t.status,
    waiting_on: t.waitingOn ?? null,
    priority: t.priority,
    important: !!t.important,
    reminder_minutes: t.time ? (t.reminderMinutes ?? null) : null,
    start_date: isoDate(t.due),
    // o banco exige fim >= início; um fim anterior vira "sem data final"
    end_date: t.endDate && t.endDate.getTime() >= t.due.getTime() ? isoDate(t.endDate) : null,
    start_time: t.time ?? null,
    end_time: t.time && t.end ? t.end : null,
    location: t.location ?? null,
    notes: t.note ?? null,
    completed_at: t.doneAt ? t.doneAt.toISOString() : null,
    position: t.position ?? 0,
  };
}

export const columnsFor = (t: Task, cats: CategoryIndex) => (isEventKind(t.kind) ? eventColumns(t, cats) : taskColumns(t, cats));

export function subtaskRow(s: Subtask, index: number, parent: Task) {
  const event = isEventKind(parent.kind);
  return {
    id: s.id,
    task_id: event ? null : parent.id,
    event_id: event ? parent.id : null,
    title: s.title.trim(),
    completed: s.done,
    position: index,
  };
}

export function recurrenceRow(t: Task) {
  return {
    entity_type: entityTypeFor(t.kind),
    entity_id: t.id,
    frequency: t.recurrence as Exclude<Recurrence, "none">,
    interval: 1,
    start_date: isoDate(t.due),
  };
}
