import { addDays, startOfDay } from "./dates";
import type { Recurrence, Task } from "@/types";

function nextDate(d: Date, rule: Exclude<Recurrence, "none">): Date {
  if (rule === "daily") return addDays(d, 1);
  if (rule === "weekly") return addDays(d, 7);
  const months = rule === "monthly" ? 1 : 12;
  const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d.getDate(), last)); // 31 → último dia do mês curto
  return startOfDay(target);
}

/** Próxima ocorrência de um item recorrente (ou null). Subtarefas voltam desmarcadas. */
export function nextOccurrence(t: Task): Task | null {
  if (!t.recurrence || t.recurrence === "none") return null;
  const due = nextDate(t.due, t.recurrence);
  const span = t.endDate ? t.endDate.getTime() - t.due.getTime() : null;
  return {
    ...t,
    id: crypto.randomUUID(),
    due,
    endDate: span === null ? undefined : new Date(due.getTime() + span),
    status: "a-fazer",
    doneAt: undefined,
    subtasks: t.subtasks?.map((s) => ({ ...s, id: crypto.randomUUID(), done: false })),
  };
}
