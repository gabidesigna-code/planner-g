"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { storage } from "@/services/storage";
import { api, type ThemeMode } from "@/services/api-client";
import { bumpEpoch, currentEpoch } from "@/lib/sync-epoch";
import { DEFAULT_PALETTE, isPaletteId } from "./palettes";
import { MODE_KEY, PALETTE_KEY } from "./css";

/** Modo (claro/escuro/sistema) e paleta são coisas independentes. */
export type Mode = ThemeMode;

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

const isMode = (v: string | null | undefined): v is Mode => v === "light" || v === "dark" || v === "system";

/** De quanto em quanto tempo confere se a paleta/modo mudou em outro aparelho. */
const SYNC_MS = 15_000;
const SAVE_DELAY = 400;

/**
 * Paleta e modo, sincronizados entre aparelhos. A fonte da verdade é o banco (via /api/preferences);
 * o localStorage é só cache, para a tela já nascer com as cores certas, sem piscar.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [paletteId, setPaletteId] = useState(DEFAULT_PALETTE);
  const [mode, setModeState] = useState<Mode>("system");
  const [systemDark, setSystemDark] = useState(false);
  const [ready, setReady] = useState(false);
  const pending = useRef<{ palette?: string; themeMode?: Mode }>({});
  const saveTimer = useRef<number | undefined>(undefined);
  const firstPull = useRef(true);

  // Lê o cache do aparelho (o script de pré-hidratação já aplicou o visual)
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

  /** Envia ao banco o que mudou aqui (agrupando cliques seguidos) e tenta de novo se falhar. */
  const flush = useCallback(() => {
    const body = pending.current;
    if (!body.palette && !body.themeMode) return;
    pending.current = {};
    api.savePreferences(body)
      .catch(() => {
        pending.current = { ...body, ...pending.current };
        window.clearTimeout(saveTimer.current);
        saveTimer.current = window.setTimeout(flush, 5000);
      })
      .finally(bumpEpoch);
  }, []);

  const queue = useCallback((patch: { palette?: string; themeMode?: Mode }) => {
    bumpEpoch();
    pending.current = { ...pending.current, ...patch };
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(flush, SAVE_DELAY);
  }, [flush]);

  /** Busca as preferências do servidor e aplica, se nada foi mexido aqui nesse meio-tempo. */
  const pull = useCallback(async () => {
    const started = currentEpoch();
    try {
      const prefs = await api.getPreferences();
      if (currentEpoch() !== started || pending.current.palette || pending.current.themeMode) return;

      const localPalette = storage.get(PALETTE_KEY);
      const localMode = storage.get(MODE_KEY);
      // Primeira abertura neste aparelho com o banco ainda no padrão: sobe a escolha que já existia aqui
      if (firstPull.current && prefs.untouched && (isPaletteId(localPalette) || isMode(localMode))) {
        firstPull.current = false;
        queue({
          ...(isPaletteId(localPalette) ? { palette: localPalette } : {}),
          ...(isMode(localMode) ? { themeMode: localMode } : {}),
        });
        return;
      }
      firstPull.current = false;
      if (isPaletteId(prefs.palette)) { setPaletteId(prefs.palette); storage.set(PALETTE_KEY, prefs.palette); }
      if (isMode(prefs.themeMode)) { setModeState(prefs.themeMode); storage.set(MODE_KEY, prefs.themeMode); }
    } catch {
      // sem conexão: segue com o cache do aparelho
    }
  }, [queue]);

  useEffect(() => {
    if (!ready) return;
    void pull();
    const tick = () => document.visibilityState === "visible" && void pull();
    const id = window.setInterval(tick, SYNC_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [ready, pull]);

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
    queue({ palette: id });
  }, [queue]);

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    storage.set(MODE_KEY, m);
    queue({ themeMode: m });
  }, [queue]);

  const toggleMode = useCallback(() => setMode(dark ? "light" : "dark"), [dark, setMode]);

  const value = useMemo(
    () => ({ paletteId, setPalette, mode, setMode, dark, toggleMode }),
    [paletteId, setPalette, mode, setMode, dark, toggleMode],
  );
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
