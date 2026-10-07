"use client";

import { cn } from "@/lib/utils";
import { CTX } from "@/lib/context";
import { useApp } from "@/lib/app-context";
import type { ContextFilter } from "@/types";

const OPTIONS: { id: ContextFilter; label: string; dot?: string; on: string }[] = [
  { id: "tudo", label: "Tudo", on: "bg-primary text-primary-foreground" },
  { id: "trabalho", label: "Trabalho", dot: CTX.trabalho.dot, on: "bg-work text-work-foreground" },
  { id: "pessoal", label: "Pessoal", dot: CTX.pessoal.dot, on: "bg-personal text-personal-foreground" },
];

/** Chips compactos. No celular rolam na horizontal; atalhos 1 · 2 · 3. */
export function ContextSwitch() {
  const { filter, setFilter } = useApp();
  return (
    <div
      role="tablist"
      aria-label="Filtrar por contexto"
      className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:gap-1 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {OPTIONS.map((o) => {
        const active = o.id === filter;
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={active}
            onClick={() => setFilter(o.id)}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-[0.8438rem] transition-[background-color,color,box-shadow] duration-150 sm:h-8 sm:px-3.5 sm:text-[0.8125rem] lg:h-9 lg:px-4 lg:text-[0.875rem]",
              active
                ? cn(o.on, "font-medium")
                : "bg-surface/70 text-foreground/70 ring-1 ring-border/70 hover:bg-hover hover:text-foreground sm:bg-transparent sm:ring-0",
            )}
          >
            {o.dot && <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-current" : o.dot)} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
