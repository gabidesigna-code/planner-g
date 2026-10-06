import { storage } from "./storage";
import { seedTasks } from "./seed-tasks";
import type { Task } from "@/types";

/**
 * Contrato de persistência das tarefas. Hoje: localStorage.
 * Para migrar ao Supabase, basta outra implementação desta interface
 * (a assinatura já é assíncrona) e trocar `taskRepository` abaixo.
 */
export interface TaskRepository {
  list(): Promise<Task[]>;
  saveAll(tasks: Task[]): Promise<void>;
}

const KEY = "central-tarefas:v1:tasks";
const DATE_FIELDS = ["due", "endDate", "doneAt"] as const;

function serialize(tasks: Task[]): string {
  return JSON.stringify(tasks); // Date → ISO string
}

function revive(raw: unknown): Task[] {
  if (!Array.isArray(raw)) throw new Error("formato inválido");
  return raw.map((r) => {
    const t = { ...r } as Record<string, unknown>;
    for (const f of DATE_FIELDS) if (typeof t[f] === "string") t[f] = new Date(t[f] as string);
    return t as unknown as Task;
  });
}

export const localTaskRepository: TaskRepository = {
  async list() {
    const raw = storage.get(KEY);
    if (raw) {
      try {
        return revive(JSON.parse(raw));
      } catch {
        // dado corrompido: cai nos exemplos, sem apagar nada até a próxima gravação
      }
    }
    return seedTasks();
  },
  async saveAll(tasks) {
    storage.set(KEY, serialize(tasks));
  },
};

export const taskRepository: TaskRepository = localTaskRepository;
