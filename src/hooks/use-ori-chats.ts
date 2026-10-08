"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/services/api-client";
import { MAX_CHAT_TEXT } from "@/lib/ai/chat-schema";
import { toTurns, type OriMessage } from "@/lib/ai/chat-turns";

/**
 * Conversas com a ori. O histórico fica NESTE aparelho (localStorage): o banco do app não tem tabela de
 * conversas e não foi alterado. As respostas vêm do mesmo Gemini do "Organizar com ori" (api.oriChat).
 */

export type { OriMessage, ProposalStatus, ChangeStatus } from "@/lib/ai/chat-turns";
import type { ProposalStatus } from "@/lib/ai/chat-turns";

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: OriMessage[];
}

const KEY = "ori-chats-v1";
const MAX_CONVERSATIONS = 40;
const MAX_MESSAGES = 200;

interface Stored {
  version: 1;
  currentId: string | null;
  conversations: Conversation[];
}

const newId = () => crypto.randomUUID();
const titleOf = (text: string) => {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 56 ? `${t.slice(0, 55)}…` : t;
};

function read(): Stored {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { version: 1, currentId: null, conversations: [] };
    const d = JSON.parse(raw) as Stored;
    if (d?.version !== 1 || !Array.isArray(d.conversations)) throw new Error("formato");
    return d;
  } catch {
    return { version: 1, currentId: null, conversations: [] };
  }
}

function write(s: Stored) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // sem espaço ou bloqueado: a conversa segue funcionando, só não fica guardada
  }
}

export function useOriChats() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const convRef = useRef<Conversation[]>([]);
  convRef.current = conversations;

  // carrega do aparelho (depois da hidratação)
  useEffect(() => {
    const s = read();
    setConversations(s.conversations);
    setCurrentId(s.conversations.some((c) => c.id === s.currentId) ? s.currentId : null);
    setReady(true);
  }, []);

  // guarda a cada mudança
  useEffect(() => {
    if (!ready) return;
    write({ version: 1, currentId, conversations });
  }, [ready, currentId, conversations]);

  const patchConversation = useCallback((id: string, fn: (c: Conversation) => Conversation) => {
    setConversations((cs) => cs.map((c) => (c.id === id ? fn(c) : c)));
  }, []);

  const append = useCallback((id: string, msg: OriMessage) => {
    patchConversation(id, (c) => ({ ...c, updatedAt: msg.at, messages: [...c.messages, msg].slice(-MAX_MESSAGES) }));
  }, [patchConversation]);

  /** Pergunta à ori usando as mensagens atuais da conversa (a última precisa ser da usuária). */
  const ask = useCallback(async (id: string, messages: OriMessage[]) => {
    setErrors((e) => { const { [id]: _drop, ...rest } = e; return rest; });
    setPending((p) => new Set(p).add(id));
    try {
      const res = await api.oriChat(toTurns(messages));
      append(id, {
        id: newId(), role: "ori", text: res.reply, at: Date.now(),
        ...(res.items.length ? { items: res.items, proposal: "pending" as const } : {}),
        ...(res.changes ? { changes: res.changes, changeStatus: "pending" as const } : {}),
        ...(res.choices?.length ? { choices: res.choices } : {}),
      });
    } catch (e) {
      setErrors((er) => ({ ...er, [id]: e instanceof Error ? e.message : "Não consegui falar com a ori agora." }));
    } finally {
      setPending((p) => { const n = new Set(p); n.delete(id); return n; });
    }
  }, [append]);

  const send = useCallback((text: string, pick?: string) => {
    const t = text.trim().slice(0, MAX_CHAT_TEXT);
    if (!t) return;
    const at = Date.now();
    const user: OriMessage = { id: newId(), role: "user", text: t, at, ...(pick ? { pick } : {}) };
    let id = currentId;
    let existing = id ? convRef.current.find((c) => c.id === id) : undefined;
    if (!existing) {
      id = newId();
      const created: Conversation = { id, title: titleOf(t), createdAt: at, updatedAt: at, messages: [user] };
      setConversations((cs) => [created, ...cs].slice(0, MAX_CONVERSATIONS));
      setCurrentId(id);
      void ask(id, created.messages);
      return;
    }
    const messages = [...existing.messages, user].slice(-MAX_MESSAGES);
    patchConversation(existing.id, (c) => ({ ...c, updatedAt: at, messages }));
    void ask(existing.id, messages);
  }, [currentId, ask, patchConversation]);

  /** Tenta de novo a última pergunta (depois de um erro). */
  const retry = useCallback(() => {
    const c = currentId ? convRef.current.find((x) => x.id === currentId) : undefined;
    if (c && c.messages[c.messages.length - 1]?.role === "user") void ask(c.id, c.messages);
  }, [currentId, ask]);

  const newChat = useCallback(() => setCurrentId(null), []);
  const open = useCallback((id: string) => setCurrentId(id), []);
  const remove = useCallback((id: string) => {
    setConversations((cs) => cs.filter((c) => c.id !== id));
    setCurrentId((cur) => (cur === id ? null : cur));
  }, []);
  const setProposal = useCallback((convId: string, msgId: string, status: ProposalStatus) => {
    patchConversation(convId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === msgId ? { ...m, proposal: status } : m)) }));
  }, [patchConversation]);

  const patchMessage = useCallback((convId: string, msgId: string, patch: Partial<OriMessage>) => {
    patchConversation(convId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === msgId ? { ...m, ...patch } : m)) }));
  }, [patchConversation]);

  const current = useMemo(() => conversations.find((c) => c.id === currentId) ?? null, [conversations, currentId]);
  const sorted = useMemo(() => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt), [conversations]);

  return {
    ready,
    conversations: sorted,
    current,
    thinking: currentId ? pending.has(currentId) : false,
    error: currentId ? (errors[currentId] ?? null) : null,
    send, retry, newChat, open, remove, setProposal, patchMessage,
  };
}
