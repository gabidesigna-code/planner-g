import { authed, json, readJson } from "@/lib/server/api";
import { importConversations, importSchema, listConversations } from "@/lib/server/ori-store";
import { ValidationError } from "@/lib/task-dto";

export const dynamic = "force-dynamic";

/** Lista de conversas da conta logada (mais recente primeiro). */
export const GET = authed(async (_request, { db }) => ({ conversations: await listConversations(db) }));

/** Importa conversas antigas guardadas no aparelho para a conta logada (só quando a pessoa pede). */
export const POST = authed(async (request, { db, userId }) => {
  const parsed = importSchema.safeParse(await readJson(request));
  if (!parsed.success) throw new ValidationError("Conversas antigas em formato inesperado.");
  return json({ imported: await importConversations(db, userId, parsed.data) });
});
