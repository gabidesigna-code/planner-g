"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell, CalendarDays, Columns3, Check, Clock, Diamond, ListChecks, Moon, Palette, SlidersHorizontal, Square, Sun, PanelLeft,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CTX } from "@/lib/context";
import { diffDays, fromMin, longDay, pad2, toMin } from "@/lib/dates";
import { parseQuick } from "@/lib/parse";
import { useTheme } from "@/theme/theme-provider";
import { useApp, type AddPreset, type ViewId } from "@/lib/app-context";
import type { Context, Kind, Task } from "@/types";

interface Entry {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  shortcut?: string;
  run: () => void;
  dot?: string;
  /** Abre o formulário completo (só nas opções de adicionar) */
  details?: () => void;
}

const TYPES: { kind: Kind; label: string; icon: LucideIcon }[] = [
  { kind: "tarefa", label: "Tarefa", icon: Square },
  { kind: "compromisso", label: "Compromisso", icon: Clock },
  { kind: "lembrete", label: "Lembrete", icon: Bell },
  { kind: "evento", label: "Evento", icon: Diamond },
];

export function CommandMenu({ open, preset, defaultContext, onClose, onCreate, onToggleSidebar }: {
  open: boolean;
  preset: AddPreset;
  defaultContext: Context;
  onClose: () => void;
  onCreate: (t: Task) => void;
  onToggleSidebar: () => void;
}) {
  const { today, navigate, openForm, openAppearance } = useApp();
  const { toggleMode } = useTheme();
  const [query, setQuery] = useState("");
  const [ctx, setCtx] = useState<Context>(defaultContext);
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setIdx(0);
    setCtx(defaultContext);
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open, defaultContext]);

  const parsed = useMemo(() => parseQuick(query, preset.due ?? today), [query, preset.due, today]);
  const time = parsed.time ?? preset.time;
  const dueDate = parsed.time || query ? parsed.due : preset.due ?? parsed.due;

  const when = (() => {
    const n = diffDays(dueDate, today);
    const day = n === 0 ? "Hoje" : n === 1 ? "Amanhã" : longDay(dueDate);
    return `${day} · ${time ?? "sem horário"}`;
  })();

  const entries: Entry[] = useMemo(() => {
    // Com texto: cria na hora. Sem texto (ou pelo botão de detalhes): abre o formulário completo.
    const details = (kind: Kind) => () => {
      openForm(kind, { context: ctx, due: dueDate, time, title: parsed.title || undefined });
      onClose();
    };
    const create = (kind: Kind) => () => {
      if (!parsed.title) return details(kind)();
      const withSlot = (kind === "compromisso" || kind === "evento") && time;
      onCreate({
        id: crypto.randomUUID(),
        title: parsed.title,
        context: ctx,
        kind,
        category: "Outros",
        priority: "normal",
        status: "a-fazer",
        due: dueDate,
        time,
        end: withSlot ? fromMin(Math.min(toMin(time!) + 60, 23 * 60 + 59)) : undefined,
      });
      onClose();
    };
    const adds: Entry[] = TYPES.map((t, i) => ({
      id: t.kind,
      label: t.label,
      hint: parsed.title ? `“${parsed.title}” · ${when}` : when,
      icon: t.icon,
      shortcut: `⌘${i + 1}`,
      run: create(t.kind),
      details: details(t.kind),
    }));
    if (query.trim()) return adds;
    const go = (v: ViewId, label: string, icon: LucideIcon, shortcut: string, dot?: string): Entry => ({
      id: v, label: `Ir para ${label}`, icon, shortcut, dot, run: () => { navigate(v); onClose(); },
    });
    return [
      ...adds,
      go("hoje", "Hoje", Sun, "G H"),
      go("semana", "Semana", Columns3, "G S"),
      go("calendario", "Calendário", CalendarDays, "G C"),
      go("tarefas", "Tarefas", ListChecks, "G T"),
      go("trabalho", "Trabalho", Square, "G W", CTX.trabalho.dot),
      go("pessoal", "Pessoal", Square, "G P", CTX.pessoal.dot),
      go("concluidos", "Concluídos", Check, "G D"),
      { id: "appearance", label: "Aparência e paleta", icon: Palette, run: () => { onClose(); openAppearance(); } },
      { id: "theme", label: "Alternar claro/escuro", icon: Moon, shortcut: "⇧D", run: () => { toggleMode(); onClose(); } },
      { id: "sidebar", label: "Recolher/expandir menu", icon: PanelLeft, shortcut: "[", run: () => { onToggleSidebar(); onClose(); } },
    ];
  }, [parsed.title, query, when, ctx, time, dueDate, onCreate, onClose, navigate, openForm, openAppearance, toggleMode, onToggleSidebar]);

  if (!open) return null;

  const safeIdx = Math.min(idx, entries.length - 1);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => (i + 1) % entries.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => (i - 1 + entries.length) % entries.length); }
    else if (e.key === "Enter") { e.preventDefault(); const en = entries[safeIdx]; if (e.shiftKey && en?.details) en.details(); else en?.run(); }
    else if (e.key === "Tab") { e.preventDefault(); setCtx((c) => (c === "trabalho" ? "pessoal" : "trabalho")); }
    else if ((e.metaKey || e.ctrlKey) && /^[1-4]$/.test(e.key)) { e.preventDefault(); entries[Number(e.key) - 1]?.run(); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-[7vh] sm:px-4 sm:pt-[14vh]">
      <div className="animate-fade absolute inset-0 bg-foreground/25 backdrop-blur-[2px]" onClick={onClose} />
      <div role="dialog" aria-label="Adicionar" onKeyDown={onKeyDown} className="animate-menuIn relative w-full max-w-[580px] overflow-hidden rounded-xl bg-surface shadow-pop">
        <div className="flex items-center gap-3 px-4 pt-4">
          <span className="label-mono">O que você quer adicionar?</span>
          <button
            onClick={() => setCtx((c) => (c === "trabalho" ? "pessoal" : "trabalho"))}
            title="Alternar contexto (Tab)"
            className="ml-auto flex items-center gap-1.5 rounded-md bg-hover px-2 py-1 text-xs transition-colors hover:bg-muted"
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", CTX[ctx].dot)} /> {CTX[ctx].label}
            <span className="kbd">Tab</span>
          </button>
        </div>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIdx(0); }}
          placeholder="Ex.: Dentista amanhã 16h"
          className="keep-size w-full bg-transparent px-4 pb-4 pt-3 text-[20px] font-medium tracking-[-0.02em] placeholder:text-muted-foreground/45 focus:outline-none"
        />
        <ul className="scroll-thin max-h-[52vh] sm:max-h-[340px] overflow-y-auto border-t border-border p-1.5">
          {entries.map((en, i) => {
            const Icon = en.icon;
            const isAdd = i < TYPES.length;
            return (
              <li key={en.id}>
                {i === TYPES.length && <p className="label-mono px-3 pb-1 pt-3 text-[10px]">Navegar</p>}
                <div className={cn("flex items-center rounded-lg transition-colors duration-75", i === safeIdx && "bg-hover")}>
                <button
                  onMouseEnter={() => setIdx(i)}
                  onClick={en.run}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-3 text-left sm:py-2"
                >
                  {en.dot ? (
                    <span className="grid h-[18px] w-[18px] place-items-center"><span className={cn("h-2 w-2 rounded-full", en.dot)} /></span>
                  ) : (
                    <Icon className={cn("h-[18px] w-[18px]", isAdd ? CTX[ctx].text : "text-muted-foreground")} strokeWidth={1.7} />
                  )}
                  <span className="text-[14px] font-medium">{en.label}</span>
                  {en.hint && <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">{en.hint}</span>}
                  {!en.hint && <span className="flex-1" />}
                  {en.shortcut && <span className="kbd hidden shrink-0 sm:grid">{en.shortcut}</span>}
                </button>
                {en.details && parsed.title && (
                  <button
                    onClick={en.details}
                    aria-label={`${en.label}: mais detalhes`}
                    title="Mais detalhes (⇧⏎)"
                    className="mr-1.5 grid h-10 w-10 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-8 sm:w-8"
                  >
                    <SlidersHorizontal className="h-4 w-4" strokeWidth={1.6} />
                  </button>
                )}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="hidden items-center gap-4 border-t border-border px-4 py-2.5 font-mono sm:flex text-[11px] text-muted-foreground">
          <span><span className="kbd">↑↓</span> navegar</span>
          <span><span className="kbd">⏎</span> criar</span>
          <span><span className="kbd">⇧⏎</span> detalhes</span>
          <span><span className="kbd">esc</span> fechar</span>
          <span className="ml-auto hidden sm:inline">{pad2(today.getDate())}/{pad2(today.getMonth() + 1)}</span>
        </div>
      </div>
    </div>
  );
}
