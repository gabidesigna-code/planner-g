"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgendaRepository } from "@/services/agenda-repository";
import { nextOccurrence } from "@/lib/recurrence";
import { bumpEpoch, currentEpoch } from "@/lib/sync-epoch";
import { toDto } from "@/lib/task-dto";
import type { Notify } from "./use-toast";
import type { Category, Task } from "@/types";

/** Tempo em que um item recém-concluído continua visível nas listas, riscado. */
const RECENT_MS = 1600;
/** Espera após a última edição antes de gravar (agrupa o que o usuário digita). */
const SAVE_DELAY = 450;
/** De quanto em quanto tempo a tela confere o servidor (além de ao voltar para a aba). */
const SYNC_MS = 15_000;
const SAVE_FAILED = "Não foi possível salvar. A alteração foi desfeita.";

interface Options {
  repo: AgendaRepository;
  notify: Notify;
  notifyError: (message: string) => void;
}

/**
 * Estado da agenda, sincronizado com o servidor (e, por ele, com o Supabase).
 *
 * Sincronização entre aparelhos: a tela reconfere o servidor ao voltar para a aba, ao reconectar e a
 * cada `SYNC_MS`. A atualização preserva o que está sendo editado/gravado aqui e é descartada se
 * alguma mudança local aconteceu enquanto ela viajava.
 *
 * Interface otimista: toda mudança aparece na hora e é gravada em segundo plano.
 * - `persisted` guarda a última versão confirmada de cada item; se a gravação falhar,
 *   o item volta a ela (e um aviso discreto aparece).
 * - As gravações de um mesmo item entram numa fila, então nunca se atropelam
 *   (ex.: criar e logo editar, ou excluir e logo desfazer).
 */
export function useTasks({ repo, notify, notifyError }: Options) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [pending, setPending] = useState(0);
  const [recent, setRecent] = useState<ReadonlySet<string>>(new Set());

  /** Fonte da verdade síncrona (o state é só o espelho que renderiza). */
  const ref = useRef<Task[]>([]);
  const persisted = useRef(new Map<string, Task>());
  const chains = useRef(new Map<string, Promise<void>>());
  const timers = useRef(new Map<string, number>());
  /** Quantas gravações de cada item estão em andamento. */
  const busy = useRef(new Map<string, number>());
  const refreshing = useRef(false);

  const apply = useCallback((fn: (ts: Task[]) => Task[]) => {
    bumpEpoch();
    ref.current = fn(ref.current);
    setTasks(ref.current);
  }, []);

  const isBusy = (id: string) => (busy.current.get(id) ?? 0) > 0 || timers.current.has(id);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await repo.load();
      persisted.current = new Map(data.tasks.map((t) => [t.id, t]));
      ref.current = data.tasks;
      setTasks(data.tasks);
      setCategories(data.categories);
      setNote(data.note);
      setOwnerName(data.preferences.displayName);
      setReady(true);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Erro ao carregar");
    }
  }, [repo]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Enfileira uma operação de gravação para o item `id`. */
  const enqueue = useCallback((id: string, op: () => Promise<void>) => {
    setPending((n) => n + 1);
    busy.current.set(id, (busy.current.get(id) ?? 0) + 1);
    const next = (chains.current.get(id) ?? Promise.resolve())
      .then(op)
      .catch(() => {})
      .finally(() => {
        const left = (busy.current.get(id) ?? 1) - 1;
        if (left > 0) busy.current.set(id, left);
        else busy.current.delete(id);
        bumpEpoch(); // o fim de uma gravação também invalida atualizações que estavam a caminho
        setPending((n) => n - 1);
      });
    chains.current.set(id, next);
    return next;
  }, []);

  const saveCreate = useCallback((task: Task) => enqueue(task.id, async () => {
    try {
      await repo.create(task);
      persisted.current.set(task.id, task);
    } catch {
      apply((ts) => ts.filter((t) => t.id !== task.id));
      notifyError(SAVE_FAILED);
    }
  }), [repo, enqueue, apply, notifyError]);

  const saveUpdate = useCallback((id: string) => enqueue(id, async () => {
    const cur = ref.current.find((t) => t.id === id);
    const base = persisted.current.get(id);
    if (!cur || !base || cur === base) return;
    if (!cur.title.trim()) return; // título apagado no meio da edição: espera terminar de digitar
    try {
      await repo.update(base, cur);
      persisted.current.set(id, cur);
    } catch {
      apply((ts) => ts.map((t) => (t.id === id ? base : t)));
      notifyError(SAVE_FAILED);
    }
  }), [repo, enqueue, apply, notifyError]);

  const saveRemove = useCallback((task: Task, onFail?: () => void) => enqueue(task.id, async () => {
    const base = persisted.current.get(task.id);
    if (!base) return; // nunca chegou a ser gravado
    try {
      await repo.remove(base);
      persisted.current.delete(task.id);
    } catch {
      onFail?.();
      notifyError("Não foi possível excluir. O item foi restaurado.");
    }
  }), [repo, enqueue, notifyError]);

  const clearTimer = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t !== undefined) window.clearTimeout(t);
    timers.current.delete(id);
  }, []);

  /** Grava depois de uma pausa na edição. */
  const scheduleSave = useCallback((id: string) => {
    clearTimer(id);
    timers.current.set(id, window.setTimeout(() => {
      timers.current.delete(id);
      void saveUpdate(id);
    }, SAVE_DELAY));
  }, [clearTimer, saveUpdate]);

  /** Grava já (ações pontuais como concluir). */
  const saveNow = useCallback((id: string) => {
    clearTimer(id);
    void saveUpdate(id);
  }, [clearTimer, saveUpdate]);

  /** Traz do servidor o que mudou em outro aparelho, sem pisar no que está sendo feito aqui. */
  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    const started = currentEpoch();
    try {
      const data = await repo.load();
      if (currentEpoch() !== started) return; // houve mudança local no meio do caminho: tenta no próximo ciclo
      const local = ref.current;
      const localById = new Map(local.map((t) => [t.id, t]));
      const serverIds = new Set(data.tasks.map((t) => t.id));
      const merged = data.tasks.map((t) => (isBusy(t.id) ? localById.get(t.id) ?? t : t));
      for (const t of local) if (!serverIds.has(t.id) && isBusy(t.id)) merged.push(t); // criação ainda em andamento
      merged.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

      if (JSON.stringify(merged.map(toDto)) !== JSON.stringify(local.map(toDto))) {
        for (const t of data.tasks) if (!isBusy(t.id)) persisted.current.set(t.id, t);
        for (const id of [...persisted.current.keys()]) if (!serverIds.has(id) && !isBusy(id)) persisted.current.delete(id);
        ref.current = merged;
        setTasks(merged);
      }
      setCategories((prev) => (JSON.stringify(prev) === JSON.stringify(data.categories) ? prev : data.categories));
      setNote(data.note);
      setOwnerName(data.preferences.displayName);
    } catch {
      // sem conexão agora: segue com o que já está na tela e tenta de novo depois
    } finally {
      refreshing.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo]);

  useEffect(() => {
    if (!ready) return;
    const tick = () => document.visibilityState === "visible" && void refresh();
    const id = window.setInterval(tick, SYNC_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    window.addEventListener("online", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
      window.removeEventListener("online", tick);
    };
  }, [ready, refresh]);

  // Ao sair da aba ou fechar a página, grava o que ainda estava esperando a pausa
  useEffect(() => {
    const flush = () => [...timers.current.keys()].forEach(saveNow);
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [saveNow]);

  const markRecent = useCallback((id: string) => {
    setRecent((s) => new Set(s).add(id));
    window.setTimeout(() => {
      setRecent((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }, RECENT_MS);
  }, []);

  const toggle = useCallback((id: string) => {
    const prev = ref.current.find((t) => t.id === id);
    if (!prev) return;
    if (prev.status === "concluido") {
      apply((ts) => ts.map((t) => (t.id === id ? { ...t, status: "a-fazer", doneAt: undefined } : t)));
      saveNow(id);
      return;
    }
    let spawn = nextOccurrence(prev);
    if (spawn) spawn = { ...spawn, position: Math.max(0, ...ref.current.map((t) => t.position ?? 0)) + 1024 };
    const next = spawn;
    apply((ts) => {
      const done = ts.map((t) => (t.id === id ? { ...t, status: "concluido" as const, doneAt: new Date() } : t));
      return next ? [...done, next] : done;
    });
    markRecent(id);
    saveNow(id);
    if (next) void saveCreate(next);
    notify(next ? "Concluído · próxima ocorrência criada" : "Concluído", () => {
      apply((ts) => ts.filter((t) => t.id !== next?.id).map((t) => (t.id === id ? prev : t)));
      saveNow(id);
      if (next) void saveRemove(next);
    });
  }, [apply, markRecent, notify, saveNow, saveCreate, saveRemove]);

  const toggleSub = useCallback((id: string, subId: string) => {
    apply((ts) =>
      ts.map((t) => {
        if (t.id !== id || !t.subtasks) return t;
        const subtasks = t.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s));
        const all = subtasks.every((s) => s.done);
        const status = all && t.status !== "concluido" ? "pronto" : !all && t.status === "pronto" ? "em-andamento" : t.status;
        return { ...t, subtasks, status };
      }),
    );
    scheduleSave(id);
  }, [apply, scheduleSave]);

  const update = useCallback((id: string, patch: Partial<Task>) => {
    const prev = ref.current.find((t) => t.id === id);
    if (!prev) return;
    // Concluir pelo painel segue o mesmo caminho do checkbox (recorrência, feedback, desfazer)
    if (patch.status === "concluido" && prev.status !== "concluido") {
      const { status: _s, doneAt: _d, ...rest } = patch;
      if (Object.keys(rest).length) apply((ts) => ts.map((t) => (t.id === id ? { ...t, ...rest } : t)));
      return toggle(id);
    }
    apply((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    scheduleSave(id);
  }, [apply, scheduleSave, toggle]);

  const remove = useCallback((id: string) => {
    const index = ref.current.findIndex((t) => t.id === id);
    if (index < 0) return;
    const removed = ref.current[index];
    clearTimer(id);
    apply((ts) => ts.filter((t) => t.id !== id));
    const restore = (task: Task) => apply((ts) => {
      if (ts.some((t) => t.id === id)) return ts;
      const n = [...ts];
      n.splice(Math.min(index, n.length), 0, task);
      return n;
    });
    void saveRemove(removed, () => restore(persisted.current.get(id) ?? removed));
    notify(`Excluído: ${removed.title}`, () => {
      restore(removed);
      void saveCreate(removed);
    });
  }, [apply, clearTimer, notify, saveCreate, saveRemove]);

  const create = useCallback((t: Task) => {
    // novo item entra no topo da lista
    const position = Math.min(0, ...ref.current.map((x) => x.position ?? 0)) - 1024;
    const task = { ...t, position };
    apply((ts) => [task, ...ts]);
    void saveCreate(task);
    notify(`Adicionado: ${t.title}`);
  }, [apply, saveCreate, notify]);

  /** Coloca `id` antes de `beforeId` (e no mesmo dia dele, sem horário). */
  const reorder = useCallback((id: string, beforeId: string) => {
    if (id === beforeId) return;
    const item = ref.current.find((t) => t.id === id);
    const target = ref.current.find((t) => t.id === beforeId);
    if (!item || !target) return;
    const rest = ref.current.filter((t) => t.id !== id);
    const at = rest.findIndex((t) => t.id === beforeId);
    const above = rest[at - 1];
    const tp = target.position ?? 0;
    const ap = above?.position ?? tp - 2048;
    const position = ap < tp ? (ap + tp) / 2 : tp - 0.001;
    rest.splice(at, 0, { ...item, due: target.due, time: undefined, end: undefined, position });
    apply(() => rest);
    scheduleSave(id);
  }, [apply, scheduleSave]);

  return { tasks, categories, note, ownerName, ready, loadError, reload: load, refresh, saving: pending > 0, recent, toggle, toggleSub, update, remove, create, reorder };
}
