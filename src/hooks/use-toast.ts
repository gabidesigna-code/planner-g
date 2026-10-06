"use client";

import { useCallback, useRef, useState } from "react";

export interface ToastState {
  id: number;
  message: string;
  undo?: () => void;
}

export type Notify = (message: string, undo?: () => void) => void;

/** Aviso curto no rodapé; com `undo`, fica mais tempo e mostra "Desfazer". */
export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const dismiss = useCallback(() => {
    window.clearTimeout(timer.current);
    setToast(null);
  }, []);

  const notify: Notify = useCallback((message, undo) => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), message, undo });
    timer.current = window.setTimeout(() => setToast(null), undo ? 6000 : 2200);
  }, []);

  return { toast, notify, dismiss };
}
