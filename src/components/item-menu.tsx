"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

/**
 * Menu do item (Importante · Editar · Excluir): o caminho SEM gesto para as mesmas ações do deslize,
 * e o menu do desktop. Abre por botão "…" ou por clique direito; fica num portal (não é cortado pela lista).
 */

type Pos = { x: number; y: number };
const MENU_W = 216;

function Popover({ task, pos, onClose }: { task: Task; pos: Pos; onClose: () => void }) {
  const { toggleImportant, openTask, confirmRemove } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<Pos>({ x: pos.x, y: pos.y });

  // mantém o menu dentro da tela (vira para cima / para a esquerda quando falta espaço)
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { offsetWidth: w, offsetHeight: h } = el;
    const x = Math.max(8, Math.min(pos.x, window.innerWidth - w - 8));
    const y = pos.y + h + 12 > window.innerHeight ? Math.max(8, pos.y - h - 8) : pos.y;
    setAt({ x, y });
  }, [pos]);

  useEffect(() => {
    const first = ref.current?.querySelector<HTMLElement>("[role=menuitem]");
    first?.focus();
    const down = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const items = [...(ref.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
      const i = items.indexOf(document.activeElement as HTMLElement);
      items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
    };
    document.addEventListener("pointerdown", down, true);
    window.addEventListener("keydown", key, true);
    window.addEventListener("scroll", onClose, { capture: true, passive: true });
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose]);

  const run = (fn: () => void) => () => { onClose(); fn(); };
  const item = "flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-[0.875rem] transition-colors hover:bg-hover focus-visible:bg-hover focus-visible:outline-none sm:h-9";

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={`Ações de ${task.title}`}
      // o menu vive num portal, mas os eventos subiriam pela árvore do React até a linha (e abririam o item)
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      className="animate-menuIn fixed z-[55] rounded-xl bg-surface p-1 shadow-pop"
      style={{ left: at.x, top: at.y, width: MENU_W }}
    >
      <button role="menuitem" className={item} onClick={run(() => toggleImportant(task.id))}>
        <Star className={cn("h-4 w-4", task.important && "fill-waiting text-waiting")} strokeWidth={1.7} />
        {task.important ? "Remover de importantes" : "Marcar como importante"}
      </button>
      <button role="menuitem" className={item} onClick={run(() => openTask(task.id))}>
        <Pencil className="h-4 w-4" strokeWidth={1.7} /> Editar
      </button>
      <button role="menuitem" className={cn(item, "text-urgent hover:bg-urgent-soft focus-visible:bg-urgent-soft")} onClick={run(() => confirmRemove(task.id))}>
        <Trash2 className="h-4 w-4" strokeWidth={1.7} /> Excluir
      </button>
    </div>,
    document.body,
  );
}

/** Estado do menu de um item + o clique direito. `menu` precisa ser renderizado junto do item. */
export function useItemMenu(task: Task) {
  const [pos, setPos] = useState<Pos | null>(null);
  const close = useCallback(() => setPos(null), []);
  return {
    menu: pos ? <Popover task={task} pos={pos} onClose={close} /> : null,
    onContextMenu: (e: ReactMouseEvent) => {
      e.preventDefault();
      setPos({ x: e.clientX, y: e.clientY + 4 });
    },
    openFrom: (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      setPos({ x: r.right - MENU_W, y: r.bottom + 4 });
    },
  };
}

/** Botão "…" do item. `menu` vem de useItemMenu (o mesmo estado do clique direito); quem usa renderiza `menu.menu` ao lado. */
export function ItemMenuButton({ task, menu, className }: { task: Task; menu: ReturnType<typeof useItemMenu>; className?: string }) {
  return (
    <button
      type="button"
      aria-haspopup="menu"
      aria-label={`Mais ações para ${task.title}`}
      onClick={(e) => { e.stopPropagation(); menu.openFrom(e.currentTarget); }}
      className={cn("grid place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", className)}
    >
      <MoreHorizontal className="h-4 w-4" strokeWidth={1.8} />
    </button>
  );
}
