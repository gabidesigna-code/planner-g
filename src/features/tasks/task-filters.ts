import { diffDays } from "@/lib/dates";
import { searchText } from "@/lib/task-utils";
import type { Priority, Status, Task } from "@/types";

export type PeriodFilter = "qualquer" | "atrasadas" | "hoje" | "7dias" | "mes";

export interface TaskFilters {
  q: string;
  /** "abertas" = tudo que não está concluído (padrão) */
  status: "abertas" | "todas" | Status;
  priority: "todas" | Priority;
  category: "todas" | string;
  period: PeriodFilter;
  client: "todos" | string;
}

export const DEFAULT_FILTERS: TaskFilters = {
  q: "",
  status: "abertas",
  priority: "todas",
  category: "todas",
  period: "qualquer",
  client: "todos",
};

export const PERIOD_LABEL: Record<PeriodFilter, string> = {
  qualquer: "Qualquer data",
  atrasadas: "Atrasadas",
  hoje: "Hoje",
  "7dias": "Próximos 7 dias",
  mes: "Este mês",
};

export function isFiltering(f: TaskFilters, hideStatus: boolean) {
  return (
    !!f.q.trim() ||
    (!hideStatus && f.status !== "abertas") ||
    f.priority !== "todas" ||
    f.category !== "todas" ||
    f.period !== "qualquer" ||
    f.client !== "todos"
  );
}

export function applyFilters(tasks: Task[], f: TaskFilters, today: Date): Task[] {
  const q = f.q.trim().toLowerCase();
  return tasks.filter((t) => {
    if (f.status === "abertas" ? t.status === "concluido" : f.status !== "todas" && t.status !== f.status) return false;
    if (f.priority !== "todas" && t.priority !== f.priority) return false;
    if (f.category !== "todas" && t.category !== f.category) return false;
    if (f.client !== "todos" && t.client !== f.client) return false;
    if (q && !searchText(t).includes(q)) return false;
    const n = diffDays(t.due, today);
    switch (f.period) {
      case "atrasadas": return n < 0 && t.status !== "concluido";
      case "hoje": return n === 0;
      case "7dias": return n >= 0 && n <= 7;
      case "mes": return t.due.getMonth() === today.getMonth() && t.due.getFullYear() === today.getFullYear();
      default: return true;
    }
  });
}
