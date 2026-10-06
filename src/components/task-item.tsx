"use client";

import { ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { CTX, detail } from "@/lib/context";
import { relDay } from "@/lib/dates";
import { dragProps } from "@/lib/dnd";
import { useApp } from "@/lib/app-context";
import type { Task } from "@/lib/types";

/** Linha simples: título + uma linha de apoio. O resto vive no painel lateral. */
export function TaskItem({ task, showDay, showTime }: { task: Task; showDay?: boolean; showTime?: boolean }) {
  const { toggle, openTask, today, selectedId } = useApp();
  const done = task.status === "concluido";
  const subs = task.subtasks ?? [];
  const subsDone = subs.filter((s) => s.done).length;
  const day = showDay ? relDay(task.due, today) : null;
  const sub = [showTime ? task.time : undefined, detail(task)].filter(Boolean).join(" · ");

  return (
    <div
      {...dragProps(task.id)}
      onClick={() => openTask(task.id)}
      className={cn(
        "group -mx-3 flex cursor-pointer items-start gap-3 rounded-lg px-3 py-3 transition-colors sm:py-2 duration-100 active:cursor-grabbing",
        "hover:bg-hover [&[draggable=true]:active]:opacity-60",
        selectedId === task.id && "bg-muted",
      )}
    >
      <span className="mt-[2px] shrink-0" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={done}
          tone={task.context}
          onCheckedChange={() => toggle(task.id)}
          aria-label={`Concluir ${task.title}`}
        />
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[15px] leading-[22px] transition-colors duration-200",
            done && "text-muted-foreground line-through decoration-muted-foreground/40",
          )}
        >
          {task.title}
        </p>
        {sub && <p className="truncate text-[13px] leading-[18px] text-muted-foreground">{sub}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-2.5 pt-[5px] font-mono text-[11px] text-muted-foreground">
        {subs.length > 0 && (
          <span className="tabular-nums">
            {subsDone}/{subs.length}
          </span>
        )}
        {task.priority === "urgente" && !done && <span className="text-urgent">urgente</span>}
        {day && <span className={cn(day.late && !done && "text-urgent")}>{day.text}</span>}
        <ChevronRight className="-mr-1 h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-60" />
        <span className={cn("h-1.5 w-1.5 rounded-full", CTX[task.context].dot)} title={CTX[task.context].label} />
      </div>
    </div>
  );
}
