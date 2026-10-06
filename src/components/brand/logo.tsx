/**
 * Marca "gabi": wordmark desenhado com círculos e hastes de traço uniforme. Cada letra nasce do
 * mesmo anel (o gesto dos checkboxes do app). O traço usa currentColor, então acompanha o tema;
 * o ponto do "i" fica na cor do contexto Pessoal. O monograma é o "g" com o mesmo ponto.
 */
const WORD = "M6.5 -25a18.5 18.5 0 1 0 37 0a18.5 18.5 0 1 0 -37 0M43.5 -50V4A16 16 0 0 1 27.5 20H19.5M68 -25a18.5 18.5 0 1 0 37 0a18.5 18.5 0 1 0 -37 0M105 -50V0M129.5 -25a18.5 18.5 0 1 0 37 0a18.5 18.5 0 1 0 -37 0M129.5 -88V0M191 -50V0";
const WORD_DOT = "M183.5 -66.5a7.5 7.5 0 1 0 15 0a7.5 7.5 0 1 0 -15 0Z";
const MONO = "M6.5 -25a18.5 18.5 0 1 0 37 0a18.5 18.5 0 1 0 -37 0M43.5 -50V4A16 16 0 0 1 27.5 20H19.5";
const MONO_DOT = "M17.2 -25a7.8 7.8 0 1 0 15.6 0a7.8 7.8 0 1 0 -15.6 0Z";

export function Wordmark({ className, title = "gabi" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="-1 -75 199.5 102.5" role="img" aria-label={title} className={className}>
      <path d={WORD} fill="none" stroke="currentColor" strokeWidth={13} strokeLinejoin="round" />
      <path d={WORD_DOT} className="fill-personal" />
    </svg>
  );
}

export function Monogram({ className, title = "gabi" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="-1 -51 52 78.5" role="img" aria-label={title} className={className}>
      <path d={MONO} fill="none" stroke="currentColor" strokeWidth={13} strokeLinejoin="round" />
      <path d={MONO_DOT} className="fill-personal" />
    </svg>
  );
}
