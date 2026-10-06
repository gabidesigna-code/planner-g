const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const WD_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export const pad2 = (n: number) => String(n).padStart(2, "0");

export function startOfDay(d: Date = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function diffDays(a: Date, b: Date) {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86_400_000);
}

export const sameDay = (a: Date, b: Date) => diffDays(a, b) === 0;

/** Segunda-feira da semana de `d` */
export function weekStart(d: Date) {
  const x = startOfDay(d);
  return addDays(x, -((x.getDay() + 6) % 7));
}

/** 42 dias (6 semanas, começando na segunda) cobrindo o mês */
export function monthGrid(year: number, month: number) {
  const first = weekStart(new Date(year, month, 1));
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

export const monthName = (m: number) => MONTHS[m].charAt(0).toUpperCase() + MONTHS[m].slice(1);
export const weekdayName = (d: Date) => WEEKDAYS[d.getDay()];
export const weekdayShort = (d: Date) => WD_SHORT[d.getDay()];
export const monAbbr = (d: Date) => MONTHS[d.getMonth()].slice(0, 3);

/** "SÁB 03" */
export const dayTag = (d: Date) => `${weekdayShort(d)} ${pad2(d.getDate())}`.toUpperCase();

export function longDay(d: Date) {
  const w = WEEKDAYS[d.getDay()];
  return `${w.charAt(0).toUpperCase() + w.slice(1)}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}

/** Dia relativo a hoje, para o canto das linhas */
export function relDay(due: Date, today: Date) {
  const n = diffDays(due, today);
  if (n === 0) return { text: "hoje", late: false };
  if (n === 1) return { text: "amanhã", late: false };
  if (n === -1) return { text: "ontem", late: true };
  if (n < 0) return { text: `${-n} dias atrás`, late: true };
  return { text: dayTag(due).toLowerCase(), late: false };
}

export function greeting(d: Date | null) {
  if (!d) return "Olá";
  const h = d.getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export const hhmm = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
export const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
export const fromMin = (n: number) => `${pad2(Math.floor(n / 60))}:${pad2(n % 60)}`;

export const isoDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export function fromIso(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Ordena por horário; itens sem horário vão para o fim. */
export function byTime(a: { time?: string }, b: { time?: string }) {
  return (a.time ?? "99:99").localeCompare(b.time ?? "99:99");
}
