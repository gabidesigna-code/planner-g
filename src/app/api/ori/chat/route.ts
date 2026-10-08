import { randomUUID } from "node:crypto";
import { authed, readJson, json } from "@/lib/server/api";
import { AiError, isAiConfigured } from "@/lib/server/gemini";
import { chatWithOri } from "@/lib/server/ori-chat";
import { ensureConversation, recentMessages, saveOriMessage, saveUserMessage } from "@/lib/server/ori-store";
import { listCategories, loadAgenda } from "@/lib/server/agenda-db";
import { chatRequestSchema } from "@/lib/ai/chat-schema";
import { toTurns } from "@/lib/ai/chat-turns";
import { ValidationError } from "@/lib/task-dto";

export const dynamic = "force-dynamic";

/**
 * Chat da ori. Guarda a pergunta e a resposta NA CONVERSA DA CONTA LOGADA (banco, protegido por RLS) e devolve a resposta.
 * Não altera a agenda: itens e alterações vêm só como PROPOSTAS (dentro da mensagem); quem grava é a tela, depois da confirmação.
 *
 * Isolamento: a memória da ori é montada AQUI, lendo as últimas mensagens da conversa (user_id + conversation_id, pelo RLS);
 * a agenda enviada ao Gemini é só a desta conta. Nada do histórico vem do navegador.
 */
export const POST = authed(async (request, { db, userId }) => {
  const parsed = chatRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) throw new ValidationError("Mensagem inválida. Escreva algo para a ori (até 4000 caracteres).");
  const { conversationId, message } = parsed.data;

  const conversation = await ensureConversation(db, userId, conversationId, message?.text);
  if (message) await saveUserMessage(db, userId, conversationId, message);

  const history = (await recentMessages(db, conversationId)) ?? [];
  if (history[history.length - 1]?.role !== "user") throw new ValidationError("Não há pergunta pendente nesta conversa.");
  if (!isAiConfigured()) return json({ error: "A ori ainda não está configurada: falta a GEMINI_API_KEY no servidor." }, 503);

  try {
    const [categories, agenda] = await Promise.all([listCategories(db, userId), loadAgenda(db, userId)]);
    // quem é a pessoa (para a ori usar o nome) vem do perfil dela
    const res = await chatWithOri(toTurns(history), { ownerName: agenda.preferences.displayName, categories, tasks: agenda.tasks });
    const meta: Record<string, unknown> = {};
    if (res.items.length) Object.assign(meta, { items: res.items, proposal: "pending" });
    if (res.changes) Object.assign(meta, { changes: res.changes, changeStatus: "pending" });
    if (res.choices?.length) meta.choices = res.choices;
    const saved = await saveOriMessage(db, userId, conversationId, randomUUID(), res.reply, meta);
    return { message: saved, conversation: { id: conversation.id, title: conversation.title, updatedAt: saved.at } };
  } catch (e) {
    // a pergunta já está salva: "tentar de novo" reenvia sem duplicar
    if (e instanceof AiError) return json({ error: e.message }, e.status);
    throw e;
  }
});
