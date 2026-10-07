"use client";

import { CalendarDays, Columns3, Check, ListChecks, PanelLeftClose, PanelLeftOpen, Palette, Sun, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { Monogram, OriMonogram, Wordmark } from "./brand/logo";
import type { ViewId } from "@/lib/app-context";

interface Item { id: ViewId; label: string; icon?: LucideIcon; dot?: string; key: string; /** usa o símbolo oficial da ori no lugar de um ícone */ ori?: boolean }

const GROUPS: Item[][] = [
  [
    { id: "hoje", label: "Hoje", icon: Sun, key: "H" },
    { id: "semana", label: "Semana", icon: Columns3, key: "S" },
    { id: "calendario", label: "Calendário", icon: CalendarDays, key: "C" },
    { id: "tarefas", label: "Tarefas", icon: ListChecks, key: "T" },
    { id: "ori", label: "Ori", ori: true, key: "O" },
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
  onOpenAppearance: () => void;
}

export function Sidebar({ view, collapsed, touch, onNavigate, onToggleCollapsed, onOpenAppearance }: Props) {
  return (
    <div className={cn("pb-safe flex h-full flex-col px-2.5 py-4", !touch && (collapsed ? "lg:py-7 xl:py-8" : "lg:px-4 lg:py-7 xl:px-5 xl:py-8"))}>
      <div className={cn("mb-6 flex h-10 items-center text-foreground", !touch && "lg:mb-12 lg:h-14 xl:mb-14 xl:h-16", collapsed ? "justify-center" : cn("px-2.5", !touch && "lg:px-4"))}>
        {collapsed ? <Monogram tile className="h-[2.25rem] w-[2.25rem] shrink-0" /> : <Wordmark className={cn("h-[1.5rem] w-auto", !touch && "lg:h-[2.3125rem] xl:h-[2.6875rem]")} />}
      </div>

      <nav aria-label="Principal" className="flex flex-col">
        {GROUPS.map((group, gi) => (
          <div key={gi} className={cn("flex flex-col gap-0.5", !touch && "lg:gap-1.5", gi > 0 && "mt-3 border-t border-border/80 pt-3", gi > 0 && !touch && "lg:mt-6 lg:pt-6 xl:mt-7 xl:pt-7")}>
            {group.map(({ id, label, icon: Icon, dot, key, ori }) => {
              const active = id === view;
              return (
                <button
                  key={id}
                  onClick={() => onNavigate(id)}
                  title={collapsed ? label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg transition-colors duration-100", touch ? "h-11 text-[0.9375rem]" : "h-11 text-[0.9688rem] xl:h-12 xl:text-[1.0313rem]",
                    collapsed ? "justify-center px-0" : cn("px-2.5", !touch && "lg:px-4 lg:gap-4"),
                    active ? "bg-primary font-medium text-primary-foreground shadow-btn" : "text-foreground/80 hover:bg-surface/70 hover:text-foreground",
                  )}
                >
                  <span className={cn("grid h-4 w-4 shrink-0 place-items-center", !touch && "lg:h-6 lg:w-6")}>
                    {ori ? <OriMonogram crop accent={active ? "hsl(var(--ori-on-primary))" : undefined} className="h-[0.95rem] w-auto lg:h-[1.1rem] xl:h-[1.25rem]" /> : Icon ? <Icon className={cn("h-[0.9375rem] w-[0.9375rem]", !touch && "lg:h-[1.1875rem] lg:w-[1.1875rem] xl:h-[1.3125rem] xl:w-[1.3125rem]")} strokeWidth={1.7} /> : <span className={cn("h-2 w-2 rounded-full", dot, active && "ring-2 ring-primary-foreground/80")} />}
                  </span>
                  {!collapsed && <span className="flex-1 text-left">{label}</span>}
                  {!collapsed && !touch && <span className="kbd opacity-0 transition-opacity group-hover:opacity-100">G {key}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {touch ? (
        <div className="mt-auto flex flex-col gap-0.5">
          <div className="flex items-center justify-between">
            <button
              onClick={onOpenAppearance}
              className="flex h-11 items-center gap-2.5 rounded-lg px-2.5 text-[0.9375rem] text-foreground/80 transition-colors hover:bg-surface/70 hover:text-foreground"
            >
              <Palette className="h-[1rem] w-[1rem]" strokeWidth={1.7} /> Aparência
            </button>
            <ThemeToggle />
          </div>
        </div>
      ) : (
        <div className={cn("mt-auto flex gap-1", collapsed ? "flex-col items-center" : "items-center justify-between px-1")}>
          <button
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            title={collapsed ? "Expandir ( [ )" : "Recolher ( [ )"}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
          >
            {collapsed ? <PanelLeftOpen className="h-[0.9375rem] w-[0.9375rem]" strokeWidth={1.7} /> : <PanelLeftClose className="h-[0.9375rem] w-[0.9375rem]" strokeWidth={1.7} />}
          </button>
          <div className={cn("flex gap-0.5", collapsed && "flex-col items-center")}>
            <button
              onClick={onOpenAppearance}
              aria-label="Aparência e paleta"
              title="Aparência e paleta"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
            >
              <Palette className="h-[0.9375rem] w-[0.9375rem]" strokeWidth={1.7} />
            </button>
            <ThemeToggle />
          </div>
        </div>
      )}
    </div>
  );
}
