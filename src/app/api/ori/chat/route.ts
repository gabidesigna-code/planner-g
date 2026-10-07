import { route, readJson, json } from "@/lib/server/api";
import { AiError, isAiConfigured } from "@/lib/server/gemini";
import { chatWithOri } from "@/lib/server/ori-chat";
import { listCategories, loadAgenda } from "@/lib/server/agenda-db";
import { chatRequestSchema } from "@/lib/ai/chat-schema";
import { ValidationError } from "@/lib/task-dto";

export const dynamic = "force-dynamic";

/**
 * Chat da ori. NÃO grava nada: devolve o texto da resposta e, se for o caso, itens PROPOSTOS.
 * A gravação acontece no navegador, pelos serviços de sempre, depois da confirmação.
 */
export const POST = route(async (request) => {
  const parsed = chatRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) throw new ValidationError("Mensagem inválida. Escreva algo para a ori (até 4000 caracteres).");
  const { messages } = parsed.data;
  if (messages[messages.length - 1].role !== "user") throw new ValidationError("A última mensagem precisa ser sua.");
  if (!isAiConfigured()) return json({ error: "A ori ainda não está configurada: falta a GEMINI_API_KEY no servidor." }, 503);

  try {
    const [categories, agenda] = await Promise.all([listCategories(), loadAgenda()]);
    return await chatWithOri(messages, { ownerName: agenda.preferences.displayName, categories, tasks: agenda.tasks });
  } catch (e) {
    if (e instanceof AiError) return json({ error: e.message }, e.status);
    throw e;
  }
});
