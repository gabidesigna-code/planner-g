"use client";

import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIORITY_LABEL, STATUS_LABEL, type Priority, type Status } from "@/types";
import { DEFAULT_FILTERS, PERIOD_LABEL, isFiltering, type PeriodFilter, type TaskFilters } from "./task-filters";

const select =
  "h-9 shrink-0 rounded-full bg-surface/70 pl-3 pr-2 text-[0.8125rem] ring-1 ring-border/70 transition-colors hover:bg-hover focus:outline-none focus-visible:ring-foreground/30 sm:h-8";
const active = "bg-muted font-medium ring-foreground/25";

interface Props {
  value: TaskFilters;
  onChange: (f: TaskFilters) => void;
  categories: string[];
  clients: string[];
  /** Na tela Concluídos o status é fixo */
  hideStatus?: boolean;
  total: number;
}

/** Busca + filtros. No celular os seletores rolam na horizontal (a página nunca). */
export function TaskFilterBar({ value, onChange, categories, clients, hideStatus, total }: Props) {
  const set = <K extends keyof TaskFilters>(k: K, v: TaskFilters[K]) => onChange({ ...value, [k]: v });
  const dirty = isFiltering(value, !!hideStatus);

  return (
    <div className="mb-8 flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.7} />
        <input
          type="search"
          value={value.q}
          onChange={(e) => set("q", e.target.value)}
          placeholder="Buscar por título, observação, cliente ou categoria"
          aria-label="Buscar tarefas"
          className="h-11 w-full rounded-lg border border-border bg-surface pl-9 pr-9 text-[0.875rem] placeholder:text-muted-foreground/60 hover:border-foreground/25 focus:border-foreground/40 focus:outline-none sm:h-9 [&::-webkit-search-cancel-button]:hidden"
        />
        {value.q && (
          <button onClick={() => set("q", "")} aria-label="Limpar busca" className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
        {!hideStatus && (
          <select aria-label="Status" value={value.status} onChange={(e) => set("status", e.target.value as TaskFilters["status"])} className={cn(select, value.status !== "abertas" && active)}>
            <option value="abertas">Em aberto</option>
            <option value="todas">Todos os status</option>
            {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        )}
        <select aria-label="Prioridade" value={value.priority} onChange={(e) => set("priority", e.target.value as TaskFilters["priority"])} className={cn(select, value.priority !== "todas" && active)}>
          <option value="todas">Prioridade</option>
          {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
        </select>
        <select aria-label="Categoria" value={value.category} onChange={(e) => set("category", e.target.value)} className={cn(select, value.category !== "todas" && active)}>
          <option value="todas">Categoria</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select aria-label="Data" value={value.period} onChange={(e) => set("period", e.target.value as PeriodFilter)} className={cn(select, value.period !== "qualquer" && active)}>
          {(Object.keys(PERIOD_LABEL) as PeriodFilter[]).map((p) => <option key={p} value={p}>{p === "qualquer" ? "Data" : PERIOD_LABEL[p]}</option>)}
        </select>
        {clients.length > 0 && (
          <select aria-label="Cliente ou projeto" value={value.client} onChange={(e) => set("client", e.target.value)} className={cn(select, value.client !== "todos" && active)}>
            <option value="todos">Cliente / projeto</option>
            {clients.map((c) => <option key={c}>{c}</option>)}
          </select>
        )}
        {dirty && (
          <button onClick={() => onChange({ ...DEFAULT_FILTERS, status: hideStatus ? value.status : "abertas" })} className="h-9 shrink-0 rounded-full px-3 text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground sm:h-8">
            Limpar
          </button>
        )}
        <span className="ml-auto shrink-0 pl-2 font-mono text-[0.6875rem] tabular-nums text-muted-foreground/70">{total} {total === 1 ? "item" : "itens"}</span>
      </div>
    </div>
  );
}
