import { z } from "zod";
import type { ProposedItem } from "./schema";
import type { OriAction } from "./actions";
import type { TaskDto } from "@/lib/task-dto";

/** Contrato do chat da ori: o que o navegador envia e o que volta (sempre validado). */

export const MAX_CHAT_TEXT = 4000;
/** Quantas mensagens recentes seguem para o modelo a cada pergunta (a conversa inteira fica no aparelho). */
export const MAX_CHAT_TURNS = 24;

export interface OriChatTurn {
  role: "user" | "ori";
  text: string;
}

export const chatRequestSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "ori"]), text: z.string().trim().min(1).max(MAX_CHAT_TEXT) }))
    .min(1)
    .max(MAX_CHAT_TURNS),
});

/** Resposta do modelo: texto + itens que ela PROPÕE criar + ações que ela PROPÕE sobre itens existentes. */
export const chatReplySchema = z.object({
  reply: z.string().trim().min(1).max(6000),
  items: z.array(z.unknown()).max(12).default([]),
  actions: z.array(z.unknown()).max(60).nullish().transform((v) => v ?? []),
  /** referências de itens parecidos, quando ela precisa perguntar "qual deles?" */
  choices: z.array(z.string().max(40)).max(12).nullish().transform((v) => v ?? []),
});

/** Uma alteração proposta, com o item como está (before) e como ficará (after; null = será excluído). */
export interface ChangeEntry {
  action: OriAction;
  before: TaskDto;
  after: TaskDto | null;
  /** itens abertos com título quase igual (para a usuária conferir que é o certo) */
  similar: TaskDto[];
  /** partes do pedido que não puderam ser aplicadas (ex.: categoria que não existe) */
  ignored: string[];
}

export interface ChangeProposal {
  /** exclusão: exige confirmação própria */
  destructive: boolean;
  entries: ChangeEntry[];
  /** itens que já estavam como pedido (ex.: já concluída) */
  skipped: { title: string; reason: string }[];
  /** true se havia mais de MAX_BULK itens e só os primeiros entraram */
  truncated: boolean;
}

export interface OriChatResponse {
  reply: string;
  /** Itens propostos (nada é salvo até a usuária confirmar na tela) */
  items: ProposedItem[];
  /** Alterações propostas em itens existentes (nada muda até a usuária confirmar na tela) */
  changes?: ChangeProposal;
  /** Itens entre os quais ela precisa escolher (a ori não adivinha) */
  choices?: TaskDto[];
}
