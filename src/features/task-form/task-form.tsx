"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, Clock, Diamond, Plus, Square, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CTX } from "@/lib/context";
import { fromIso, fromMin, isoDate, toMin } from "@/lib/dates";
import { useApp, type AddPreset } from "@/lib/app-context";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import {
  KIND_LABEL, PRIORITY_LABEL, RECURRENCE_LABEL, STATUS_LABEL,
  type Context, type Kind, type Priority, type Recurrence, type Status, type Task,
} from "@/types";

const KINDS: { kind: Kind; icon: LucideIcon }[] = [
  { kind: "tarefa", icon: Square },
  { kind: "compromisso", icon: Clock },
  { kind: "lembrete", icon: Bell },
  { kind: "evento", icon: Diamond },
];

const FORM_STATUSES: Status[] = ["a-fazer", "em-andamento", "aguardando", "concluido"];

const input =
  "h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-[14px] transition-colors placeholder:text-muted-foreground/50 hover:border-foreground/25 focus:border-foreground/40 focus:outline-none sm:h-9";

function Field({ label, error, group, className, children }: { label: string; error?: string; group?: boolean; className?: string; children: ReactNode }) {
  const Tag = group ? "div" : "label";
  return (
    <Tag className={cn("flex min-w-0 flex-col gap-1.5", className)} {...(group ? { role: "group", "aria-label": label } : {})}>
      <span className="label-mono text-[10px] tracking-[0.14em]">{label}</span>
      {children}
      {error && <span className="text-[12px] text-urgent">{error}</span>}
    </Tag>
  );
}

function Chip({ active, onClick, children, tone }: { active: boolean; onClick: () => void; children: ReactNode; tone?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-10 items-center gap-2 rounded-lg px-3 text-[13.5px] transition-colors sm:h-8 sm:text-[13px]",
        active ? cn("bg-muted font-medium", tone) : "text-muted-foreground ring-1 ring-border hover:bg-hover hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

interface Props {
  open: boolean;
  kind: Kind;
  preset: AddPreset;
  today: Date;
  now: Date | null;
  onClose: () => void;
  onSubmit: (t: Task) => void;
}

export function TaskForm(props: Props) {
  if (!props.open) return null;
  return <FormBody {...props} />;
}

function FormBody({ kind: initialKind, preset, today, now, onClose, onSubmit }: Props) {
  useScrollLock(true);
  const { categoryNames } = useApp();
  const titleRef = useRef<HTMLInputElement>(null);

  const defaultStart = () => {
    const h = now ? Math.min(Math.max(now.getHours() + 1, 8), 20) : 9;
    return fromMin(h * 60);
  };

  const [kind, setKind] = useState<Kind>(initialKind);
  const [title, setTitle] = useState(preset.title ?? "");
  const [context, setContext] = useState<Context>(preset.context ?? "trabalho");
  const [category, setCategory] = useState(() => categoryNames(preset.context ?? "trabalho")[0]);
  const [date, setDate] = useState(isoDate(preset.due ?? today));
  const [endDate, setEndDate] = useState("");
  const [time, setTime] = useState(preset.time ?? (initialKind === "compromisso" ? defaultStart() : ""));
  const [end, setEnd] = useState(() => {
    const s = preset.time ?? (initialKind === "compromisso" ? defaultStart() : "");
    return s && (initialKind === "compromisso" || initialKind === "evento") ? fromMin(Math.min(toMin(s) + 60, 23 * 60 + 59)) : "";
  });
  const [priority, setPriority] = useState<Priority>("normal");
  const [status, setStatus] = useState<Status>("a-fazer");
  const [client, setClient] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [subs, setSubs] = useState<string[]>([]);
  const [newSub, setNewSub] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"title" | "time" | "end" | "endDate", string>>>({});

  useEffect(() => {
    const id = requestAnimationFrame(() => titleRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  const hasEnd = kind === "compromisso" || kind === "evento";
  const ctx = CTX[context];
  const categories = categoryNames(context);

  function changeContext(c: Context) {
    setContext(c);
    if (!categoryNames(c).includes(category)) setCategory(categoryNames(c)[0]);
  }

  function changeKind(k: Kind) {
    setKind(k);
    if (k === "compromisso" && !time) {
      const s = defaultStart();
      setTime(s);
      setEnd(fromMin(Math.min(toMin(s) + 60, 23 * 60 + 59)));
    }
    setErrors({});
  }

  function changeStart(v: string) {
    setTime(v);
    if (hasEnd && v && (!end || toMin(end) <= toMin(v))) setEnd(fromMin(Math.min(toMin(v) + 60, 23 * 60 + 59)));
    if (!v) setEnd("");
  }

  function addSub() {
    const s = newSub.trim();
    if (!s) return;
    setSubs((l) => [...l, s]);
    setNewSub("");
  }

  function submit() {
    const next: typeof errors = {};
    if (!title.trim()) next.title = "Dê um título.";
    if (kind === "compromisso" && !time) next.time = "Compromisso precisa de horário inicial.";
    if (hasEnd && time && end && toMin(end) <= toMin(time) && (!endDate || endDate <= date)) next.end = "O fim precisa ser depois do início.";
    if (kind === "evento" && endDate && endDate < date) next.endDate = "A data final vem depois da inicial.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const pending = newSub.trim();
    const subtasks = [...subs, ...(pending ? [pending] : [])].map((s) => ({ id: crypto.randomUUID(), title: s, done: false }));
    onSubmit({
      id: crypto.randomUUID(),
      title: title.trim(),
      context,
      kind,
      category: kind === "lembrete" ? "Outros" : category,
      due: fromIso(date),
      endDate: kind === "evento" && endDate && endDate > date ? fromIso(endDate) : undefined,
      time: time || undefined,
      end: hasEnd && time && end ? end : undefined,
      priority: kind === "tarefa" ? priority : "normal",
      status: kind === "tarefa" ? status : "a-fazer",
      doneAt: kind === "tarefa" && status === "concluido" ? new Date() : undefined,
      client: context === "trabalho" && kind !== "lembrete" ? client.trim() || undefined : undefined,
      location: (kind === "compromisso" || kind === "evento") && location.trim() ? location.trim() : undefined,
      note: note.trim() || undefined,
      recurrence: (kind === "tarefa" || kind === "compromisso") && recurrence !== "none" ? recurrence : undefined,
      subtasks: kind === "tarefa" && subtasks.length ? subtasks : undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="animate-fade absolute inset-0 bg-foreground/25 backdrop-blur-[2px]" onClick={onClose} />
      <form
        role="dialog"
        aria-label={`Nova ${KIND_LABEL[kind].toLowerCase()}`}
        noValidate
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        onKeyDown={(e) => {
          if (e.key === "Escape") { e.stopPropagation(); onClose(); }
          else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); submit(); }
        }}
        className="animate-sheetUp sm:animate-menuIn relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-pop sm:max-h-[90dvh] sm:max-w-[580px] sm:rounded-xl"
      >
        <div className="flex items-center gap-2 px-4 pt-3 sm:pt-4">
          <div role="tablist" aria-label="Tipo" className="grid flex-1 grid-cols-4 gap-1 rounded-lg bg-hover p-1">
            {KINDS.map(({ kind: k, icon: Icon }) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={k === kind}
                onClick={() => changeKind(k)}
                className={cn(
                  "flex h-9 items-center justify-center gap-1.5 rounded-md text-[12.5px] transition-colors sm:h-8",
                  k === kind ? "bg-surface font-medium shadow-soft" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-3.5 w-3.5 shrink-0", k === kind && ctx.text)} strokeWidth={1.8} />
                <span className="truncate">{KIND_LABEL[k]}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-hover hover:text-foreground sm:h-8 sm:w-8">
            <X className="h-4 w-4" strokeWidth={1.6} />
          </button>
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-4">
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => { setTitle(e.target.value); if (errors.title) setErrors((x) => ({ ...x, title: undefined })); }}
            placeholder={kind === "tarefa" ? "O que precisa ser feito?" : kind === "lembrete" ? "Do que lembrar?" : "Título"}
            aria-label="Título"
            aria-invalid={!!errors.title}
            className="keep-size w-full bg-transparent text-[22px] font-semibold tracking-[-0.025em] placeholder:text-muted-foreground/45 focus:outline-none"
          />
          {errors.title && <p className="mt-1 text-[12px] text-urgent">{errors.title}</p>}

          <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Contexto">
            {(["trabalho", "pessoal"] as Context[]).map((c) => (
              <Chip key={c} active={context === c} onClick={() => changeContext(c)} tone={CTX[c].text}>
                <span className={cn("h-1.5 w-1.5 rounded-full", CTX[c].dot)} /> {CTX[c].label}
              </Chip>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-4">
            <Field label={kind === "evento" ? "Data inicial" : "Data"}>
              <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className={input} />
            </Field>
            {kind === "evento" ? (
              <Field label="Data final (opcional)" error={errors.endDate}>
                <input type="date" value={endDate} min={date} onChange={(e) => setEndDate(e.target.value)} className={input} />
              </Field>
            ) : (
              <Field label={hasEnd ? "Início" : "Horário (opcional)"} error={errors.time}>
                <input type="time" value={time} onChange={(e) => changeStart(e.target.value)} className={input} />
              </Field>
            )}
            {kind === "evento" && (
              <Field label="Início (opcional)" error={errors.time}>
                <input type="time" value={time} onChange={(e) => changeStart(e.target.value)} className={input} />
              </Field>
            )}
            {hasEnd && (
              <Field label="Fim" error={errors.end}>
                <input type="time" value={end} disabled={!time} onChange={(e) => setEnd(e.target.value)} className={cn(input, "disabled:opacity-40")} />
              </Field>
            )}

            {kind !== "lembrete" && (
              <Field label="Categoria" className={context === "pessoal" && kind !== "tarefa" ? "col-span-2" : undefined}>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
            )}
            {context === "trabalho" && kind !== "lembrete" && (
              <Field label="Cliente / projeto">
                <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Opcional" className={input} />
              </Field>
            )}

            {(kind === "compromisso" || kind === "evento") && (
              <Field label="Local" className="col-span-2">
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Opcional" className={input} />
              </Field>
            )}

            {kind === "tarefa" && (
              <Field label="Prioridade" group className="col-span-2">
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
                    <Chip key={p} active={priority === p} onClick={() => setPriority(p)} tone={p === "urgente" ? "text-urgent" : undefined}>
                      {PRIORITY_LABEL[p]}
                    </Chip>
                  ))}
                </div>
              </Field>
            )}
            {kind === "tarefa" && (
              <Field label="Status">
                <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className={input}>
                  {FORM_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </Field>
            )}
            {(kind === "tarefa" || kind === "compromisso") && (
              <Field label="Recorrência" className={kind === "tarefa" ? undefined : "col-span-2"}>
                <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)} className={input}>
                  {(Object.keys(RECURRENCE_LABEL) as Recurrence[]).map((r) => <option key={r} value={r}>{RECURRENCE_LABEL[r]}</option>)}
                </select>
              </Field>
            )}
            <Field label={kind === "lembrete" ? "Observação" : "Observações"} className="col-span-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Opcional"
                className="scroll-thin w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[14px] leading-relaxed transition-colors placeholder:text-muted-foreground/50 hover:border-foreground/25 focus:border-foreground/40 focus:outline-none"
              />
            </Field>

            {kind === "tarefa" && (
              <div className="col-span-2 flex flex-col gap-1.5">
                <span className="label-mono text-[10px] tracking-[0.14em]">Subtarefas</span>
                {subs.map((s, i) => (
                  <div key={`${s}-${i}`} className="flex items-center gap-2 rounded-lg bg-hover px-3 py-2 text-[14px]">
                    <span className="min-w-0 flex-1 break-words">{s}</span>
                    <button type="button" onClick={() => setSubs((l) => l.filter((_, j) => j !== i))} aria-label="Remover subtarefa" className="grid h-6 w-6 shrink-0 place-items-center text-muted-foreground hover:text-urgent">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    value={newSub}
                    onChange={(e) => setNewSub(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); addSub(); } }}
                    placeholder="Adicionar subtarefa"
                    aria-label="Nova subtarefa"
                    className={input}
                  />
                  <Button type="button" variant="soft" size="icon" onClick={addSub} aria-label="Adicionar subtarefa" className="shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pb-safe flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit">Salvar {KIND_LABEL[kind].toLowerCase()}</Button>
        </div>
      </form>
    </div>
  );
}
