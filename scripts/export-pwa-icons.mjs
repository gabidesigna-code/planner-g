// Gera os ícones do PWA e da notificação em public/icons, a partir da marca já aprovada (brand/ora/png):
//   icon-192.png, icon-512.png      ícone do app (ora), "any"
//   icon-maskable-512.png           ícone com margem de segurança para Android (fundo = cor do ícone)
//   ori-192.png                     ícone grande da notificação (ori)
//   badge-96.png                    ícone pequeno monocromático da barra de status do Android (anel da ori, branco)
//   npm run export:pwa
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.join(import.meta.dirname, "..");
const brand = (f) => path.join(root, "brand", "ora", "png", f);
const out = path.join(root, "public", "icons");
fs.mkdirSync(out, { recursive: true });
const INK = { r: 22, g: 26, b: 24, alpha: 1 }; // #161A18, a cor do quadrado do ícone

const save = (name, buf) => { fs.writeFileSync(path.join(out, name), buf); console.log("  public/icons/" + name); };

save("icon-192.png", await sharp(brand("ora-icon-512.png")).resize(192, 192).png().toBuffer());
save("icon-512.png", await sharp(brand("ora-icon-512.png")).resize(512, 512).png().toBuffer());

// maskable: o Android recorta em círculo/arredondado; o conteúdo precisa caber nos 80% centrais
const inner = await sharp(brand("ora-icon-512.png")).resize(360, 360).png().toBuffer();
save("icon-maskable-512.png", await sharp({ create: { width: 512, height: 512, channels: 4, background: INK } }).composite([{ input: inner, gravity: "centre" }]).png().toBuffer());

save("ori-192.png", await sharp(brand("ori-icon-512.png")).resize(192, 192).png().toBuffer());

// badge: anel da ori com o entalhe (mesma geometria de logo.tsx), só branco sobre transparente
const ring = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -76 90 82" width="96" height="96">
  <defs><clipPath id="n"><path clip-rule="evenodd" d="M-100 -200H900V200H-100Z M51 -33.5H72V-26.5H51Z"/></clipPath></defs>
  <g fill="none" stroke="#fff" stroke-width="16"><g clip-path="url(#n)"><circle cx="30" cy="-30" r="22"/></g></g>
  <circle cx="73" cy="-64" r="11" fill="#fff"/></svg>`;
save("badge-96.png", await sharp(Buffer.from(ring), { density: 300 }).resize(96, 96).png().toBuffer());
console.log("OK");
