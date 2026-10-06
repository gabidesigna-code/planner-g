"use client";

import { createContext, useContext } from "react";
import type { Context, ContextFilter, Kind, Task } from "@/types";

export type ViewId = "hoje" | "semana" | "calendario" | "tarefas" | "trabalho" | "pessoal" | "concluidos";

/** Valores iniciais ao abrir o menu "Adicionar" ou o formulário. */
export interface AddPreset {
  time?: string;
  due?: Date;
  kind?: Kind;
  context?: Context;
  title?: string;
}

export interface AppApi {
  tasks: Task[];
  today: Date;
  /** Hora atual (só no cliente, depois da hidratação) */
  now: Date | null;
  filter: ContextFilter;
  setFilter: (f: ContextFilter) => void;
  selectedId: string | null;
  /** Itens concluídos há instantes: continuam nas listas, riscados, antes de sair. */
  recent: ReadonlySet<string>;
  toggle: (id: string) => void;
  toggleSub: (id: string, subId: string) => void;
  update: (id: string, patch: Partial<Task>) => void;
  remove: (id: string) => void;
  reorder: (id: string, beforeId: string) => void;
  openTask: (id: string | null) => void;
  /** Menu "Adicionar" (escolhe o tipo ou cria rápido por texto) */
  openAdd: (preset?: AddPreset) => void;
  /** Formulário completo, direto no tipo escolhido */
  openForm: (kind: Kind, preset?: AddPreset) => void;
  navigate: (v: ViewId) => void;
}

export const AppCtx = createContext<AppApi | null>(null);

export function useApp() {
  const v = useContext(AppCtx);
  if (!v) throw new Error("useApp fora do provider");
  return v;
}

export const matches = (t: Task, f: ContextFilter) => f === "tudo" || t.context === f;

/** Em aberto, ou concluído há instantes (para o feedback de conclusão não sumir de cara). */
export const isOpen = (t: Task, recent: ReadonlySet<string>) => t.status !== "concluido" || recent.has(t.id);
