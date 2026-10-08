import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category, Task } from "@/types";
import { toDto, type TaskDto } from "@/lib/task-dto";
import {
  CategoryIndex, categoryFromRow, columnsFor, entityTypeFor, eventFromRow, recurrenceRow, subtaskRow, tableFor, taskFromRow,
  isEventKind, type CategoryRow, type EventRow, type RecurrenceRow, type TaskRow,
} from "@/services/mappers";
import { NotFoundError } from "./api";
import { getAdmin } from "./supabase-admin";

/**
 * Todo acesso ao banco passa por aqui, no servidor, com a chave service_role.
 * O navegador só conhece as rotas /api; nunca fala com o Supabase.
 */

export type ThemeMode = "light" | "dark" | "system";

export interface PreferencesDto {
  displayName: string;
  themeMode: ThemeMode;
  palette: string;
  /** true enquanto nada foi alterado desde a criação (ainda são os valores padrão) */
  untouched: boolean;
}

export interface AgendaPayload {
  tasks: TaskDto[];
  categories: Category[];
  note: string;
  preferences: PreferencesDto;
}

const DEFAULT_CATEGORIES: { name: string; context: "trabalho" | "pessoal" }[] = [
  ...["Fiscal", "Financeiro", "Clientes", "Reuniões", "Administrativo"].map((name) => ({ name, context: "trabalho" as const })),
  ...["Casa", "Compras", "Saúde", "Família", "Financeiro pessoal", "Lazer"].map((name) => ({ name, context: "pessoal" as const })),
];

type Db = SupabaseClient;
type Failure = { message: string; code?: string } | null;

const check = (error: Failure) => {
  if (error) throw new Error(error.message);
};

/** O PostgREST limita cada resposta (1000 linhas por padrão): busca em páginas. */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: Failure }>): Promise<T[]> {
  const size = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1);
    check(error);
    out.push(...(data ?? []));
    if (!data || data.length < size) break;
  }
  return out;
}

async function loadCategoryRows(db: Db): Promise<CategoryRow[]> {
  const read = () =>
    fetchAll<CategoryRow>((a, b) =>
      db.from("categories").select("id,name,context,color,icon,position").order("context").order("position").order("name").range(a, b),
    );
  const rows = await read();
  if (rows.length) return rows;
  // banco sem categorias (ex.: foram apagadas): recria as padrão
  check((await db.from("categories").insert(DEFAULT_CATEGORIES.map((c, i) => ({ ...c, position: (i % 6) + 1 })))).error);
  return read();
}

/** Categorias do usuário (nome e contexto), para a IA escolher entre elas. */
export async function listCategories(): Promise<{ name: string; context: string }[]> {
  return (await loadCategoryRows(getAdmin())).map((c) => ({ name: c.name, context: c.context }));
}

async function categoryIndex(db: Db) {
  return new CategoryIndex((await loadCategoryRows(db)).map(categoryFromRow));
}

// ------------------------------------------------------------------ preferências

async function readPreferences(db: Db): Promise<PreferencesDto> {
  const read = async () => {
    const { data, error } = await db
      .from("preferences")
      .select("display_name,theme_mode,palette,created_at,updated_at")
      .eq("id", true)
      .maybeSingle();
    check(error);
    return data;
  };
  let row = await read();
  if (!row) {
    check((await db.from("preferences").upsert({ id: true }, { onConflict: "id" })).error);
    row = await read();
  }
  return {
    displayName: row?.display_name ?? "",
    themeMode: row?.theme_mode ?? "system",
    palette: row?.palette ?? "oliva-vinho",
    untouched: !row || row.created_at === row.updated_at,
  };
}

export async function getPreferences() {
  return readPreferences(getAdmin());
}

export async function savePreferences(patch: { themeMode?: ThemeMode; palette?: string; displayName?: string }) {
  const cols: Record<string, unknown> = { id: true };
  if (patch.displayName !== undefined) cols.display_name = patch.displayName;
  if (patch.themeMode) cols.theme_mode = patch.themeMode;
  if (patch.palette) cols.palette = patch.palette;
  check((await getAdmin().from("preferences").upsert(cols, { onConflict: "id" })).error);
}

// ------------------------------------------------------------------ nota rápida

async function readNote(db: Db): Promise<{ id: string; content: string } | null> {
  const { data, error } = await db
    .from("notes")
    .select("id,content")
    .eq("converted", false)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  check(error);
  return data;
}

export async function saveNote(content: string) {
  const db = getAdmin();
  const current = await readNote(db);
  if (current) check((await db.from("notes").update({ content }).eq("id", current.id)).error);
  else if (content.trim()) check((await db.from("notes").insert({ content })).error);
}

// ------------------------------------------------------------------ agenda

/**
 * Banco ainda sem a coluna `important` (a migration 20261008 não foi rodada): grava o item sem ela, em vez de
 * quebrar toda criação/edição. O restante do app segue normal; só a estrela não persiste até a migration rodar.
 */
const missingImportant = (e: Failure) => !!e && /important/i.test(e.message);
const withoutImportant = <T extends { important?: unknown }>(cols: T) => {
  console.warn("[agenda] coluna `important` ausente: rode supabase/migrations/20261008000000_important_and_display_name.sql");
  const { important: _drop, ...rest } = cols;
  return rest;
};

export async function loadAgenda(): Promise<AgendaPayload> {
  const db = getAdmin();
  const [catRows, taskRows, eventRows, recRows, note, preferences] = await Promise.all([
    loadCategoryRows(db),
    fetchAll<TaskRow>((a, b) => db.from("tasks").select("*, subtasks(*)").order("position").order("id").range(a, b)),
    fetchAll<EventRow>((a, b) => db.from("events").select("*, subtasks(*)").order("position").order("id").range(a, b)),
    fetchAll<RecurrenceRow>((a, b) => db.from("recurrences").select("entity_type,entity_id,frequency").order("id").range(a, b)),
    readNote(db),
    readPreferences(db),
  ]);

  const categories = catRows.map(categoryFromRow);
  const cats = new CategoryIndex(categories);
  const rec = new Map<string, RecurrenceRow["frequency"]>(recRows.map((r) => [`${r.entity_type}:${r.entity_id}`, r.frequency]));
  const tasks = [
    ...taskRows.map((r) => taskFromRow(r, cats, rec.get(`task:${r.id}`))),
    ...eventRows.map((r) => eventFromRow(r, cats, rec.get(`event:${r.id}`))),
  ].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  return { tasks: tasks.map(toDto), categories, note: note?.content ?? "", preferences };
}

export async function createItem(task: Task): Promise<void> {
  const db = getAdmin();
  const cats = await categoryIndex(db);
  const table = tableFor(task.kind);
  const cols = columnsFor(task, cats);
  let { error } = await db.from(table).insert({ id: task.id, ...cols });
  if (missingImportant(error)) ({ error } = await db.from(table).insert({ id: task.id, ...withoutImportant(cols) }));
  if (error?.code === "23505") return updateItem(task); // já existe (reenvio): vira atualização
  check(error);
  try {
    if (task.subtasks?.length) {
      check((await db.from("subtasks").insert(task.subtasks.map((s, i) => subtaskRow(s, i, task)))).error);
    }
    if (task.recurrence && task.recurrence !== "none") {
      check((await db.from("recurrences").insert(recurrenceRow(task))).error);
    }
  } catch (e) {
    // não deixa um item pela metade no banco
    await db.from(table).delete().eq("id", task.id);
    throw e;
  }
}

export async function updateItem(next: Task): Promise<void> {
  const db = getAdmin();
  const cats = await categoryIndex(db);
  const table = tableFor(next.kind);
  const cols = columnsFor(next, cats);
  let { data, error } = await db.from(table).update(cols).eq("id", next.id).select("id");
  if (missingImportant(error)) ({ data, error } = await db.from(table).update(withoutImportant(cols)).eq("id", next.id).select("id"));
  check(error);
  if (!data?.length) throw new NotFoundError("Item não encontrado.");

  // recorrência: compara com o que está gravado
  const { data: recRows, error: recErr } = await db
    .from("recurrences").select("frequency").eq("entity_type", entityTypeFor(next.kind)).eq("entity_id", next.id);
  check(recErr);
  const before = recRows?.[0]?.frequency ?? "none";
  const after = next.recurrence ?? "none";
  if (before !== after) {
    if (after === "none") {
      check((await db.from("recurrences").delete().eq("entity_type", entityTypeFor(next.kind)).eq("entity_id", next.id)).error);
    } else {
      check((await db.from("recurrences").upsert(recurrenceRow(next), { onConflict: "entity_type,entity_id" })).error);
    }
  }

  // subtarefas: remove, insere e atualiza só o que mudou
  const parentCol = isEventKind(next.kind) ? "event_id" : "task_id";
  const { data: subRows, error: subErr } = await db
    .from("subtasks").select("id,title,completed,position").eq(parentCol, next.id);
  check(subErr);
  const was = new Map((subRows ?? []).map((s) => [s.id as string, s as { id: string; title: string; completed: boolean; position: number }]));
  const wanted = next.subtasks ?? [];
  const keep = new Set(wanted.map((s) => s.id));
  const removed = [...was.keys()].filter((id) => !keep.has(id));
  const added = wanted.map((s, i) => ({ s, i })).filter(({ s }) => !was.has(s.id));
  const changed = wanted
    .map((s, i) => ({ s, i, old: was.get(s.id) }))
    .filter(({ s, i, old }) => old && (old.title !== s.title.trim() || old.completed !== s.done || old.position !== i));

  const ops: PromiseLike<{ error: Failure }>[] = [];
  if (removed.length) ops.push(db.from("subtasks").delete().in("id", removed));
  if (added.length) ops.push(db.from("subtasks").insert(added.map(({ s, i }) => subtaskRow(s, i, next))));
  for (const { s, i } of changed) {
    ops.push(db.from("subtasks").update({ title: s.title.trim(), completed: s.done, position: i }).eq("id", s.id));
  }
  for (const r of await Promise.all(ops)) check(r.error);
}

export async function deleteItem(id: string): Promise<void> {
  const db = getAdmin();
  // o id é único entre as duas tabelas; subtarefas saem em cascata e a recorrência, por trigger
  check((await db.from("tasks").delete().eq("id", id)).error);
  check((await db.from("events").delete().eq("id", id)).error);
}
