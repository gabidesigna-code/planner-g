"use client";

import { CalendarDays, Columns3, Check, ListChecks, PanelLeftClose, PanelLeftOpen, Sun, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { Monogram, Wordmark } from "./brand/logo";
import type { ViewId } from "@/lib/app-context";

interface Item { id: ViewId; label: string; icon?: LucideIcon; dot?: string; key: string }

const GROUPS: Item[][] = [
  [
    { id: "hoje", label: "Hoje", icon: Sun, key: "H" },
    { id: "semana", label: "Semana", icon: Columns3, key: "S" },
    { id: "calendario", label: "Calendário", icon: CalendarDays, key: "C" },
    { id: "tarefas", label: "Tarefas", icon: ListChecks, key: "T" },
  ],
  [
    { id: "trabalho", label: "Trabalho", dot: "bg-work", key: "W" },
    { id: "pessoal", label: "Pessoal", dot: "bg-personal", key: "P" },
  ],
  [{ id: "concluidos", label: "Concluídos", icon: Check, key: "D" }],
];

interface Props {
  view: ViewId;
  collapsed: boolean;
  /** Drawer no celular: itens maiores, sem botão de recolher */
  touch?: boolean;
  onNavigate: (v: ViewId) => void;
  onToggleCollapsed: () => void;
}

export function Sidebar({ view, collapsed, touch, onNavigate, onToggleCollapsed }: Props) {
  return (
    <div className="pb-safe flex h-full flex-col px-2.5 py-4">
      <div className={cn("mb-6 flex h-10 items-center text-foreground", collapsed ? "justify-center" : "px-2.5")}>
        {collapsed ? <Monogram className="h-[34px] w-auto" /> : <Wordmark className="h-[34px] w-auto" />}
      </div>

      <nav aria-label="Principal" className="flex flex-col">
        {GROUPS.map((group, gi) => (
          <div key={gi} className={cn("flex flex-col gap-0.5", gi > 0 && "mt-3 border-t border-border/80 pt-3")}>
            {group.map(({ id, label, icon: Icon, dot, key }) => {
              const active = id === view;
              return (
                <button
                  key={id}
                  onClick={() => onNavigate(id)}
                  title={collapsed ? label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg transition-colors duration-100", touch ? "h-11 text-[15px]" : "h-8 text-[13.5px]",
                    collapsed ? "justify-center px-0" : "px-2.5",
                    active ? "bg-primary font-medium text-primary-foreground shadow-btn" : "text-foreground/80 hover:bg-surface/70 hover:text-foreground",
                  )}
                >
                  <span className="grid h-4 w-4 shrink-0 place-items-center">
                    {Icon ? <Icon className="h-[15px] w-[15px]" strokeWidth={1.7} /> : <span className={cn("h-2 w-2 rounded-full", dot, active && "ring-2 ring-primary-foreground/80")} />}
                  </span>
                  {!collapsed && <span className="flex-1 text-left">{label}</span>}
                  {!collapsed && !touch && <span className="kbd opacity-0 transition-opacity group-hover:opacity-100">G {key}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={cn("mt-auto flex gap-1", collapsed ? "flex-col items-center" : "items-center justify-between px-1")}>
        {touch ? (
          <span className="px-2 text-[13px] text-muted-foreground">Tema</span>
        ) : (
          <button
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            title={collapsed ? "Expandir ( [ )" : "Recolher ( [ )"}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
          >
            {collapsed ? <PanelLeftOpen className="h-[15px] w-[15px]" strokeWidth={1.7} /> : <PanelLeftClose className="h-[15px] w-[15px]" strokeWidth={1.7} />}
          </button>
        )}
        <ThemeToggle />
      </div>
    </div>
  );
}
