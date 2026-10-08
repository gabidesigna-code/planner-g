"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type HTMLAttributes, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Pencil, Star, Trash2 } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { swipeStore, useSwipeOpen } from "@/lib/swipe-store";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

/**
 * Deslizar para a esquerda revela as ações do item: ★ Importante · ✏ Editar · 🗑 Excluir (nessa ordem).
 *
 * O gesto só REVELA: nada é executado por arrastar. Excluir ainda pede confirmação.
 *
 * Como não briga com a rolagem vertical:
 *  - a linha usa `touch-action: pan-y`: o navegador cuida da rolagem vertical e só repassa o movimento
 *    horizontal. Se o dedo sobe/desce, o navegador assume e cancela o ponteiro (nós só desistimos).
 *  - nenhum movimento vira gesto antes de passar `SLOP` px, e só se for claramente mais horizontal
 *    (`LOCK_RATIO`) que vertical. Depois de "travar" no horizontal, a linha acompanha o dedo.
 *  - só funciona com toque (`pointerType === "touch"`): no desktop não há gesto.
 */

const BTN = 56; // largura de cada ação (px)
const BTN_COMPACT = 46;
const SLOP = 10; // movimento mínimo antes de decidir que é um gesto
const LOCK_RATIO = 1.4; // quão mais horizontal que vertical precisa ser
const OPEN_FRACTION = 0.35; // fração da largura das ações que o dedo precisa percorrer para abrir (ou fechar)
const FLICK = 0.45; // px/ms: um gesto rápido abre mesmo que curto
const MIN_FLICK_DIST = 24;
const DESKTOP = "(min-width: 1024px)";
const EASE = "transform 220ms cubic-bezier(.2,.8,.2,1)";

interface Props {
  task: Task;
  /** versão para blocos baixos (linha do tempo, semana): só ícones, botões mais estreitos */
  compact?: boolean;
  /** geometria da linha (ex.: posição absoluta na linha do tempo) */
  className?: string;
  style?: CSSProperties;
  /** a camada que desliza: classes e props (cliques, drag) do item em si */
  layerClassName?: string;
  layerProps?: HTMLAttributes<HTMLDivElement>;
  children: ReactNode;
}

interface Drag {
  id: number;
  x0: number;
  y0: number;
  base: number; // 0 (fechada) ou -W (aberta) quando o dedo encostou
  locked: boolean;
  x: number; // posição atual da camada
  lastX: number;
  lastT: number;
  v: number; // velocidade horizontal (px/ms)
}

export function SwipeRow({ task, compact, className, style, layerClassName, layerProps, children }: Props) {
  const { toggleImportant, openTask, confirmRemove } = useApp();
  const key = useId();
  const open = useSwipeOpen(key);
  const [engaged, setEngaged] = useState(false); // ações montadas (arrastando ou abertas)
  const outer = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const first = useRef(true);
  const guardUntil = useRef(0); // ignora o clique que o navegador dispara logo depois de um arrasto
  const W = (compact ? BTN_COMPACT : BTN) * 3;

  const place = (x: number, animate: boolean) => {
    const el = layer.current;
    if (!el) return;
    el.style.transition = animate ? EASE : "none";
    el.style.transform = x ? `translate3d(${x}px,0,0)` : "";
  };

  // abre/fecha quando o estado compartilhado muda (outra linha abriu, toque fora, ação executada)
  useEffect(() => {
    if (drag.current?.locked) return;
    if (open) {
      setEngaged(true);
      place(-W, true);
      return;
    }
    if (first.current) { first.current = false; return; } // primeira renderização: já está fechada
    place(0, true);
    const t = window.setTimeout(() => {
      setEngaged(false);
      if (layer.current) layer.current.style.transition = ""; // devolve as transições de cor da própria linha
    }, 260);
    return () => window.clearTimeout(t);
  }, [open, W]);

  // fecha com toque fora, rolagem da página e Esc
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (outer.current?.contains(e.target as Node)) return;
      swipeStore.close(key);
      // o primeiro toque só fecha: não deixa o clique cair em outro item ou botão
      const swallow = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); };
      document.addEventListener("click", swallow, { capture: true, once: true });
      window.setTimeout(() => document.removeEventListener("click", swallow, true), 500);
    };
    const close = () => swipeStore.close(key);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && swipeStore.close(key);
    document.addEventListener("pointerdown", outside, true);
    window.addEventListener("scroll", close, { capture: true, passive: true });
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", esc);
    };
  }, [open, key]);

  // se a linha some enquanto está aberta, libera o estado compartilhado
  useEffect(() => () => swipeStore.close(key), [key]);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType !== "touch" || !e.isPrimary) return;
    if (window.matchMedia(DESKTOP).matches) return; // no desktop não há gesto: as ações vêm do menu "…"
    drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, base: open ? -W : 0, locked: false, x: open ? -W : 0, lastX: e.clientX, lastT: e.timeStamp, v: 0 };
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;

    if (!d.locked) {
      if (Math.abs(dy) > SLOP && Math.abs(dy) > Math.abs(dx)) { drag.current = null; return; } // rolagem vertical: é do navegador
      if (Math.abs(dx) < SLOP || Math.abs(dx) < Math.abs(dy) * LOCK_RATIO) return; // pequeno ou diagonal: ainda não é um gesto
      if (d.base === 0 && dx > 0) { drag.current = null; return; } // fechada: arrastar para a direita não faz nada
      d.locked = true;
      try { layer.current?.setPointerCapture(e.pointerId); } catch { /* ok */ }
      swipeStore.set(key); // fecha as outras linhas
      setEngaged(true);
    }

    // acompanha o dedo (descontando o SLOP para a linha não "pular"); além do limite, resiste (elástico)
    let x = d.base + dx - Math.sign(dx) * SLOP;
    if (x > 0) x = 0;
    if (x < -W) x = -W + (x + W) * 0.3;
    d.x = x;
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.v = d.v * 0.6 + ((e.clientX - d.lastX) / dt) * 0.4;
    d.lastX = e.clientX;
    d.lastT = e.timeStamp;
    place(x, false);
  };

  const finish = (e: ReactPointerEvent, cancelled: boolean) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    if (!d.locked) return;
    guardUntil.current = performance.now() + 350;
    try { layer.current?.releasePointerCapture(e.pointerId); } catch { /* ok */ }

    const travelled = Math.abs(d.x - d.base);
    let next = d.base !== 0; // por padrão, volta ao estado em que estava
    if (!cancelled) {
      if (d.base === 0) next = -d.x >= W * OPEN_FRACTION || (d.v < -FLICK && travelled > MIN_FLICK_DIST);
      else next = !(d.x - d.base >= W * OPEN_FRACTION || (d.v > FLICK && travelled > MIN_FLICK_DIST));
    }
    place(next ? -W : 0, true);
    if (next) swipeStore.set(key);
    else swipeStore.close(key);
  };

  const act = (fn: () => void) => () => {
    swipeStore.close(key);
    fn();
  };

  const btn = "grid h-full flex-1 place-items-center text-background transition-[filter] active:brightness-90";
  const icon = "h-[1.125rem] w-[1.125rem]";
  const label = "mt-0.5 block text-[0.5938rem] font-medium leading-none";

  return (
    <div ref={outer} className={cn("relative", engaged && "overflow-hidden", className)} style={style}>
      {engaged && (
        <div className="absolute inset-y-0 right-0 flex overflow-hidden" style={{ width: W }} inert={!open}>
          <button type="button" aria-label={task.important ? "Remover de importantes" : "Marcar como importante"} aria-pressed={!!task.important} onClick={act(() => toggleImportant(task.id))} className={cn(btn, "bg-waiting")}>
            <span className="grid place-items-center">
              <Star className={cn(icon, task.important && "fill-current")} strokeWidth={1.8} />
              {!compact && <span className={label}>Importante</span>}
            </span>
          </button>
          <button type="button" aria-label="Editar" onClick={act(() => openTask(task.id))} className={cn(btn, "bg-cool")}>
            <span className="grid place-items-center">
              <Pencil className={icon} strokeWidth={1.8} />
              {!compact && <span className={label}>Editar</span>}
            </span>
          </button>
          <button type="button" aria-label="Excluir" onClick={act(() => confirmRemove(task.id))} className={cn(btn, "bg-urgent")}>
            <span className="grid place-items-center">
              <Trash2 className={icon} strokeWidth={1.8} />
              {!compact && <span className={label}>Excluir</span>}
            </span>
          </button>
        </div>
      )}
      <div
        {...layerProps}
        ref={layer}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => finish(e, false)}
        onPointerCancel={(e) => finish(e, true)}
        onClickCapture={(e) => {
          // logo depois de arrastar, ou com as ações abertas, o toque na linha não abre o item: só fecha
          if (performance.now() < guardUntil.current || open) {
            e.preventDefault();
            e.stopPropagation();
            if (open) swipeStore.close(key);
          }
        }}
        className={cn("relative touch-pan-y touch-pinch-zoom bg-background max-lg:select-none motion-reduce:!transition-none", layerClassName)}
      >
        {children}
      </div>
    </div>
  );
}
