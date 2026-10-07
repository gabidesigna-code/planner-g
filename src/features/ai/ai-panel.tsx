"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, Repeat, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { cn } from "@/lib/utils";
import { CTX } from "@/lib/context";
import { diffDays, fromIso, fromMin, longDay, toMin } from "@/lib/dates";
import { useApp } from "@/lib/app-context";
import { api } from "@/services/api-client";
import { MAX_AI_TEXT, type AiItemType, type ProposedItem } from "@/lib/ai/schema";
import { KIND_LABEL, RECURRENCE_LABEL, type Context, type Kind, type Task } from "@/types";

const KIND_OF: Record<AiItemType, Kind> = { task: "tarefa", appointment: "compromisso", reminder: "lembrete", event: "evento" };

const EXAMPLES = ["amanhã 14h reunião FCA", "sexta preciso pagar a conta de luz", "todo dia 1 fazer faturamento da Confian"];

/** Linha da prévia: o item proposto + se está marcado para salvar. */
interface Row extends ProposedItem {
  key: number;
  on: boolean;
}

/** Converte um item confirmado em Task: a gravação é a mesma de qualquer item criado à mão. */
export function toTask(it: ProposedItem): Task {
  const kind = KIND_OF[it.type];
  const slot = (kind === "compromisso" || kind === "evento") && it.time;
  return {
    id: crypto.randomUUID(),
    title: it.title,
    context: it.context,
    kind,
    category: it.category,
    client: it.context === "trabalho" ? it.client : undefined,
    priority: it.priority,
    status: "a-fazer",
    due: fromIso(it.date),
    time: it.time,
    end: slot ? (it.endTime ?? fromMin(Math.min(toMin(it.time!) + 60, 23 * 60 + 59))) : undefined,
    note: it.notes,
    recurrence: it.recurrence,
  };
}

type Step = "input" | "loading" | "preview";

export function AiPanel({ open, initialText, onClose, onCreate }: {
  open: boolean;
  initialText: string;
  onClose: () => void;
  onCreate: (t: Task) => void;
}) {
  const { today } = useApp();
  const [text, setText] = useState("");
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const run = useRef(0);
  useScrollLock(open);

  async function interpret(value: string) {
    const v = value.trim();
    if (!v || step === "loading") return;
    const id = ++run.current;
    setStep("loading");
    setError(null);
    try {
      const { items } = await api.organize(v);
      if (id !== run.current) return;
      if (items.length === 0) {
        setError("Não encontrei nada para organizar nessa frase. Tente dizer o que fazer e quando.");
        setStep("input");
        return;
      }
      setRows(items.map((it, i) => ({ ...it, key: i, on: true })));
      setEditing(null);
      setStep("preview");
    } catch (e) {
      if (id !== run.current) return;
      setError(e instanceof Error ? e.message : "Não consegui organizar agora.");
      setStep("input");
    }
  }

  // Ao abrir: limpa, e se veio texto do menu "Adicionar", já interpreta
  useEffect(() => {
    if (!open) {
      run.current++; // descarta qualquer resposta que ainda esteja a caminho
      return;
    }
    setText(initialText);
    setRows([]);
    setError(null);
    setEditing(null);
    setStep("input");
    if (initialText.trim()) void interpret(initialText);
    else requestAnimationFrame(() => inputRef.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialText]);

  if (!open) return null;

  const selected = rows.filter((r) => r.on);
  const patch = (key: number, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

  function confirm() {
    selected.forEach((r) => onCreate(toTask(r)));
    onClose();
  }

  function back() {
    run.current++;
    setStep("input");
    setError(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  const when = (r: ProposedItem) => {
    const d = fromIso(r.date);
    const n = diffDays(d, today);
    const day = n === 0 ? "Hoje" : n === 1 ? "Amanhã" : longDay(d);
    return r.time ? `${day} · ${r.time}${r.endTime ? `–${r.endTime}` : ""}` : day;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-start sm:px-4 sm:pt-[10vh]">
      <div className="animate-fade absolute inset-0 bg-foreground/25 backdrop-blur-[0.125rem]" onClick={onClose} />
      <div
        role="dialog"
        aria-label="Organizar com IA"
        onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }}
        className="animate-sheetUp sm:animate-menuIn pb-safe relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-pop sm:max-h-[78dvh] sm:max-w-[40rem] sm:rounded-xl"
      >
        <div className="flex items-center gap-2 px-4 pt-4 sm:px-5">
          <Sparkles className="h-4 w-4 text-work" strokeWidth={1.8} />
          <span className="label-mono">{step === "preview" ? "Entendi assim" : "O que você precisa organizar?"}</span>
        </div>

        {step !== "preview" ? (
          <div className="px-4 pb-4 pt-3 sm:px-5">
            <textarea
              ref={inputRef}
              value={text}
              disabled={step === "loading"}
              maxLength={MAX_AI_TEXT}
              rows={3}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void interpret(text); }
              }}
              placeholder="Ex.: amanhã às 14h tenho reunião da FCA e antes preciso conciliar o extrato"
              className="keep-size scroll-thin w-full resize-none bg-transparent text-[1.125rem] font-medium leading-snug tracking-[-0.02em] placeholder:text-muted-foreground/45 focus:outline-none disabled:opacity-60 max-sm:text-[1rem]"
            />
            {error && <p role="alert" className="mt-2 text-[0.8125rem] text-urgent">{error}</p>}
            {!text.trim() && step === "input" && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => { setText(ex); inputRef.current?.focus(); }}
                    className="rounded-full bg-hover px-3 py-1.5 text-[0.8125rem] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 flex items-center gap-3">
              <span className="font-mono text-[0.6875rem] text-muted-foreground/70">
                {step === "loading" ? "Organizando…" : "Nada é salvo antes da sua confirmação."}
              </span>
              <Button onClick={() => void interpret(text)} disabled={!text.trim() || step === "loading"} className="ml-auto">
                <Sparkles className="h-4 w-4" strokeWidth={1.8} /> {step === "loading" ? "Organizando" : "Organizar"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <ul className="scroll-thin mt-2 min-h-0 flex-1 overflow-y-auto border-t border-border px-2 py-2 sm:px-3">
              {rows.map((r) => {
                const ctx = CTX[r.context];
                const meta = [KIND_LABEL[KIND_OF[r.type]], r.client, r.category !== "Outros" ? r.category : null].filter(Boolean).join(" · ");
                return (
                  <li key={r.key} className={cn("rounded-lg px-2 py-2.5 transition-opacity sm:px-3", !r.on && "opacity-45")}>
                    <div className="flex items-start gap-3">
                      <span className="mt-[0.1875rem] shrink-0">
                        <Checkbox checked={r.on} tone={r.context} onCheckedChange={(v) => patch(r.key, { on: v === true })} aria-label={`Salvar ${r.title}`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[1rem] font-medium leading-snug">{r.title}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.8125rem] text-muted-foreground">
                          <span className={cn("h-1.5 w-1.5 rounded-full", ctx.dot)} />
                          <span>{when(r)}</span>
                          <span className="text-muted-foreground/60">·</span>
                          <span>{meta}</span>
                          {r.priority !== "normal" && <span className="text-urgent">{r.priority}</span>}
                          {r.recurrence && (
                            <span className="inline-flex items-center gap-1"><Repeat className="h-3 w-3" strokeWidth={1.8} />{RECURRENCE_LABEL[r.recurrence]}</span>
                          )}
                        </p>
                        {r.notes && <p className="mt-1 text-[0.8125rem] text-muted-foreground/80">{r.notes}</p>}
                      </div>
                      <button
                        onClick={() => setEditing(editing === r.key ? null : r.key)}
                        aria-label={`Editar ${r.title}`}
                        aria-expanded={editing === r.key}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.7} />
                      </button>
                    </div>

                    {editing === r.key && (
                      <div className="animate-rise mt-2.5 grid gap-2 pl-8 sm:grid-cols-[1fr_auto_auto]">
                        <input
                          value={r.title}
                          maxLength={200}
                          onChange={(e) => patch(r.key, { title: e.target.value })}
                          aria-label="Título"
                          className="keep-size h-9 min-w-0 rounded-md bg-hover px-3 text-[0.875rem] focus:outline-none focus:ring-1 focus:ring-foreground/25 sm:col-span-3 max-sm:text-base"
                        />
                        <input
                          type="date"
                          value={r.date}
                          onChange={(e) => e.target.value && patch(r.key, { date: e.target.value })}
                          aria-label="Data"
                          className="keep-size h-9 rounded-md bg-hover px-3 text-[0.875rem] focus:outline-none focus:ring-1 focus:ring-foreground/25 max-sm:text-base"
                        />
                        <input
                          type="time"
                          value={r.time ?? ""}
                          onChange={(e) => patch(r.key, { time: e.target.value || undefined, endTime: undefined })}
                          aria-label="Horário"
                          className="keep-size h-9 rounded-md bg-hover px-3 text-[0.875rem] focus:outline-none focus:ring-1 focus:ring-foreground/25 max-sm:text-base"
                        />
                        <div className="flex gap-1">
                          {(["trabalho", "pessoal"] as Context[]).map((c) => (
                            <button
                              key={c}
                              onClick={() => patch(r.key, { context: c, client: c === "trabalho" ? r.client : undefined })}
                              aria-pressed={r.context === c}
                              className={cn(
                                "flex h-9 items-center gap-1.5 rounded-md px-3 text-[0.8125rem] transition-colors",
                                r.context === c ? "bg-primary text-primary-foreground" : "bg-hover text-muted-foreground hover:bg-muted hover:text-foreground",
                              )}
                            >
                              <span className={cn("h-1.5 w-1.5 rounded-full", r.context === c ? "bg-current" : CTX[c].dot)} /> {CTX[c].label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center gap-2 border-t border-border px-4 py-3 sm:px-5">
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button variant="soft" onClick={back} className="ml-auto">Editar texto</Button>
              <Button onClick={confirm} disabled={selected.length === 0}>
                Confirmar{selected.length > 0 ? ` (${selected.length})` : ""}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
