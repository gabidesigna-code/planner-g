"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { taskRepository } from "@/services/task-service";
import { nextOccurrence } from "@/lib/recurrence";
import type { Notify } from "./use-toast";
import type { Task } from "@/types";

/** Tempo em que um item recém-concluído continua visível nas listas, riscado. */
const RECENT_MS = 1600;

/** Estado das tarefas + persistência. Toda gravação passa por `taskRepository`. */
export function useTasks(notify: Notify) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);
  const [recent, setRecent] = useState<ReadonlySet<string>>(new Set());
  const ref = useRef(tasks);
  ref.current = tasks;

  useEffect(() => {
    let alive = true;
    taskRepository.list().then((ts) => {
      if (!alive) return;
      setTasks(ts);
      setReady(true);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (ready) void taskRepository.saveAll(tasks);
  }, [tasks, ready]);

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
      setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status: "a-fazer", doneAt: undefined } : t)));
      return;
    }
    const spawn = nextOccurrence(prev);
    setTasks((ts) => {
      const next = ts.map((t) => (t.id === id ? { ...t, status: "concluido" as const, doneAt: new Date() } : t));
      return spawn ? [...next, spawn] : next;
    });
    markRecent(id);
    notify(spawn ? "Concluído · próxima ocorrência criada" : "Concluído", () =>
      setTasks((ts) => ts.filter((t) => t.id !== spawn?.id).map((t) => (t.id === id ? prev : t))),
    );
  }, [markRecent, notify]);

  const toggleSub = useCallback((id: string, subId: string) => {
    setTasks((ts) =>
      ts.map((t) => {
        if (t.id !== id || !t.subtasks) return t;
        const subtasks = t.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s));
        const all = subtasks.every((s) => s.done);
        const status = all && t.status !== "concluido" ? "pronto" : !all && t.status === "pronto" ? "em-andamento" : t.status;
        return { ...t, subtasks, status };
      }),
    );
  }, []);

  const update = useCallback((id: string, patch: Partial<Task>) => {
    const prev = ref.current.find((t) => t.id === id);
    // Concluir pelo painel segue o mesmo caminho do checkbox (recorrência, feedback, desfazer)
    if (prev && patch.status === "concluido" && prev.status !== "concluido") {
      const { status: _s, doneAt: _d, ...rest } = patch;
      if (Object.keys(rest).length) setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...rest } : t)));
      return toggle(id);
    }
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, [toggle]);

  const remove = useCallback((id: string) => {
    const index = ref.current.findIndex((t) => t.id === id);
    if (index < 0) return;
    const removed = ref.current[index];
    setTasks((ts) => ts.filter((t) => t.id !== id));
    notify(`Excluído: ${removed.title}`, () =>
      setTasks((ts) => {
        if (ts.some((t) => t.id === id)) return ts;
        const n = [...ts];
        n.splice(Math.min(index, n.length), 0, removed);
        return n;
      }),
    );
  }, [notify]);

  const create = useCallback((t: Task) => {
    setTasks((ts) => [t, ...ts]);
    notify(`Adicionado: ${t.title}`);
  }, [notify]);

  /** Coloca `id` antes de `beforeId` (e no mesmo dia dele, sem horário). */
  const reorder = useCallback((id: string, beforeId: string) => {
    if (id === beforeId) return;
    setTasks((ts) => {
      const item = ts.find((t) => t.id === id);
      const target = ts.find((t) => t.id === beforeId);
      if (!item || !target) return ts;
      const rest = ts.filter((t) => t.id !== id);
      rest.splice(rest.findIndex((t) => t.id === beforeId), 0, { ...item, due: target.due, time: undefined, end: undefined });
      return rest;
    });
  }, []);

  return { tasks, ready, recent, toggle, toggleSub, update, remove, create, reorder };
}
