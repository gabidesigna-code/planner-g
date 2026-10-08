import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category, Task } from "@/types";
import { toDto, type TaskDto } from "@/lib/task-dto";
import {
  CategoryIndex, categoryFromRow, columnsFor, entityTypeFor, eventFromRow, recurrenceRow, subtaskRow, tableFor, taskFromRow,
  isEventKind, type CategoryRow, type EventRow, type RecurrenceRow, type TaskRow,
} from "@/services/mappers";
import { NotFoundError } from "./api";

/**
 * Todo acesso aos dados passa por aqui, no servidor, com o cliente DA PESSOA LOGADA (`db`: chave pública +
 * sessão dela). O RLS do banco garante que ela só lê e grava o que é dela; o `userId` (vindo da sessão
 * verificada, nunca do navegador) é gravado como dono de cada registro novo.
 * O navegador só conhece as rotas /api para os dados.
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
  /** a conta logada (para a tela Você e para o Realtime) */
  account: { userId: string; email: string | null };
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

async function loadCategoryRows(db: Db, userId: string): Promise<CategoryRow[]> {
  const read = () =>
    fetchAll<CategoryRow>((a, b) =>
      db.from("categories").select("id,name,context,color,icon,position").order("context").order("position").order("name").range(a, b),
    );
  const rows = await read();
  if (rows.length) return rows;
  // conta sem categorias (o cadastro já cria as padrão; isto cobre contas antigas ou apagadas): recria as padrão
  check((await db.from("categories").insert(DEFAULT_CATEGORIES.map((c, i) => ({ ...c, user_id: userId, position: (i % 6) + 1 })))).error);
  return read();
}

/** Categorias da pessoa (nome e contexto), para a IA escolher entre elas. */
export async function listCategories(db: Db, userId: string): Promise<{ name: string; context: string }[]> {
  return (await loadCategoryRows(db, userId)).map((c) => ({ name: c.name, context: c.context }));
}

async function categoryIndex(db: Db, userId: string) {
  return new CategoryIndex((await loadCategoryRows(db, userId)).map(categoryFromRow));
}

// ------------------------------------------------------------------ preferências e perfil
// Visual (modo e paleta) vive em `preferences`; o nome que a ori usa vive em `profiles`. Ambos são da conta.

async function readPreferences(db: Db, userId: string): Promise<PreferencesDto> {
  const readPrefs = async () => {
    const { data, error } = await db.from("preferences").select("theme_mode,palette,created_at,updated_at").eq("user_id", userId).maybeSingle();
    check(error);
    return data;
  };
  const readProfile = async () => {
    const { data, error } = await db.from("profiles").select("display_name").eq("id", userId).maybeSingle();
    check(error);
    return data;
  };
  let prefs = await readPrefs();
  if (!prefs) {
    check((await db.from("preferences").upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true })).error);
    prefs = await readPrefs();
  }
  let profile = await readProfile();
  if (!profile) {
    check((await db.from("profiles").upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true })).error);
    profile = await readProfile();
  }
  return {
    displayName: profile?.display_name ?? "",
    themeMode: prefs?.theme_mode ?? "system",
    palette: prefs?.palette ?? "oliva-vinho",
    untouched: !prefs || prefs.created_at === prefs.updated_at,
  };
}

export async function getPreferences(db: Db, userId: string) {
  return readPreferences(db, userId);
}

export async function savePreferences(db: Db, userId: string, patch: { themeMode?: ThemeMode; palette?: string; displayName?: string }) {
  if (patch.themeMode || patch.palette) {
    const cols: Record<string, unknown> = { user_id: userId };
    if (patch.themeMode) cols.theme_mode = patch.themeMode;
    if (patch.palette) cols.palette = patch.palette;
    check((await db.from("preferences").upsert(cols, { onConflict: "user_id" })).error);
  }
  if (patch.displayName !== undefined) {
    check((await db.from("profiles").upsert({ id: userId, display_name: patch.displayName }, { onConflict: "id" })).error);
  }
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

export async function saveNote(db: Db, userId: string, content: string) {
  const current = await readNote(db);
  if (current) check((await db.from("notes").update({ content }).eq("id", current.id)).error);
  else if (content.trim()) check((await db.from("notes").insert({ content, user_id: userId })).error);
}

// ------------------------------------------------------------------ agenda

/**
 * Banco ainda sem a coluna `important` (a migration 20261008 não foi rodada): grava o item sem ela, em vez de
 * quebrar toda criação/edição. O restante do app segue normal; só a estrela não persiste até a migration rodar.
 */
const missingImportant = (e: Failure) => !!e && /important|reminder_minutes/i.test(e.message);
const withoutImportant = <T extends { important?: unknown; reminder_minutes?: unknown }>(cols: T) => {
  console.warn("[agenda] coluna `important` ou `reminder_minutes` ausente: rode as migrations pendentes de supabase/migrations");
  const { important: _a, reminder_minutes: _b, ...rest } = cols;
  return rest;
};

export async function loadAgenda(db: Db, userId: string, email: string | null = null): Promise<AgendaPayload> {
  const [catRows, taskRows, eventRows, recRows, note, preferences] = await Promise.all([
    loadCategoryRows(db, userId),
    fetchAll<TaskRow>((a, b) => db.from("tasks").select("*, subtasks(*)").order("position").order("id").range(a, b)),
    fetchAll<EventRow>((a, b) => db.from("events").select("*, subtasks(*)").order("position").order("id").range(a, b)),
    fetchAll<RecurrenceRow>((a, b) => db.from("recurrences").select("entity_type,entity_id,frequency").order("id").range(a, b)),
    readNote(db),
    readPreferences(db, userId),
  ]);

  const categories = catRows.map(categoryFromRow);
  const cats = new CategoryIndex(categories);
  const rec = new Map<string, RecurrenceRow["frequency"]>(recRows.map((r) => [`${r.entity_type}:${r.entity_id}`, r.frequency]));
  const tasks = [
    ...taskRows.map((r) => taskFromRow(r, cats, rec.get(`task:${r.id}`))),
    ...eventRows.map((r) => eventFromRow(r, cats, rec.get(`event:${r.id}`))),
  ].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  return { tasks: tasks.map(toDto), categories, note: note?.content ?? "", preferences, account: { userId, email } };
}

export async function createItem(db: Db, userId: string, task: Task): Promise<void> {
  const cats = await categoryIndex(db, userId);
  const table = tableFor(task.kind);
  const cols = { ...columnsFor(task, cats), user_id: userId };
  let { error } = await db.from(table).insert({ id: task.id, ...cols });
  if (missingImportant(error)) ({ error } = await db.from(table).insert({ id: task.id, ...withoutImportant(cols) }));
  if (error?.code === "23505") return updateItem(db, userId, task); // já existe (reenvio): vira atualização
  check(error);
  try {
    if (task.subtasks?.length) {
      check((await db.from("subtasks").insert(task.subtasks.map((s, i) => ({ ...subtaskRow(s, i, task), user_id: userId })))).error);
    }
    if (task.recurrence && task.recurrence !== "none") {
      check((await db.from("recurrences").insert({ ...recurrenceRow(task), user_id: userId })).error);
    }
  } catch (e) {
    // não deixa um item pela metade no banco
    await db.from(table).delete().eq("id", task.id);
    throw e;
  }
}

export async function updateItem(db: Db, userId: string, next: Task): Promise<void> {
  const cats = await categoryIndex(db, userId);
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
      check((await db.from("recurrences").upsert({ ...recurrenceRow(next), user_id: userId }, { onConflict: "entity_type,entity_id" })).error);
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
  if (added.length) ops.push(db.from("subtasks").insert(added.map(({ s, i }) => ({ ...subtaskRow(s, i, next), user_id: userId }))));
  for (const { s, i } of changed) {
    ops.push(db.from("subtasks").update({ title: s.title.trim(), completed: s.done, position: i }).eq("id", s.id));
  }
  for (const r of await Promise.all(ops)) check(r.error);
}

export async function deleteItem(db: Db, id: string): Promise<void> {
  // o id é único entre as duas tabelas; subtarefas saem em cascata e a recorrência, por trigger.
  // Pelo RLS, só apaga se for da pessoa logada (id de outra conta = nada acontece).
  check((await db.from("tasks").delete().eq("id", id)).error);
  check((await db.from("events").delete().eq("id", id)).error);
}
