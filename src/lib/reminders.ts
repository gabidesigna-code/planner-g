/**
 * Lembretes: "quantos minutos antes do horário do item a Ori avisa".
 * null/undefined = sem lembrete; 0 = na hora. O lembrete só vale para itens COM horário.
 */

export const REMINDER_OPTIONS: { minutes: number | null; label: string; short: string }[] = [
  { minutes: null, label: "Sem lembrete", short: "" },
  { minutes: 0, label: "Na hora", short: "na hora" },
  { minutes: 5, label: "5 min antes", short: "5 min antes" },
  { minutes: 10, label: "10 min antes", short: "10 min antes" },
  { minutes: 15, label: "15 min antes", short: "15 min antes" },
  { minutes: 30, label: "30 min antes", short: "30 min antes" },
  { minutes: 60, label: "1 hora antes", short: "1 h antes" },
  { minutes: 120, label: "2 horas antes", short: "2 h antes" },
  { minutes: 1440, label: "1 dia antes", short: "1 dia antes" },
];

/** Maior valor aceito pelo banco e pela API (7 dias). */
export const MAX_REMINDER_MINUTES = 10_080;

/** Valor do <select>: "" = sem lembrete. */
export const reminderToValue = (m: number | null | undefined) => (m === null || m === undefined ? "" : String(m));
export const valueToReminder = (v: string): number | undefined => (v === "" ? undefined : Number(v));

/** "10 min antes", "na hora", "1 dia antes" (ou "" se não há lembrete). */
export function reminderLabel(m: number | null | undefined): string {
  if (m === null || m === undefined) return "";
  const known = REMINDER_OPTIONS.find((o) => o.minutes === m);
  if (known) return known.short;
  if (m % 1440 === 0) return `${m / 1440} d antes`;
  if (m % 60 === 0) return `${m / 60} h antes`;
  return `${m} min antes`;
}
