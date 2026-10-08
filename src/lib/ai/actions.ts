import { z } from "zod";
import type { TaskDto } from "@/lib/task-dto";
import type { Kind } from "@/types";

/**
 * Camada estruturada de ações da ori sobre itens EXISTENTES.
 *
 * O Gemini só PROPÕE (JSON). O servidor valida com estes schemas, confere que o item existe e monta a prévia
 * (antes/depois); a tela pede a confirmação e só então executa pelos serviços de sempre (useTasks → /api/items).
 * `applyAction` é a ÚNICA função que calcula o "depois": a prévia e a execução usam a mesma conta.
 *
 * Criar itens continua pelo caminho já existente (`items` → "Posso adicionar"), com a mesma confirmação.
 */

export const ACTION_TYPES = ["update", "delete", "complete", "reopen", "reschedule"] as const;
export type ActionType = (typeof ACTION_TYPES)[number];
/** Inclui `create`, que segue o fluxo de propostas de itens (ver ProposedItem). */
export type OriActionType = ActionType | "create";

export const ENTITY_TYPES = ["task", "appointment", "reminder", "event"] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];
export const ENTITY_OF_KIND: Record<Kind, EntityType> = { tarefa: "task", compromisso: "appointment", lembrete: "reminder", evento: "event" };

/** Teto de itens afetados por uma única confirmação. */
export const MAX_BULK = 100;

/** AAAA-MM-DD de um dia que existe (2026-02-31 não passa: só o Date.parse aceitaria). */
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => { const d = new Date(`${s}T00:00:00Z`); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; }, "data inválida");
const hm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const UUID = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

/** Campos que uma ação pode alterar. `null` em time/endTime/client/notes = limpar o campo. */
export const changesSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  date: day.optional(),
  time: hm.nullable().optional(),
  endTime: hm.nullable().optional(),
  priority: z.enum(["urgente", "alta", "normal", "baixa"]).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  context: z.enum(["trabalho", "pessoal"]).optional(),
  client: z.string().trim().max(200).nullable().optional(),
  /** substitui as observações */
  notes: z.string().trim().max(2000).nullable().optional(),
  /** acrescenta ao fim das observações atuais */
  appendNote: z.string().trim().min(1).max(2000).optional(),
}).strict();
export type Changes = z.infer<typeof changesSchema>;

const RESCHEDULE_KEYS = ["date", "time", "endTime"] as const;

/** Ação já validada, no formato estruturado: é isto que a tela guarda e executa depois do "sim". */
export const oriActionSchema = z.object({
  action: z.enum(ACTION_TYPES),
  entityType: z.enum(ENTITY_TYPES),
  entityId: UUID,
  changes: changesSchema.optional(),
}).superRefine((a, ctx) => {
  const keys = Object.keys(a.changes ?? {});
  const issue = (message: string) => ctx.addIssue({ code: "custom", message });
  if (a.action === "update" && keys.length === 0) issue("update sem alterações");
  if (a.action === "reschedule" && (keys.length === 0 || keys.some((k) => !(RESCHEDULE_KEYS as readonly string[]).includes(k)))) issue("reschedule só muda data e horário");
  if (["delete", "complete", "reopen"].includes(a.action) && keys.length) issue(`${a.action} não aceita alterações`);
});
export type OriAction = z.infer<typeof oriActionSchema>;

// ------------------------------------------------------------------ o que o modelo devolve

/** Seleção em lote ("tudo que está atrasado"): o SERVIDOR busca na agenda inteira, o modelo não lista ids. */
export const selectorSchema = z.object({
  scope: z.enum(["overdue", "open", "all", "today", "tomorrow", "this_week", "completed"]),
  kind: z.enum(["tarefa", "compromisso", "lembrete", "evento"]).nullish(),
  context: z.enum(["trabalho", "pessoal"]).nullish(),
  category: z.string().trim().max(100).nullish(),
  client: z.string().trim().max(200).nullish(),
});
export type Selector = z.infer<typeof selectorSchema>;

/** Uma ação como o Gemini devolve: um alvo (`entityId` = referência curta da agenda) OU um `selector`. */
export const aiActionSchema = z.object({
  action: z.enum(ACTION_TYPES),
  entityId: z.string().trim().max(40).nullish(),
  selector: selectorSchema.nullish(),
  changes: z.record(z.string(), z.unknown()).nullish(),
});
export type AiAction = z.infer<typeof aiActionSchema>;

/** Troca null/"" por "ausente" nos campos que o modelo preenche à toa (o schema do Gemini os obriga a existir). */
export function modelChanges(raw: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!raw) return out;
  for (const [k, v] of Object.entries(raw)) {
    if (v === null || v === undefined || v === "") continue;
    if (k === "removeTime") { if (v === true) { out.time = null; out.endTime = null; } continue; }
    if (k === "clearClient") { if (v === true) out.client = null; continue; }
    if (k === "clearNotes") { if (v === true) out.notes = null; continue; }
    out[k] = v;
  }
  return out;
}

// ------------------------------------------------------------------ cálculo do "depois"

const pad = (n: number) => String(n).padStart(2, "0");
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const fromMin = (n: number) => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;

export function addDaysIso(s: string, n: number): string {
  const d = new Date(`${s}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
const diffIso = (a: string, b: string) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);

export interface ApplyContext {
  /** Nomes de categoria por contexto (para não deixar um item numa categoria que não existe) */
  categories: { name: string; context: string }[];
}

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Campos que a ori enxerga/compara; se algum mudar entre a prévia e a execução, a execução é recusada. */
export const GUARDED_FIELDS = ["title", "due", "time", "end", "endDate", "priority", "category", "context", "client", "note", "status", "kind"] as const;
export const sameGuarded = (a: TaskDto, b: TaskDto) => GUARDED_FIELDS.every((k) => (a[k] ?? null) === (b[k] ?? null));

/** O item como ficará depois da ação (nunca altera o original). `delete` devolve null. */
export function applyAction(before: TaskDto, action: OriAction, ctx: ApplyContext): { after: TaskDto | null; ignored: string[] } {
  const ignored: string[] = [];
  if (action.action === "delete") return { after: null, ignored };
  if (action.action === "complete") return { after: { ...before, status: "concluido" }, ignored };
  if (action.action === "reopen") return { after: { ...before, status: "a-fazer", doneAt: undefined }, ignored };

  const c = action.changes ?? {};
  const after: TaskDto = { ...before };

  if (c.title !== undefined) after.title = c.title;
  if (c.priority !== undefined) after.priority = c.priority;

  // data (eventos de vários dias andam juntos) e horário (a duração é mantida)
  if (c.date !== undefined && c.date !== before.due) {
    if (before.endDate) after.endDate = addDaysIso(before.endDate, diffIso(c.date, before.due));
    after.due = c.date;
  }
  if (c.time === null) {
    after.time = undefined;
    after.end = undefined;
  } else if (c.time !== undefined) {
    after.time = c.time;
    if (c.endTime === undefined && before.time && before.end) {
      const end = toMin(c.time) + (toMin(before.end) - toMin(before.time));
      after.end = end > toMin(c.time) && end < 24 * 60 ? fromMin(end) : undefined;
    }
  }
  if (c.endTime === null) after.end = undefined;
  else if (c.endTime !== undefined) {
    if (after.time && toMin(c.endTime) > toMin(after.time)) after.end = c.endTime;
    else ignored.push("horário final ignorado (precisa ser depois do início)");
  }
  if (!after.time) after.end = undefined;

  // contexto → categoria e cliente continuam coerentes (categorias são por contexto)
  const context = c.context ?? before.context;
  if (c.context !== undefined) after.context = c.context;
  if (c.category !== undefined) {
    const known = ctx.categories.find((k) => k.context === context && fold(k.name) === fold(c.category!));
    if (known) after.category = known.name;
    else ignored.push(`categoria "${c.category}" não existe em ${context === "trabalho" ? "Trabalho" : "Pessoal"}`);
  }
  if (c.context !== undefined && c.context !== before.context) {
    const stays = after.category === "Outros" || ctx.categories.some((k) => k.context === context && k.name === after.category);
    if (!stays) after.category = "Outros";
    after.topic = undefined;
  }
  if (c.client !== undefined) after.client = c.client || undefined;
  if (after.context === "pessoal") after.client = undefined;

  if (c.notes !== undefined) after.note = c.notes || undefined;
  if (c.appendNote !== undefined) after.note = after.note ? `${after.note}\n${c.appendNote}` : c.appendNote;

  return { after, ignored };
}
