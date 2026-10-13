import { authed, readJson, json } from "@/lib/server/api";
import { AiError, isAiConfigured, organizeWithGemini } from "@/lib/server/gemini";
import { listCategories, loadAgenda } from "@/lib/server/agenda-db";
import { attachConflicts } from "@/lib/travel";
import { MAX_AI_TEXT, type OrganizeResponse } from "@/lib/ai/schema";
import { ValidationError } from "@/lib/task-dto";

export const dynamic = "force-dynamic";
// o Gemini pode levar dezenas de segundos com a agenda no contexto: sem isso a Vercel corta a rota antes do timeout daqui
export const maxDuration = 60;

/**
 * Linguagem natural → itens propostos. NÃO grava nada: devolve só a prévia (JSON validado).
 * A gravação acontece depois, no navegador, pelos mesmos serviços de sempre, após a confirmação.
 */
export const POST = authed(async (request, { db, userId }) => {
  const body = (await readJson(request)) as { text?: unknown };
  if (typeof body.text !== "string") throw new ValidationError("Escreva o que você precisa organizar.");
  const text = body.text.trim();
  if (!text) throw new ValidationError("Escreva o que você precisa organizar.");
  if (text.length > MAX_AI_TEXT) throw new ValidationError(`Texto longo demais (máximo ${MAX_AI_TEXT} caracteres).`);
  if (!isAiConfigured()) return json({ error: "A ori ainda não está configurada: falta a GEMINI_API_KEY no servidor." }, 503);

  try {
    const [categories, agenda] = await Promise.all([listCategories(db, userId), loadAgenda(db, userId)]);
    const items = attachConflicts(await organizeWithGemini(text, categories), agenda.tasks);
    return { items } satisfies OrganizeResponse;
  } catch (e) {
    if (e instanceof AiError) return json({ error: e.message }, e.status);
    throw e;
  }
});
