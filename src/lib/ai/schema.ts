import { z } from "zod";

/**
 * Contrato da IA: o que o Gemini pode devolver e o que a tela recebe depois de validado.
 * Nunca se usa o texto do modelo diretamente: tudo passa por estes schemas.
 */

export const AI_ITEM_TYPES = ["task", "appointment", "reminder", "event"] as const;
export type AiItemType = (typeof AI_ITEM_TYPES)[number];

/** AAAA-MM-DD de um dia que existe (2026-02-31 não passa: só o Date.parse aceitaria). */
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => { const d = new Date(`${s}T00:00:00Z`); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; }, "data inválida");
const hm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/** Um item como o modelo devolve. */
export const aiItemSchema = z.object({
  type: z.enum(AI_ITEM_TYPES),
  title: z.string().trim().min(1).max(200),
  context: z.enum(["trabalho", "pessoal"]),
  category: z.string().trim().max(100).nullish(),
  date: day,
  time: hm.nullish(),
  endTime: hm.nullish(),
  priority: z.enum(["urgente", "alta", "normal", "baixa"]).default("normal"),
  clientProject: z.string().trim().max(200).nullish(),
  notes: z.string().trim().max(2000).nullish(),
  recurrence: z.enum(["daily", "weekly", "monthly", "yearly"]).nullish(),
});

/** Envelope: os itens são validados um a um depois (um item ruim não derruba os outros). */
export const aiEnvelopeSchema = z.object({ items: z.array(z.unknown()).max(12) });

/** Item proposto, já normalizado pelo servidor e pronto para a prévia. */
export interface ProposedItem {
  type: AiItemType;
  title: string;
  context: "trabalho" | "pessoal";
  /** Sempre uma categoria existente do usuário, ou "Outros" */
  category: string;
  /** AAAA-MM-DD */
  date: string;
  time?: string;
  endTime?: string;
  priority: "urgente" | "alta" | "normal" | "baixa";
  client?: string;
  notes?: string;
  recurrence?: "daily" | "weekly" | "monthly" | "yearly";
}

export interface OrganizeResponse {
  items: ProposedItem[];
}

export const MAX_AI_TEXT = 1000;
