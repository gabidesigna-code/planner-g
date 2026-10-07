import { useId, type CSSProperties, type ReactNode } from "react";

/**
 * PÁGINA TEMPORÁRIA de exploração de marca (nada daqui é usado pelo app).
 * Todas as letras são GEOMÉTRICAS, construídas à mão em SVG (traços sobre uma grade de altura-x = 60),
 * então não dependem de fonte nem reaproveitam nada da marca "gabi" arquivada.
 *
 * Convenções: linha de base em y = 0, altura-x de y = -60 a 0. A tinta é `currentColor`;
 * o destaque vem da variável CSS `--ora-accent` (a cor da Ori).
 */

export type Dir = "A" | "B" | "C" | "D" | "D2A" | "D2B" | "D2C" | "F" | "G1" | "G2";

interface WM {
  className?: string;
  style?: CSSProperties;
  /** só a "ori": cor de destaque (padrão: var(--ora-accent)) */
  accent?: string;
}

const ACC = "var(--ora-accent)";
export const stroke = (w: number) => ({ fill: "none", stroke: "currentColor", strokeWidth: w, strokeLinecap: "butt" as const });

/* =============================================================== A · MINIMAL
   Letras largas (elipses), traço médio, terminais retos. "a" de um andar = anel + haste.
   Personalidade: proporção larga e compacta; o "r" aninha sobre o "a". */

const A_W = 12;
/** o: elipse larga */
const aO = (cx: number) => <ellipse cx={cx} cy={-30} rx={30} ry={24} />;
/** r: haste + ombro em quarto de elipse */
const aR = (x: number) => (
  <>
    <path d={`M${x} 0V-60`} />
    <path d={`M${x} -34A22 20 0 0 1 ${x + 22} -54`} />
  </>
);
const aA = (cx: number) => (
  <>
    <ellipse cx={cx} cy={-30} rx={30} ry={24} />
    <path d={`M${cx + 30} 0V-60`} />
  </>
);

export function WordA_Ora({ style, className }: WM) {
  return (
    <svg viewBox="0 -62 194 64" role="img" aria-label="ora" className={className} style={style}>
      <g {...stroke(A_W)}>{aO(36)}{aR(86)}{aA(158)}</g>
    </svg>
  );
}

export function WordA_Ori({ style, className, accent = ACC }: WM) {
  return (
    <svg viewBox="0 -92 136 94" role="img" aria-label="ori" className={className} style={style}>
      <g {...stroke(A_W)}>{aO(36)}{aR(86)}<path d="M128 0V-60" /></g>
      <circle cx={128} cy={-79} r={8.5} fill={accent} />
    </svg>
  );
}

/* =============================================================== B · EDITORIAL TECH
   Peso alto, círculos densos e UM corte horizontal que atravessa todas as letras:
   a metade de cima desliza para a direita (um "instante" deslocado). */

const B_W = 18;
const B_SHIFT = 7;
const B_CUT_Y = -30;
const B_GAP = 5;

function Cut({ children, topColor, h = 60 }: { children: ReactNode; topColor?: string; h?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <>
      <defs>
        <clipPath id={`${id}t`}><rect x={-40} y={-200} width={500} height={200 + B_CUT_Y - B_GAP / 2} /></clipPath>
        <clipPath id={`${id}b`}><rect x={-40} y={B_CUT_Y + B_GAP / 2} width={500} height={h + 40} /></clipPath>
      </defs>
      <g clipPath={`url(#${id}t)`}>
        <g transform={`translate(${B_SHIFT} 0)`} style={topColor ? { color: topColor } : undefined}>{children}</g>
      </g>
      <g clipPath={`url(#${id}b)`}>{children}</g>
    </>
  );
}

const bO = (cx: number) => <circle cx={cx} cy={-30} r={21} />;
const bR = (x: number) => (
  <>
    <path d={`M${x} 0V-60`} />
    <path d={`M${x} -27A24 24 0 0 1 ${x + 24} -51`} />
  </>
);
const bA = (cx: number) => (
  <>
    <circle cx={cx} cy={-30} r={21} />
    <path d={`M${cx + 21} 0V-60`} />
  </>
);

export function WordB_Ora({ style, className }: WM) {
  return (
    <svg viewBox="0 -62 184 64" role="img" aria-label="ora" className={className} style={style}>
      <g {...stroke(B_W)}>
        <Cut>{bO(30)}{bR(79)}{bA(145)}</Cut>
      </g>
    </svg>
  );
}

export function WordB_Ori({ style, className, accent = ACC }: WM) {
  return (
    <svg viewBox="0 -90 146 92" role="img" aria-label="ori" className={className} style={style}>
      <g {...stroke(B_W)}>
        <Cut topColor={accent}>
          {bO(30)}{bR(79)}
          <path d="M124 0V-60" />
          <rect x={115} y={-86} width={18} height={18} fill={accent} stroke="none" />
        </Cut>
      </g>
    </svg>
  );
}

/* =============================================================== C · EXPERIMENTAL CONTROLADA
   Letras ligadas num traço só: o "o" toca a haste do "r" e o ombro do "r" corre até o bojo do "a". */

const C_W = 13;
const C_R = 23.5;

export function WordC_Ora({ style, className }: WM) {
  return (
    <svg viewBox="0 -62 152 64" role="img" aria-label="ora" className={className} style={style}>
      <g {...stroke(C_W)} strokeLinejoin="round">
        <circle cx={30} cy={-30} r={C_R} />
        <path d="M66.5 0V-60" />
        <path d={`M66.5 -30A${C_R} ${C_R} 0 0 1 90 -53.5H120`} />
        <circle cx={120} cy={-30} r={C_R} />
        <path d="M143.5 0V-60" />
      </g>
    </svg>
  );
}

export function WordC_Ori({ style, className, accent = ACC }: WM) {
  return (
    <svg viewBox="0 -92 118 94" role="img" aria-label="ori" className={className} style={style}>
      <g {...stroke(C_W)}>
        <circle cx={30} cy={-30} r={C_R} />
        <path d="M66.5 0V-60" />
        <path d={`M66.5 -30A${C_R} ${C_R} 0 0 1 90 -53.5`} />
        <path d="M110 0V-60" />
      </g>
      <circle cx={110} cy={-79} r={9} fill={accent} />
    </svg>
  );
}

/* =============================================================== ÍCONES (viewBox 100) */

interface IC {
  className?: string;
  style?: CSSProperties;
  /** true = quadrado arredondado (ícone de app/favicon); false = só o símbolo */
  tile?: boolean;
  accent?: string;
  /** cor do símbolo quando em tile (padrão: o fundo do tema) */
  fg?: string;
}

function Tile({ tile, fg, children }: { tile?: boolean; fg: string; children: ReactNode }) {
  return (
    <>
      {tile && <rect width={100} height={100} rx={22} fill="currentColor" />}
      <g style={{ color: tile ? fg : undefined }}>{children}</g>
    </>
  );
}

const FG = "hsl(var(--background))";

/** A · Ora: "a" de um andar (anel + haste) — o "o" e o "r" juntos num só gesto */
export function IconA_Ora({ style, className, tile = true, fg = FG }: IC) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="ora" className={className} style={style}>
      <Tile tile={tile} fg={fg}>
        <g transform="translate(50 50) scale(.76) translate(-36 30)" {...stroke(A_W)}>
          {aA(36)}
        </g>
      </Tile>
    </svg>
  );
}
/** A · Ori: o anel sem haste, com o ponto do "i" dentro (a presença) */
export function IconA_Ori({ style, className, tile = true, fg = FG, accent = ACC }: IC) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="ori" className={className} style={style}>
      <Tile tile={tile} fg={fg}>
        <g transform="translate(50 50) scale(.62) translate(-43 36)">
          <g {...stroke(A_W)}><ellipse cx={36} cy={-30} rx={30} ry={24} /></g>
          <circle cx={76} cy={-62} r={9.5} fill={accent} />
        </g>
      </Tile>
    </svg>
  );
}

/** B · Ora: anel denso cortado, metade de cima deslocada */
export function IconB_Ora({ style, className, tile = true, fg = FG }: IC) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="ora" className={className} style={style}>
      <Tile tile={tile} fg={fg}>
        <g transform="translate(46.5 50) scale(.78) translate(-30 30)" {...stroke(B_W)}>
          <Cut>{bO(30)}</Cut>
        </g>
      </Tile>
    </svg>
  );
}
/** B · Ori: o mesmo anel cortado, com a metade de cima na cor da Ori */
export function IconB_Ori({ style, className, tile = true, fg = FG, accent = ACC }: IC) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="ori" className={className} style={style}>
      <Tile tile={tile} fg={fg}>
        <g transform="translate(46.5 50) scale(.78) translate(-30 30)" {...stroke(B_W)}>
          <Cut topColor={accent}>{bO(30)}</Cut>
        </g>
      </Tile>
    </svg>
  );
}

/** C · Ora: o "o" tocando a haste do "r", com o ombro (as duas primeiras letras da ligação) */
export function IconC_Ora({ style, className, tile = true, fg = FG }: IC) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="ora" className={className} style={style}>
      <Tile tile={tile} fg={fg}>
        <g transform="translate(50 50) scale(.64) translate(-45 30)" {...stroke(C_W)}>
          <circle cx={30} cy={-30} r={C_R} />
          <path d="M66.5 0V-60" />
          <path d={`M66.5 -30A${C_R} ${C_R} 0 0 1 90 -53.5`} />
        </g>
      </Tile>
    </svg>
  );
}
/** C · Ori: o mesmo anel tocando a haste, mas o ombro vira o ponto do "i" na cor da Ori */
export function IconC_Ori({ style, className, tile = true, fg = FG, accent = ACC }: IC) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="ori" className={className} style={style}>
      <Tile tile={tile} fg={fg}>
        <g transform="translate(50 50) scale(.56) translate(-36.5 44)">
          <g {...stroke(C_W)}>
            <circle cx={30} cy={-30} r={C_R} />
            <path d="M66.5 0V-60" />
          </g>
          <circle cx={66.5} cy={-80} r={9.5} fill={accent} />
        </g>
      </Tile>
    </svg>
  );
}

/* =============================================================== registro */

export interface Direction {
  id: Dir;
  title: string;
  name: string;
  tagline: string;
  idea: string[];
  ori: string;
  /** cor da Ori (claro/escuro) — proposta, não definitiva */
  accent: { light: string; dark: string; name: string };
  Ora: (p: WM) => ReactNode;
  OriWord: (p: WM) => ReactNode;
  OraIcon: (p: IC) => ReactNode;
  OriIcon: (p: IC) => ReactNode;
  /** altura do wordmark nos mocks (px) */
  sidebarH: number;
}

export const DIRECTIONS: Direction[] = [
  {
    id: "A",
    title: "A · ORA MINIMAL",
    name: "Minimal",
    tagline: "Larga, calma, premium.",
    idea: [
      "Letras largas (elipses) com traço médio e terminais retos: o peso fica na proporção, não no enfeite.",
      "O ombro do “r” aninha por cima do “a”; o “a” é de um andar (anel + haste), a mesma forma do ícone.",
      "Sem cor no wordmark da Ora: a cor aparece só na Ori.",
    ],
    ori: "Ori = o anel da Ora sem a haste, com o ponto do “i” saltando no canto. A Ora tem haste (estrutura, rotina); a Ori tem ponto (presença).",
    accent: { light: "#D4502B", dark: "#FF8760", name: "brasa" },
    Ora: WordA_Ora, OriWord: WordA_Ori, OraIcon: IconA_Ora, OriIcon: IconA_Ori, sidebarH: 22,
  },
  {
    id: "B",
    title: "B · ORA EDITORIAL TECH",
    name: "Editorial tech",
    tagline: "Densa, cortada, com energia.",
    idea: [
      "Peso alto e círculos fechados. A intervenção é um corte horizontal único que atravessa todas as letras.",
      "A metade de cima desliza para a direita: um instante deslocado, como um quadro de relógio que pulou. Sem desenhar relógio.",
      "Continua legível: o corte tem a mesma altura em todas as letras e o “a” segue de um andar.",
    ],
    ori: "Ori = o mesmo corte, mas com a metade de cima na cor da Ori. O ponto do “i” é um quadrado, pertencente à mesma gramática.",
    accent: { light: "#2F44FF", dark: "#9AA6FF", name: "ultramar" },
    Ora: WordB_Ora, OriWord: WordB_Ori, OraIcon: IconB_Ora, OriIcon: IconB_Ori, sidebarH: 22,
  },
  {
    id: "C",
    title: "C · ORA EXPERIMENTAL CONTROLADA",
    name: "Experimental controlada",
    tagline: "Ligada num traço só.",
    idea: [
      "Traço contínuo e fino: o “o” encosta na haste do “r” e o ombro do “r” corre até o bojo do “a”.",
      "As três letras viram uma única forma; no tamanho pequeno ela ainda se lê porque as contraformas são grandes.",
      "O símbolo vem das letras: as duas primeiras da ligação, o “o” encostado na haste do “r” com o ombro.",
    ],
    ori: "Ori = o mesmo anel encostado na haste, mas o ombro do “r” vira o ponto do “i”, na cor da Ori. Mesmo esqueleto, outra letra.",
    accent: { light: "#0F8F6A", dark: "#5FE0B4", name: "verde-água" },
    Ora: WordC_Ora, OriWord: WordC_Ori, OraIcon: IconC_Ora, OriIcon: IconC_Ori, sidebarH: 22,
  },
];

/* =============================================================== D · HÍBRIDA
   Uma única regra, com a contribuição das três:
   - de A: elipses largas, traço médio (12), "a" de um andar, terminais retos;
   - de B: um corte horizontal, mas só nas formas redondas (o curvo desliza, o reto segura);
   - de C: ligação: a metade de cima do "o" encosta na haste do "r" e o ombro do "r" corre até o "a",
     formando uma linha contínua no alto; as metades de baixo escorregam 8 un. para trás. */

export const D_W = 12;
const D_CUT = -30;
const D_GAP = 6;
export const D_SLIP = -9;

/** Desenha `children` partido em duas metades: a de cima fica; a de baixo desliza para trás. */
export function Slip({ children }: { children: ReactNode }) {
  const id = useId().replace(/:/g, "");
  return (
    <>
      <defs>
        <clipPath id={`${id}t`}><rect x={-60} y={-200} width={600} height={200 + D_CUT - D_GAP / 2} /></clipPath>
        <clipPath id={`${id}b`}><rect x={-60} y={D_CUT + D_GAP / 2} width={600} height={140} /></clipPath>
      </defs>
      <g clipPath={`url(#${id}t)`}>{children}</g>
      <g clipPath={`url(#${id}b)`}><g transform={`translate(${D_SLIP} 0)`}>{children}</g></g>
    </>
  );
}

/** As partes que compõem "or": o anel que desliza + haste e ombro do "r" */
export const dBowl = (cx: number) => <ellipse cx={cx} cy={-30} rx={27} ry={24} />;

export function WordD_Ora({ style, className }: WM) {
  return (
    <svg viewBox="-9 -62 170 64" role="img" aria-label="ora" className={className} style={style}>
      <g {...stroke(D_W)}>
        <Slip>{dBowl(33)}</Slip>
        <path d="M72 0V-60" />
        <path d="M72 -34A22 20 0 0 1 94 -54H126" />
        <Slip>{dBowl(126)}</Slip>
        <path d="M153 0V-60" />
      </g>
    </svg>
  );
}

export function WordD_Ori({ style, className, accent = ACC }: WM) {
  return (
    <svg viewBox="-9 -92 140 94" role="img" aria-label="ori" className={className} style={style}>
      <g {...stroke(D_W)}>
        <Slip>{dBowl(33)}</Slip>
        <path d="M72 0V-60" />
        <path d="M72 -34A22 20 0 0 1 94 -54" />
        <path d="M115 0V-60" />
      </g>
      <circle cx={115} cy={-79} r={8.5} fill={accent} />
    </svg>
  );
}

/** Ora: anel que desliza + haste + ombro ("or" ligados). */
export function IconD_Ora({ style, className, tile = true, fg = FG }: IC) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="ora" className={className} style={style}>
      <Tile tile={tile} fg={fg}>
        <g transform="translate(50 50) scale(.64) translate(-38 30)" {...stroke(D_W)}>
          <Slip><circle cx={30} cy={-30} r={24} /></Slip>
          <path d="M66 0V-60" />
          <path d="M66 -34A19 20 0 0 1 85 -54" />
        </g>
      </Tile>
    </svg>
  );
}
/** Ori: o mesmo anel que desliza, sem haste, com o ponto do "i" (acento) saltando no canto. */
export function IconD_Ori({ style, className, tile = true, fg = FG, accent = ACC }: IC) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="ori" className={className} style={style}>
      <Tile tile={tile} fg={fg}>
        <g transform="translate(50 50) scale(.62) translate(-38 36)">
          <g {...stroke(D_W)}><Slip><circle cx={30} cy={-30} r={24} /></Slip></g>
          <circle cx={74} cy={-62} r={9.5} fill={accent} />
        </g>
      </Tile>
    </svg>
  );
}

export const DIRECTION_D: Direction = {
  id: "D",
  title: "D · ORA HÍBRIDA",
  name: "Híbrida",
  tagline: "Uma regra só: o curvo desliza, o reto segura.",
  idea: [
    "De A: letras largas, traço médio e o “a” de um andar. É o que garante a leitura em tamanho pequeno.",
    "De B: um corte horizontal (6 un.), aplicado só às formas redondas (“o” e bojo do “a”). As hastes ficam inteiras, então a palavra continua firme.",
    "De C: a ligação. No alto, o “o” encosta na haste do “r” e o ombro do “r” corre até o “a”, numa linha contínua. Embaixo, as metades redondas escorregam para trás: o presente ligado, o resto ficando para trás.",
  ],
  ori: "Ori = o mesmo anel que desliza, sem haste, com o ponto do “i” em ultramar saltando no canto. Mesma geometria e mesmo corte; muda só o detalhe (haste vs. ponto).",
  accent: { light: "#2F44FF", dark: "#9AA6FF", name: "ultramar" },
  Ora: WordD_Ora, OriWord: WordD_Ori, OraIcon: IconD_Ora, OriIcon: IconD_Ori, sidebarH: 22,
};

export const ALL_DIRECTIONS: Direction[] = [...DIRECTIONS, DIRECTION_D];

/* =============================================================== D2 · legibilidade primeiro
   Base = wordmark A (elipses largas, "a" de um andar, terminais retos). UM gesto autoral, em UMA parte:
   D2-A: uma fenda curta na parede direita do "o" (só o "o");
   D2-B: o corte horizontal com deslize, só no bojo do "a" (a haste fica inteira);
   D2-C: o ombro do "r" pousa no bojo do "a" (as letras seguem separadas). */

type D2 = "A" | "B" | "C";
const D2_CFG: Record<D2, { w: number; gapOR: number; gapRA: number; gapRI: number }> = {
  A: { w: 12, gapOR: 9, gapRA: 14, gapRI: 13 },
  B: { w: 14, gapOR: 8, gapRA: 12, gapRI: 12 },
  C: { w: 13, gapOR: 9, gapRA: -3, gapRI: 13 },
};

/** Tira uma fenda horizontal de `gap` un. na parede direita do anel (centro cx, semieixo rx). */
function RightSlit({ children, cx, rx, gap = 6, depth = 12, wall = 12 }: { children: ReactNode; cx: number; rx: number; gap?: number; depth?: number; wall?: number }) {
  const id = useId().replace(/:/g, "");
  const x1 = cx + rx + wall / 2 - depth;
  const x2 = cx + rx + 20;
  const y1 = -30 - gap / 2;
  const y2 = -30 + gap / 2;
  return (
    <>
      <defs>
        <clipPath id={id}>
          <path clipRule="evenodd" d={`M-100 -200H900V200H-100Z M${x1} ${y1}H${x2}V${y2}H${x1}Z`} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>{children}</g>
    </>
  );
}

/** Corte horizontal só no que for passado: a metade de baixo desliza `shift` un. */
function SlipOnly({ children, shift, gap }: { children: ReactNode; shift: number; gap: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <>
      <defs>
        <clipPath id={`${id}t`}><rect x={-60} y={-200} width={900} height={200 - 30 - gap / 2} /></clipPath>
        <clipPath id={`${id}b`}><rect x={-60} y={-30 + gap / 2} width={900} height={140} /></clipPath>
      </defs>
      <g clipPath={`url(#${id}t)`}>{children}</g>
      <g clipPath={`url(#${id}b)`}><g transform={`translate(${shift} 0)`}>{children}</g></g>
    </>
  );
}

function d2Geometry(v: D2) {
  const { w, gapOR, gapRA, gapRI } = D2_CFG[v];
  const ro = 33; // semieixo externo horizontal
  const rx = ro - w / 2;
  const ry = 30 - w / 2;
  const top = -(60 - w / 2);
  const oCx = ro;
  const stem = 2 * ro + gapOR + w / 2;
  const armEnd = stem + 22;
  const aCx = armEnd + gapRA + ro;
  const aStem = aCx + ro - w / 2;
  const iStem = armEnd + gapRI + w / 2;
  return { w, rx, ry, top, oCx, stem, armEnd, aCx, aStem, iStem, armStartY: top + 20 };
}

function D2Word({ v, ori, slit = 4, depth = 12, style, className, accent = ACC }: WM & { v: D2; ori?: boolean; slit?: number; depth?: number }) {
  const g = d2Geometry(v);
  const o = <ellipse cx={g.oCx} cy={-30} rx={g.rx} ry={g.ry} />;
  const rStem = <path d={`M${g.stem} 0V-60`} />;
  const rArm = (end: number) => <path d={`M${g.stem} ${g.armStartY}A22 20 0 0 1 ${g.stem + 22} ${g.top}${end > g.stem + 22 ? `H${end}` : ""}`} />;
  const oShape = v === "A" ? <RightSlit cx={g.oCx} rx={g.rx} gap={slit} depth={depth} wall={g.w}>{o}</RightSlit> : o;

  if (ori) {
    const width = g.iStem + g.w / 2;
    return (
      <svg viewBox={`0 -92 ${width + 2} 94`} role="img" aria-label="ori" className={className} style={style}>
        <g {...stroke(g.w)}>{oShape}{rStem}{rArm(0)}<path d={`M${g.iStem} 0V-60`} /></g>
        <circle cx={g.iStem} cy={-79} r={g.w * 0.72} fill={accent} />
      </svg>
    );
  }
  const bowl = <ellipse cx={g.aCx} cy={-30} rx={g.rx} ry={g.ry} />;
  const stemA = <path d={`M${g.aStem} 0V-60`} />;
  const link = v === "C" ? g.aCx - 20 : 0; // C: o ombro corre até pousar no bojo
  return (
    <svg viewBox={`-1 -62 ${g.aStem + g.w / 2 + 3} 64`} role="img" aria-label="ora" className={className} style={style}>
      <g {...stroke(g.w)}>
        {oShape}{rStem}{rArm(link)}
        {v === "B" ? <SlipOnly shift={-6} gap={5}>{bowl}</SlipOnly> : bowl}
        {stemA}
      </g>
    </svg>
  );
}

export const WordD2A_Ora = (p: WM) => <D2Word v="A" {...p} />;
export const WordD2A_Ori = (p: WM) => <D2Word v="A" ori {...p} />;
export const WordD2B_Ora = (p: WM) => <D2Word v="B" {...p} />;
export const WordD2B_Ori = (p: WM) => <D2Word v="B" ori {...p} />;
export const WordD2C_Ora = (p: WM) => <D2Word v="C" {...p} />;
export const WordD2C_Ori = (p: WM) => <D2Word v="C" ori {...p} />;

/* ---- ícones (simples e legíveis em 16 px) */

/** D2-A · Ora: anel com a fenda na parede direita */
export function IconD2A_Ora({ style, className, tile = true, fg = FG }: IC) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="ora" className={className} style={style}>
      <Tile tile={tile} fg={fg}>
        <g transform="translate(50 50) scale(.8) translate(-30 30)" {...stroke(12)}>
          <RightSlit cx={30} rx={24} gap={4.5}><circle cx={30} cy={-30} r={24} /></RightSlit>
        </g>
      </Tile>
    </svg>
  );
}
/** D2-A · Ori: o mesmo anel, com o ponto de cor encaixado na fenda */
export function IconD2A_Ori({ style, className, tile = true, fg = FG, accent = ACC }: IC) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="ori" className={className} style={style}>
      <Tile tile={tile} fg={fg}>
        <g transform="translate(50 50) scale(.8) translate(-30 30)">
          <g {...stroke(12)}><RightSlit cx={30} rx={24} gap={4.5}><circle cx={30} cy={-30} r={24} /></RightSlit></g>
          <circle cx={54} cy={-30} r={7} fill={accent} />
        </g>
      </Tile>
    </svg>
  );
}

/** D2-B · Ora: o "a" de um andar com o corte e o deslize no bojo */
export function IconD2B_Ora({ style, className, tile = true, fg = FG }: IC) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="ora" className={className} style={style}>
      <Tile tile={tile} fg={fg}>
        <g transform="translate(50 50) scale(.8) translate(-27 30)" {...stroke(14)}>
          <SlipOnly shift={-6} gap={5}><circle cx={30} cy={-30} r={23} /></SlipOnly>
          <path d="M53 0V-60" />
        </g>
      </Tile>
    </svg>
  );
}
/** D2-B · Ori: o anel inteiro, com o ponto de cor saltando no canto */
export function IconD2B_Ori({ style, className, tile = true, fg = FG, accent = ACC }: IC) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="ori" className={className} style={style}>
      <Tile tile={tile} fg={fg}>
        <g transform="translate(50 50) scale(.66) translate(-42 36)">
          <g {...stroke(14)}><circle cx={30} cy={-30} r={23} /></g>
          <circle cx={74} cy={-62} r={10} fill={accent} />
        </g>
      </Tile>
    </svg>
  );
}

/** D2-C · Ora: "o" + "r" (anel, haste e o ombro que vai pousar no "a") */
export function IconD2C_Ora({ style, className, tile = true, fg = FG }: IC) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="ora" className={className} style={style}>
      <Tile tile={tile} fg={fg}>
        <g transform="translate(50 50) scale(.66) translate(-46 30)" {...stroke(13)}>
          <circle cx={30} cy={-30} r={23.5} />
          <path d="M73 0V-60" />
          <path d="M73 -33.5A20 20 0 0 1 93 -53.5" />
        </g>
      </Tile>
    </svg>
  );
}
/** D2-C · Ori: anel + haste do "i" com o ponto de cor */
export function IconD2C_Ori({ style, className, tile = true, fg = FG, accent = ACC }: IC) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="ori" className={className} style={style}>
      <Tile tile={tile} fg={fg}>
        <g transform="translate(50 50) scale(.54) translate(-40 44)">
          <g {...stroke(13)}><circle cx={30} cy={-30} r={23.5} /><path d="M73 0V-60" /></g>
          <circle cx={73} cy={-80} r={9.5} fill={accent} />
        </g>
      </Tile>
    </svg>
  );
}

const D2_ACCENT = { light: "#2F44FF", dark: "#9AA6FF", name: "ultramar" };

export const DIRECTIONS_D2: Direction[] = [
  {
    id: "D2A", title: "D2-A · MAIS LIMPA", name: "D2-A", tagline: "O “o” com uma pequena abertura. Nada mais.",
    idea: [
      "Base do wordmark A: letras largas, traço médio, “a” de um andar. O único gesto é uma fenda curta na parede direita do “o”.",
      "Não é um corte que atravessa a letra: o “o” continua sendo um anel inteiro para o olho, e a fenda só aparece quando há espaço.",
      "Ícone = o anel com a fenda. Simples, e a fenda ainda é visível em 16 px.",
    ],
    ori: "Ori = a mesma fenda no “o”; o ponto do “i” em ultramar é o único detalhe de cor. No ícone, o ponto de cor encaixa na fenda do anel.",
    accent: D2_ACCENT, Ora: WordD2A_Ora, OriWord: WordD2A_Ori, OraIcon: IconD2A_Ora, OriIcon: IconD2A_Ori, sidebarH: 22,
  },
  {
    id: "D2B", title: "D2-B · MAIS EDITORIAL", name: "D2-B", tagline: "Traço firme e o corte só no “a”.",
    idea: [
      "Traço mais firme (14) e letras justas. O corte horizontal com deslize da direção B fica restrito ao bojo do “a”; a haste do “a” é inteira.",
      "Como “o” e “r” não são tocados, a palavra se lê de imediato; o gesto fica no fim, como uma assinatura.",
      "Ícone = o “a” de um andar com o bojo cortado.",
    ],
    ori: "Ori = as mesmas proporções e o mesmo traço, sem corte, com o ponto do “i” em ultramar. No ícone, o anel inteiro com o ponto saltando no canto.",
    accent: D2_ACCENT, Ora: WordD2B_Ora, OriWord: WordD2B_Ori, OraIcon: IconD2B_Ora, OriIcon: IconD2B_Ori, sidebarH: 22,
  },
  {
    id: "D2C", title: "D2-C · MAIS AUTORAL", name: "D2-C", tagline: "O ombro do “r” pousa no “a”.",
    idea: [
      "Um único gesto da direção C: o ombro do “r” corre até pousar no bojo do “a”. As três letras seguem separadas e legíveis.",
      "O “o” e o “a” ficam intactos, então o gesto lê como uma ligação, não como uma distorção.",
      "Ícone = “o” + “r” com o ombro estendido.",
    ],
    ori: "Ori = o mesmo “o” e “r”, com o “i” e seu ponto de cor no lugar do “a”. No ícone, anel + haste do “i” com o ponto.",
    accent: D2_ACCENT, Ora: WordD2C_Ora, OriWord: WordD2C_Ori, OraIcon: IconD2C_Ora, OriIcon: IconD2C_Ori, sidebarH: 22,
  },
];

/* =============================================================== FINAL (híbrido D2-A + D2-B)
   Wordmark = D2-A (o "o" com a fenda), reforçada: 6,5 un. de abertura (antes 4) e agora um ENTALHE POR FORA
   (corta só 8 das 12 un. da parede), para o anel nunca abrir e o "o" nunca virar "c".
   Ícone/avatar = D2-B refeito para 16 px: traço 16, corte 7 e deslize 8 (antes 14, 5 e 6). */

export const WordF_Ora = (p: WM) => <D2Word v="A" slit={6.5} depth={8} {...p} />;
export const WordF_Ori = (p: WM) => <D2Word v="A" ori slit={6.5} depth={8} {...p} />;

/** Ora: o "a" de um andar com o bojo cortado (corte 7, deslize 8, traço 16) */
export function IconF_Ora({ style, className, tile = true, fg = FG }: IC) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="ora" className={className} style={style}>
      <Tile tile={tile} fg={fg}>
        <g transform="translate(50 50) scale(.82) translate(-26 30)" {...stroke(16)}>
          <SlipOnly shift={-8} gap={7}><circle cx={30} cy={-30} r={22} /></SlipOnly>
          <path d="M52 0V-60" />
        </g>
      </Tile>
    </svg>
  );
}
/** Ori: o mesmo traço (16), anel inteiro e o ponto de cor saltando no canto */
export function IconF_Ori({ style, className, tile = true, fg = FG, accent = ACC }: IC) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="ori" className={className} style={style}>
      <Tile tile={tile} fg={fg}>
        <g transform="translate(50 50) scale(.66) translate(-42 38)">
          <g {...stroke(16)}><circle cx={30} cy={-30} r={22} /></g>
          <circle cx={73} cy={-64} r={11} fill={accent} />
        </g>
      </Tile>
    </svg>
  );
}

export const DIRECTION_FINAL: Direction = {
  id: "F",
  title: "ORA · SISTEMA HÍBRIDO",
  name: "Híbrido",
  tagline: "Wordmark da D2-A + ícone da D2-B.",
  idea: [
    "Wordmark: letras largas e claras da D2-A, com o único gesto no “o”: um entalhe na parede direita do anel. Ficou mais firme (6,5 un.) e passou a cortar só por fora, então o anel continua fechado e o “o” não vira “c” em tamanho pequeno.",
    "Ícone, favicon e avatar: o “a” de um andar da D2-B com o bojo cortado e deslizado, redesenhado com traço mais grosso e corte maior para sobreviver a 16 px.",
    "Os dois gestos são da mesma família (um corte horizontal que desliza ou abre), mas cada um vive em uma parte só: a fenda no “o” do wordmark e o corte no “a” do ícone.",
  ],
  ori: "Ori = o wordmark com a mesma lógica (o “o” com a fenda, “r” e “i”, ponto do “i” em ultramar). O ícone da Ori é o anel inteiro no mesmo traço do ícone da Ora, com o ponto de cor saltando no canto.",
  accent: { light: "#2F44FF", dark: "#9AA6FF", name: "ultramar" },
  Ora: WordF_Ora, OriWord: WordF_Ori, OraIcon: IconF_Ora, OriIcon: IconF_Ori, sidebarH: 22,
};

/* =============================================================== G · O CORTE COMO PARENTESCO
   Mesma base híbrida aprovada (wordmark D2-A, ícone D2-B). O que muda: o CORTE passa a ser uma medida única,
   usada igual na Ora e na Ori (mesma altura de meia altura-x, mesma abertura de 7 un.).
   - G1: corte com deslize (o mesmo da Ora) também no anel da Ori;
   - G2: versão mais sutil, só entalhe por fora, nos dois ícones. */

const CUT = 7; // abertura única do corte (un. de altura-x 60)

/** Igual ao RightSlit, mas na parede ESQUERDA do anel. */
function LeftSlit({ children, cx, rx, gap = 6, depth = 12, wall = 12 }: { children: ReactNode; cx: number; rx: number; gap?: number; depth?: number; wall?: number }) {
  const id = useId().replace(/:/g, "");
  const x1 = cx - rx - 20;
  const x2 = cx - rx - wall / 2 + depth;
  const y1 = -30 - gap / 2;
  const y2 = -30 + gap / 2;
  return (
    <>
      <defs>
        <clipPath id={id}>
          <path clipRule="evenodd" d={`M-100 -200H900V200H-100Z M${x1} ${y1}H${x2}V${y2}H${x1}Z`} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>{children}</g>
    </>
  );
}

/** Wordmarks: o mesmo desenho aprovado, com a abertura do entalhe igual à do corte dos ícones (7). */
export const WordG_Ora = (p: WM) => <D2Word v="A" slit={CUT} depth={8} {...p} />;
export const WordG_Ori = (p: WM) => <D2Word v="A" ori slit={CUT} depth={8} {...p} />;

/* ---- G1 · o corte com deslize nos dois ícones */

/** Ora (igual ao final): o "a" com o bojo cortado e deslizado */
export const IconG1_Ora = IconF_Ora;
/** Ori: o anel com EXATAMENTE o mesmo corte e deslize da Ora, e o ponto de cor no canto */
export function IconG1_Ori({ style, className, tile = true, fg = FG, accent = ACC }: IC) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="ori" className={className} style={style}>
      <Tile tile={tile} fg={fg}>
        <g transform="translate(50 50) scale(.64) translate(-38 37.5)">
          <g {...stroke(16)}><SlipOnly shift={-8} gap={CUT}><circle cx={30} cy={-30} r={22} /></SlipOnly></g>
          <circle cx={74} cy={-65} r={11} fill={accent} />
        </g>
      </Tile>
    </svg>
  );
}

/* ---- G2 · o corte sutil (entalhe por fora) nos dois ícones */

/** Ora: o "a" de um andar com um entalhe por fora na parede esquerda do bojo */
export function IconG2_Ora({ style, className, tile = true, fg = FG }: IC) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="ora" className={className} style={style}>
      <Tile tile={tile} fg={fg}>
        <g transform="translate(50 50) scale(.82) translate(-30 30)" {...stroke(16)}>
          <LeftSlit cx={30} rx={22} gap={CUT} depth={9} wall={16}><circle cx={30} cy={-30} r={22} /></LeftSlit>
          <path d="M52 0V-60" />
        </g>
      </Tile>
    </svg>
  );
}
/** Ori: o anel com o mesmo entalhe, na parede direita, e o ponto de cor no canto */
export function IconG2_Ori({ style, className, tile = true, fg = FG, accent = ACC }: IC) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="ori" className={className} style={style}>
      <Tile tile={tile} fg={fg}>
        <g transform="translate(50 50) scale(.66) translate(-42 38)">
          <g {...stroke(16)}><RightSlit cx={30} rx={22} gap={CUT} depth={9} wall={16}><circle cx={30} cy={-30} r={22} /></RightSlit></g>
          <circle cx={73} cy={-64} r={11} fill={accent} />
        </g>
      </Tile>
    </svg>
  );
}

const G_ACCENT = { light: "#2F44FF", dark: "#9AA6FF", name: "ultramar" };

export const DIRECTIONS_G: Direction[] = [
  {
    id: "G1", title: "VARIAÇÃO 1 · O MESMO CORTE, COM DESLIZE", name: "G1", tagline: "O corte da Ora também na Ori.",
    idea: [
      "Base aprovada, sem mudar: wordmark D2-A e “a” cortado no ícone da Ora. O anel NÃO vai para a Ora.",
      "O corte vira uma medida única: abertura de 7 un., à meia altura, nos dois ícones. A Ori ganha, no anel, exatamente o mesmo corte e o mesmo deslize do “a” da Ora.",
      "No wordmark, o entalhe do “o” usa a mesma abertura (7), então Ora e Ori compartilham o gesto também nas letras.",
    ],
    ori: "Ori = anel com o corte da Ora + ponto de cor no canto. A personalidade da Ori fica no anel e no ponto; o corte é o que as une.",
    accent: G_ACCENT, Ora: WordG_Ora, OriWord: WordG_Ori, OraIcon: IconG1_Ora, OriIcon: IconG1_Ori, sidebarH: 22,
  },
  {
    id: "G2", title: "VARIAÇÃO 2 · O CORTE SUTIL", name: "G2", tagline: "Só um entalhe por fora, nos dois ícones.",
    idea: [
      "Mesma base. Aqui o corte é o entalhe discreto do wordmark (por fora, sem abrir o anel) levado aos dois ícones.",
      "Ora: o “a” com o entalhe na parede esquerda do bojo (a direita é a haste). Ori: o anel com o entalhe na parede direita, como no “o” do wordmark.",
      "É mais limpo e mais legível em 16 px, mas menos editorial: o deslize some e fica só a marca do corte.",
    ],
    ori: "Ori = anel com o entalhe + ponto de cor no canto. O mesmo entalhe do “o” do wordmark, só que agora também no ícone.",
    accent: G_ACCENT, Ora: WordG_Ora, OriWord: WordG_Ori, OraIcon: IconG2_Ora, OriIcon: IconG2_Ori, sidebarH: 22,
  },
];
