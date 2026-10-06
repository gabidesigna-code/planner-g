"use client";

import { useState, type DragEvent } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContextSwitch } from "@/components/context-switch";
import { ViewHeader } from "./view-header";
import { cn } from "@/lib/utils";
import { CTX } from "@/lib/context";
import { addDays, byTime, monAbbr, pad2, sameDay, weekStart, weekdayShort } from "@/lib/dates";
import { dragProps, draggedId, isTaskDrag } from "@/lib/dnd";
import { matches, useApp } from "@/lib/app-context";

export function WeekView() {
  const { tasks, today, filter, update, openTask, openAdd } = useApp();
  const [offset, setOffset] = useState(0);
  const [over, setOver] = useState<string | null>(null);
  const start = addDays(weekStart(today), offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const vis = tasks.filter((t) => matches(t, filter));

  const drop = (e: DragEvent, day: Date) => {
    if (!isTaskDrag(e)) return;
    e.preventDefault();
    setOver(null);
    update(draggedId(e), { due: day });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-36 pt-6 sm:px-8 sm:pt-16">
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
        {days.map((day) => {
          const key = day.toISOString();
          const isToday = sameDay(day, today);
          const items = vis.filter((t) => sameDay(t.due, day)).sort(byTime);
          return (
            <section
              key={key}
              onDragOver={(e) => { if (isTaskDrag(e)) { e.preventDefault(); setOver(key); } }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => drop(e, day)}
              className={cn(
                "group/day min-h-[120px] border-t border-border px-1 py-3 transition-colors duration-150 lg:min-h-[360px] lg:border-l lg:border-t-0 lg:px-3 lg:first:border-l-0",
                over === key && "bg-hover",
              )}
            >
              <div className="mb-3 flex items-center gap-2 lg:flex-col lg:items-start lg:gap-1">
                <span className="label-mono">{weekdayShort(day)}</span>
                <span
                  className={cn(
                    "grid h-8 min-w-8 place-items-center rounded-full px-1 text-[20px] font-semibold tabular-nums tracking-tight",
                    isToday ? "bg-primary text-primary-foreground" : "text-foreground/80",
                  )}
                >
                  {pad2(day.getDate())}
                </span>
                <button
                  onClick={() => openAdd({ due: day })}
                  aria-label="Adicionar neste dia"
                  className="ml-auto rounded-md p-2 text-muted-foreground opacity-100 transition-opacity hover:text-foreground lg:opacity-0 group-hover/day:opacity-100 lg:ml-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex flex-col gap-1">
                {items.map((t) => (
                  <button
                    key={t.id}
                    {...dragProps(t.id)}
                    onClick={() => openTask(t.id)}
                    className={cn(
                      "relative cursor-pointer rounded-lg py-2 pl-3 pr-1.5 text-left lg:py-1.5 transition-colors duration-100 hover:bg-hover active:cursor-grabbing",
                      t.status === "concluido" && "opacity-45",
                    )}
                  >
                    <span className={cn("absolute inset-y-1.5 left-0 w-[2px] rounded-full", CTX[t.context].bar)} />
                    {t.time && <span className="block font-mono text-[10.5px] tabular-nums text-muted-foreground">{t.time}</span>}
                    <span className={cn("block text-[14px] leading-snug lg:text-[13px]", t.status === "concluido" && "line-through")}>{t.title}</span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
