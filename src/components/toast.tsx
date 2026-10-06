"use client";

import type { ToastState } from "@/hooks/use-toast";

/** Aviso no rodapé. No celular sobe para não ficar embaixo do botão flutuante. */
export function Toast({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  if (!toast) return null;
  return (
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      className="animate-menuIn fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] left-1/2 z-[60] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-lg bg-foreground py-2 pl-4 pr-2 text-[13px] font-medium text-background shadow-pop lg:bottom-6"
    >
      <span className="min-w-0 truncate">{toast.message}</span>
      {toast.undo && (
        <button
          onClick={() => { toast.undo?.(); onDismiss(); }}
          className="shrink-0 rounded-md px-2.5 py-1.5 font-semibold transition-colors hover:bg-background/15"
        >
          Desfazer
        </button>
      )}
    </div>
  );
}
