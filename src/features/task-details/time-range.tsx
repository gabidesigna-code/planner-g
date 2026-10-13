"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { HM, applyTimeEdit } from "@/lib/time-edit";
import type { Task } from "@/types";


/**
 * Início → Fim. Cada campo tem um RASCUNHO local: nada é salvo enquanto a hora está pela metade
 * (o navegador manda "" até o campo ficar completo) nem com fim antes do início.
 */
export function TimeRange({ task, onChange, className, clearOnTimeOff }: {
  task: Task;
  onChange: (patch: Partial<Task>) => void;
  className: string;
  clearOnTimeOff: Partial<Task>;
}) {
  const [time, setTime] = useState(task.time ?? "");
  const [end, setEnd] = useState(task.end ?? "");
  const [error, setError] = useState("");
  const multiDay = task.kind === "evento" && !!task.endDate && task.endDate > task.due;

  // mudanças vindas de fora (outro aparelho, desfazer) entram nos rascunhos
  useEffect(() => { setTime(task.time ?? ""); }, [task.time]);
  useEffect(() => { setEnd(task.end ?? ""); setError(""); }, [task.end]);

  const run = (field: "time" | "end", value: string, final: boolean) => {
    const r = applyTimeEdit({ time: task.time, end: task.end, multiDay }, field, value);
    if (!r) return;
    if ("error" in r) { if (final) setError(r.error); return; }
    setError("");
    onChange(field === "time" && value === "" ? { ...r.patch, ...clearOnTimeOff } : r.patch);
  };

  const revert = () => { setTime(task.time ?? ""); setEnd(task.end ?? ""); setError(""); };

  return (
    <div>
      <div className="flex items-center gap-1">
        <input
          type="time" value={time} aria-label="Início"
          onChange={(e) => { setTime(e.target.value); setError(""); run("time", e.target.value, false); }}
          onBlur={() => (time === "" && task.time ? run("time", "", true) : HM.test(time) ? undefined : revert())}
          className={className}
        />
        <span className="text-muted-foreground/50">→</span>
        <input
          type="time" value={end} aria-label="Fim" disabled={!task.time}
          onChange={(e) => { setEnd(e.target.value); setError(""); run("end", e.target.value, false); }}
          onBlur={() => {
            if (end === "" ) { if (task.end) run("end", "", true); return; }
            if (!HM.test(end)) { revert(); return; }
            const r = applyTimeEdit({ time: task.time, end: task.end, multiDay }, "end", end);
            if (r && "error" in r) setError(r.error);
          }}
          className={cn(className, "disabled:opacity-40", error && "ring-1 ring-urgent")}
        />
      </div>
      {error && <p role="alert" className="mt-1 px-2 text-[0.75rem] text-urgent">{error}</p>}
    </div>
  );
}
