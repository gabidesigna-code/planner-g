"use client";

import { useMemo, useState } from "react";
import { ContextSwitch } from "@/components/context-switch";
import { TaskItem } from "@/components/task-item";
import { ViewHeader } from "@/components/view-header";
import { TaskFilterBar } from "./task-filter-bar";
import { DEFAULT_FILTERS, applyFilters, isFiltering, type TaskFilters } from "./task-filters";
import { byTime, diffDays, longDay } from "@/lib/dates";
import { isOpen, matches, useApp } from "@/lib/app-context";
import { allCategories, listCategories } from "@/services/category-service";
import type { Task } from "@/types";

export type TasksMode = "tarefas" | "trabalho" | "pessoal" | "concluidos";

const TITLE: Record<TasksMode, string> = {
  tarefas: "Tarefas",
  trabalho: "Trabalho",
  pessoal: "Pessoal",
  concluidos: "Concluídos",
};

function Group({ label, tasks }: { label: string; tasks: Task[] }) {
  if (!tasks.length) return null;
  return (
    <section className="mb-10">
      <div className="mb-2 flex items-center gap-3">
        <span className="label-mono">{label}</span>
        <span className="font-mono text-[11px] text-muted-foreground/60">{tasks.length}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      {tasks.map((t) => <TaskItem key={t.id} task={t} showDay showTime />)}
    </section>
  );
}

export function TasksView({ mode }: { mode: TasksMode }) {
  const { tasks, today, filter, recent } = useApp();
  const [filters, setFilters] = useState<TaskFilters>({ ...DEFAULT_FILTERS });
  const doneMode = mode === "concluidos";

  const scoped = useMemo(
    () => tasks.filter((t) => (mode === "trabalho" || mode === "pessoal" ? t.context === mode : matches(t, filter))),
    [tasks, mode, filter],
  );
  const categories = mode === "trabalho" || mode === "pessoal" ? listCategories(mode) : filter === "tudo" ? allCategories() : listCategories(filter);
  const clients = useMemo(() => [...new Set(scoped.map((t) => t.client).filter((c): c is string => !!c))].sort(), [scoped]);

  // Em Concluídos o status é fixo; nas demais o padrão é "em aberto"
  // (itens recém-concluídos continuam aparecendo, riscados, por alguns instantes).
  const effective: TaskFilters = doneMode ? { ...filters, status: "concluido" } : filters;
  const shown = applyFilters(scoped, effective, today).concat(
    !doneMode && filters.status === "abertas" ? scoped.filter((t) => t.status === "concluido" && recent.has(t.id) && applyFilters([{ ...t, status: "a-fazer" }], effective, today).length) : [],
  );
  const sort = (a: Task, b: Task) => diffDays(a.due, b.due) || byTime(a, b);

  let body: React.ReactNode;
  if (!shown.length) {
    body = (
      <p className="py-10 text-sm text-muted-foreground/70">
        {isFiltering(filters, doneMode) ? "Nada encontrado com esses filtros." : doneMode ? "Nada concluído ainda." : "Nada em aberto."}
      </p>
    );
  } else if (doneMode || filters.status === "concluido") {
    const done = shown.sort((a, b) => (b.doneAt?.getTime() ?? 0) - (a.doneAt?.getTime() ?? 0));
    const keys = [...new Set(done.map((t) => (t.doneAt ?? t.due).toDateString()))];
    body = keys.map((k) => {
      const items = done.filter((t) => (t.doneAt ?? t.due).toDateString() === k);
      const n = diffDays(items[0].doneAt ?? items[0].due, today);
      return <Group key={k} label={n === 0 ? "Hoje" : n === -1 ? "Ontem" : longDay(items[0].doneAt ?? items[0].due)} tasks={items} />;
    });
  } else {
    const sorted = shown.sort(sort);
    const open = sorted.filter((t) => isOpen(t, recent));
    const active = open.filter((t) => t.status !== "aguardando");
    const n = (t: Task) => diffDays(t.due, today);
    body = (
      <>
        <Group label="Atrasadas" tasks={active.filter((t) => n(t) < 0)} />
        <Group label="Hoje" tasks={active.filter((t) => n(t) === 0)} />
        <Group label="Próximos 7 dias" tasks={active.filter((t) => n(t) > 0 && n(t) <= 7)} />
        <Group label="Mais tarde" tasks={active.filter((t) => n(t) > 7)} />
        <Group label="Aguardando" tasks={open.filter((t) => t.status === "aguardando")} />
        <Group label="Concluídos" tasks={sorted.filter((t) => t.status === "concluido" && !recent.has(t.id))} />
      </>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pb-36 pt-6 sm:px-8 sm:pt-16">
      <ViewHeader eyebrow={mode === "trabalho" || mode === "pessoal" ? "Contexto" : "Tudo em aberto"} title={TITLE[mode]}>
        {(mode === "tarefas" || mode === "concluidos") && <ContextSwitch />}
      </ViewHeader>
      <TaskFilterBar value={filters} onChange={setFilters} categories={categories} clients={clients} hideStatus={doneMode} total={shown.length} />
      {body}
    </div>
  );
}
