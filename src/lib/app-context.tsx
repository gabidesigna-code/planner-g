"use client";

import { createContext, useContext } from "react";
import type { ContextFilter, Task } from "./types";

export type ViewId = "hoje" | "semana" | "calendario" | "tarefas" | "trabalho" | "pessoal" | "concluidos";

export interface AddPreset {
  time?: string;
  due?: Date;
}

export interface AppApi {
  tasks: Task[];
  today: Date;
  /** Hora atual (só no cliente, depois da hidratação) */
  now: Date | null;
  filter: ContextFilter;
  setFilter: (f: ContextFilter) => void;
  selectedId: string | null;
  toggle: (id: string) => void;
  toggleSub: (id: string, subId: string) => void;
  update: (id: string, patch: Partial<Task>) => void;
  remove: (id: string) => void;
  openTask: (id: string | null) => void;
  openAdd: (preset?: AddPreset) => void;
  navigate: (v: ViewId) => void;
}

export const AppCtx = createContext<AppApi | null>(null);

export function useApp() {
  const v = useContext(AppCtx);
  if (!v) throw new Error("useApp fora do provider");
  return v;
}

export const matches = (t: Task, f: ContextFilter) => f === "tudo" || t.context === f;
