"use client";

import { useState, type ReactNode } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { CTX } from "@/lib/context";
import { addDays, fromIso, isoDate, weekStart } from "@/lib/dates";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { listCategories } from "@/services/category-service";
import { useApp } from "@/lib/app-context";
import {
  KIND_LABEL, PRIORITY_LABEL, RECURRENCE_LABEL, STATUS_LABEL,
  type Context, type Priority, type Recurrence, type Status, type Task,
} from "@/types";

const prop =
  "h-10 w-full rounded-md bg-transparent px-2 text-[13.5px] sm:h-8 transition-colors duration-100 placeholder:text-muted-foreground/50 hover:bg-hover focus:bg-hover focus:outline-none";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[84px_1fr] items-center gap-2">
      <span className="label-mono text-[10px] tracking-[0.14em]">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function SidePanel() {
  const { tasks, selectedId, openTask } = useApp();
  const task = tasks.find((t) => t.id === selectedId);
  if (!task) return null;
  return (
    <>
      <div className="animate-fade fixed inset-0 z-30 bg-foreground/25 sm:bg-hover lg:bg-transparent" onClick={() => openTask(null)} />
      <PanelBody key={task.id} task={task} />
    </>
  );
}

function PanelBody({ task }: { task: Task }) {
  const { update, remove, toggle, toggleSub, openTask, today } = useApp();
  useScrollLock(true, "(max-width: 639px)");
  const [newSub, setNewSub] = useState("");
  const ctx = CTX[task.context];
  const done = task.status === "concluido";
  const subs = task.subtasks ?? [];
  const subsDone = subs.filter((s) => s.done).length;
  const set = (patch: Partial<Task>) => update(task.id, patch);

  function addSub() {
    const title = newSub.trim();
    if (!title) return;
    set({ subtasks: [...subs, { id: crypto.randomUUID(), title, done: false }] });
    setNewSub("");
  }

  return (
    <aside
      role="dialog"
      aria-label="Detalhes"
      className="scroll-thin animate-sheetUp sm:animate-slideIn fixed inset-x-0 bottom-0 z-40 flex max-h-[92dvh] flex-col overflow-y-auto overscroll-contain rounded-t-2xl border-t border-border bg-surface shadow-pop sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:max-h-none sm:w-[420px] sm:rounded-none sm:border-l sm:border-t-0"
    >
      <div className="flex items-center justify-between px-5 pt-4">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <span className={cn("h-2 w-2 rounded-full", ctx.dot)} />
          {ctx.label} · {KIND_LABEL[task.kind]}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => { remove(task.id); openTask(null); }}
            aria-label="Excluir"
            title="Excluir"
            className="grid h-10 w-10 place-items-center rounded-md sm:h-8 sm:w-8 text-muted-foreground transition-colors hover:bg-urgent-soft hover:text-urgent"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.6} />
          </button>
          <button
            onClick={() => openTask(null)}
            aria-label="Fechar"
            title="Fechar (Esc)"
            className="grid h-10 w-10 place-items-center rounded-md sm:h-8 sm:w-8 text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
          >
            <X className="h-4 w-4" strokeWidth={1.6} />
          </button>
        </div>
      </div>

      <div className="flex items-start gap-3 px-5 pb-5 pt-5">
        <span className="mt-[7px]">
          <Checkbox checked={done} tone={task.context} onCheckedChange={() => toggle(task.id)} aria-label="Concluir" />
        </span>
        <textarea
          value={task.title}
          onChange={(e) => set({ title: e.target.value })}
          rows={1}
          ref={(el) => {
            if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; }
          }}
          className={cn(
            "keep-size w-full resize-none overflow-hidden bg-transparent text-[22px] font-semibold leading-tight tracking-[-0.025em] focus:outline-none",
            done && "text-muted-foreground line-through decoration-muted-foreground/40",
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5 border-t border-border px-4 py-4 sm:gap-1">
        <Row label="Data">
          <input type="date" value={isoDate(task.due)} onChange={(e) => e.target.value && set({ due: fromIso(e.target.value) })} className={prop} />
        </Row>
        <Row label="Reagendar">
          <div className="flex flex-wrap gap-1">
            {[
              { label: "Hoje", to: today },
              { label: "Amanhã", to: addDays(today, 1) },
              { label: "Próx. segunda", to: addDays(weekStart(today), 7) },
              { label: "+1 semana", to: addDays(task.due, 7) },
            ].map(({ label, to }) => (
              <button
                key={label}
                onClick={() => set({ due: to, endDate: task.endDate ? new Date(to.getTime() + (task.endDate.getTime() - task.due.getTime())) : undefined })}
                className="h-10 rounded-md px-2.5 text-[13px] text-muted-foreground ring-1 ring-border transition-colors hover:bg-hover hover:text-foreground sm:h-8 sm:px-2"
              >
                {label}
              </button>
            ))}
          </div>
        </Row>
        {task.kind === "evento" && (
          <Row label="Até">
            <input type="date" value={task.endDate ? isoDate(task.endDate) : ""} min={isoDate(task.due)} onChange={(e) => set({ endDate: e.target.value && e.target.value > isoDate(task.due) ? fromIso(e.target.value) : undefined })} className={prop} />
          </Row>
        )}
        <Row label="Horário">
          <div className="flex items-center gap-1">
            <input type="time" value={task.time ?? ""} onChange={(e) => set({ time: e.target.value || undefined, end: e.target.value ? task.end : undefined })} className={prop} aria-label="Início" />
            <span className="text-muted-foreground/50">→</span>
            <input type="time" value={task.end ?? ""} disabled={!task.time} onChange={(e) => set({ end: e.target.value || undefined })} className={cn(prop, "disabled:opacity-40")} aria-label="Fim" />
          </div>
        </Row>
        {(task.kind === "compromisso" || task.kind === "evento") && (
          <Row label="Local">
            <input value={task.location ?? ""} onChange={(e) => set({ location: e.target.value || undefined })} placeholder="Onde?" className={prop} />
          </Row>
        )}
        <Row label="Contexto">
          <div className="flex gap-1">
            {(["trabalho", "pessoal"] as Context[]).map((c) => (
              <button
                key={c}
                onClick={() => set({ context: c, category: listCategories(c).includes(task.category) ? task.category : "Outros", client: c === "pessoal" ? undefined : task.client })}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-md px-3 text-[13.5px] sm:h-8 sm:px-2.5 transition-colors",
                  task.context === c ? "bg-hover font-medium" : "text-muted-foreground hover:bg-hover",
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", CTX[c].dot)} /> {CTX[c].label}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Categoria">
          <select value={task.category} onChange={(e) => set({ category: e.target.value })} className={prop}>
            {[...new Set([task.category, ...listCategories(task.context)])].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Row>
        {task.context === "trabalho" && (
          <Row label="Cliente">
            <input value={task.client ?? ""} onChange={(e) => set({ client: e.target.value || undefined })} placeholder="Cliente / empresa" className={prop} />
          </Row>
        )}
        <Row label="Prioridade">
          <div className="flex flex-wrap gap-0.5">
            {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
              <button
                key={p}
                onClick={() => set({ priority: p })}
                className={cn(
                  "h-10 rounded-md px-2.5 text-[13px] transition-colors sm:h-8 sm:px-2",
                  task.priority === p
                    ? p === "urgente" ? "bg-urgent-soft font-medium text-urgent" : "bg-hover font-medium"
                    : "text-muted-foreground hover:bg-hover hover:text-foreground",
                )}
              >
                {PRIORITY_LABEL[p]}
              </button>
            ))}
          </div>
        </Row>
        {(task.kind === "tarefa" || task.kind === "compromisso") && (
          <Row label="Repete">
            <select value={task.recurrence ?? "none"} onChange={(e) => set({ recurrence: e.target.value === "none" ? undefined : (e.target.value as Recurrence) })} className={prop}>
              {(Object.keys(RECURRENCE_LABEL) as Recurrence[]).map((r) => <option key={r} value={r}>{RECURRENCE_LABEL[r]}</option>)}
            </select>
          </Row>
        )}
        <Row label="Status">
          <select value={task.status} onChange={(e) => set({ status: e.target.value as Status, doneAt: e.target.value === "concluido" ? new Date() : undefined })} className={prop}>
            {(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </Row>
        {task.status === "aguardando" && (
          <Row label="Aguardando">
            <input value={task.waitingOn ?? ""} onChange={(e) => set({ waitingOn: e.target.value || undefined })} placeholder="Cliente, banco, prefeitura, Receita…" className={prop} />
          </Row>
        )}
      </div>

      <div className="border-t border-border px-5 py-4">
        <p className="label-mono mb-2 text-[10px] tracking-[0.14em]">Observações</p>
        <textarea
          value={task.note ?? ""}
          onChange={(e) => set({ note: e.target.value || undefined })}
          placeholder="Adicionar observação…"
          rows={3}
          className="scroll-thin -mx-2 w-[calc(100%+1rem)] resize-none rounded-md bg-transparent px-2 py-1.5 text-[14px] leading-relaxed transition-colors placeholder:text-muted-foreground/50 hover:bg-hover focus:bg-hover focus:outline-none"
        />
      </div>

      <div className="border-t border-border px-5 py-4 pb-16">
        <div className="mb-2 flex items-center justify-between">
          <p className="label-mono text-[10px] tracking-[0.14em]">Subtarefas</p>
          {subs.length > 0 && <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{subsDone} de {subs.length} · {Math.round((subsDone / subs.length) * 100)}%</span>}
        </div>
        {subs.length > 0 && (
          <div className="mb-3 h-[3px] overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full transition-[width] duration-300", ctx.bar)} style={{ width: `${(subsDone / subs.length) * 100}%` }} />
          </div>
        )}
        <ul>
          {subs.map((s) => (
            <li key={s.id} className="group -mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-hover">
              <Checkbox checked={s.done} tone={task.context} onCheckedChange={() => toggleSub(task.id, s.id)} aria-label={s.title} className="h-4 w-4" />
              <span className={cn("flex-1 text-[14px]", s.done && "text-muted-foreground line-through decoration-muted-foreground/40")}>{s.title}</span>
              <button
                onClick={() => set({ subtasks: subs.filter((x) => x.id !== s.id) })}
                aria-label="Remover subtarefa"
                className="text-muted-foreground opacity-0 transition-opacity hover:text-urgent group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <div className="-mx-2 flex items-center gap-3 px-2 py-1.5">
          <Plus className="h-4 w-4 shrink-0 text-muted-foreground/60" strokeWidth={1.8} />
          <input
            value={newSub}
            onChange={(e) => setNewSub(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSub()}
            placeholder="Adicionar subtarefa"
            className="w-full bg-transparent text-[14px] placeholder:text-muted-foreground/50 focus:outline-none"
          />
        </div>
      </div>
    </aside>
  );
}
