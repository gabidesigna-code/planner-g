/**
 * Medidas do "a" da ora: fonte ÚNICA para o componente (logo.tsx) e para a exportação dos arquivos
 * (scripts/export-ora-assets.mjs). Mudou aqui, reexporte os arquivos.
 *
 * O "a" é mais leve que o "o" e o "r" de propósito (refinamento de 2026-10-08): o corpo e a haste do "a"
 * usam traço 9,5 no wordmark (o "o" e o "r" seguem em 12) e 12,5 no ícone (era 16). As medidas EXTERNAS
 * (largura, altura, posição da haste) não mudam: só o miolo abre.
 */

/** Wordmark: traço do "o" e do "r", e traço do "a". */
export const WORD_STROKE = 12;
export const A_STROKE = 9.5;

/** Ícone da ora: traço do "a" e quanto do entalhe entra na parede (56% do traço, como antes). */
export const MONO_STROKE = 12.5;
export const MONO_OUTER = 30; // raio externo do anel (não muda)
export const MONO_R = MONO_OUTER - MONO_STROKE / 2; // raio da linha central do anel
export const MONO_STEM_X = 2 * MONO_OUTER - MONO_STROKE / 2; // haste: a borda externa fica em x = 60
export const MONO_NOTCH_DEPTH = 7;
