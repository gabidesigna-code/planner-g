/**
 * Paletas do app: a ÚNICA fonte das cores. Nenhum componente usa cor fixa; todos consomem
 * estes tokens por variáveis CSS (ver theme/css.ts) através das classes do Tailwind.
 *
 * Para criar uma paleta nova: acrescente um objeto em PALETTES com as versões `light` e `dark`
 * (cada token é "H S% L%") e rode `npm run check:palettes` para validar o contraste.
 *
 * Mapa de tokens (nome semântico → token):
 *   background / surface / sidebar ...... fundos            foreground / muted-foreground ... textos
 *   primary(+foreground) ................ botão e item ativo   work / personal (+soft, +foreground)
 *   urgent (perigo) · waiting (aviso) · done (sucesso) · cool (apoio, horas da timeline)
 */

export interface PaletteTokens {
  background: string;
  surface: string;
  sidebar: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  hover: string;
  ring: string;
  primary: string;
  primaryForeground: string;
  work: string;
  workSoft: string;
  workForeground: string;
  personal: string;
  personalSoft: string;
  personalForeground: string;
  cool: string;
  waiting: string;
  waitingSoft: string;
  urgent: string;
  urgentSoft: string;
  done: string;
  doneSoft: string;
  shadow: string;
}

export interface Palette {
  id: string;
  name: string;
  /** a sensação da paleta, em uma linha */
  mood: string;
  light: PaletteTokens;
  dark: PaletteTokens;
}

export const PALETTES: Palette[] = [
  {
    id: "oliva-vinho",
    name: "Oliva + Vinho",
    mood: "Sofisticada, alternativa, natural",
    light: {
      background: "90 11% 96.5%", surface: "0 0% 100%", sidebar: "110 11% 89.6%",
      foreground: "150 8% 9.4%", muted: "120 9% 89%", mutedForeground: "153 6% 35%",
      border: "130 8% 84.7%", hover: "120 10% 92.5%", ring: "149 24% 17%",
      primary: "149 24% 17%", primaryForeground: "0 0% 100%",
      work: "128 13% 35.5%", workSoft: "120 15% 92%", workForeground: "0 0% 100%",
      personal: "335 31% 36.5%", personalSoft: "330 28% 93%", personalForeground: "0 0% 100%",
      cool: "204 10% 49%", waiting: "33 46% 35%", waitingSoft: "33 45% 92%",
      urgent: "12 52% 41%", urgentSoft: "12 50% 93%", done: "126 18% 32%", doneSoft: "126 16% 91%",
      shadow: "149 30% 10%",
    },
    dark: {
      background: "150 12% 6.5%", surface: "150 10% 9.5%", sidebar: "150 13% 5%",
      foreground: "110 12% 92%", muted: "150 8% 17%", mutedForeground: "140 6% 62%",
      border: "150 8% 19%", hover: "150 9% 14%", ring: "140 22% 80%",
      primary: "140 24% 80%", primaryForeground: "150 20% 8%",
      work: "128 26% 64%", workSoft: "128 14% 14%", workForeground: "150 20% 8%",
      personal: "335 40% 73%", personalSoft: "335 16% 16%", personalForeground: "335 30% 10%",
      cool: "204 22% 66%", waiting: "36 50% 62%", waitingSoft: "36 20% 15%",
      urgent: "12 62% 64%", urgentSoft: "12 24% 17%", done: "126 26% 62%", doneSoft: "126 12% 15%",
      shadow: "0 0% 0%",
    },
  },
  {
    id: "vinho-azul",
    name: "Vinho + Azul",
    mood: "Urbana, moderna, marcante",
    light: {
      background: "216 22% 96%", surface: "0 0% 100%", sidebar: "216 18% 90%",
      foreground: "224 26% 11%", muted: "216 16% 89%", mutedForeground: "218 10% 40%",
      border: "216 14% 83%", hover: "216 20% 92.5%", ring: "340 46% 24%",
      primary: "340 46% 24%", primaryForeground: "0 0% 100%",
      work: "216 58% 33%", workSoft: "216 50% 93%", workForeground: "0 0% 100%",
      personal: "340 44% 36%", personalSoft: "340 34% 94%", personalForeground: "0 0% 100%",
      cool: "212 16% 48%", waiting: "36 66% 34%", waitingSoft: "38 60% 92%",
      urgent: "12 68% 42%", urgentSoft: "12 60% 93%", done: "166 34% 31%", doneSoft: "166 24% 91%",
      shadow: "225 40% 10%",
    },
    dark: {
      background: "224 24% 7%", surface: "224 20% 10.5%", sidebar: "224 26% 5%",
      foreground: "216 18% 92%", muted: "224 14% 18%", mutedForeground: "218 10% 64%",
      border: "224 14% 19%", hover: "224 16% 14%", ring: "340 50% 78%",
      primary: "340 48% 74%", primaryForeground: "340 40% 10%",
      work: "214 62% 70%", workSoft: "216 28% 15%", workForeground: "224 40% 8%",
      personal: "340 50% 74%", personalSoft: "340 20% 16%", personalForeground: "340 40% 10%",
      cool: "212 24% 66%", waiting: "38 60% 62%", waitingSoft: "38 22% 15%",
      urgent: "12 72% 66%", urgentSoft: "12 28% 17%", done: "166 32% 60%", doneSoft: "166 14% 14%",
      shadow: "0 0% 0%",
    },
  },
  {
    id: "preto-creme",
    name: "Preto + Creme",
    mood: "Editorial, minimalista, fashion",
    light: {
      background: "42 28% 95.5%", surface: "42 40% 99%", sidebar: "40 16% 90%",
      foreground: "30 10% 8%", muted: "40 14% 88%", mutedForeground: "36 6% 38%",
      border: "38 12% 82%", hover: "40 18% 91.5%", ring: "30 8% 12%",
      primary: "30 8% 11%", primaryForeground: "42 30% 96%",
      work: "30 6% 26%", workSoft: "40 12% 90%", workForeground: "42 30% 96%",
      personal: "6 56% 36%", personalSoft: "8 38% 93%", personalForeground: "42 30% 97%",
      cool: "36 6% 44%", waiting: "34 52% 36%", waitingSoft: "38 40% 90%",
      urgent: "16 74% 40%", urgentSoft: "16 60% 92%", done: "100 14% 32%", doneSoft: "100 12% 90%",
      shadow: "30 20% 8%",
    },
    dark: {
      background: "30 8% 6.5%", surface: "30 7% 9.5%", sidebar: "30 9% 4.5%",
      foreground: "40 24% 92%", muted: "30 6% 17%", mutedForeground: "36 8% 62%",
      border: "30 6% 19%", hover: "30 7% 13%", ring: "40 22% 86%",
      primary: "40 26% 90%", primaryForeground: "30 10% 8%",
      work: "40 12% 78%", workSoft: "30 6% 14%", workForeground: "30 10% 8%",
      personal: "8 62% 68%", personalSoft: "8 22% 16%", personalForeground: "8 40% 8%",
      cool: "36 8% 64%", waiting: "38 56% 62%", waitingSoft: "38 20% 14%",
      urgent: "16 74% 64%", urgentSoft: "16 26% 16%", done: "100 20% 62%", doneSoft: "100 10% 14%",
      shadow: "0 0% 0%",
    },
  },
  {
    id: "verde-lilas",
    name: "Verde + Lilás escuro",
    mood: "Diferente, estilosa, sofisticada",
    light: {
      background: "150 10% 96%", surface: "0 0% 100%", sidebar: "155 10% 89.5%",
      foreground: "160 12% 9%", muted: "150 8% 88%", mutedForeground: "160 6% 34%",
      border: "150 8% 83%", hover: "150 10% 92%", ring: "156 38% 18%",
      primary: "156 38% 18%", primaryForeground: "0 0% 100%",
      work: "156 32% 28%", workSoft: "150 16% 91%", workForeground: "0 0% 100%",
      personal: "286 20% 38%", personalSoft: "286 16% 93%", personalForeground: "0 0% 100%",
      cool: "266 10% 48%", waiting: "36 55% 36%", waitingSoft: "38 45% 91%",
      urgent: "8 56% 42%", urgentSoft: "8 50% 93%", done: "150 30% 32%", doneSoft: "150 18% 90%",
      shadow: "160 30% 8%",
    },
    dark: {
      background: "160 14% 6%", surface: "160 11% 9%", sidebar: "162 16% 4.5%",
      foreground: "150 14% 92%", muted: "158 8% 16%", mutedForeground: "152 6% 62%",
      border: "158 8% 18%", hover: "158 10% 13%", ring: "150 30% 78%",
      primary: "150 34% 76%", primaryForeground: "160 24% 8%",
      work: "152 34% 62%", workSoft: "156 14% 13%", workForeground: "160 24% 8%",
      personal: "290 34% 76%", personalSoft: "290 14% 16%", personalForeground: "290 30% 10%",
      cool: "270 18% 70%", waiting: "38 54% 62%", waitingSoft: "38 20% 14%",
      urgent: "8 66% 66%", urgentSoft: "8 24% 16%", done: "150 28% 60%", doneSoft: "150 12% 14%",
      shadow: "0 0% 0%",
    },
  },
  {
    id: "petroleo-terracota",
    name: "Petróleo + Terracota",
    mood: "Moderna, quente, profissional",
    light: {
      background: "36 24% 95.5%", surface: "38 40% 99%", sidebar: "34 16% 89.5%",
      foreground: "200 20% 10%", muted: "34 12% 87.5%", mutedForeground: "30 6% 38%",
      border: "34 12% 82%", hover: "34 18% 91.5%", ring: "192 56% 19%",
      primary: "192 56% 19%", primaryForeground: "40 40% 97%",
      work: "192 52% 26%", workSoft: "190 26% 91%", workForeground: "0 0% 100%",
      personal: "14 56% 40%", personalSoft: "16 50% 93%", personalForeground: "0 0% 100%",
      cool: "196 16% 44%", waiting: "38 72% 32%", waitingSoft: "40 55% 90%",
      urgent: "356 60% 42%", urgentSoft: "356 50% 93%", done: "160 30% 30%", doneSoft: "160 18% 90%",
      shadow: "200 40% 8%",
    },
    dark: {
      background: "200 22% 6.5%", surface: "200 18% 9.5%", sidebar: "200 26% 4.5%",
      foreground: "36 20% 92%", muted: "200 12% 16%", mutedForeground: "196 8% 62%",
      border: "200 12% 18%", hover: "200 14% 13%", ring: "190 36% 76%",
      primary: "190 42% 72%", primaryForeground: "200 30% 8%",
      work: "190 46% 64%", workSoft: "196 20% 13%", workForeground: "200 30% 8%",
      personal: "16 66% 66%", personalSoft: "16 22% 15%", personalForeground: "16 40% 8%",
      cool: "196 20% 66%", waiting: "40 62% 60%", waitingSoft: "40 22% 14%",
      urgent: "356 68% 68%", urgentSoft: "356 24% 16%", done: "160 28% 58%", doneSoft: "160 12% 13%",
      shadow: "0 0% 0%",
    },
  },
  {
    id: "monochrome",
    name: "Monochrome",
    mood: "Quase monocromática, muito clean",
    light: {
      background: "220 7% 96%", surface: "0 0% 100%", sidebar: "220 6% 90.5%",
      foreground: "220 10% 9%", muted: "220 6% 88%", mutedForeground: "220 5% 40%",
      border: "220 6% 83%", hover: "220 6% 92.5%", ring: "220 10% 14%",
      primary: "220 10% 14%", primaryForeground: "0 0% 100%",
      work: "220 12% 26%", workSoft: "220 8% 90%", workForeground: "0 0% 100%",
      personal: "220 4% 44%", personalSoft: "220 3% 94%", personalForeground: "0 0% 100%",
      cool: "220 6% 46%", waiting: "36 28% 36%", waitingSoft: "36 22% 91%",
      urgent: "8 46% 42%", urgentSoft: "8 34% 93%", done: "150 12% 34%", doneSoft: "150 8% 90%",
      shadow: "220 20% 8%",
    },
    dark: {
      background: "220 8% 6.5%", surface: "220 7% 9.5%", sidebar: "220 9% 4.5%",
      foreground: "220 8% 92%", muted: "220 5% 17%", mutedForeground: "220 5% 62%",
      border: "220 5% 19%", hover: "220 6% 13%", ring: "220 8% 84%",
      primary: "220 10% 88%", primaryForeground: "220 10% 8%",
      work: "220 14% 80%", workSoft: "220 6% 14%", workForeground: "220 10% 8%",
      personal: "220 5% 64%", personalSoft: "220 4% 12%", personalForeground: "220 10% 8%",
      cool: "220 8% 66%", waiting: "38 36% 62%", waitingSoft: "38 14% 14%",
      urgent: "8 52% 66%", urgentSoft: "8 20% 15%", done: "150 14% 62%", doneSoft: "150 8% 13%",
      shadow: "0 0% 0%",
    },
  },
];

export const DEFAULT_PALETTE = PALETTES[0].id;

export const isPaletteId = (id: string | null | undefined): id is string => PALETTES.some((p) => p.id === id);

/** Os cinco pontos do preview: fundo, sidebar, principal, trabalho e pessoal. */
export const previewColors = (t: PaletteTokens) => [t.background, t.sidebar, t.primary, t.work, t.personal];
