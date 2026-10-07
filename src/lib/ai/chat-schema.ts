import { z } from "zod";
import type { ProposedItem } from "./schema";

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

/** Resposta do modelo: texto + (opcional) itens que ela PROPÕE criar. Os itens passam pela mesma validação do "Organizar". */
export const chatReplySchema = z.object({
  reply: z.string().trim().min(1).max(6000),
  items: z.array(z.unknown()).max(12).default([]),
});

export interface OriChatResponse {
  reply: string;
  /** Itens propostos (nada é salvo até a usuária confirmar na tela) */
  items: ProposedItem[];
}
