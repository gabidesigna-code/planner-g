"use client";

import { useState } from "react";
import { ChevronRight, Star } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { ItemMenuButton, useItemMenu } from "@/components/item-menu";
import { SwipeRow } from "@/components/swipe-row";
import { cn } from "@/lib/utils";
import { CTX, detail } from "@/lib/context";
import { relDay } from "@/lib/dates";
import { dragProps, draggedId, isTaskDrag } from "@/lib/dnd";
import { useApp } from "@/lib/app-context";
import type { Task } from "@/types";

/** Linha simples: título + uma linha de apoio. O resto vive no painel lateral. */
export function TaskItem({ task, showDay, showTime, reorderable }: { task: Task; showDay?: boolean; showTime?: boolean; reorderable?: boolean }) {
  const { toggle, openTask, today, selectedId, reorder } = useApp();
  const [over, setOver] = useState(false);
  const menu = useItemMenu(task);
  const done = task.status === "concluido";
  const subs = task.subtasks ?? [];
  const subsDone = subs.filter((s) => s.done).length;
  const day = showDay ? relDay(task.due, today) : null;
  const sub = [showTime ? task.time : undefined, detail(task)].filter(Boolean).join(" · ");

  return (
    <SwipeRow
      task={task}
      className="-mx-3 rounded-lg"
      layerProps={{
        ...dragProps(task.id),
        ...(reorderable && {
          onDragOver: (e: React.DragEvent) => { if (isTaskDrag(e)) { e.preventDefault(); e.stopPropagation(); setOver(true); } },
          onDragLeave: () => setOver(false),
          onDrop: (e: React.DragEvent) => {
            if (!isTaskDrag(e)) return;
            e.preventDefault();
            e.stopPropagation();
            setOver(false);
            reorder(draggedId(e), task.id);
          },
        }),
        onClick: () => openTask(task.id),
        onContextMenu: menu.onContextMenu,
      }}
      layerClassName={cn(
        "group flex cursor-pointer items-start gap-3 rounded-lg px-3 py-3 transition-colors sm:py-2 lg:py-3 duration-100 active:cursor-grabbing",
        "hover:bg-hover [&[draggable=true]:active]:opacity-60",
        selectedId === task.id && "bg-muted",
        over && "shadow-[inset_0_2px_0_hsl(var(--foreground)/0.4)]",
        done && "opacity-60",
      )}
    >
      <span className="mt-[0.125rem] shrink-0 lg:mt-[0.125rem]" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={done}
          tone={task.context}
          onCheckedChange={() => toggle(task.id)}
          aria-label={`Concluir ${task.title}`}
          className="lg:h-5 lg:w-5"
        />
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[0.9375rem] leading-[1.375rem] lg:text-[1rem] lg:leading-[1.5rem] transition-colors duration-200",
            done && "text-muted-foreground line-through decoration-muted-foreground/40",
          )}
        >
          {task.title}
        </p>
        {sub && <p className="truncate text-[0.8125rem] leading-[1.125rem] text-muted-foreground lg:text-[0.8438rem] lg:leading-[1.25rem]">{sub}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-2.5 pt-[0.3125rem] font-mono text-[0.6875rem] text-muted-foreground lg:pt-[0.375rem] lg:text-[0.7813rem]">
        {subs.length > 0 && (
          <span className="tabular-nums">
            {subsDone}/{subs.length}
          </span>
        )}
        {task.priority === "urgente" && !done && <span className="text-urgent">urgente</span>}
        {task.important && <Star className="h-3 w-3 fill-waiting text-waiting" strokeWidth={1.8} aria-label="Importante" role="img" />}
        {day && <span className={cn(day.late && !done && "text-urgent")}>{day.text}</span>}
        <ItemMenuButton
          task={task}
          menu={menu}
          className="-my-1.5 -mr-1.5 h-8 w-8 lg:opacity-0 lg:transition-opacity lg:focus-visible:opacity-100 lg:group-hover:opacity-100"
        />
        <ChevronRight className="-mr-1 hidden h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-60 lg:block" />
        <span className={cn("h-1.5 w-1.5 rounded-full", CTX[task.context].dot)} title={CTX[task.context].label} />
      </div>
      {menu.menu}
    </SwipeRow>
  );
}
