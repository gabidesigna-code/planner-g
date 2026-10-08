import { MAX_CHAT_TEXT, MAX_CHAT_TURNS, type ChangeProposal, type OriChatTurn } from "./chat-schema";
import type { ProposedItem } from "./schema";
import type { TaskDto } from "@/lib/task-dto";

/** Mensagens da conversa com a ori e o que delas segue para o modelo (a "memória" da conversa). */

export type ProposalStatus = "pending" | "saved" | "dismissed";
/** Estado de uma alteração proposta em itens existentes. "stale" = o item mudou/sumiu entre a prévia e o "sim". */
export type ChangeStatus = "pending" | "done" | "cancelled" | "stale" | "undone";

export interface OriMessage {
  id: string;
  role: "user" | "ori";
  text: string;
  at: number;
  /** itens que a ori PROPÔS criar (só a ori) */
  items?: ProposedItem[];
  proposal?: ProposalStatus;
  /** alterações que a ori PROPÔS em itens existentes (só a ori) */
  changes?: ChangeProposal;
  changeStatus?: ChangeStatus;
  /** ids que a usuária deixou de fora ao confirmar (lote) */
  changeSkipped?: string[];
  /** itens entre os quais a ori pediu para ela escolher */
  choices?: TaskDto[];
  /** item que a usuária apontou ao responder "qual deles?" (a ori lembra) */
  pick?: string;
}

/** Uma conversa na lista (as mensagens são carregadas à parte). */
export interface ConversationMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

/** Título de uma conversa: o começo da primeira pergunta. */
export const titleOf = (text: string) => {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 56 ? `${t.slice(0, 55)}…` : t;
};

const itemSummary = (it: ProposedItem) => `${it.title} (${it.date}${it.time ? ` ${it.time}` : ""})`;
const when = (t: TaskDto) => `${t.due}${t.time ? ` ${t.time}` : ""}`;
const ref = (t: TaskDto) => t.id.slice(0, 8);
const ACTION_VERB: Record<string, string> = { update: "alterar", reschedule: "reagendar", delete: "EXCLUIR", complete: "concluir", reopen: "reabrir" };

/** Resumo de uma proposta de alteração para a memória da ori: guarda a referência do item (o referente de "muda ela pra 15h"). */
function changeSummary(m: OriMessage): string {
  const c = m.changes!;
  const estado =
    m.changeStatus === "done" ? "EXECUTADA pela usuária"
    : m.changeStatus === "cancelled" ? "CANCELADA (a usuária recusou)"
    : m.changeStatus === "stale" ? "NÃO executada (o item mudou)"
    : m.changeStatus === "undone" ? "executada e depois DESFEITA pela usuária"
    : "ainda aguardando confirmação";
  const shown = c.entries.slice(0, 6).map((e) => {
    const after = e.after ? ` → ${when(e.after)}${e.after.title !== e.before.title ? ` "${e.after.title}"` : ""}` : "";
    return `${ACTION_VERB[e.action.action]} [ref ${ref(e.before)}] "${e.before.title}" (${when(e.before)}${e.before.status === "concluido" ? ", concluída" : ""})${after}`;
  });
  const more = c.entries.length > shown.length ? ` e mais ${c.entries.length - shown.length} itens` : "";
  return `\n[Você propôs: ${shown.join("; ")}${more}. Estado: ${estado}.]`;
}

const choicesSummary = (m: OriMessage) =>
  `\n[Você perguntou qual destes: ${m.choices!.map((t) => `[ref ${ref(t)}] "${t.title}" (${when(t)})`).join("; ")}.]`;

/** O que a ori "lembra": as últimas mensagens, com as propostas resumidas e o que aconteceu com elas. */
export function toTurns(messages: OriMessage[]): OriChatTurn[] {
  return messages.slice(-MAX_CHAT_TURNS).map((m) => {
    let text = m.text;
    if (m.role === "ori" && m.items?.length) {
      const estado = m.proposal === "saved" ? "ADICIONADOS pela usuária" : m.proposal === "dismissed" ? "NÃO adicionados (a usuária recusou)" : "ainda sem resposta";
      text += `\n[Você propôs criar: ${m.items.map(itemSummary).join("; ")}. Estado: ${estado}.]`;
    }
    if (m.role === "ori" && m.changes) text += changeSummary(m);
    if (m.role === "ori" && m.choices?.length) text += choicesSummary(m);
    if (m.role === "user" && m.pick) text += `\n[Item escolhido: ref ${m.pick}]`;
    return { role: m.role, text: text.slice(0, MAX_CHAT_TEXT) };
  });
}
