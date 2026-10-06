"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { storage } from "@/services/storage";
import { DEFAULT_PALETTE, isPaletteId } from "./palettes";
import { MODE_KEY, PALETTE_KEY } from "./css";

/** Modo (claro/escuro/sistema) e paleta são coisas independentes. */
export type Mode = "light" | "dark" | "system";

interface ThemeApi {
  paletteId: string;
  setPalette: (id: string) => void;
  mode: Mode;
  setMode: (m: Mode) => void;
  /** o modo efetivo agora (já resolvido quando é "sistema") */
  dark: boolean;
  /** alterna claro/escuro (atalho rápido) */
  toggleMode: () => void;
}

const ThemeCtx = createContext<ThemeApi | null>(null);

export function useTheme() {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error("useTheme fora do ThemeProvider");
  return v;
}

const isMode = (v: string | null): v is Mode => v === "light" || v === "dark" || v === "system";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [paletteId, setPaletteId] = useState(DEFAULT_PALETTE);
  const [mode, setModeState] = useState<Mode>("system");
  const [systemDark, setSystemDark] = useState(false);
  const [ready, setReady] = useState(false);

  // Lê as preferências salvas (o script de pré-hidratação já aplicou o visual; aqui só sincroniza o estado)
  useEffect(() => {
    const p = storage.get(PALETTE_KEY);
    const m = storage.get(MODE_KEY);
    if (isPaletteId(p)) setPaletteId(p);
    if (isMode(m)) setModeState(m);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", on);
    setReady(true);
    return () => mq.removeEventListener("change", on);
  }, []);

  const dark = mode === "dark" || (mode === "system" && systemDark);

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.setAttribute("data-palette", paletteId);
    root.classList.toggle("dark", dark);
  }, [ready, paletteId, dark]);

  const setPalette = useCallback((id: string) => {
    if (!isPaletteId(id)) return;
    setPaletteId(id);
    storage.set(PALETTE_KEY, id);
  }, []);

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    storage.set(MODE_KEY, m);
  }, []);

  const toggleMode = useCallback(() => setMode(dark ? "light" : "dark"), [dark, setMode]);

  const value = useMemo(
    () => ({ paletteId, setPalette, mode, setMode, dark, toggleMode }),
    [paletteId, setPalette, mode, setMode, dark, toggleMode],
  );
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
