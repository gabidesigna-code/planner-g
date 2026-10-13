"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Route, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_TRAVEL_MINUTES, TRAVEL_QUICK, cleanTravel, describe, formatTravel, spanOfProposed, type TimeSpan } from "@/lib/travel";
import type { ProposedItem } from "@/lib/ai/schema";

export interface TravelValue {
  to?: number;
  from?: number;
}

const chip = (active: boolean) =>
  cn(
    "flex h-9 items-center rounded-lg px-2.5 text-[0.8125rem] transition-colors sm:h-7",
    active ? "bg-muted font-medium" : "text-muted-foreground ring-1 ring-border hover:bg-hover hover:text-foreground",
  );

const numInput =
  "h-10 w-16 rounded-lg border border-border bg-background px-2 text-center text-[0.875rem] tabular-nums hover:border-foreground/25 focus:border-foreground/40 focus:outline-none sm:h-8";

/** Um sentido (ida OU volta): atalhos + "Outro" com horas e minutos. */
function Picker({ label, icon: Icon, value, onChange }: { label: string; icon: typeof ArrowUpRight; value?: number; onChange: (v: number | undefined) => void }) {
  const quick = value !== undefined && (TRAVEL_QUICK as readonly number[]).includes(value);
  const [custom, setCustom] = useState(value !== undefined && !quick);
  const [h, setH] = useState(value ? String(Math.floor(value / 60)) : "");
  const [m, setM] = useState(value ? String(value % 60) : "");

  const setParts = (nh: string, nm: string) => {
    setH(nh);
    setM(nm);
    onChange(cleanTravel((Number(nh) || 0) * 60 + (Number(nm) || 0)));
  };
  const digits = (s: string, max: number) => {
    const d = s.replace(/\D/g, "").slice(0, 3);
    return d === "" ? "" : String(Math.min(Number(d), max));
  };
  const pick = (n: number | undefined) => {
    setCustom(false);
    onChange(n === value ? undefined : n);
  };

  return (
    <div role="group" aria-label={label} className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-[0.8125rem] font-medium">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.8} aria-hidden />
        {label}
        <span className="font-normal text-muted-foreground">{value ? formatTravel(value) : "nenhuma"}</span>
      </span>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" aria-pressed={value === undefined && !custom} onClick={() => { setCustom(false); setH(""); setM(""); onChange(undefined); }} className={chip(value === undefined && !custom)}>
          Nenhum
        </button>
        {TRAVEL_QUICK.map((q) => (
          <button key={q} type="button" aria-pressed={!custom && value === q} onClick={() => pick(q)} className={chip(!custom && value === q)}>
            {q === 60 ? "1h" : `${q} min`}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={custom}
          onClick={() => { setCustom(true); if (value) { setH(String(Math.floor(value / 60))); setM(String(value % 60)); } }}
          className={chip(custom)}
        >
          Personalizado
        </button>
      </div>
      {custom && (
        <div className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
          <input inputMode="numeric" value={h} placeholder="0" onChange={(e) => setParts(digits(e.target.value, MAX_TRAVEL_MINUTES / 60), m)} aria-label={`${label}: horas`} className={numInput} />
          h
          <input inputMode="numeric" value={m} placeholder="0" onChange={(e) => setParts(h, digits(e.target.value, 59))} aria-label={`${label}: minutos`} className={numInput} />
          min
        </div>
      )}
    </div>
  );
}

/**
 * "Considerar tempo de trajeto": uma seção que abre dentro do formulário com Ida e Volta INDEPENDENTES.
 * Desligar zera os dois (o item volta a ocupar só o próprio horário).
 */
export function TravelFields({ value, onChange, className }: { value: TravelValue; onChange: (v: TravelValue) => void; className?: string }) {
  const [on, setOn] = useState(!!(value.to || value.from));
  const toggle = () => {
    if (on) onChange({});
    setOn(!on);
  };
  return (
    <div className={cn("rounded-lg border border-border", className)}>
      <button type="button" role="switch" aria-checked={on} onClick={toggle} className="flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-[0.875rem] sm:min-h-9">
        <Route className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.7} aria-hidden />
        <span className="flex-1">Considerar tempo de trajeto</span>
        <span aria-hidden className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", on ? "bg-foreground" : "bg-muted ring-1 ring-inset ring-border")}>
          <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-background shadow-soft transition-[left]", on ? "left-[1.1875rem]" : "left-0.5")} />
        </span>
      </button>
      {on && (
        <div className="flex flex-col gap-4 border-t border-border px-3 py-3">
          <Picker label="Ida" icon={ArrowUpRight} value={value.to} onChange={(to) => onChange({ ...value, to })} />
          <Picker label="Volta" icon={ArrowDownRight} value={value.from} onChange={(from) => onChange({ ...value, from })} />
        </div>
      )}
    </div>
  );
}

/** Horário · Deslocamento · Tempo total bloqueado. `span` precisa ter trajeto para o resumo aparecer. */
export function TravelSummary({ span, className }: { span: TimeSpan | null; className?: string }) {
  if (!span || (!span.travelTo && !span.travelFrom)) return null;
  const d = describe(span);
  const row = (label: string, value: string, sub?: string) => (
    <div className="flex items-baseline gap-2">
      <dt className="w-[5.25rem] shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 tabular-nums">
        {value}
        {sub && <span className="ml-1.5 text-muted-foreground">{sub}</span>}
      </dd>
    </div>
  );
  return (
    <dl className={cn("flex flex-col gap-1 rounded-lg bg-hover px-3 py-2.5 text-[0.8125rem]", className)}>
      {row("Horário", d.event)}
      {row("Ida", span.travelTo ? formatTravel(span.travelTo) : "—", d.go)}
      {row("Volta", span.travelFrom ? formatTravel(span.travelFrom) : "—", d.back)}
      <div className="mt-0.5 flex items-baseline gap-2 border-t border-border pt-1.5 font-medium">
        <dt className="w-[5.25rem] shrink-0">Bloqueado</dt>
        <dd className="tabular-nums">{d.blocked}</dd>
      </div>
    </dl>
  );
}

/** Aviso (não bloqueia): o horário bate com outro compromisso ou com o trajeto dele. */
export function ConflictNotice({ conflicts, className }: { conflicts: { id: string; message: string }[]; className?: string }) {
  if (!conflicts.length) return null;
  return (
    <div role="alert" className={cn("flex gap-2 rounded-lg bg-waiting-soft px-3 py-2.5 text-[0.8125rem] leading-snug", className)}>
      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-waiting" strokeWidth={1.8} aria-hidden />
      <ul className="flex flex-col gap-1">
        {conflicts.slice(0, 3).map((c) => <li key={c.id}>{c.message}</li>)}
        {conflicts.length > 3 && <li className="text-muted-foreground">e mais {conflicts.length - 3}…</li>}
      </ul>
    </div>
  );
}

/** Na confirmação da Ori: "Compromisso: 15:00–16:00 · Ida: 20 min · Volta: 1h20 / Período total ocupado: 14:40–17:20" + avisos de conflito. */
export function ProposedTravel({ item, className }: { item: ProposedItem; className?: string }) {
  const span = spanOfProposed(item);
  const conflicts = (item.conflicts ?? []).map((message, i) => ({ id: String(i), message }));
  const trip = span && (span.travelTo || span.travelFrom) ? describe(span) : null;
  if (!trip && !conflicts.length) return null;
  return (
    <div className={cn("mt-1.5 flex flex-col gap-1.5", className)}>
      {span && trip && (
        <p className="flex gap-1.5 text-[0.78rem] leading-snug text-muted-foreground">
          <Route className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.8} aria-hidden />
          <span>
            Compromisso: {trip.event}
            {span.travelTo ? ` · Ida: ${formatTravel(span.travelTo)}` : ""}
            {span.travelFrom ? ` · Volta: ${formatTravel(span.travelFrom)}` : ""}
            <br />
            <span className="font-medium text-foreground">Período total ocupado: {trip.blocked}</span>
          </span>
        </p>
      )}
      <ConflictNotice conflicts={conflicts} className="text-[0.78rem]" />
    </div>
  );
}
