"use client";

import { useState, type DragEvent } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContextSwitch } from "@/components/context-switch";
import { DayTimeline } from "@/components/day-timeline";
import { TaskItem } from "@/components/task-item";
import { cn } from "@/lib/utils";
import { CTX } from "@/lib/context";
import { addDays, byTime, dayTag, diffDays, greeting, monAbbr, pad2, weekdayName } from "@/lib/dates";
import { draggedId, isTaskDrag } from "@/lib/dnd";
import { isOpen, matches, useApp } from "@/lib/app-context";
import { canBeOverdue, occursOn } from "@/lib/task-utils";
import type { Task } from "@/types";

type Peek = "aguardando" | "concluidas" | null;

function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-3">
      <span className="label-mono">{children}</span>
      <span className="h-px flex-1 bg-border" />
      {right}
    </div>
  );
}

export function HomeView() {
  const { tasks, today, now, filter, recent, update, openAdd, ownerName } = useApp();
  const firstName = ownerName.trim().split(" ")[0];
  const [peek, setPeek] = useState<Peek>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [dropDay, setDropDay] = useState<number | null>(null);
  const [dropUntimed, setDropUntimed] = useState(false);

  const vis = tasks.filter((t) => matches(t, filter));
  const open = vis.filter((t) => isOpen(t, recent));
  const waiting = open.filter((t) => t.status === "aguardando");
  const active = open.filter((t) => t.status !== "aguardando");
  const overdue = active.filter((t) => canBeOverdue(t) && diffDays(t.due, today) < 0 && t.status !== "concluido").sort((a, b) => diffDays(a.due, b.due));
  const todays = vis.filter((t) => occursOn(t, today) && t.status !== "aguardando");
  const timeline = todays.filter((t) => t.time);
  const untimed = todays.filter((t) => !t.time && isOpen(t, recent));
  const doneToday = vis.filter((t) => t.status === "concluido" && t.doneAt && diffDays(t.doneAt, today) === 0);

  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i + 1)).map((d, i) => ({
    offset: i + 1,
    date: d,
    items: active.filter((t) => occursOn(t, d) && t.status !== "concluido").sort(byTime),
  })).filter((d) => d.items.length > 0);

  const peeks: { id: Exclude<Peek, null>; n: number; label: string; dot: string; tone: string; items: Task[] }[] = [
    { id: "aguardando", n: waiting.length, label: "aguardando", dot: "bg-waiting", tone: "text-waiting", items: waiting },
    { id: "concluidas", n: doneToday.length, label: doneToday.length === 1 ? "concluída" : "concluídas", dot: "bg-done", tone: "text-done", items: doneToday },
  ];
  const peeking = peeks.find((p) => p.id === peek);

  const onDropDay = (e: DragEvent, date: Date) => {
    if (!isTaskDrag(e)) return;
    e.preventDefault();
    update(draggedId(e), { due: date });
    setDropDay(null);
  };

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pb-36 pt-6 sm:px-8 sm:pb-32 sm:pt-16">
      <header className="animate-rise flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <p className="label-mono text-[12px] text-work">{weekdayName(today)}</p>
          <h1 className="mt-2 text-[84px] font-bold leading-[0.82] tracking-[-0.065em] sm:text-[116px]">
            {pad2(today.getDate())}{" "}
            <span className="text-work/55">{monAbbr(today).toUpperCase()}</span>
          </h1>
          <p className="mt-4 min-h-[20px] text-[14px] text-muted-foreground">{greeting(now)}{firstName ? `, ${firstName}` : ""}.</p>
        </div>
        <Button onClick={() => openAdd()} className="w-full shrink-0 sm:mt-1 sm:w-auto">
          <Plus className="h-4 w-4" strokeWidth={2} /> Adicionar <span className="kbd ml-1 hidden border-background/20 bg-background/10 text-background/70 sm:grid">N</span>
        </Button>
      </header>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:gap-x-4">
        <div className="-mx-1 flex flex-wrap items-center gap-1">
          {peeks.filter((p) => p.n > 0).map((p) => (
            <button
              key={p.id}
              onClick={() => setPeek(peek === p.id ? null : p.id)}
              aria-pressed={peek === p.id}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-2 font-mono text-[12px] transition-colors duration-150 sm:px-2 sm:py-1",
                peek === p.id ? "bg-muted font-medium" : "hover:bg-hover",
                p.tone,
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", p.dot)} />
              {p.n} {p.label}
            </button>
          ))}
        </div>
        <ContextSwitch />
      </div>

      {peeking && (
        <div className="animate-rise mt-3 border-l-2 border-border pl-4">
          {peeking.items.map((t) => (
            <TaskItem key={t.id} task={t} showDay />
          ))}
        </div>
      )}

      <section className="mt-10 sm:mt-12">
        <SectionLabel>Hoje</SectionLabel>
        <DayTimeline tasks={timeline} />
      </section>

      <section
        className={cn("-mx-3 mt-10 rounded-xl sm:mt-12 px-3 pb-2 transition-colors duration-150", dropUntimed && "bg-hover ring-1 ring-dashed ring-foreground/20")}
        onDragOver={(e) => { if (isTaskDrag(e)) { e.preventDefault(); setDropUntimed(true); } }}
        onDragLeave={() => setDropUntimed(false)}
        onDrop={(e) => {
          if (!isTaskDrag(e)) return;
          e.preventDefault();
          setDropUntimed(false);
          update(draggedId(e), { due: today, time: undefined, end: undefined });
        }}
      >
        <div className="px-0"><SectionLabel>Para resolver hoje</SectionLabel></div>
        {untimed.length === 0 ? (
          <p className="py-3 text-sm text-muted-foreground/70">Nada solto por enquanto.</p>
        ) : (
          untimed.map((t) => <TaskItem key={t.id} task={t} reorderable />)
        )}
        <button
          onClick={() => openAdd({ due: today })}
          className="-mx-0 mt-1 flex w-full items-center gap-3 rounded-lg px-0 py-2 text-[14px] text-muted-foreground/70 transition-colors hover:text-foreground"
        >
          <Plus className="h-[18px] w-[18px] p-0.5" strokeWidth={1.8} /> Nova tarefa
        </button>
      </section>

      {overdue.length > 0 && (
        <section className="mt-10 sm:mt-12">
          <div className="mb-1 flex items-center gap-3">
            <span className="label-mono text-urgent">Atrasadas</span>
            <span className="font-mono text-[11px] tabular-nums text-urgent/70">{overdue.length}</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          {overdue.map((t) => <TaskItem key={t.id} task={t} showDay />)}
        </section>
      )}

      {days.length > 0 && (
        <section className="mt-10 sm:mt-12">
          <SectionLabel>Próximos dias</SectionLabel>
          <div>
            {days.map(({ offset, date, items }) => {
              const isOpen = expanded === offset;
              return (
                <div
                  key={offset}
                  onDragOver={(e) => { if (isTaskDrag(e)) { e.preventDefault(); setDropDay(offset); } }}
                  onDragLeave={() => setDropDay(null)}
                  onDrop={(e) => onDropDay(e, date)}
                  className={cn("-mx-3 rounded-lg px-3 transition-colors duration-150", dropDay === offset && "bg-hover ring-1 ring-foreground/20")}
                >
                  <button
                    onClick={() => setExpanded(isOpen ? null : offset)}
                    aria-expanded={isOpen}
                    className="group flex w-full items-center gap-4 py-2.5 text-left"
                  >
                    <span className="w-16 font-mono text-[13px] font-medium tracking-wide">{dayTag(date)}</span>
                    <span className="flex-1 text-[14px] text-muted-foreground transition-colors group-hover:text-foreground">
                      {items.length} {items.length === 1 ? "coisa" : "coisas"}
                    </span>
                    <span className="flex items-center gap-1">
                      {items.slice(0, 6).map((t) => (
                        <span key={t.id} className={cn("h-1.5 w-1.5 rounded-full", CTX[t.context].dot)} />
                      ))}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="animate-rise pb-2 pl-1">
                      {items.map((t) => <TaskItem key={t.id} task={t} showTime />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <QuickNote />
    </div>
  );
}

function QuickNote() {
  const { note } = useApp();
  return (
    <section className="mt-10 sm:mt-12">
      <SectionLabel>Nota rápida</SectionLabel>
      <textarea
        value={note.text}
        onChange={(e) => note.set(e.target.value)}
        disabled={!note.ready}
        placeholder="Anote qualquer coisa…"
        rows={3}
        className="scroll-thin w-full resize-none bg-transparent text-[14px] leading-relaxed placeholder:text-muted-foreground/50 focus:outline-none"
      />
    </section>
  );
}
