import { useSyncExternalStore } from "react";

/**
 * Qual linha está com as ações do deslize abertas. Só uma por vez: abrir (ou começar a arrastar) outra
 * fecha a anterior, e qualquer toque fora fecha todas.
 */

let openKey: string | null = null;
const listeners = new Set<() => void>();

export const swipeStore = {
  get: () => openKey,
  set(key: string | null) {
    if (key === openKey) return;
    openKey = key;
    listeners.forEach((l) => l());
  },
  /** fecha só se `key` for a linha aberta */
  close(key: string) {
    if (openKey === key) this.set(null);
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => void listeners.delete(l);
  },
};

export const useSwipeOpen = (key: string) =>
  useSyncExternalStore(swipeStore.subscribe, () => openKey === key, () => false);
