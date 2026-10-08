import { useId, type CSSProperties, type ReactNode } from "react";
import { A_STROKE, MONO_NOTCH_DEPTH, MONO_R, MONO_STEM_X, MONO_STROKE, WORD_STROKE } from "./geometry";

/**
 * Marca "ora" (o app) e "ori" (a assistente): sistema final G2.
 *
 * Tudo é geométrico, desenhado em traços sobre uma grade de altura-x = 60 (linha de base em y = 0),
 * então não depende de fonte. O parentesco entre as duas marcas é UM corte horizontal à meia altura-x,
 * com a mesma abertura (7 un.) em todas as peças: um entalhe por fora no "o" dos wordmarks e nos ícones.
 * Wordmarks e símbolos usam `currentColor`; só o ponto da ori usa a cor `--ori` (ultramar).
 *
 * A marca anterior ("gabi") está arquivada em /brand-archive/gabi e NÃO deve ser usada aqui.
 */

/** Cores opcionais: sem elas, a marca usa a cor do texto e os tokens do tema. */
interface Colors {
  /** tinta do wordmark / símbolo (ou cor do quadrado, quando `tile`) */
  ink?: string;
  /** cor do símbolo sobre o quadrado (`tile`) */
  bg?: string;
  /** cor do ponto da ori */
  accent?: string;
}

interface MarkProps extends Colors {
  className?: string;
  style?: CSSProperties;
  title?: string;
}

interface IconProps extends MarkProps {
  /** true = quadrado arredondado (app icon, avatar, favicon); false = só o símbolo */
  tile?: boolean;
}

const ORI = "hsl(var(--ori))";
const BG = "hsl(var(--background))";

const stroke = (w: number) => ({ fill: "none", stroke: "currentColor", strokeWidth: w, strokeLinecap: "butt" as const });
const safeId = (raw: string) => raw.replace(/[^a-zA-Z0-9_-]/g, "");

/** Remove um entalhe horizontal (`gap` un.) da parede direita (ou esquerda) do anel; `depth` = quanto da parede, a partir de fora. */
function Notch({ children, cx, rx, wall, gap, depth, side }: { children: ReactNode; cx: number; rx: number; wall: number; gap: number; depth: number; side: "r" | "l" }) {
  const id = safeId(useId());
  const x1 = side === "r" ? cx + rx + wall / 2 - depth : cx - rx - 20;
  const x2 = side === "r" ? cx + rx + 20 : cx - rx - wall / 2 + depth;
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

/* ----------------------------------------------------------------------------- wordmarks */

/** Medidas do wordmark (altura-x 60): traço 12 no "o" e no "r", 9,5 no "a"; elipses largas, "a" de um andar. */
const W = WORD_STROKE;
const WA = A_STROKE; // o "a" é mais leve que o "o" e o "r" (ver geometry.ts)
const CUT = 7; // abertura única do corte
const G = (() => {
  const ro = 33;
  const rx = ro - W / 2;
  const ry = 30 - W / 2;
  const top = -(60 - W / 2);
  const stem = 2 * ro + 9 + W / 2;
  const armEnd = stem + 22;
  const aCx = armEnd + 14 + ro;
  return { ro, rx, ry, top, oCx: ro, stem, armEnd, aCx, aRx: ro - WA / 2, aRy: 30 - WA / 2, aStem: aCx + ro - WA / 2, iStem: armEnd + 13 + W / 2, armY: top + 20 };
})();

const OShape = () => (
  <Notch cx={G.oCx} rx={G.rx} wall={W} gap={CUT} depth={8} side="r">
    <ellipse cx={G.oCx} cy={-30} rx={G.rx} ry={G.ry} />
  </Notch>
);
const RShape = () => (
  <>
    <path d={`M${G.stem} 0V-60`} />
    <path d={`M${G.stem} ${G.armY}A22 20 0 0 1 ${G.armEnd} ${G.top}`} />
  </>
);

/** ora */
export function Wordmark({ className, style, title = "ora", ink }: MarkProps) {
  return (
    <svg viewBox={`-1 -62 ${G.aCx + G.ro + 3} 64`} role="img" aria-label={title} className={className} style={{ ...(ink ? { color: ink } : null), ...style }}>
      <g {...stroke(W)}>
        <OShape />
        <RShape />
      </g>
      <g {...stroke(WA)}>
        <ellipse cx={G.aCx} cy={-30} rx={G.aRx} ry={G.aRy} />
        <path d={`M${G.aStem} 0V-60`} />
      </g>
    </svg>
  );
}

/** ori: mesmas letras e o mesmo entalhe; o ponto do "i" é a cor da assistente */
export function OriWordmark({ className, style, title = "ori", ink, accent = ORI }: MarkProps) {
  return (
    <svg viewBox={`0 -92 ${G.iStem + W / 2 + 2} 94`} role="img" aria-label={title} className={className} style={{ ...(ink ? { color: ink } : null), ...style }}>
      <g {...stroke(W)}>
        <OShape />
        <RShape />
        <path d={`M${G.iStem} 0V-60`} />
      </g>
      <circle cx={G.iStem} cy={-79} r={W * 0.72} fill={accent} />
    </svg>
  );
}

/* ----------------------------------------------------------------------------- símbolos */

/** Quadrado arredondado opcional; o símbolo fica na cor `bg` sobre o quadrado. */
function Frame({ tile, ink, bg, children }: { tile?: boolean; ink?: string; bg?: string; children: ReactNode }) {
  return (
    <>
      {tile && <rect width={100} height={100} rx={22} fill={ink ?? "currentColor"} />}
      <g style={{ color: tile ? (bg ?? BG) : undefined }}>{children}</g>
    </>
  );
}

/** Ícone da ora: o "a" de um andar (traço 12,5) com o entalhe por fora, na parede esquerda do bojo. */
export function Monogram({ className, style, title = "ora", tile, ink, bg }: IconProps) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={title} className={className} style={{ ...(!tile && ink ? { color: ink } : null), ...style }}>
      <Frame tile={tile} ink={ink} bg={bg}>
        <g transform="translate(50 50) scale(.82) translate(-30 30)" {...stroke(MONO_STROKE)}>
          <Notch cx={30} rx={MONO_R} wall={MONO_STROKE} gap={CUT} depth={MONO_NOTCH_DEPTH} side="l"><circle cx={30} cy={-30} r={MONO_R} /></Notch>
          <path d={`M${MONO_STEM_X} 0V-60`} />
        </g>
      </Frame>
    </svg>
  );
}

/** Ícone da ori: o anel com o mesmo entalhe (na parede direita) e o ponto de cor no canto. */
export function OriMonogram({ className, style, title = "ori", tile, crop, ink, bg, accent = ORI }: IconProps & { crop?: boolean }) {
  if (crop && !tile) {
    // só o símbolo, sem a margem do quadrado: para ícones de navegação
    return (
      <svg viewBox="-1 -76 86 77" role="img" aria-label={title} className={className} style={{ ...(ink ? { color: ink } : null), ...style }}>
        <g {...stroke(16)}>
          <Notch cx={30} rx={22} wall={16} gap={CUT} depth={9} side="r"><circle cx={30} cy={-30} r={22} /></Notch>
        </g>
        <circle cx={73} cy={-64} r={11} fill={accent} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={title} className={className} style={{ ...(!tile && ink ? { color: ink } : null), ...style }}>
      <Frame tile={tile} ink={ink} bg={bg}>
        <g transform="translate(50 50) scale(.66) translate(-42 38)">
          <g {...stroke(16)}>
            <Notch cx={30} rx={22} wall={16} gap={CUT} depth={9} side="r"><circle cx={30} cy={-30} r={22} /></Notch>
          </g>
          <circle cx={73} cy={-64} r={11} fill={accent} />
        </g>
      </Frame>
    </svg>
  );
}
