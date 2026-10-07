"use client";

import { useEffect, useState } from "react";

/**
 * Fio fino no topo enquanto há gravações em andamento. Só aparece se a gravação demora
 * (evita piscar nas rápidas), e não ocupa espaço no layout.
 */
export function SyncBar({ saving }: { saving: boolean }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!saving) return setVisible(false);
    const id = window.setTimeout(() => setVisible(true), 350);
    return () => window.clearTimeout(id);
  }, [saving]);

  if (!visible) return null;
  return (
    <div role="progressbar" aria-label="Salvando" aria-busy className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[2px] overflow-hidden">
      <div className="animate-sync h-full w-1/3 rounded-full bg-primary/70" />
    </div>
  );
}
