"use client";

import { useRef, useState, type DragEvent, type MouseEvent } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { CTX } from "@/lib/context";
import { fromMin, pad2, toMin } from "@/lib/dates";
import { dragProps, draggedId, isTaskDrag } from "@/lib/dnd";
import { useApp } from "@/lib/app-context";
import type { Task } from "@/types";

const HOUR_H = 64;


interface Ev { t: Task; s: number; e: number; col: number; cols: number }

/** Posiciona eventos lado a lado quando se sobrepõem. */
function layout(tasks: Task[]): Ev[] {
  const evs: Ev[] = tasks
    .map((t) => {
      const s = toMin(t.time!);
      let e = t.end ? toMin(t.end) : s + 45;
      if (e <= s) e = s + 30;
      return { t, s, e, col: 0, cols: 1 };
    })
    .sort((a, b) => a.s - b.s || a.e - b.e);

  let cluster: Ev[] = [];
  let colEnds: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    cluster.forEach((c) => (c.cols = colEnds.length));
    cluster = [];
    colEnds = [];
    clusterEnd = -1;
  };
  for (const ev of evs) {
    if (cluster.length && ev.s >= clusterEnd) flush();
    let col = colEnds.findIndex((end) => end <= ev.s);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(ev.e);
    } else colEnds[col] = ev.e;
    ev.col = col;
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, ev.e);
  }
  flush();
  return evs;
}

/** O dia como tempo: horas na lateral, blocos proporcionais à duração. */
export function DayTimeline({ tasks }: { tasks: Task[] }) {
  const { today, now, update, openTask, openAdd, toggle } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const [ghost, setGhost] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const evs = layout(tasks);
  const first = evs.length ? Math.floor(evs[0].s / 60) : 9;
  const last = evs.length ? Math.ceil(Math.max(...evs.map((e) => e.e)) / 60) : 18;
  const startH = Math.min(8, first - 1);
  const endH = Math.max(19, last);
  const height = (endH - startH) * HOUR_H;
  const hours = Array.from({ length: endH - startH + 1 }, (_, i) => startH + i);

  const minuteAt = (clientY: number, step: number) => {
    const rect = ref.current!.getBoundingClientRect();
    const raw = ((clientY - rect.top) / HOUR_H) * 60 + startH * 60;
    const snapped = Math.round(raw / step) * step;
    return Math.max(startH * 60, Math.min(snapped, endH * 60 - step));
  };

  const onDragOver = (e: DragEvent) => {
    if (!isTaskDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setGhost(minuteAt(e.clientY, 15));
  };
  const onDrop = (e: DragEvent) => {
    if (!isTaskDrag(e)) return;
    e.preventDefault();
    const id = draggedId(e);
    const min = minuteAt(e.clientY, 15);
    setGhost(null);
    const t = tasks.find((x) => x.id === id);
    // duração: preserva a do item; se já estava na linha do tempo ou tinha fim
    update(id, {
      due: today,
      time: fromMin(min),
      end: t?.end && t.time ? fromMin(min + toMin(t.end) - toMin(t.time)) : undefined,
    });
  };

  const onMove = (e: MouseEvent) => {
    if (e.target !== e.currentTarget) return setHover(null);
    setHover(minuteAt(e.clientY, 30));
  };
  const onClick = (e: MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    openAdd({ time: fromMin(minuteAt(e.clientY, 30)), due: today });
  };

  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : null;
  const showNow = nowMin !== null && nowMin >= startH * 60 && nowMin <= endH * 60;
  const topOf = (min: number) => ((min - startH * 60) / 60) * HOUR_H;

  return (
    <div
      ref={ref}
      className="relative mb-2 mt-5 select-none [--g:48px] sm:[--g:56px]"
      style={{ height }}
      onDragOver={onDragOver}
      onDragLeave={(e) => e.currentTarget === e.target && setGhost(null)}
      onDrop={onDrop}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
      onClick={onClick}
    >
      {hours.map((h) => (
        <div key={h} className="pointer-events-none absolute inset-x-0" style={{ top: (h - startH) * HOUR_H }}>
          <span
            className={cn(
              "absolute -top-[7px] left-0 font-mono text-[10.5px] tabular-nums text-cool/80",
              nowMin !== null && Math.abs(nowMin - h * 60) < 16 && "invisible",
            )}
            style={{ width: "calc(var(--g) - 12px)" }}
          >
            {pad2(h)}:00
          </span>
          <div className="absolute right-0 h-px bg-border/45" style={{ left: "var(--g)" }} />
        </div>
      ))}

      {/* sugestão ao passar o mouse num horário vazio */}
      {hover !== null && ghost === null && (
        <div className="pointer-events-none absolute inset-x-0 animate-fade" style={{ top: topOf(hover) }}>
          <span className="absolute -top-[7px] left-0 font-mono text-[11px] tabular-nums text-foreground" style={{ width: "calc(var(--g) - 12px)" }}>
            {fromMin(hover)}
          </span>
          <div className="absolute right-0 flex h-px items-center bg-foreground/30" style={{ left: "var(--g)" }}>
            <span className="absolute left-2 -translate-y-1/2 rounded bg-background px-1.5 font-mono text-[10px] text-muted-foreground">+ adicionar</span>
          </div>
        </div>
      )}

      {/* alvo do drag */}
      {ghost !== null && (
        <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: topOf(ghost) }}>
          <span className="absolute -top-[7px] left-0 rounded bg-foreground px-1 font-mono text-[11px] tabular-nums text-background" style={{ width: "calc(var(--g) - 12px)" }}>
            {fromMin(ghost)}
          </span>
          <div className="absolute right-0 h-0.5 rounded-full bg-foreground" style={{ left: "var(--g)" }} />
        </div>
      )}

      {evs.map(({ t, s, e, col, cols }) => {
        const h = Math.max(((e - s) / 60) * HOUR_H - 5, 32);
        const done = t.status === "concluido";
        const ctx = CTX[t.context];
        const checkable = t.kind === "tarefa" || t.kind === "lembrete";
        return (
          <div
            key={t.id}
            {...dragProps(t.id)}
            onClick={(ev) => { ev.stopPropagation(); openTask(t.id); }}
            className={cn(
              "group absolute cursor-pointer overflow-hidden rounded-[10px] pl-4 pr-2.5 text-left transition-[background-color,opacity] duration-150",
              "active:cursor-grabbing",
              ctx.tint,
              ctx.edge,
              done && "opacity-50",
            )}
            style={{
              top: topOf(s) + 2,
              height: h,
              left: `calc(var(--g) + 10px + (100% - var(--g) - 10px) * ${col / cols})`,
              width: `calc((100% - var(--g) - 10px) / ${cols} - 4px)`,
            }}
          >
            <span className={cn("absolute inset-y-0 left-0 w-1", ctx.bar)} />
            <div className="flex items-center gap-2 pt-[7px]">
              {checkable && (
                <span onClick={(ev) => ev.stopPropagation()} className="-ml-0.5 shrink-0">
                  <Checkbox checked={done} tone={t.context} onCheckedChange={() => toggle(t.id)} aria-label={`Concluir ${t.title}`} className="h-4 w-4" />
                </span>
              )}
              <p className={cn("min-w-0 flex-1 truncate text-[14px] font-semibold leading-tight tracking-[-0.005em]", done && "line-through")}>{t.title}</p>
              <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-cool">{t.time}</span>
            </div>
            {h >= 44 && (
              <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                {[t.context === "trabalho" ? t.client : undefined, ctx.label].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        );
      })}

      {showNow && (
        <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: topOf(nowMin!) }}>
          <span className="absolute -top-[7px] left-0 text-right font-mono text-[11px] font-medium tabular-nums text-urgent" style={{ width: "calc(var(--g) - 12px)" }}>
            {fromMin(nowMin!)}
          </span>
          <div className="absolute right-0 h-px bg-urgent" style={{ left: "var(--g)" }}>
            <span className="absolute -left-[3px] -top-[2.5px] h-1.5 w-1.5 rounded-full bg-urgent" />
          </div>
        </div>
      )}

      {evs.length === 0 && (
        <p className="pointer-events-none absolute inset-x-0 top-1/3 text-center text-sm text-muted-foreground/70">
          Dia livre. Clique num horário ou arraste uma tarefa.
        </p>
      )}
    </div>
  );
}
