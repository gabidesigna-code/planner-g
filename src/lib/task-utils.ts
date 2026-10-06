import { diffDays, toMin } from "./dates";
import type { Task } from "@/types";

/** O item ocorre neste dia? (eventos podem durar vários dias) */
export function occursOn(t: Task, day: Date) {
  if (diffDays(t.due, day) === 0) return true;
  return !!t.endDate && diffDays(t.due, day) < 0 && diffDays(t.endDate, day) >= 0;
}

/** Só tarefas e lembretes "atrasam"; compromisso passado simplesmente passou. */
export const canBeOverdue = (t: Task) => t.kind === "tarefa" || t.kind === "lembrete";

/** Minutos ocupados por itens com horário (sem fim = 1h). */
export function scheduledMinutes(items: Task[]) {
  return items.reduce((sum, t) => {
    if (!t.time) return sum;
    const end = t.end ? toMin(t.end) : toMin(t.time) + 60;
    return sum + Math.max(end - toMin(t.time), 15);
  }, 0);
}

/** 90 → "1h30", 120 → "2h", 45 → "45min" */
export function formatDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m}min`;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/** Texto para busca: título, observação, cliente, categoria. */
export function searchText(t: Task) {
  return [t.title, t.note, t.client, t.category, t.topic, t.location].filter(Boolean).join(" ").toLowerCase();
}
