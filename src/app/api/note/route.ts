import { json, readJson, route } from "@/lib/server/api";
import { saveNote } from "@/lib/server/agenda-db";
import { ValidationError } from "@/lib/task-dto";

export const dynamic = "force-dynamic";

/** Grava a nota rápida da Home. */
export const PUT = route(async (request) => {
  const body = (await readJson(request)) as { content?: unknown };
  if (typeof body.content !== "string") throw new ValidationError("conteúdo inválido");
  if (body.content.length > 50_000) throw new ValidationError("A nota é grande demais.");
  await saveNote(body.content);
  return json({ ok: true });
});
