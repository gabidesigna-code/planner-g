import type { Category, Task } from "@/types";
import type { OrganizeResponse } from "@/lib/ai/schema";
import type { OriChatResponse, OriChatTurn } from "@/lib/ai/chat-schema";
import { fromDto, toDto, type TaskDto } from "@/lib/task-dto";

/**
 * Único ponto em que o navegador conversa com o backend. O navegador fala só com as rotas /api do
 * próprio app; quem fala com o banco (Supabase) é o servidor do Next.js.
 */

export type ThemeMode = "light" | "dark" | "system";

export interface Preferences {
  displayName: string;
  themeMode: ThemeMode;
  palette: string;
  /** true enquanto nada foi alterado (ainda são os valores padrão) */
  untouched: boolean;
}

export interface AgendaData {
  tasks: Task[];
  categories: Category[];
  note: string;
  preferences: Preferences;
}

/** Nenhuma chamada fica pendurada para sempre: passado esse tempo, vira erro (e a tela oferece tentar de novo). */
const TIMEOUT_MS = 20_000;

async function call<T>(path: string, init: RequestInit = {}, timeoutMs = TIMEOUT_MS): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "content-type": "application/json", ...init.headers },
    });
  } catch (e) {
    const timedOut = e instanceof DOMException && e.name === "TimeoutError";
    throw new Error(timedOut ? "O servidor demorou demais para responder." : "Sem conexão com o servidor.");
  }
  if (!res.ok) {
    let message = res.status >= 500 && !(path.startsWith("/api/ai/") || path.startsWith("/api/ori/")) ? "O servidor não conseguiu falar com o banco (Supabase). Confira o .env.local e o terminal." : `Erro ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error && (res.status < 500 || (path.startsWith("/api/ai/") || path.startsWith("/api/ori/")))) message = body.error;
    } catch {}
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

// `keepalive` deixa a gravação terminar mesmo se a aba for fechada logo em seguida
const write = (method: string, body?: unknown): RequestInit => ({
  method,
  keepalive: true,
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const api = {
  async loadAgenda(): Promise<AgendaData> {
    const d = await call<Omit<AgendaData, "tasks"> & { tasks: TaskDto[] }>("/api/agenda");
    return { ...d, tasks: d.tasks.map(fromDto) };
  },
  createItem: (t: Task) => call("/api/items", write("POST", toDto(t))),
  updateItem: (t: Task) => call(`/api/items/${t.id}`, write("PUT", toDto(t))),
  deleteItem: (id: string) => call(`/api/items/${id}`, write("DELETE")),
  saveNote: (content: string) => call("/api/note", write("PUT", { content })),
  /** IA: texto natural → prévia de itens (não grava nada). Tem mais tempo, pois o modelo demora um pouco. */
  organize: (text: string) => call<OrganizeResponse>("/api/ai/organize", write("POST", { text }), 50_000),
  /** Chat da ori: a conversa recente em, resposta (e itens propostos) fora. Não grava nada. */
  oriChat: (messages: OriChatTurn[]) => call<OriChatResponse>("/api/ori/chat", write("POST", { messages }), 50_000),
  getPreferences: () => call<Preferences>("/api/preferences"),
  savePreferences: (patch: Partial<Pick<Preferences, "themeMode" | "palette">>) =>
    call("/api/preferences", write("PUT", patch)),
};
