"use client";

import { useState, type DragEvent } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContextSwitch } from "@/components/context-switch";
import { TaskItem } from "@/components/task-item";
import { ViewHeader } from "@/components/view-header";
import { cn } from "@/lib/utils";
import { CTX } from "@/lib/context";
import { byTime, longDay, monthGrid, monthName, sameDay } from "@/lib/dates";
import { draggedId, isTaskDrag } from "@/lib/dnd";
import { matches, useApp } from "@/lib/app-context";
import { occursOn } from "@/lib/task-utils";

const HEAD = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

export function CalendarView() {
  const { tasks, today, filter, update, openAdd } = useApp();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = useState(today);
  const [over, setOver] = useState<string | null>(null);
  const vis = tasks.filter((t) => matches(t, filter));
  const cells = monthGrid(cursor.y, cursor.m);
  const selItems = vis.filter((t) => occursOn(t, selected)).sort(byTime);

  const shift = (n: number) => {
    const d = new Date(cursor.y, cursor.m + n, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };
  const drop = (e: DragEvent, day: Date) => {
    if (!isTaskDrag(e)) return;
    e.preventDefault();
    setOver(null);
    update(draggedId(e), { due: day });
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-36 pt-6 sm:px-8 lg:px-10 xl:max-w-5xl xl:px-12 2xl:max-w-6xl sm:pt-16">
      <ViewHeader eyebrow={String(cursor.y)} title={monthName(cursor.m)}>
        <ContextSwitch />
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Mês anterior"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => { setCursor({ y: today.getFullYear(), m: today.getMonth() }); setSelected(today); }}>Hoje</Button>
          <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Próximo mês"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </ViewHeader>

      <div className="animate-rise">
        <div className="mb-1 grid grid-cols-7">
          {HEAD.map((h) => <div key={h} className="label-mono py-2 pl-2 text-[0.625rem]">{h}</div>)}
        </div>
        <div className="grid grid-cols-7 border-l border-t border-border">
          {cells.map((day) => {
            const key = day.toISOString();
            const inMonth = day.getMonth() === cursor.m;
            const isToday = sameDay(day, today);
            const isSel = sameDay(day, selected);
            const items = vis.filter((t) => occursOn(t, day));
            return (
              <button
                key={key}
                onClick={() => setSelected(day)}
                onDoubleClick={() => openAdd({ due: day })}
                onDragOver={(e) => { if (isTaskDrag(e)) { e.preventDefault(); setOver(key); } }}
                onDragLeave={() => setOver(null)}
                onDrop={(e) => drop(e, day)}
                aria-label={longDay(day)}
                className={cn(
                  "flex min-h-[4.5rem] flex-col items-start gap-2 border-b border-r border-border p-2 text-left transition-colors duration-100 hover:bg-hover sm:min-h-[6rem]",
                  !inMonth && "text-muted-foreground/40",
                  isSel && "bg-muted",
                  over === key && "bg-muted ring-1 ring-inset ring-foreground/25",
                )}
              >
                <span className={cn("grid h-6 min-w-6 place-items-center rounded-full px-1 text-[0.8125rem] tabular-nums", isToday && "bg-foreground font-semibold text-background")}>
                  {day.getDate()}
                </span>
                <span className="flex flex-wrap gap-1">
                  {items.slice(0, 6).map((t) => (
                    <span key={t.id} className={cn("h-1.5 w-1.5 rounded-full", CTX[t.context].dot, t.status === "concluido" && "opacity-30")} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="mt-12 max-w-2xl">
        <div className="mb-2 flex items-center gap-3">
          <span className="label-mono">{longDay(selected)}</span>
          <span className="h-px flex-1 bg-border" />
          <button onClick={() => openAdd({ due: selected })} className="flex h-9 items-center gap-1.5 rounded-md px-2.5 text-[0.8125rem] text-muted-foreground transition-colors hover:bg-hover hover:text-foreground" aria-label="Adicionar neste dia">
            <Plus className="h-4 w-4" /> Adicionar
          </button>
        </div>
        {selItems.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground/70">Dia livre.</p>
        ) : (
          selItems.map((t) => <TaskItem key={t.id} task={t} showTime />)
        )}
      </section>
    </div>
  );
}
