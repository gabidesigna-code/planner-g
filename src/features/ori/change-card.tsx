"use client";

import { useState } from "react";
import { ArrowRight, Check, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useApp } from "@/lib/app-context";
import { CTX } from "@/lib/context";
import { diffDays, fromIso, monAbbr, weekdayShort } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { ChangeEntry } from "@/lib/ai/chat-schema";
import type { OriMessage } from "@/hooks/use-ori-chats";
import type { TaskDto } from "@/lib/task-dto";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/types";

/* ------------------------------------------------------------------ formatação do antes/depois */

export function useWhen() {
  const { today } = useApp();
  return (t: TaskDto) => {
    const d = fromIso(t.due);
    const n = diffDays(d, today);
    const day = n === 0 ? "hoje" : n === 1 ? "amanhã" : n === -1 ? "ontem" : `${weekdayShort(d)} ${d.getDate()} ${monAbbr(d)}`;
    return t.time ? `${day} · ${t.time}${t.end ? `–${t.end}` : ""}` : day;
  };
}

type Row = { key: string; label: string; of: (t: TaskDto, when: (t: TaskDto) => string) => string };

const ROWS: Row[] = [
  { key: "title", label: "Título", of: (t) => t.title },
  { key: "when", label: "Quando", of: (t, when) => when(t) },
  { key: "status", label: "Situação", of: (t) => STATUS_LABEL[t.status] },
  { key: "priority", label: "Prioridade", of: (t) => PRIORITY_LABEL[t.priority] },
  { key: "context", label: "Contexto", of: (t) => CTX[t.context].label },
  { key: "category", label: "Categoria", of: (t) => t.category || "Outros" },
  { key: "client", label: "Cliente", of: (t) => t.client || "—" },
  { key: "note", label: "Observações", of: (t) => (t.note ? (t.note.length > 90 ? `${t.note.slice(0, 89)}…` : t.note) : "—") },
];

/** Linhas que mudaram (ordem fixa). Sempre devolve ao menos o título e o quando, para a prévia ser reconhecível. */
function diffRows(e: ChangeEntry, when: (t: TaskDto) => string) {
  const after = e.after;
  return ROWS.filter((r) => {
    if (r.key === "title" || r.key === "when") return true;
    return !!after && r.of(e.before, when) !== r.of(after, when);
  }).map((r) => ({
    ...r,
    before: r.of(e.before, when),
    after: after ? r.of(after, when) : null,
    changed: !!after && r.of(e.before, when) !== r.of(after, when),
  }));
}

/** Frase curta do que muda (para listas em lote). */
function shortChange(e: ChangeEntry, when: (t: TaskDto) => string): string {
  const a = e.action.action;
  if (a === "delete") return `${when(e.before)} · será excluído`;
  if (!e.after) return when(e.before);
  const changed = diffRows(e, when).filter((r) => r.changed);
  if (!changed.length) return when(e.before);
  return changed.map((r) => (r.key === "title" || r.key === "note" ? `${r.label} alterado${r.key === "title" ? `: ${r.after}` : ""}` : `${r.before} → ${r.after}`)).join(" · ");
}

const HEAD: Record<string, string> = {
  update: "Posso alterar",
  reschedule: "Posso reagendar",
  complete: "Posso marcar como concluída",
  reopen: "Posso reabrir",
  delete: "Quer excluir?",
};

function headline(entries: ChangeEntry[]) {
  const kinds = new Set(entries.map((e) => e.action.action));
  if (kinds.size === 1) {
    const k = [...kinds][0];
    return entries.length > 1 && k !== "delete" ? `${HEAD[k]} (${entries.length} itens)` : entries.length > 1 ? `Quer excluir ${entries.length} itens?` : HEAD[k];
  }
  return `Posso fazer estas ${entries.length} alterações`;
}

/* ------------------------------------------------------------------ cartão de confirmação */

export function ChangeCard({ msg, onConfirm, onCancel, canUndo, onUndo }: {
  msg: OriMessage;
  onConfirm: (entries: ChangeEntry[]) => void;
  onCancel: () => void;
  /** logo depois de excluir, por alguns segundos */
  canUndo: boolean;
  onUndo: () => void;
}) {
  const when = useWhen();
  const proposal = msg.changes!;
  const { entries, skipped } = proposal;
  const [on, setOn] = useState<boolean[]>(() => entries.map(() => true));
  const [armed, setArmed] = useState(false);
  const picked = entries.filter((_, i) => on[i]);
  const multi = entries.length > 1;
  const status = msg.changeStatus ?? "pending";

  if (status === "done") {
    const n = entries.length - (msg.changeSkipped?.length ?? 0);
    const del = proposal.destructive;
    return (
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 pl-1 text-[0.78rem] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" strokeWidth={2} />{del ? (n === 1 ? "Item excluído" : `${n} itens excluídos`) : n === 1 ? "Alteração feita" : `${n} alterações feitas`}.</span>
        {canUndo && <button onClick={onUndo} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-foreground underline-offset-2 hover:bg-hover hover:underline"><Undo2 className="h-3 w-3" strokeWidth={2} />Desfazer</button>}
      </p>
    );
  }
  if (status === "undone") return <p className="mt-1.5 pl-1 text-[0.78rem] text-muted-foreground">Exclusão desfeita: o item voltou para a agenda.</p>;
  if (status === "cancelled") return <p className="mt-1.5 pl-1 text-[0.78rem] text-muted-foreground/70">Não alterei nada.</p>;
  if (status === "stale") return <p className="mt-1.5 pl-1 text-[0.78rem] text-muted-foreground">Esse item mudou ou não existe mais, então não alterei nada. Peça de novo se ainda quiser.</p>;

  const danger = proposal.destructive;
  const skippedBlock = skipped.length > 0 && (
    <ul className="px-2.5 pb-1.5 text-[0.74rem] leading-snug text-muted-foreground">
      {skipped.map((s, i) => <li key={i}>Sem mudança em “{s.title}”: {s.reason}.</li>)}
    </ul>
  );

  if (!entries.length) {
    return (
      <div className="mt-2 w-full max-w-[28rem] rounded-xl border border-border bg-surface p-1.5 shadow-soft">
        <p className="px-2.5 pb-1 pt-1.5 text-[0.82rem] text-muted-foreground">Nada para alterar.</p>
        {skippedBlock}
      </div>
    );
  }

  const confirmLabel = danger
    ? entries.length === 1 ? "Excluir" : `Excluir${picked.length ? ` (${picked.length})` : ""}`
    : multi ? `Confirmar${picked.length ? ` (${picked.length})` : ""}` : "Confirmar alteração";

  return (
    <div className="mt-2 w-full max-w-[28rem] rounded-xl border border-border bg-surface p-1.5 shadow-soft">
      <p className={cn("label-mono px-2.5 pb-1 pt-1.5", danger && "text-urgent")}>{headline(entries)}</p>

      {!multi ? (
        <SinglePreview entry={entries[0]} when={when} />
      ) : (
        <ul>
          {entries.map((e, i) => (
            <li key={e.action.entityId} className={cn("flex items-start gap-3 rounded-lg px-2.5 py-2 transition-opacity", !on[i] && "opacity-45")}>
              <span className="mt-[0.1875rem] shrink-0">
                <Checkbox checked={on[i]} tone={e.before.context} onCheckedChange={(v) => { setArmed(false); setOn((o) => o.map((x, j) => (j === i ? v === true : x))); }} aria-label={`Incluir ${e.before.title}`} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.9rem] font-medium leading-snug">{e.before.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.75rem] text-muted-foreground">
                  <span className={cn("h-1.5 w-1.5 rounded-full", CTX[e.before.context].dot)} />
                  <span>{shortChange(e, when)}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {proposal.truncated && <p className="px-2.5 pb-1.5 text-[0.74rem] leading-snug text-muted-foreground">Eram mais itens; mostrei só os primeiros 100. Peça de novo para o restante.</p>}
      {entries.length <= 3 && entries.some((e) => e.similar.length > 0) && (
        <p className="px-2.5 pb-1.5 text-[0.74rem] leading-snug text-muted-foreground">
          Há outro item parecido: {entries.flatMap((e) => e.similar).slice(0, 2).map((t) => `${t.title} (${when(t)})`).join("; ")}. Confira se é este mesmo.
        </p>
      )}
      {skippedBlock}

      {danger && armed && multi ? (
        <p role="alert" className="mx-1 mb-1.5 rounded-lg bg-urgent-soft px-2.5 py-2 text-[0.8rem] leading-snug text-urgent">
          Isso apaga {picked.length} {picked.length === 1 ? "item" : "itens"} da agenda. Confirma?
        </p>
      ) : null}

      <div className="flex items-center gap-2 px-1 pb-1 pt-1.5">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button
          size="sm"
          className={cn("ml-auto", danger && "bg-urgent text-white")}
          disabled={picked.length === 0}
          onClick={() => {
            // exclusão em lote pede um segundo toque, com o número exato de itens
            if (danger && multi && !armed) return setArmed(true);
            onConfirm(picked);
          }}
        >
          {danger && multi && armed ? `Sim, excluir ${picked.length}` : confirmLabel}
        </Button>
      </div>
    </div>
  );
}

function SinglePreview({ entry, when }: { entry: ChangeEntry; when: (t: TaskDto) => string }) {
  const rows = diffRows(entry, when);
  const del = entry.action.action === "delete";
  const Block = ({ label, side }: { label: string; side: "before" | "after" }) => (
    <div className="min-w-0 flex-1 rounded-lg bg-hover/60 px-2.5 py-2">
      <p className="label-mono">{label}</p>
      <ul className="mt-1 space-y-0.5">
        {rows.map((r) => {
          const v = side === "before" ? r.before : r.after;
          if (v === null) return null;
          const strong = r.key === "title";
          return (
            <li key={r.key} className={cn("break-words text-[0.82rem] leading-snug", strong ? "text-[0.9rem] font-medium" : "text-muted-foreground", side === "after" && r.changed && "font-medium text-foreground")}>
              {!strong && r.key !== "when" && <span className="mr-1 text-muted-foreground/70">{r.label}:</span>}{v}
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div className="px-1 pb-1">
      <div className="flex flex-col items-stretch gap-1.5 sm:flex-row sm:items-center">
        <Block label="Antes" side="before" />
        {!del && <ArrowRight className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground sm:block" strokeWidth={1.8} />}
        {!del && <Block label="Depois" side="after" />}
      </div>
      {del && <p className="px-1.5 pt-1.5 text-[0.76rem] leading-snug text-muted-foreground">Este item será removido da agenda{entry.before.recurrence && entry.before.recurrence !== "none" ? " (as próximas repetições, se já criadas, ficam)" : ""}.</p>}
      {entry.action.action === "complete" && entry.before.recurrence && entry.before.recurrence !== "none" && (
        <p className="px-1.5 pt-1.5 text-[0.76rem] leading-snug text-muted-foreground">Como se repete, a próxima ocorrência será criada.</p>
      )}
      {entry.ignored.length > 0 && <p className="px-1.5 pt-1.5 text-[0.76rem] leading-snug text-muted-foreground">Não apliquei: {entry.ignored.join("; ")}.</p>}
    </div>
  );
}
