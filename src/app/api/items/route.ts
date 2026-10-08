import { authed, json, readJson } from "@/lib/server/api";
import { createItem } from "@/lib/server/agenda-db";
import { fromDto, parseTaskDto } from "@/lib/task-dto";

export const dynamic = "force-dynamic";

/** Cria uma tarefa, lembrete, compromisso ou evento (com subtarefas e recorrência), sempre na conta logada. */
export const POST = authed(async (request, { db, userId }) => {
  const dto = parseTaskDto(await readJson(request));
  await createItem(db, userId, fromDto(dto));
  return json({ ok: true }, 201);
});
