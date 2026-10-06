// Valida o contraste de todas as paletas (WCAG). Uso: npm run check:palettes
// Falha (exit 1) se algum par de texto ficar abaixo do mínimo.
import { PALETTES } from "../src/theme/palettes.ts";

function hslToRgb(str) {
  const [h, s, l] = str.split(" ").map((v) => parseFloat(v));
  const S = s / 100, L = l / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = S * Math.min(L, 1 - L);
  const f = (n) => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}
const lum = (rgb) => {
  const [r, g, b] = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(hslToRgb(a)), lum(hslToRgb(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** [texto, fundo, mínimo, onde é usado] */
const PAIRS = [
  ["foreground", "background", 7, "texto principal"],
  ["foreground", "surface", 7, "texto em cartões"],
  ["foreground", "sidebar", 7, "menu"],
  ["foreground", "workSoft", 7, "eventos de Trabalho"],
  ["foreground", "personalSoft", 7, "eventos de Pessoal"],
  ["mutedForeground", "background", 4.5, "texto secundário"],
  ["mutedForeground", "surface", 4.5, "texto secundário em cartões"],
  ["mutedForeground", "sidebar", 4.5, "texto secundário no menu"],
  ["mutedForeground", "workSoft", 4.5, "detalhe nos eventos de Trabalho"],
  ["mutedForeground", "personalSoft", 4.5, "detalhe nos eventos de Pessoal"],
  ["primaryForeground", "primary", 4.5, "botão e item ativo"],
  ["workForeground", "work", 4.5, "chip Trabalho ativo"],
  ["personalForeground", "personal", 4.5, "chip Pessoal ativo"],
  ["work", "background", 4.5, "rótulos de Trabalho"],
  ["personal", "background", 4.5, "rótulos de Pessoal"],
  ["urgent", "background", 4.5, "atrasado"],
  ["waiting", "background", 4.5, "aguardando"],
  ["done", "background", 4.5, "concluído"],
  ["urgent", "urgentSoft", 4.5, "excluir (hover)"],
  ["cool", "background", 3, "horas da timeline (apoio)"],
];

let fails = 0;
for (const p of PALETTES) {
  for (const mode of ["light", "dark"]) {
    const t = p[mode];
    const bad = PAIRS.map(([fg, bg, min, use]) => ({ fg, bg, min, use, r: ratio(t[fg], t[bg]) })).filter((x) => x.r < x.min);
    const worst = Math.min(...PAIRS.map(([fg, bg]) => ratio(t[fg], t[bg])));
    console.log(`${bad.length ? "✗" : "✓"} ${p.id} · ${mode}  (pior par: ${worst.toFixed(2)})`);
    for (const x of bad) console.log(`    ${x.fg} sobre ${x.bg}: ${x.r.toFixed(2)} < ${x.min}  (${x.use})`);
    fails += bad.length;
  }
}
if (fails) {
  console.error(`\n${fails} par(es) abaixo do contraste mínimo.`);
  process.exit(1);
}
console.log("\nTodas as paletas passam.");
