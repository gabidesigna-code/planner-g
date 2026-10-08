"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, History, Repeat, SquarePen, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { OriMonogram, OriWordmark } from "@/components/brand/logo";
import { toTask } from "@/features/ai/ai-panel";
import { ChangeCard, useWhen } from "./change-card";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { useOriChats, type ConversationMeta, type OriMessage } from "@/hooks/use-ori-chats";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useApp } from "@/lib/app-context";
import { CTX } from "@/lib/context";
import { diffDays, fromIso, longDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { MAX_CHAT_TEXT, type ChangeEntry } from "@/lib/ai/chat-schema";
import { oriActionSchema, sameGuarded } from "@/lib/ai/actions";
import { fromDto, toDto } from "@/lib/task-dto";
import type { ProposedItem } from "@/lib/ai/schema";
import { KIND_LABEL, RECURRENCE_LABEL, type Task } from "@/types";

/** Por quanto tempo o "Desfazer" do cartão fica disponível depois de excluir. */
const UNDO_MS = 12_000;
/** Campos que uma alteração pode mexer (nomes do TaskDto = nomes do Task). */
const PATCH_KEYS = ["title", "due", "endDate", "time", "end", "priority", "context", "category", "client", "topic", "note"] as const;

const SUGGESTIONS = [
  "O que ainda falta hoje?",
  "Resuma a minha semana",
  "O que está atrasado?",
  "Passa tudo que está atrasado para amanhã",
  "Amanhã às 14h reunião da FCA e antes conciliar o extrato",
];

const KIND_OF = { task: "tarefa", appointment: "compromisso", reminder: "lembrete", event: "evento" } as const;

/** "Hoje", "Ontem" ou "12 out" */
function dayLabel(ts: number, today: Date) {
  const d = new Date(ts);
  const n = diffDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), today);
  if (n === 0) return "Hoje";
  if (n === -1) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");
}

/* ------------------------------------------------------------------ proposta de itens */

function Proposal({ msg, onConfirm, onDismiss }: { msg: OriMessage; onConfirm: (items: ProposedItem[]) => void; onDismiss: () => void }) {
  const { today } = useApp();
  const items = msg.items ?? [];
  const [on, setOn] = useState<boolean[]>(() => items.map(() => true));
  const picked = items.filter((_, i) => on[i]);

  const when = (it: ProposedItem) => {
    const d = fromIso(it.date);
    const n = diffDays(d, today);
    const day = n === 0 ? "Hoje" : n === 1 ? "Amanhã" : longDay(d);
    return it.time ? `${day} · ${it.time}` : day;
  };

  if (msg.proposal === "saved") return <p className="mt-1.5 pl-1 text-[0.78rem] text-muted-foreground">✓ {items.length === 1 ? "Item adicionado" : "Itens adicionados"} à agenda.</p>;
  if (msg.proposal === "dismissed") return <p className="mt-1.5 pl-1 text-[0.78rem] text-muted-foreground/70">Não adicionei nada.</p>;

  return (
    <div className="mt-2 w-full max-w-[28rem] rounded-xl border border-border bg-surface p-1.5 shadow-soft">
      <p className="label-mono px-2.5 pb-1 pt-1.5">Posso adicionar</p>
      <ul>
        {items.map((it, i) => (
          <li key={i} className={cn("flex items-start gap-3 rounded-lg px-2.5 py-2 transition-opacity", !on[i] && "opacity-45")}>
            <span className="mt-[0.1875rem] shrink-0">
              <Checkbox checked={on[i]} tone={it.context} onCheckedChange={(v) => setOn((o) => o.map((x, j) => (j === i ? v === true : x)))} aria-label={`Adicionar ${it.title}`} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.9rem] font-medium leading-snug">{it.title}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.75rem] text-muted-foreground">
                <span className={cn("h-1.5 w-1.5 rounded-full", CTX[it.context].dot)} />
                <span>{when(it)}</span>
                <span className="text-muted-foreground/60">·</span>
                <span>{[KIND_LABEL[KIND_OF[it.type]], it.client, it.category !== "Outros" ? it.category : null].filter(Boolean).join(" · ")}</span>
                {it.recurrence && <span className="inline-flex items-center gap-1"><Repeat className="h-3 w-3" strokeWidth={1.8} />{RECURRENCE_LABEL[it.recurrence]}</span>}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 px-1 pb-1 pt-1.5">
        <Button variant="ghost" size="sm" onClick={onDismiss}>Agora não</Button>
        <Button size="sm" className="ml-auto" disabled={picked.length === 0} onClick={() => onConfirm(picked)}>
          Adicionar{picked.length > 0 ? ` (${picked.length})` : ""}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ bolhas */

function Thinking() {
  return (
    <div className="flex items-end gap-2.5" role="status" aria-live="polite">
      <OriMonogram tile className="h-7 w-7 shrink-0" />
      <div className="flex items-center gap-2.5 rounded-2xl rounded-bl-md bg-surface px-3.5 py-3 text-[0.88rem] text-muted-foreground ring-1 ring-border">
        <span className="flex items-center gap-1" aria-hidden>
          {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-ori" style={{ animationDelay: `${i * 180}ms` }} />)}
        </span>
        Ori está pensando…
      </div>
    </div>
  );
}

function Bubble({ msg, children }: { msg: OriMessage; children?: React.ReactNode }) {
  if (msg.role === "user") {
    return (
      <div className="animate-rise ml-auto max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-[0.95rem] leading-relaxed text-primary-foreground sm:max-w-[75%]">
        {msg.text}
      </div>
    );
  }
  return (
    <div className="animate-rise flex items-start gap-2.5">
      <OriMonogram tile className="mt-0.5 h-7 w-7 shrink-0" />
      <div className="min-w-0 max-w-[85%] sm:max-w-[78%]">
        <div className="whitespace-pre-wrap break-words rounded-2xl rounded-bl-md bg-surface px-3.5 py-2.5 text-[0.95rem] leading-relaxed ring-1 ring-border">{msg.text}</div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ histórico */

function HistorySheet({ open, onClose, conversations, currentId, onOpen, onAskDelete, onNew, blocked }: {
  open: boolean;
  onClose: () => void;
  conversations: ConversationMeta[];
  currentId: string | null;
  onOpen: (id: string) => void;
  /** pede a confirmação (diálogo) antes de excluir */
  onAskDelete: (c: ConversationMeta) => void;
  onNew: () => void;
  /** um diálogo está aberto por cima: o Esc é dele */
  blocked: boolean;
}) {
  const { today } = useApp();
  useScrollLock(open);
  useEffect(() => {
    if (!open || blocked) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose, blocked]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end">
      <div className="animate-fade absolute inset-0 bg-foreground/25 backdrop-blur-[0.125rem]" onClick={onClose} />
      <div role="dialog" aria-label="Histórico de conversas" className="animate-sheetUp sm:animate-slideIn pb-safe relative flex max-h-[80dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-pop sm:max-h-none sm:w-[24rem] sm:rounded-none">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="label-mono">Conversas</span>
          <Button variant="ghost" size="icon" className="ml-auto" onClick={onClose} aria-label="Fechar"><X className="h-4 w-4" /></Button>
        </div>
        <div className="px-3 pt-3">
          <Button variant="soft" className="w-full" onClick={() => { onNew(); onClose(); }}><SquarePen className="h-4 w-4" strokeWidth={1.8} /> Nova conversa</Button>
        </div>
        <ul className="scroll-thin min-h-0 flex-1 overflow-y-auto p-2">
          {conversations.length === 0 && <li className="px-3 py-8 text-center text-[0.85rem] text-muted-foreground">Nenhuma conversa ainda.</li>}
          {conversations.map((c) => (
            <li key={c.id} className={cn("group flex items-center gap-1 rounded-lg", c.id === currentId && "bg-hover")}>
              <button onClick={() => { onOpen(c.id); onClose(); }} className="min-w-0 flex-1 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-hover">
                <p className="truncate text-[0.9rem] font-medium">{c.title}</p>
                <p className="mt-0.5 text-[0.74rem] text-muted-foreground">{dayLabel(c.updatedAt, today)} · {c.messageCount} {c.messageCount === 1 ? "mensagem" : "mensagens"}</p>
              </button>
              <button onClick={() => onAskDelete(c)} aria-label={`Excluir conversa ${c.title}`} className="mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-8 sm:w-8">
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.7} />
              </button>
            </li>
          ))}
        </ul>
        <p className="border-t border-border px-4 py-2.5 text-[0.7rem] leading-snug text-muted-foreground">As conversas ficam guardadas na sua conta e aparecem em qualquer aparelho em que você entrar.</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ tela */

export function OriView({ onCreate }: { onCreate: (t: Task) => void }) {
  const { ownerName, today, tasks, toggle, update, remove, account } = useApp();
  const chats = useOriChats(account.userId);
  const [deleting, setDeleting] = useState<ConversationMeta | null>(null);
  const when = useWhen();
  const [undo, setUndo] = useState<{ msgId: string; run: () => void } | null>(null);
  const undoTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(undoTimer.current), []);
  const [draft, setDraft] = useState("");
  const [history, setHistory] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const messages = chats.current?.messages ?? [];
  const firstName = ownerName.trim().split(" ")[0];
  const busy = chats.thinking;

  // sempre mostra o fim da conversa
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, busy, chats.error, chats.current?.id]);

  // o campo cresce com o texto (até 160 px)
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [draft]);

  const submit = (text = draft, pick?: string) => {
    const t = text.trim();
    if (!t || busy) return;
    chats.send(t, pick);
    setDraft("");
  };

  const confirm = useMemo(() => (msg: OriMessage, items: ProposedItem[]) => {
    if (!chats.current) return;
    items.forEach((it) => onCreate(toTask(it)));
    chats.setProposal(chats.current.id, msg.id, "saved");
  }, [chats, onCreate]);

  /**
   * Executa o que a usuária confirmou. NADA aqui vem "cru" do modelo: cada ação é revalidada (Zod), o item precisa
   * existir e estar como na prévia; só então passa pelos serviços de sempre (useTasks → /api/items → Supabase).
   */
  const applyChanges = (msg: OriMessage, entries: ChangeEntry[]) => {
    const conv = chats.current;
    if (!conv) return;
    const done: ChangeEntry[] = [];
    const left: string[] = (msg.changes?.entries ?? []).filter((e) => !entries.includes(e)).map((e) => e.action.entityId);

    for (const e of entries) {
      const cur = tasks.find((t) => t.id === e.action.entityId);
      if (!oriActionSchema.safeParse(e.action).success || !cur || !sameGuarded(toDto(cur), e.before)) { left.push(e.action.entityId); continue; }
      const a = e.action.action;
      if (a === "delete") remove(cur.id);
      else if (a === "complete") { if (cur.status !== "concluido") toggle(cur.id); }
      else if (a === "reopen") { if (cur.status === "concluido") toggle(cur.id); }
      else if (e.after) {
        const next = fromDto(e.after);
        const was = e.before as unknown as Record<string, unknown>;
        const now = e.after as unknown as Record<string, unknown>;
        const patch: Record<string, unknown> = {};
        for (const k of PATCH_KEYS) if (now[k] !== was[k]) patch[k] = next[k];
        update(cur.id, patch as Partial<Task>);
      }
      done.push(e);
    }

    if (!done.length) return chats.patchMessage(conv.id, msg.id, { changeStatus: "stale" });
    chats.patchMessage(conv.id, msg.id, { changeStatus: "done", changeSkipped: left });

    const deleted = done.filter((e) => e.action.action === "delete");
    window.clearTimeout(undoTimer.current);
    if (deleted.length) {
      setUndo({ msgId: msg.id, run: () => { deleted.forEach((e) => onCreate(fromDto(e.before))); chats.patchMessage(conv.id, msg.id, { changeStatus: "undone" }); } });
      undoTimer.current = window.setTimeout(() => setUndo(null), UNDO_MS);
    } else setUndo(null);
  };

  const empty = chats.ready && messages.length === 0;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col lg:h-[100dvh]">
      <header className="flex items-center gap-3 border-b border-border/70 px-4 py-3 sm:px-6">
        <OriMonogram tile className="h-10 w-10 shrink-0" />
        <div className="min-w-0 leading-tight">
          <OriWordmark className="h-[1.3rem] w-auto text-foreground" />
          <p className="mt-1.5 flex items-center gap-1.5 text-[0.75rem] text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-done" /> assistente da ora</p>
        </div>
        <div className="ml-auto flex items-center gap-0.5">
          <Button variant="ghost" size="icon" onClick={() => chats.newChat()} aria-label="Nova conversa" title="Nova conversa"><SquarePen className="h-[1.0625rem] w-[1.0625rem]" strokeWidth={1.7} /></Button>
          <Button variant="ghost" size="icon" onClick={() => setHistory(true)} aria-label="Histórico de conversas" title="Histórico"><History className="h-[1.0625rem] w-[1.0625rem]" strokeWidth={1.7} /></Button>
        </div>
      </header>

      <div ref={listRef} className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto flex min-h-full max-w-[44rem] flex-col gap-4">
          {chats.legacy && (
            <div role="status" className="rounded-xl border border-border bg-surface p-3.5 shadow-soft">
              <p className="text-[0.875rem] leading-snug">
                Encontrei {chats.legacy.conversations} {chats.legacy.conversations === 1 ? "conversa antiga" : "conversas antigas"} com a ori neste aparelho.
                Quer trazer {chats.legacy.conversations === 1 ? "ela" : "elas"} para a sua conta?
              </p>
              <p className="mt-1 text-[0.75rem] leading-snug text-muted-foreground">Elas passam a aparecer em todos os seus aparelhos. Uma cópia continua guardada aqui.</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" disabled={chats.importing} onClick={() => void chats.importLegacy()}>{chats.importing ? "Importando…" : "Importar"}</Button>
                <Button size="sm" variant="ghost" disabled={chats.importing} onClick={chats.dismissLegacy}>Agora não</Button>
              </div>
            </div>
          )}
          {chats.loadError && !chats.conversations.length && (
            <div role="alert" className="flex items-center gap-3 rounded-xl bg-urgent-soft px-3.5 py-3 text-[0.85rem] text-urgent">
              <span className="min-w-0 flex-1">{chats.loadError}</span>
            </div>
          )}
          {empty ? (
            <div className="animate-rise m-auto flex w-full max-w-[32rem] flex-col items-center py-8 text-center">
              <OriMonogram tile className="h-14 w-14" />
              <h1 className="mt-5 text-[1.6rem] font-semibold tracking-[-0.03em]">{firstName ? `Oi, ${firstName}.` : "Oi."}</h1>
              <p className="mt-2 max-w-[24rem] text-[0.92rem] leading-relaxed text-muted-foreground">Posso resumir o seu dia, apontar o que está atrasado, marcar coisas para você e também mudar, reagendar, concluir ou apagar o que já está na agenda. Você sempre confirma antes.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => submit(s)} className="rounded-full bg-hover px-3.5 py-2 text-[0.82rem] text-foreground/80 transition-colors hover:bg-muted hover:text-foreground">{s}</button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((m) => (
                <Bubble key={m.id} msg={m}>
                  {m.role === "ori" && m.changes ? (
                    <ChangeCard
                      msg={m}
                      onConfirm={(entries) => applyChanges(m, entries)}
                      onCancel={() => chats.current && chats.patchMessage(chats.current.id, m.id, { changeStatus: "cancelled" })}
                      canUndo={undo?.msgId === m.id}
                      onUndo={() => { undo?.run(); window.clearTimeout(undoTimer.current); setUndo(null); }}
                    />
                  ) : null}
                  {m.role === "ori" && m.choices?.length && m.id === messages[messages.length - 1]?.id && !busy ? (
                    <div className="mt-2 flex w-full max-w-[28rem] flex-col gap-1.5">
                      {m.choices.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => submit(`${t.title} — ${when(t)}`, t.id.slice(0, 8))}
                          className="flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-left shadow-soft transition-colors hover:bg-hover"
                        >
                          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", CTX[t.context].dot)} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[0.88rem] font-medium">{t.title}</span>
                            <span className="block text-[0.74rem] text-muted-foreground">{[when(t), t.client, t.category !== "Outros" ? t.category : null].filter(Boolean).join(" · ")}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {m.role === "ori" && m.items?.length ? (
                    <Proposal
                      msg={m}
                      onConfirm={(items) => confirm(m, items)}
                      onDismiss={() => chats.current && chats.setProposal(chats.current.id, m.id, "dismissed")}
                    />
                  ) : null}
                </Bubble>
              ))}
              {busy && <Thinking />}
              {chats.error && !busy && (
                <div role="alert" className="flex items-center gap-3 rounded-xl bg-urgent-soft px-3.5 py-3 text-[0.85rem] text-urgent">
                  <span className="min-w-0 flex-1">{chats.error}</span>
                  <Button variant="soft" size="sm" onClick={() => chats.retry()}>Tentar de novo</Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="border-t border-border/70 bg-background px-3 pt-3 sm:px-6" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <div className="mx-auto flex max-w-[44rem] items-end gap-2 rounded-2xl border border-border bg-surface p-1.5 shadow-soft transition-shadow focus-within:ring-1 focus-within:ring-foreground/25">
          <textarea
            ref={taRef}
            value={draft}
            rows={1}
            maxLength={MAX_CHAT_TEXT}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
            placeholder="Escreva para a ori…"
            aria-label="Mensagem para a ori"
            className="scroll-thin max-h-40 min-h-[2.5rem] flex-1 resize-none bg-transparent px-3 py-2 text-[0.95rem] leading-snug placeholder:text-muted-foreground/60 focus:outline-none"
          />
          <button
            onClick={() => submit()}
            disabled={!draft.trim() || busy}
            aria-label="Enviar"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-[opacity,transform] active:scale-95 disabled:opacity-35"
          >
            <ArrowUp className="h-[1.125rem] w-[1.125rem]" strokeWidth={2} />
          </button>
        </div>
        <p className="mx-auto mt-1.5 hidden max-w-[44rem] px-2 text-[0.68rem] text-muted-foreground/70 sm:block">A ori só adiciona, altera ou apaga itens depois da sua confirmação · Enter envia · Shift+Enter quebra a linha</p>
      </div>

      <HistorySheet
        open={history}
        onClose={() => setHistory(false)}
        conversations={chats.conversations}
        currentId={chats.current?.id ?? null}
        onOpen={chats.open}
        onAskDelete={setDeleting}
        onNew={chats.newChat}
        blocked={!!deleting}
      />
      <ConfirmDialog
        open={!!deleting}
        title={deleting ? `Excluir a conversa “${deleting.title}”?` : ""}
        body="As mensagens dela também serão apagadas, neste e nos outros aparelhos. Isso não pode ser desfeito."
        confirmLabel="Excluir conversa"
        destructive
        onCancel={() => setDeleting(null)}
        onConfirm={() => { if (deleting) chats.remove(deleting.id); setDeleting(null); }}
      />
    </div>
  );
}
