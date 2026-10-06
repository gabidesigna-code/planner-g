"use client";

import { useEffect } from "react";

/** Trava o scroll da página enquanto um modal/sheet está aberto. */
export function useScrollLock(active: boolean, onlyWhen?: string) {
  useEffect(() => {
    if (!active) return;
    if (onlyWhen && !window.matchMedia(onlyWhen).matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active, onlyWhen]);
}
