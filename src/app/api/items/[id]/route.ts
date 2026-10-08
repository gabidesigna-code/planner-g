import { authed, json, readJson } from "@/lib/server/api";
import { deleteItem, updateItem } from "@/lib/server/agenda-db";
import { ValidationError, fromDto, parseTaskDto } from "@/lib/task-dto";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Atualiza um item inteiro (o corpo é o item completo). Id de outra conta = 404 (o RLS não deixa nem enxergar). */
export const PUT = authed<Ctx>(async (request, { db, userId }, { params }) => {
  const { id } = await params;
  if (!UUID.test(id)) throw new ValidationError("id inválido");
  const dto = parseTaskDto(await readJson(request));
  if (dto.id !== id) throw new ValidationError("id não confere");
  await updateItem(db, userId, fromDto(dto));
  return json({ ok: true });
});

export const DELETE = authed<Ctx>(async (_request, { db }, { params }) => {
  const { id } = await params;
  if (!UUID.test(id)) throw new ValidationError("id inválido");
  await deleteItem(db, id);
  return json({ ok: true });
});
