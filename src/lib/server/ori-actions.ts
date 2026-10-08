import "server-only";
import type { TaskDto } from "@/lib/task-dto";
import type { ChangeEntry, ChangeProposal } from "@/lib/ai/chat-schema";
import {
  ENTITY_OF_KIND, MAX_BULK, aiActionSchema, applyAction, changesSchema, modelChanges, oriActionSchema, sameGuarded, addDaysIso,
  type OriAction, type Selector,
} from "@/lib/ai/actions";

/**
 * Transforma o que o Gemini PROPÔS em alterações verificadas. Aqui nada é gravado: o servidor só
 * (1) resolve cada alvo na agenda REAL (o modelo cita uma referência curta, nunca um id inventado vale),
 * (2) valida com Zod, (3) calcula o antes/depois e (4) descarta o que não faz sentido.
 */

type Cat = { name: string; context: string };

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const isOpen = (t: TaskDto) => t.status !== "concluido";
const byWhen = (a: TaskDto, b: TaskDto) => `${a.due} ${a.time ?? "99:99"}`.localeCompare(`${b.due} ${b.time ?? "99:99"}`);

/** Referência curta que aparece na agenda enviada ao modelo. */
export const taskRef = (id: string) => id.slice(0, 8);

/** Referência (curta ou id inteiro) → item. Só vale se identificar UM item. */
export function resolveRef(ref: string, tasks: TaskDto[]): TaskDto | null {
  const r = ref.trim().toLowerCase().replace(/^(ref=|#)/, "").replace(/[[\]]/g, "");
  if (!/^[0-9a-f-]{6,36}$/.test(r)) return null;
  const hits = tasks.filter((t) => t.id.toLowerCase().startsWith(r));
  return hits.length === 1 ? hits[0] : null;
}

/** Busca em lote na agenda inteira (ex.: "tudo que está atrasado"). */
export function selectTasks(sel: Selector, tasks: TaskDto[], todayIso: string): TaskDto[] {
  const dow = new Date(`${todayIso}T00:00:00Z`).getUTCDay();
  const weekEnd = addDaysIso(todayIso, (7 - dow) % 7);
  const tomorrow = addDaysIso(todayIso, 1);
  const occurs = (t: TaskDto, d: string) => t.due === d || (!!t.endDate && t.due < d && t.endDate >= d);

  return tasks
    .filter((t) => {
      switch (sel.scope) {
        case "overdue": if (!(isOpen(t) && t.due < todayIso && (t.kind === "tarefa" || t.kind === "lembrete"))) return false; break;
        case "open": if (!isOpen(t)) return false; break;
        case "completed": if (isOpen(t)) return false; break;
        case "today": if (!occurs(t, todayIso)) return false; break;
        case "tomorrow": if (!occurs(t, tomorrow)) return false; break;
        case "this_week": if (!(t.due >= todayIso && t.due <= weekEnd)) return false; break;
        case "all": break;
      }
      if (sel.kind && t.kind !== sel.kind) return false;
      if (sel.context && t.context !== sel.context) return false;
      if (sel.category && fold(t.category) !== fold(sel.category)) return false;
      if (sel.client && !fold(t.client ?? "").includes(fold(sel.client))) return false;
      return true;
    })
    .sort(byWhen);
}

const STOP = new Set(["de", "da", "do", "das", "dos", "a", "o", "e", "para", "pra", "com", "em", "no", "na"]);
const tokens = (s: string) => new Set(fold(s).split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w)));

/** Outros itens com título quase igual: a usuária vê que existem e confere que o alvo é o certo. */
function similarTo(target: TaskDto, tasks: TaskDto[], limit = 2): TaskDto[] {
  const a = tokens(target.title);
  if (!a.size) return [];
  return tasks
    .filter((t) => {
      if (t.id === target.id || t.kind !== target.kind || isOpen(t) !== isOpen(target)) return false;
      const b = tokens(t.title);
      const inter = [...a].filter((w) => b.has(w)).length;
      return inter / (a.size + b.size - inter) >= 0.6;
    })
    .sort(byWhen)
    .slice(0, limit);
}

// ------------------------------------------------------------------ "qual deles?" (trava contra adivinhação)

/** O que a usuária escreveu (e escolheu) neste pedido. */
export interface AskContext {
  /** as últimas mensagens dela, sem as notas internas */
  userText: string;
  /** referência do item que ela tocou ao responder "qual deles?" */
  pick?: string;
}

const WEEKDAY_RE = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const re = (source: string) => new RegExp(source);

/** Jeitos de a usuária apontar um dia, um horário, um cliente ou uma palavra do título (texto já sem acentos/maiúsculas). */
function pointers(t: { due?: string; time?: string; client?: string; title?: string }, todayIso: string): Map<string, RegExp> {
  const m = new Map<string, RegExp>();
  if (t.due) {
    const n = Math.round((Date.parse(`${t.due}T00:00:00Z`) - Date.parse(`${todayIso}T00:00:00Z`)) / 86_400_000);
    if (n === 0) m.set("d:hoje", re(String.raw`\bhoje\b`));
    if (n === 1) m.set("d:amanha", re(String.raw`(?<!depois de )\bamanha\b`));
    if (n === 2) m.set("d:depois", re(String.raw`\bdepois de amanha\b`));
    if (n === -1) m.set("d:ontem", re(String.raw`\bontem\b`));
    const [, mo, da] = t.due.split("-").map(Number);
    const dow = new Date(`${t.due}T00:00:00Z`).getUTCDay();
    m.set(`d:wd${dow}`, re(String.raw`\b${WEEKDAY_RE[dow]}(-feira)?\b`));
    m.set(`d:dia${da}`, re(String.raw`\bdia 0?${da}\b`));
    m.set(`d:${da}/${mo}`, re(String.raw`\b0?${da}\s*/\s*0?${mo}\b`));
  }
  if (t.time) {
    const [h, mi] = t.time.split(":").map(Number);
    m.set(`t:${t.time}`, mi === 0
      ? re(String.raw`\b0?${h}\s*(h|hs|horas?|:00)(?!\d)|\bas 0?${h}(?![\d:])`)
      : re(String.raw`\b0?${h}\s*(h|:)\s*${String(mi).padStart(2, "0")}\b`));
  }
  if (t.client) m.set(`c:${fold(t.client)}`, re(String.raw`\b${esc(fold(t.client))}\b`));
  if (t.title) for (const w of tokens(t.title)) m.set(`w:${w}`, re(String.raw`\b${w}\b`));
  return m;
}

/**
 * A mensagem dela aponta O ITEM ESCOLHIDO e nenhum dos parecidos? (algo que só ele tem: o dia, o horário, o cliente…)
 * As partes que são o NOVO valor pedido ("pra 15h") não contam como apontar o item.
 */
function pointsAt(target: TaskDto, others: TaskDto[], ask: AskContext, changes: { date?: string; time?: string | null }, todayIso: string): boolean {
  let text = fold(ask.userText);
  for (const r of pointers({ due: changes.date, time: changes.time ?? undefined }, todayIso).values()) text = text.replace(new RegExp(r.source, "g"), " ");
  const mine = pointers(target, todayIso);
  const theirs = others.map((o) => pointers(o, todayIso));
  for (const [key, r] of mine) {
    if (theirs.some((p) => p.has(key))) continue; // todos têm isso: não distingue
    if (r.test(text)) return true;
  }
  return false;
}

/** Itens entre os quais a ori quer que a usuária escolha (só vale com 2 ou mais itens reais). */
export function buildChoices(refs: string[], tasks: TaskDto[]): TaskDto[] {
  const seen = new Set<string>();
  const out: TaskDto[] = [];
  for (const ref of refs) {
    const t = resolveRef(ref, tasks);
    if (t && !seen.has(t.id)) { seen.add(t.id); out.push(t); }
  }
  return out.length >= 2 ? out.sort(byWhen).slice(0, 6) : [];
}

export interface BuiltChanges {
  proposal: ChangeProposal | null;
  /** quantas ações do modelo foram descartadas (alvo inexistente, formato inválido…) */
  invalid: number;
  /** o pedido apontava para mais de um item parecido e a mensagem não distingue: a ori precisa perguntar */
  ambiguous?: { action: string; title: string; candidates: TaskDto[] };
}

export function buildChangeProposal(rawActions: unknown[], tasks: TaskDto[], categories: Cat[], todayIso: string, ask: AskContext = { userText: "" }): BuiltChanges {
  let invalid = 0;
  const drop = (why: string, raw: unknown) => { invalid++; console.error("[ori] ação descartada:", why, JSON.stringify(raw).slice(0, 300)); };
  let truncated = false;
  const entries: ChangeEntry[] = [];
  const skipped: ChangeProposal["skipped"] = [];
  const claimed = new Set<string>();

  for (const raw of rawActions) {
    const parsed = aiActionSchema.safeParse(raw);
    if (!parsed.success) { drop("formato", raw); continue; }
    const { action, entityId, selector } = parsed.data;

    let targets: TaskDto[] = [];
    if (selector) targets = selectTasks(selector, tasks, todayIso);
    else if (entityId) {
      const t = resolveRef(entityId, tasks);
      if (t) targets = [t];
    }
    if (!targets.length) { drop("item não encontrado", raw); continue; }
    if (targets.length > MAX_BULK) { targets = targets.slice(0, MAX_BULK); truncated = true; }

    const changes = changesSchema.safeParse(modelChanges(parsed.data.changes));
    if (!changes.success) { drop(`alterações inválidas: ${changes.error.issues[0]?.message}`, raw); continue; }
    // Um alvo só, com outros itens de título quase igual: a mensagem precisa apontar qual (ou ela precisa ter tocado em um deles)
    if (!selector && targets.length === 1) {
      const sims = similarTo(targets[0], tasks, 5);
      const picked = ask.pick ? resolveRef(ask.pick, tasks) : null;
      if (picked && (picked.id === targets[0].id || sims.some((x) => x.id === picked.id))) targets = [picked];
      else if (sims.length && !pointsAt(targets[0], sims, ask, changes.data, todayIso)) {
        return { proposal: null, invalid, ambiguous: { action, title: targets[0].title, candidates: [targets[0], ...sims].sort(byWhen).slice(0, 6) } };
      }
    }
    const keys = Object.keys(changes.data);
    // "reschedule" só mexe em data/horário; se vier mais que isso, é uma edição comum
    const kind = action === "reschedule" && keys.some((k) => !["date", "time", "endTime"].includes(k)) ? "update" : action;

    for (const before of targets) {
      if (claimed.has(before.id)) { skipped.push({ title: before.title, reason: "já há outra alteração pedida para este item" }); continue; }
      const candidate = {
        action: kind,
        entityType: ENTITY_OF_KIND[before.kind],
        entityId: before.id,
        ...(["delete", "complete", "reopen"].includes(kind) ? {} : { changes: changes.data }),
      };
      const checked = oriActionSchema.safeParse(candidate);
      if (!checked.success) { drop(`ação inválida: ${checked.error.issues[0]?.message}`, raw); continue; }
      const act: OriAction = checked.data;

      if (act.action === "complete" && !isOpen(before)) { skipped.push({ title: before.title, reason: "já está concluída" }); continue; }
      if (act.action === "reopen" && isOpen(before)) { skipped.push({ title: before.title, reason: "já está em aberto" }); continue; }

      const { after, ignored } = applyAction(before, act, { categories });
      if (after && (act.action === "update" || act.action === "reschedule") && sameGuarded(before, after)) {
        skipped.push({ title: before.title, reason: ignored[0] ?? "já está assim" });
        continue;
      }
      claimed.add(before.id);
      entries.push({ action: act, before, after, ignored, similar: [] });
    }
  }

  if (!entries.length && !skipped.length) return { proposal: null, invalid };
  if (entries.length <= 3) for (const e of entries) e.similar = similarTo(e.before, tasks);
  entries.sort((a, b) => byWhen(a.before, b.before));
  return { proposal: { destructive: entries.some((e) => e.action.action === "delete"), entries, skipped, truncated }, invalid };
}
