import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MAX_CHAT_TURNS } from "@/lib/ai/chat-schema";
import { titleOf, type ConversationMeta, type OriMessage } from "@/lib/ai/chat-turns";
import { ConflictError, NotFoundError } from "./api";

/**
 * Conversas da ori no banco. Tudo passa pelo `db` DA PESSOA LOGADA: o RLS garante que ela só enxerga e mexe
 * nas próprias conversas e mensagens (inclusive ao apagar). O `userId` vem da sessão e é gravado como dono.
 */

type Db = SupabaseClient;
type Failure = { message: string; code?: string } | null;
const check = (error: Failure) => {
  if (error) throw new Error(error.message);
};

interface MessageRow {
  id: string;
  role: "user" | "ori";
  content: string;
  meta: Record<string, unknown> | null;
  created_at: string;
}

/** O que a tela guarda dentro de `meta`: propostas da ori e o que a pessoa decidiu. */
const META_KEYS = ["items", "proposal", "changes", "changeStatus", "changeSkipped", "choices", "pick"] as const;

const pickMeta = (meta: Record<string, unknown> | null) => {
  const out: Record<string, unknown> = {};
  for (const k of META_KEYS) if (meta && meta[k] !== undefined) out[k] = meta[k];
  return out;
};

const toMessage = (r: MessageRow): OriMessage => ({ id: r.id, role: r.role, text: r.content, at: Date.parse(r.created_at), ...pickMeta(r.meta) });

/** Só estes campos podem ser alterados depois (decisão da pessoa sobre uma proposta). */
export const messagePatchSchema = z
  .object({
    proposal: z.enum(["pending", "saved", "dismissed"]).optional(),
    changeStatus: z.enum(["pending", "done", "cancelled", "stale", "undone"]).optional(),
    changeSkipped: z.array(z.string().max(40)).max(200).optional(),
  })
  .strict();

export async function listConversations(db: Db): Promise<ConversationMeta[]> {
  const { data, error } = await db
    .from("ori_conversations")
    .select("id,title,created_at,updated_at,ori_messages(count)")
    .order("updated_at", { ascending: false })
    .limit(100);
  check(error);
  return (data ?? []).map((c) => ({
    id: c.id as string,
    title: c.title as string,
    createdAt: Date.parse(c.created_at as string),
    updatedAt: Date.parse(c.updated_at as string),
    messageCount: ((c.ori_messages as { count: number }[] | null)?.[0]?.count) ?? 0,
  }));
}

/** Mensagens da conversa em ordem; `null` se a conversa não existir PARA ESTA PESSOA. */
export async function getMessages(db: Db, conversationId: string, limit = 400): Promise<OriMessage[] | null> {
  const { data: conv, error: convErr } = await db.from("ori_conversations").select("id").eq("id", conversationId).maybeSingle();
  check(convErr);
  if (!conv) return null;
  const { data, error } = await db
    .from("ori_messages")
    .select("id,role,content,meta,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  check(error);
  return ((data ?? []) as MessageRow[]).reverse().map(toMessage);
}

/** A memória da ori: as últimas mensagens DESTA conversa, desta conta. */
export const recentMessages = (db: Db, conversationId: string) => getMessages(db, conversationId, MAX_CHAT_TURNS);

/** Garante a conversa (criando na primeira mensagem). O id novo vem do navegador, mas o dono é sempre a sessão. */
export async function ensureConversation(db: Db, userId: string, id: string, firstText?: string): Promise<{ id: string; title: string }> {
  const { data, error } = await db.from("ori_conversations").select("id,title").eq("id", id).maybeSingle();
  check(error);
  if (data) return data as { id: string; title: string };
  if (!firstText) throw new NotFoundError("Conversa não encontrada.");
  const title = titleOf(firstText);
  const ins = await db.from("ori_conversations").insert({ id, user_id: userId, title });
  if (ins.error?.code === "23505") throw new ConflictError("Esse identificador de conversa já está em uso.");
  check(ins.error);
  return { id, title };
}

/** Salva a pergunta (idempotente pelo id: repetir o envio não duplica). */
export async function saveUserMessage(db: Db, userId: string, conversationId: string, m: { id: string; text: string; pick?: string }) {
  const meta = m.pick ? { pick: m.pick } : {};
  check((await db.from("ori_messages").upsert({ id: m.id, conversation_id: conversationId, user_id: userId, role: "user", content: m.text, meta }, { onConflict: "id", ignoreDuplicates: true })).error);
}

export async function saveOriMessage(db: Db, userId: string, conversationId: string, id: string, text: string, meta: Record<string, unknown>): Promise<OriMessage> {
  const { data, error } = await db
    .from("ori_messages")
    .insert({ id, conversation_id: conversationId, user_id: userId, role: "ori", content: text, meta })
    .select("id,role,content,meta,created_at")
    .single();
  check(error);
  return toMessage(data as MessageRow);
}

/** Atualiza o que a pessoa decidiu sobre uma proposta (só mensagens da ori, só os campos permitidos). */
export async function patchMessage(db: Db, id: string, patch: z.infer<typeof messagePatchSchema>) {
  const { data, error } = await db.from("ori_messages").select("role,meta").eq("id", id).maybeSingle();
  check(error);
  if (!data || data.role !== "ori") throw new NotFoundError("Mensagem não encontrada.");
  const meta = { ...((data.meta as Record<string, unknown>) ?? {}), ...patch };
  const upd = await db.from("ori_messages").update({ meta }).eq("id", id).select("id");
  check(upd.error);
  if (!upd.data?.length) throw new NotFoundError("Mensagem não encontrada.");
}

/** Apaga a conversa (as mensagens saem em cascata). Id de outra conta = não encontrada. */
export async function deleteConversation(db: Db, id: string) {
  const { data, error } = await db.from("ori_conversations").delete().eq("id", id).select("id");
  check(error);
  if (!data?.length) throw new NotFoundError("Conversa não encontrada.");
}

// ------------------------------------------------------------------ importar conversas antigas (guardadas no aparelho)

const importMessage = z.object({
  id: z.string().uuid(),
  role: z.enum(["user", "ori"]),
  text: z.string().min(1).max(8000),
  at: z.number().int().positive(),
  items: z.array(z.unknown()).max(12).optional(),
  proposal: z.enum(["pending", "saved", "dismissed"]).optional(),
  changes: z.unknown().optional(),
  changeStatus: z.enum(["pending", "done", "cancelled", "stale", "undone"]).optional(),
  changeSkipped: z.array(z.string().max(40)).max(200).optional(),
  choices: z.array(z.unknown()).max(12).optional(),
  pick: z.string().max(40).optional(),
});

export const importSchema = z.object({
  conversations: z
    .array(
      z.object({
        id: z.string().uuid(),
        title: z.string().trim().min(1).max(200),
        createdAt: z.number().int().positive(),
        updatedAt: z.number().int().positive(),
        messages: z.array(importMessage).max(300),
      }),
    )
    .max(100),
});

/** Traz conversas antigas para a conta logada. Repetir não duplica (ids). Devolve quantas conversas entraram. */
export async function importConversations(db: Db, userId: string, input: z.infer<typeof importSchema>): Promise<number> {
  let imported = 0;
  for (const c of input.conversations) {
    const created = new Date(c.createdAt).toISOString();
    const up = await db.from("ori_conversations").upsert({ id: c.id, user_id: userId, title: c.title, created_at: created, updated_at: new Date(c.updatedAt).toISOString() }, { onConflict: "id", ignoreDuplicates: true });
    check(up.error);
    // se o id já pertencia a OUTRA conta o insert foi ignorado e o RLS esconde a linha: pula (nunca anexa a conversa alheia)
    const own = await db.from("ori_conversations").select("id").eq("id", c.id).maybeSingle();
    check(own.error);
    if (!own.data) continue;
    const rows = c.messages.map((m) => {
      const meta: Record<string, unknown> = {};
      for (const k of META_KEYS) if ((m as Record<string, unknown>)[k] !== undefined) meta[k] = (m as Record<string, unknown>)[k];
      return { id: m.id, conversation_id: c.id, user_id: userId, role: m.role, content: m.text, meta, created_at: new Date(m.at).toISOString() };
    });
    if (rows.length) check((await db.from("ori_messages").upsert(rows, { onConflict: "id", ignoreDuplicates: true })).error);
    imported++;
  }
  return imported;
}
