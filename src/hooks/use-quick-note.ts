"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/services/api-client";
import { bumpEpoch } from "@/lib/sync-epoch";

const SAVE_DELAY = 800;

/**
 * Nota rápida da Home, guardada em `notes` (via /api/note).
 * Grava depois de uma pausa na digitação e ao sair da aba. Quando o servidor traz uma nota nova
 * (editada em outro aparelho), ela só é adotada se não há texto local ainda por gravar.
 */
export function useQuickNote({ serverNote, ready, notifyError }: { serverNote: string; ready: boolean; notifyError: (m: string) => void }) {
  const [text, setTextState] = useState("");
  const [loaded, setLoaded] = useState(false);
  const latest = useRef("");
  const dirty = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const chain = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!ready || dirty.current) return;
    if (serverNote !== latest.current || !loaded) {
      latest.current = serverNote;
      setTextState(serverNote);
    }
    setLoaded(true);
  }, [serverNote, ready, loaded]);

  const save = useCallback(() => {
    if (!dirty.current) return;
    dirty.current = false;
    const content = latest.current;
    chain.current = chain.current.then(async () => {
      try {
        await api.saveNote(content);
      } catch {
        dirty.current = true;
        notifyError("Não foi possível salvar a nota.");
      } finally {
        bumpEpoch(); // atualizações que estavam a caminho durante a gravação ficam obsoletas
      }
    });
  }, [notifyError]);

  const setText = useCallback((value: string) => {
    bumpEpoch();
    setTextState(value);
    latest.current = value;
    dirty.current = true;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(save, SAVE_DELAY);
  }, [save]);

  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && save();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", save);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", save);
      save();
    };
  }, [save]);

  return { text, setText, ready: loaded };
}
