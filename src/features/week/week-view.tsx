"use client";

import { useState, type DragEvent } from "react";
import { Bell, ChevronLeft, ChevronRight, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContextSwitch } from "@/components/context-switch";
import { ViewHeader } from "@/components/view-header";
import { SwipeRow } from "@/components/swipe-row";
import { useItemMenu } from "@/components/item-menu";
import { reminderLabel } from "@/lib/reminders";
import { cn } from "@/lib/utils";
import { CTX } from "@/lib/context";
import { addDays, byTime, monAbbr, pad2, sameDay, weekStart, weekdayShort } from "@/lib/dates";
import { dragProps, draggedId, isTaskDrag } from "@/lib/dnd";
import { matches, useApp } from "@/lib/app-context";
import { formatDuration, occursOn, scheduledMinutes } from "@/lib/task-utils";
import type { Task } from "@/types";

/** Um item da semana. No celular, deslizar para a esquerda revela Importante · Editar · Excluir. */
function WeekCard({ t }: { t: Task }) {
  const { openTask } = useApp();
  const menu = useItemMenu(t);
  return (
    <SwipeRow
      task={t}
      compact
      className="rounded-lg"
      layerProps={{
        ...dragProps(t.id),
        role: "button",
        tabIndex: 0,
        onClick: () => openTask(t.id),
        onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openTask(t.id); } },
        onContextMenu: menu.onContextMenu,
      }}
      layerClassName={cn(
        "relative cursor-pointer rounded-lg py-2 pl-3 pr-1.5 text-left lg:py-1.5 transition-colors duration-100 hover:bg-hover active:cursor-grabbing",
        t.status === "concluido" && "opacity-45",
      )}
    >
      <span className={cn("absolute inset-y-1.5 left-0 w-[0.125rem] rounded-full", CTX[t.context].bar)} />
      {(t.time || t.important || t.reminderMinutes !== undefined) && (
        <span className="flex items-center gap-1.5 font-mono text-[0.6563rem] tabular-nums text-muted-foreground">
          {t.time}
          {t.time && t.reminderMinutes !== undefined && t.status !== "concluido" && <Bell className="h-2.5 w-2.5" strokeWidth={1.8} aria-label={`Lembrete: ${reminderLabel(t.reminderMinutes)}`} role="img" />}
          {t.important && <Star className="h-2.5 w-2.5 fill-waiting text-waiting" strokeWidth={1.8} aria-label="Importante" role="img" />}
        </span>
      )}
      <span className={cn("block text-[0.875rem] leading-snug lg:text-[0.8125rem]", t.status === "concluido" && "line-through")}>{t.title}</span>
      {menu.menu}
    </SwipeRow>
  );
}

export function WeekView() {
  const { tasks, today, filter, update, openAdd } = useApp();
  const [offset, setOffset] = useState(0);
  const [over, setOver] = useState<string | null>(null);
  const start = addDays(weekStart(today), offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const vis = tasks.filter((t) => matches(t, filter));

  // Carga de cada dia: itens em aberto + horas agendadas, para enxergar os dias mais cheios
  const loads = days.map((day) => {
    const open = vis.filter((t) => occursOn(t, day) && t.status !== "concluido");
    const mins = scheduledMinutes(open);
    return { count: open.length, mins, weight: open.length + mins / 60 };
  });
  const maxWeight = Math.max(...loads.map((l) => l.weight), 1);
  const busiest = loads.reduce((b, l, i) => (l.weight > loads[b].weight ? i : b), 0);

  const drop = (e: DragEvent, day: Date) => {
    if (!isTaskDrag(e)) return;
    e.preventDefault();
    setOver(null);
    update(draggedId(e), { due: day });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-36 pt-6 sm:px-8 lg:px-10 xl:max-w-7xl xl:px-12 2xl:max-w-[87.5rem] sm:pt-16">
      <ViewHeader
        eyebrow="Semana"
        title={`${pad2(days[0].getDate())} ${monAbbr(days[0])} – ${pad2(days[6].getDate())} ${monAbbr(days[6])}`.toUpperCase()}
      >
        <ContextSwitch />
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => setOffset((o) => o - 1)} aria-label="Semana anterior"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setOffset(0)} disabled={offset === 0}>Hoje</Button>
          <Button variant="ghost" size="icon" onClick={() => setOffset((o) => o + 1)} aria-label="Próxima semana"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </ViewHeader>

      <div className="grid gap-y-2 lg:grid-cols-7">
        {days.map((day, di) => {
          const key = day.toISOString();
          const isToday = sameDay(day, today);
          const items = vis.filter((t) => occursOn(t, day)).sort(byTime);
          const load = loads[di];
          const heavy = di === busiest && load.count >= 3;
          return (
            <section
              key={key}
              onDragOver={(e) => { if (isTaskDrag(e)) { e.preventDefault(); setOver(key); } }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => drop(e, day)}
              className={cn(
                "group/day min-h-[7.5rem] border-t border-border px-1 py-3 transition-colors duration-150 lg:min-h-[22.5rem] lg:border-l lg:border-t-0 lg:px-3 lg:first:border-l-0",
                over === key && "bg-hover",
              )}
            >
              <div className="mb-3 flex items-center gap-2 lg:flex-col lg:items-start lg:gap-1">
                <span className="label-mono">{weekdayShort(day)}</span>
                <span
                  className={cn(
                    "grid h-8 min-w-8 place-items-center rounded-full px-1 text-[1.25rem] font-semibold tabular-nums tracking-tight",
                    isToday ? "bg-primary text-primary-foreground" : "text-foreground/80",
                  )}
                >
                  {pad2(day.getDate())}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5 lg:w-full lg:flex-none" title="Carga do dia">
                  <span className={cn("font-mono text-[0.6875rem] tabular-nums text-muted-foreground", heavy && "font-medium text-waiting")}>
                    {load.count === 0 ? "livre" : `${load.count} ${load.count === 1 ? "item" : "itens"}${load.mins ? ` · ${formatDuration(load.mins)}` : ""}`}
                  </span>
                  <span className="h-[0.1875rem] overflow-hidden rounded-full bg-muted">
                    <span className={cn("block h-full rounded-full transition-[width] duration-300", heavy ? "bg-waiting" : "bg-foreground/40")} style={{ width: `${(load.weight / maxWeight) * 100}%` }} />
                  </span>
                </div>
                <button
                  onClick={() => openAdd({ due: day })}
                  aria-label="Adicionar neste dia"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-muted-foreground opacity-100 transition-opacity hover:text-foreground lg:ml-0 lg:h-8 lg:w-8 lg:opacity-0 group-hover/day:opacity-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex flex-col gap-1">
                {items.map((t) => <WeekCard key={t.id} t={t} />)}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
