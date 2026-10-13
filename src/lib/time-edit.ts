import { fromMin, toMin } from "@/lib/dates";
import type { Task } from "@/types";

export const HM = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Regra de horário do painel (pura, testável): dado o que está salvo e o que a pessoa quer mudar,
 * devolve o patch a salvar ou o motivo de recusar. Nunca devolve valor parcial/inválido.
 */
export function applyTimeEdit(
  cur: { time?: string; end?: string; multiDay?: boolean },
  field: "time" | "end",
  value: string,
): { patch: Pick<Task, "time" | "end"> } | { error: string } | null {
  if (value !== "" && !HM.test(value)) return null; // ainda incompleto: não faz nada
  if (field === "time") {
    if (value === cur.time || (value === "" && !cur.time)) return null;
    if (value === "") return { patch: { time: undefined, end: undefined } };
    if (cur.end && !cur.multiDay && toMin(cur.end) <= toMin(value)) {
      const keep = cur.time ? toMin(cur.end) - toMin(cur.time) : 0;
      const dur = keep > 0 ? keep : 60;
      return { patch: { time: value, end: fromMin(Math.min(toMin(value) + dur, 23 * 60 + 59)) } };
    }
    return { patch: { time: value, end: cur.end } };
  }
  if (!cur.time) return null;
  if (value === (cur.end ?? "")) return null;
  if (value === "") return { patch: { time: cur.time, end: undefined } };
  if (!cur.multiDay && toMin(value) <= toMin(cur.time)) return { error: "O fim precisa ser depois do início." };
  return { patch: { time: cur.time, end: value } };
}
