import { json, readJson, route } from "@/lib/server/api";
import { createItem } from "@/lib/server/agenda-db";
import { fromDto, parseTaskDto } from "@/lib/task-dto";

export const dynamic = "force-dynamic";

/** Cria uma tarefa, lembrete, compromisso ou evento (com subtarefas e recorrência). */
export const POST = route(async (request) => {
  const dto = parseTaskDto(await readJson(request));
  await createItem(fromDto(dto));
  return json({ ok: true }, 201);
});
