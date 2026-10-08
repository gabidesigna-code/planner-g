"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { cn } from "@/lib/utils";

/** Confirmação curta: folha de baixo no celular, caixa centralizada no desktop. Foco inicial em "Cancelar". */
export function ConfirmDialog({ open, title, body, confirmLabel, cancelLabel = "Cancelar", hideCancel, destructive, onConfirm, onCancel }: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** só o botão de confirmar (avisos de "entendi") */
  hideCancel?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onCancel(); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:px-4">
      <div className="animate-fade absolute inset-0 bg-foreground/30 backdrop-blur-[0.125rem]" onClick={onCancel} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={body ? "confirm-body" : undefined}
        className="animate-sheetUp relative w-full max-w-[24rem] rounded-t-2xl bg-surface p-5 shadow-pop sm:animate-rise sm:rounded-2xl"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <h2 id="confirm-title" className="break-words text-[1.0625rem] font-semibold leading-snug tracking-[-0.01em]">{title}</h2>
        {body && <p id="confirm-body" className="mt-1.5 text-[0.875rem] leading-relaxed text-muted-foreground">{body}</p>}
        <div className="mt-5 flex gap-2">
          {!hideCancel && <Button ref={cancelRef} variant="soft" className="flex-1" onClick={onCancel}>{cancelLabel}</Button>}
          <Button className={cn("flex-1", destructive && "bg-urgent text-background")} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
