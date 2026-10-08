import { authed, json, NotFoundError } from "@/lib/server/api";
import { deleteConversation, getMessages } from "@/lib/server/ori-store";
import { ValidationError } from "@/lib/task-dto";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const idOf = async (ctx: Ctx) => {
  const { id } = await ctx.params;
  if (!UUID.test(id)) throw new ValidationError("id inválido");
  return id;
};

/** Mensagens de uma conversa da conta logada. Id de outra conta = 404. */
export const GET = authed<Ctx>(async (_request, { db }, ctx) => {
  const messages = await getMessages(db, await idOf(ctx));
  if (!messages) throw new NotFoundError("Conversa não encontrada.");
  return { messages };
});

/** Apaga a conversa e as mensagens dela (só se for da conta logada). */
export const DELETE = authed<Ctx>(async (_request, { db }, ctx) => {
  await deleteConversation(db, await idOf(ctx));
  return json({ ok: true });
});
