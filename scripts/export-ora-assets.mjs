// Reexporta os arquivos da marca ORA (wordmark, símbolo e ícones) a partir da geometria em
// src/components/brand/geometry.ts (a mesma que o componente logo.tsx usa).
//   npm run export:ora
// Só mexe nos arquivos da ora. A ori (brand/ora/*/ori-*, public/brand/ori-avatar.png) NÃO é tocada.
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";

register("./ts-alias-loader.mjs", pathToFileURL(path.join(import.meta.dirname, "/")));
const { A_STROKE, WORD_STROKE, MONO_STROKE, MONO_R, MONO_STEM_X, MONO_NOTCH_DEPTH } = await import("@/components/brand/geometry");

const root = path.join(import.meta.dirname, "..");
const INK = "#161A18", PAPER = "#F6F5F0", MIST = "#E8EEE9";
const num = (n) => String(+n.toFixed(4));

/** wordmark "ora": o e r em traço 12, o "a" em traço 9,5 (mesma extensão externa) */
function wordmark(ink) {
  const rx = 33 - A_STROKE / 2, ry = 30 - A_STROKE / 2, stem = 183 - A_STROKE / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -62 186 64" aria-label="ora">` +
    `<g fill="none" stroke="${ink}" stroke-width="${WORD_STROKE}" stroke-linecap="butt"><defs><clipPath id="n"><path clip-rule="evenodd" d="M-100 -200H900V200H-100Z M58 -33.5H80V-26.5H58Z"></path></clipPath></defs>` +
    `<g clip-path="url(#n)"><ellipse cx="33" cy="-30" rx="27" ry="24"></ellipse></g><path d="M81 0V-60"></path><path d="M81 -34A22 20 0 0 1 103 -54"></path></g>` +
    `<g fill="none" stroke="${ink}" stroke-width="${A_STROKE}" stroke-linecap="butt"><ellipse cx="150" cy="-30" rx="${num(rx)}" ry="${num(ry)}"></ellipse><path d="M${num(stem)} 0V-60"></path></g></svg>`;
}

/** símbolo/ícone "a" da ora; `tile` = cor do quadrado (ou null), `square` = quadrado sem cantos (apple touch) */
function monogram(ink, tile = null, square = false) {
  const x1 = 30 - MONO_R - 20, x2 = 30 - MONO_R - MONO_STROKE / 2 + MONO_NOTCH_DEPTH;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-label="ora">` +
    (tile ? `<rect width="100" height="100"${square ? "" : ' rx="22"'} fill="${tile}"></rect>` : "") +
    `<g><g transform="translate(50 50) scale(.82) translate(-30 30)" fill="none" stroke="${ink}" stroke-width="${MONO_STROKE}" stroke-linecap="butt">` +
    `<defs><clipPath id="n"><path clip-rule="evenodd" d="M-100 -200H900V200H-100Z M${num(x1)} -33.5H${num(x2)}V-26.5H${num(x1)}Z"></path></clipPath></defs>` +
    `<g clip-path="url(#n)"><circle cx="30" cy="-30" r="${num(MONO_R)}"></circle></g><path d="M${num(MONO_STEM_X)} 0V-60"></path></g></g></svg>`;
}

const out = (rel, data) => { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, data); console.log("  ", rel); };
const png = async (svg, rel, { width, height }) => out(rel, await sharp(Buffer.from(svg), { density: 300 }).resize({ width, height }).png().toBuffer());

const svgs = {
  "wordmark-light": wordmark(INK),
  "wordmark-dark": wordmark(MIST),
  icon: monogram(PAPER, INK),
  "icon-claro": monogram(INK, MIST),
  "symbol-light": monogram(INK),
  "symbol-dark": monogram(MIST),
};

console.log("SVG");
for (const [name, svg] of Object.entries(svgs)) out(`brand/ora/svg/ora-${name}.svg`, svg);

console.log("PNG");
await png(svgs["wordmark-light"], "brand/ora/png/ora-wordmark-light-1200.png", { width: 1200 });
await png(svgs["wordmark-dark"], "brand/ora/png/ora-wordmark-dark-1200.png", { width: 1200 });
await png(svgs["symbol-light"], "brand/ora/png/ora-symbol-light-512.png", { width: 512, height: 512 });
await png(svgs["symbol-dark"], "brand/ora/png/ora-symbol-dark-512.png", { width: 512, height: 512 });
for (const s of [512, 64, 32, 16]) {
  await png(svgs.icon, `brand/ora/png/ora-icon-${s}.png`, { width: s, height: s });
  await png(svgs["icon-claro"], `brand/ora/png/ora-icon-claro-${s}.png`, { width: s, height: s });
}
// ícone do iOS: quadrado sem cantos e sem transparência (o iOS arredonda)
const apple = await sharp(Buffer.from(monogram(PAPER, INK, true)), { density: 300 }).resize(180, 180).flatten({ background: INK }).png().toBuffer();
out("brand/ora/png/ora-apple-touch-icon-180.png", apple);

console.log("No app");
out("src/app/icon.svg", svgs.icon);
out("src/app/apple-icon.png", apple);
out("public/brand/ora-icon.svg", svgs.icon);
out("public/brand/ora-wordmark.svg", svgs["wordmark-light"]);
out("public/brand/ora-wordmark-claro.svg", svgs["wordmark-dark"]);
out("public/brand/ora-avatar.png", fs.readFileSync(path.join(root, "brand/ora/png/ora-icon-512.png")));
console.log("\nOK. A ori não foi alterada.");
