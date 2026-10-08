"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/services/api-client";
import { storage } from "@/services/storage";
import { MAX_CHAT_TEXT } from "@/lib/ai/chat-schema";
import { titleOf, type ConversationMeta, type OriMessage } from "@/lib/ai/chat-turns";
import { useRealtime } from "./use-realtime";

export type { OriMessage, ProposalStatus, ChangeStatus, ConversationMeta } from "@/lib/ai/chat-turns";

/**
 * Conversas com a ori, guardadas NO BANCO (Supabase), por conta: a mesma lista e as mesmas mensagens aparecem no
 * celular e no desktop. O servidor guarda cada pergunta e resposta e monta a memória da ori lendo a conversa dessa
 * conta; aqui só ficam a lista, as mensagens abertas e o que ainda está em trânsito.
 *
 * Sincronia: Realtime (aviso de mudança) + releitura a cada 15 s e ao voltar para a aba. Nada é sobrescrito enquanto
 * há uma gravação ou uma pergunta em andamento.
 */

const SYNC_MS = 15_000;
const CURRENT_KEY = "ori-conversa-atual"; // qual conversa está aberta NESTE aparelho (cada aparelho pode estar numa)
const LEGACY_KEY = "ori-chats-v1"; // histórico antigo, que ficava só neste aparelho
const MAX_IMPORT_CONVERSATIONS = 100;
const MAX_IMPORT_MESSAGES = 300;

const newId = () => crypto.randomUUID();

/** Histórico antigo do aparelho (antes de existir conta), no formato em que era guardado. */
interface LegacyConversation { id: string; title: string; createdAt: number; updatedAt: number; messages: OriMessage[] }

function readLegacy(): LegacyConversation[] {
  try {
    const raw = storage.get(LEGACY_KEY);
    if (!raw) return [];
    const d = JSON.parse(raw) as { version?: number; conversations?: LegacyConversation[] };
    if (d?.version !== 1 || !Array.isArray(d.conversations)) return [];
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return d.conversations
      .filter((c) => uuid.test(c?.id) && Array.isArray(c.messages) && c.messages.length > 0)
      .slice(0, MAX_IMPORT_CONVERSATIONS)
      .map((c) => ({
        id: c.id,
        title: String(c.title || "Conversa").slice(0, 200),
        createdAt: Number(c.createdAt) || Date.now(),
        updatedAt: Number(c.updatedAt) || Date.now(),
        messages: c.messages
          .filter((m) => uuid.test(m?.id) && (m.role === "user" || m.role === "ori") && typeof m.text === "string" && m.text.length > 0)
          .slice(-MAX_IMPORT_MESSAGES)
          .map((m) => ({ ...m, text: m.text.slice(0, 8000), at: Number(m.at) || Date.now() })),
      }))
      .filter((c) => c.messages.length > 0);
  } catch {
    return [];
  }
}

export function useOriChats(userId: string | null) {
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [messages, setMessages] = useState<Record<string, OriMessage[]>>({});
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [legacy, setLegacy] = useState<{ conversations: number; messages: number } | null>(null);
  const [importing, setImporting] = useState(false);

  const inflight = useRef(0); // gravações em andamento: a releitura espera para não desfazer o que acabou de acontecer
  const currentRef = useRef<string | null>(null);
  currentRef.current = currentId;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  const select = useCallback((id: string | null) => {
    setCurrentId(id);
    if (id) storage.set(CURRENT_KEY, id);
    else storage.remove(CURRENT_KEY);
  }, []);

  const refreshMessages = useCallback(async (id: string) => {
    try {
      const { messages: list } = await api.oriMessages(id);
      setMessages((m) => ({ ...m, [id]: list }));
    } catch (e) {
      // apagada em outro aparelho: sai da lista
      if (e instanceof Error && /não encontrada|404/i.test(e.message)) {
        setConversations((cs) => cs.filter((c) => c.id !== id));
        setMessages((m) => { const { [id]: _drop, ...rest } = m; return rest; });
        if (currentRef.current === id) select(null);
      }
    }
  }, [select]);

  /** Relê a lista e a conversa aberta (se nada estiver em trânsito). */
  const sync = useCallback(async () => {
    if (inflight.current > 0 || pendingRef.current.size > 0) return;
    try {
      const { conversations: list } = await api.oriConversations();
      if (inflight.current > 0 || pendingRef.current.size > 0) return;
      setConversations((prev) => (JSON.stringify(prev) === JSON.stringify(list) ? prev : list));
      setLoadError(null);
      const cur = currentRef.current;
      if (cur && list.some((c) => c.id === cur)) await refreshMessages(cur);
      else if (cur && !messagesRef.current[cur]?.length) select(null);
    } catch (e) {
      setLoadError((prev) => prev ?? (e instanceof Error ? e.message : "Não consegui carregar as conversas."));
    }
  }, [refreshMessages, select]);

  // primeira carga: lista, conversa aberta (a deste aparelho ou a mais recente) e histórico antigo do aparelho
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      try {
        const { conversations: list } = await api.oriConversations();
        if (!alive) return;
        setConversations(list);
        const saved = storage.get(CURRENT_KEY);
        const open = list.find((c) => c.id === saved) ?? list[0] ?? null;
        if (open) {
          select(open.id);
          await refreshMessages(open.id);
        }
      } catch (e) {
        if (alive) setLoadError(e instanceof Error ? e.message : "Não consegui carregar as conversas.");
      } finally {
        if (alive) setReady(true);
      }
      const old = readLegacy();
      if (alive && old.length) setLegacy({ conversations: old.length, messages: old.reduce((n, c) => n + c.messages.length, 0) });
    })();
    return () => { alive = false; };
  }, [userId, refreshMessages, select]);

  // acompanha outros aparelhos: Realtime + releitura periódica
  useRealtime(userId ? `ori:${userId}` : null, [
    { table: "ori_conversations", filter: `user_id=eq.${userId}` },
    { table: "ori_messages", filter: `user_id=eq.${userId}` },
  ], sync);

  useEffect(() => {
    if (!ready) return;
    const tick = () => document.visibilityState === "visible" && void sync();
    const id = window.setInterval(tick, SYNC_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    window.addEventListener("online", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
      window.removeEventListener("online", tick);
    };
  }, [ready, sync]);

  /** Pergunta à ori. `userMsg` = a mensagem ainda não confirmada pelo servidor (reenviar é seguro: o id evita duplicar). */
  const ask = useCallback(async (convId: string, userMsg?: OriMessage) => {
    setErrors((e) => { const { [convId]: _drop, ...rest } = e; return rest; });
    setPending((p) => new Set(p).add(convId));
    inflight.current++;
    try {
      const res = await api.oriChat({
        conversationId: convId,
        ...(userMsg ? { message: { id: userMsg.id, text: userMsg.text, ...(userMsg.pick ? { pick: userMsg.pick } : {}) } } : {}),
      });
      setMessages((m) => {
        const list = m[convId] ?? [];
        return { ...m, [convId]: list.some((x) => x.id === res.message.id) ? list : [...list, res.message] };
      });
      setConversations((cs) => {
        const found = cs.find((c) => c.id === convId);
        const rest = cs.filter((c) => c.id !== convId);
        const count = (messagesRef.current[convId]?.length ?? 0) + 1;
        const next: ConversationMeta = found
          ? { ...found, title: res.conversation.title, updatedAt: res.conversation.updatedAt, messageCount: Math.max(found.messageCount, count) }
          : { id: convId, title: res.conversation.title, createdAt: res.conversation.updatedAt, updatedAt: res.conversation.updatedAt, messageCount: count };
        return [next, ...rest];
      });
    } catch (e) {
      setErrors((er) => ({ ...er, [convId]: e instanceof Error ? e.message : "Não consegui falar com a ori agora." }));
    } finally {
      inflight.current--;
      setPending((p) => { const n = new Set(p); n.delete(convId); return n; });
    }
  }, []);

  const send = useCallback((text: string, pick?: string) => {
    const t = text.trim().slice(0, MAX_CHAT_TEXT);
    if (!t) return;
    const at = Date.now();
    const user: OriMessage = { id: newId(), role: "user", text: t, at, ...(pick ? { pick } : {}) };
    let id = currentRef.current;
    if (!id) {
      id = newId(); // a conversa nasce junto com a primeira pergunta
      select(id);
      setConversations((cs) => [{ id: id!, title: titleOf(t), createdAt: at, updatedAt: at, messageCount: 1 }, ...cs]);
    } else {
      setConversations((cs) => cs.map((c) => (c.id === id ? { ...c, updatedAt: at } : c)).sort((a, b) => b.updatedAt - a.updatedAt));
    }
    const convId = id;
    setMessages((m) => ({ ...m, [convId]: [...(m[convId] ?? []), user] }));
    void ask(convId, user);
  }, [ask, select]);

  /** Tenta de novo a última pergunta (depois de um erro). */
  const retry = useCallback(() => {
    const id = currentRef.current;
    const last = id ? messagesRef.current[id]?.at(-1) : undefined;
    if (id && last?.role === "user") void ask(id, last);
  }, [ask]);

  const newChat = useCallback(() => select(null), [select]);

  const open = useCallback((id: string) => {
    select(id);
    void refreshMessages(id);
  }, [select, refreshMessages]);

  const remove = useCallback((id: string) => {
    setConversations((cs) => cs.filter((c) => c.id !== id));
    setMessages((m) => { const { [id]: _drop, ...rest } = m; return rest; });
    if (currentRef.current === id) select(null);
    inflight.current++;
    api.oriDeleteConversation(id)
      .catch(() => void 0)
      .finally(() => { inflight.current--; void sync(); }); // se falhou, a releitura traz a conversa de volta
  }, [select, sync]);

  /** Registra o que a pessoa decidiu sobre uma proposta (na tela e no banco, para valer nos outros aparelhos). */
  const patchMessage = useCallback((convId: string, msgId: string, patch: Partial<OriMessage>) => {
    setMessages((m) => ({ ...m, [convId]: (m[convId] ?? []).map((x) => (x.id === msgId ? { ...x, ...patch } : x)) }));
    const body: Record<string, unknown> = {};
    for (const k of ["proposal", "changeStatus", "changeSkipped"] as const) if (patch[k] !== undefined) body[k] = patch[k];
    if (!Object.keys(body).length) return;
    inflight.current++;
    api.oriPatchMessage(msgId, body)
      .catch(() => void 0)
      .finally(() => { inflight.current--; });
  }, []);

  const setProposal = useCallback((convId: string, msgId: string, status: "pending" | "saved" | "dismissed") => {
    patchMessage(convId, msgId, { proposal: status });
  }, [patchMessage]);

  // ---------------------------------------------------------------- histórico antigo deste aparelho
  const finishLegacy = useCallback((suffix: string) => {
    const raw = storage.get(LEGACY_KEY);
    if (raw) storage.set(`${LEGACY_KEY}-${suffix}`, raw); // fica guardado no aparelho (nada é apagado)
    storage.remove(LEGACY_KEY);
    setLegacy(null);
  }, []);

  const importLegacy = useCallback(async () => {
    const old = readLegacy();
    if (!old.length) return finishLegacy("importado");
    setImporting(true);
    try {
      await api.oriImport(old);
      finishLegacy("importado");
      await sync();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Não consegui importar as conversas antigas.");
    } finally {
      setImporting(false);
    }
  }, [finishLegacy, sync]);

  const dismissLegacy = useCallback(() => finishLegacy("descartado"), [finishLegacy]);

  // ---------------------------------------------------------------- o que a tela usa
  const current = useMemo(() => {
    if (!currentId) return null;
    const meta = conversations.find((c) => c.id === currentId);
    return { id: currentId, title: meta?.title ?? "Nova conversa", messages: messages[currentId] ?? [] };
  }, [conversations, currentId, messages]);

  return {
    ready,
    conversations,
    current,
    thinking: currentId ? pending.has(currentId) : false,
    error: currentId ? (errors[currentId] ?? null) : null,
    loadError,
    legacy,
    importing,
    send, retry, newChat, open, remove, setProposal, patchMessage, importLegacy, dismissLegacy,
  };
}
