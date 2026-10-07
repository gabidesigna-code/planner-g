import { DEFAULT_PALETTE, PALETTES, type PaletteTokens } from "./palettes";

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const vars = (t: PaletteTokens) =>
  (Object.keys(t) as (keyof PaletteTokens)[]).map((k) => `--${kebab(k)}:${t[k]};`).join("");

/**
 * CSS gerado das paletas: cada uma vira `html[data-palette="id"]` (claro) e
 * `html[data-palette="id"].dark` (escuro). A primeira também é o padrão sem atributo.
 * Trocar de paleta = trocar o atributo; os componentes só leem as variáveis.
 */
export function buildPaletteCss(): string {
  const base = PALETTES.find((p) => p.id === DEFAULT_PALETTE) ?? PALETTES[0];
  const out = [`:root{${vars(base.light)}}`, `:root.dark{${vars(base.dark)}}`];
  for (const p of PALETTES) {
    out.push(`html[data-palette="${p.id}"]{${vars(p.light)}}`, `html[data-palette="${p.id}"].dark{${vars(p.dark)}}`);
  }
  return out.join("\n");
}

/** Chaves de armazenamento (as mesmas que o script de pré-hidratação lê). */
export const PALETTE_KEY = "palette";
export const MODE_KEY = "theme";

/** Roda antes da hidratação para a página já nascer com paleta e modo certos (sem piscar). */
export const themeInitScript = `try{var d=document.documentElement,p=localStorage.getItem('${PALETTE_KEY}'),t=localStorage.getItem('${MODE_KEY}');d.setAttribute('data-palette',p||'${DEFAULT_PALETTE}');if(t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme: dark)').matches))d.classList.add('dark')}catch(e){document.documentElement.setAttribute('data-palette','${DEFAULT_PALETTE}')}`;
