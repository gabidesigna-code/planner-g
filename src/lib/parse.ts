import { addDays, pad2 } from "./dates";

/** Entende "Dentista amanhã 16h", "Reunião às 9:30", "Mercado hoje 18h30". */
export function parseQuick(input: string, today: Date) {
  let title = input.trim();
  let due = today;
  let time: string | undefined;

  const tm = title.match(/(?:(?<![\p{L}])[àa]s\s+)?(?<!\d)(\d{1,2})(?::(\d{2})|h(\d{2})?)(?!\d)/iu);
  if (tm) {
    const h = Number(tm[1]);
    const m = Number(tm[2] ?? tm[3] ?? 0);
    if (h < 24 && m < 60) {
      time = `${pad2(h)}:${pad2(m)}`;
      title = title.replace(tm[0], " ");
    }
  }
  const tomorrow = /(?<![\p{L}])amanh[ãa](?![\p{L}])/iu;
  const todayRe = /(?<![\p{L}])hoje(?![\p{L}])/iu;
  if (tomorrow.test(title)) {
    due = addDays(today, 1);
    title = title.replace(tomorrow, " ");
  } else if (todayRe.test(title)) {
    title = title.replace(todayRe, " ");
  }

  title = title.replace(/\s+/g, " ").trim().replace(/\s+(às|as|a)$/i, "");
  return { title, due, time };
}
