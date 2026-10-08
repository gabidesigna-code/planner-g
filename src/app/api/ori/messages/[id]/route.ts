import { authed, json, readJson } from "@/lib/server/api";
import { messagePatchSchema, patchMessage } from "@/lib/server/ori-store";
import { ValidationError } from "@/lib/task-dto";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Registra a decisão da pessoa sobre uma proposta da ori (adicionado, cancelado, desfeito…). Só esses campos. */
export const PATCH = authed<Ctx>(async (request, { db }, { params }) => {
  const { id } = await params;
  if (!UUID.test(id)) throw new ValidationError("id inválido");
  const patch = messagePatchSchema.safeParse(await readJson(request));
  if (!patch.success || !Object.keys(patch.data).length) throw new ValidationError("Nada válido para salvar.");
  await patchMessage(db, id, patch.data);
  return json({ ok: true });
});
