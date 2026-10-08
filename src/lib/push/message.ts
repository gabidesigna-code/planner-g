import { spokenTime } from "@/lib/ori-greeting";

/**
 * Texto das notificações: a ori avisando, curto e direto.
 * Exemplos: "Gabi, seu compromisso “Consulta” começa em 10 minutos." · "Gabi, hora de pagar cartão."
 */

export interface ReminderNotice {
  /** id do item (vira a "tag": evita duas notificações iguais empilhadas no aparelho) */
  tag: string;
  /** como a ori chama a pessoa ("" = sem nome) */
  name: string;
  title: string;
  /** tarefa | lembrete | compromisso | evento */
  kind: string;
  minutes_before: number;
  /** horário do item, HH:MM, no fuso da pessoa */
  time: string;
}

export const NOTIFICATION_TITLE = "Ori";

const clip = (s: string, n: number) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};
const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** "5 minutos", "1 hora", "2 horas", "1 h 30 min" */
export function humanMinutes(m: number): string {
  if (m < 60) return `${m} ${m === 1 ? "minuto" : "minutos"}`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (r === 0) return `${h} ${h === 1 ? "hora" : "horas"}`;
  return `${h} h ${r} min`;
}

/** Título que começa com verbo no infinitivo ("Pagar cartão"): dá para dizer "hora de pagar cartão". */
const startsWithInfinitive = (title: string) => /^[a-zà-ú]{3,}(ar|er|ir|or)\b/i.test(title.trim());

export function buildMessage(n: ReminderNotice): { title: string; body: string; tag: string } {
  const title = clip(n.title, 60);
  const name = n.name.trim();
  const who = name ? `${name}, ` : "";
  const appointment = n.kind === "compromisso" || n.kind === "evento";
  const noun = n.kind === "evento" ? "evento" : "compromisso";
  const day = n.minutes_before >= 1440; // "1 dia antes" ou mais: fala do horário, não de "daqui a N"
  let body: string;

  if (appointment) {
    if (n.minutes_before === 0) body = `${who}seu ${noun} “${title}” começa agora.`;
    else if (day) body = `${who}amanhã às ${spokenTime(n.time)}: seu ${noun} “${title}”.`;
    else body = `${who}seu ${noun} “${title}” começa em ${humanMinutes(n.minutes_before)}.`;
  } else if (n.minutes_before === 0) {
    body = startsWithInfinitive(title) ? `${who}hora de ${lowerFirst(title)}.` : `${who}agora: “${title}”.`;
  } else if (day) {
    body = `${who}amanhã às ${spokenTime(n.time)}: “${title}”.`;
  } else {
    body = `${who}“${title}” é em ${humanMinutes(n.minutes_before)}.`;
  }
  return { title: NOTIFICATION_TITLE, body: upperFirst(body), tag: n.tag };
}
