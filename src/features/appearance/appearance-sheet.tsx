"use client";

import { Check, Monitor, Moon, Sun, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { PALETTES, previewColors } from "@/theme/palettes";
import { useTheme, type Mode } from "@/theme/theme-provider";

const MODES: { id: Mode; label: string; icon: LucideIcon }[] = [
  { id: "light", label: "Claro", icon: Sun },
  { id: "dark", label: "Escuro", icon: Moon },
  { id: "system", label: "Sistema", icon: Monitor },
];

/** Modo (claro/escuro/sistema) e paleta. A troca é imediata; no celular abre como bottom sheet. */
export function AppearanceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <SheetBody onClose={onClose} />;
}

function SheetBody({ onClose }: { onClose: () => void }) {
  useScrollLock(true);
  const { paletteId, setPalette, mode, setMode, dark } = useTheme();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="animate-fade absolute inset-0 bg-foreground/25 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-label="Aparência"
        onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }}
        className="animate-sheetUp sm:animate-menuIn relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-pop sm:max-w-[560px] sm:rounded-xl"
      >
        <div className="flex items-center justify-between px-5 pb-1 pt-4">
          <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Aparência</h2>
          <button onClick={onClose} aria-label="Fechar" className="-mr-2 grid h-10 w-10 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-hover hover:text-foreground sm:h-8 sm:w-8">
            <X className="h-4 w-4" strokeWidth={1.6} />
          </button>
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-3">
          <p className="label-mono mb-2 text-[10px] tracking-[0.14em]">Modo</p>
          <div role="radiogroup" aria-label="Modo" className="grid grid-cols-3 gap-1 rounded-lg bg-hover p-1">
            {MODES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="radio"
                aria-checked={mode === id}
                onClick={() => setMode(id)}
                className={cn(
                  "flex h-11 items-center justify-center gap-2 rounded-md text-[13.5px] transition-colors sm:h-9",
                  mode === id ? "bg-surface font-medium shadow-soft" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.7} /> {label}
              </button>
            ))}
          </div>

          <p className="label-mono mb-2 mt-6 text-[10px] tracking-[0.14em]">Paleta</p>
          <div role="radiogroup" aria-label="Paleta" className="grid gap-2 sm:grid-cols-2">
            {PALETTES.map((p) => {
              const selected = p.id === paletteId;
              const tokens = dark ? p.dark : p.light;
              return (
                <button
                  key={p.id}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setPalette(p.id)}
                  className={cn(
                    "flex min-h-[60px] items-center gap-3 rounded-xl p-3 text-left ring-1 transition-[box-shadow,background-color] duration-150",
                    selected ? "bg-hover ring-2 ring-foreground" : "ring-border hover:bg-hover",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{p.name}</span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">{p.mood}</span>
                    <Dots colors={previewColors(tokens)} className="mt-2 hidden sm:flex" />
                  </span>
                  <Dots colors={previewColors(tokens)} className="sm:hidden" small />
                  <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full", selected ? "bg-foreground text-background" : "ring-1 ring-border")}>
                    {selected && <Check className="h-3.5 w-3.5" strokeWidth={2.4} />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="pb-safe" />
      </div>
    </div>
  );
}

/** Preview da paleta: fundo, sidebar, principal, trabalho e pessoal. */
function Dots({ colors, className, small }: { colors: string[]; className?: string; small?: boolean }) {
  return (
    <span className={cn("items-center", small ? "flex gap-1" : "flex gap-1.5", className)} aria-hidden>
      {colors.map((c, i) => (
        <span key={i} className={cn("shrink-0 rounded-full ring-1 ring-foreground/15", small ? "h-3 w-3" : "h-4 w-4")} style={{ background: `hsl(${c})` }} />
      ))}
    </span>
  );
}
