import type { Task } from "@/types";
import { api, type AgendaData } from "./api-client";

export type { AgendaData };

/**
 * Contrato de persistência da agenda, do ponto de vista da tela. A implementação atual fala
 * com as rotas /api (que gravam no Supabase pelo servidor).
 */
export interface AgendaRepository {
  load(): Promise<AgendaData>;
  create(task: Task): Promise<void>;
  /** `prev` é a última versão gravada; o servidor compara com o que está no banco. */
  update(prev: Task, next: Task): Promise<void>;
  remove(task: Task): Promise<void>;
}

export const httpAgendaRepository: AgendaRepository = {
  load: () => api.loadAgenda(),
  create: async (task) => void (await api.createItem(task)),
  update: async (_prev, next) => void (await api.updateItem(next)),
  remove: async (task) => void (await api.deleteItem(task.id)),
};
