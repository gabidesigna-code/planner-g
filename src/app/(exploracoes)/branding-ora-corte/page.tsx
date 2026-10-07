"use client";

import { Fragment, type CSSProperties } from "react";
import { useTheme } from "@/theme/theme-provider";
import { DIRECTIONS_G, DIRECTION_FINAL, type Direction } from "../branding-ora/marks";
import { DirectionSection, Label } from "../branding-ora/mocks";

/**
 * PÁGINA TEMPORÁRIA: o CORTE como elemento de parentesco entre Ora e Ori.
 * Nada daqui é aplicado ao app. As outras explorações continuam disponíveis.
 */

const L = { bg: "#F6F5F0", ink: "#161A18" };
const K = { bg: "#111614", ink: "#E8EEE9" };

const COLS: { name: string; d: Direction; note: string }[] = [
  { name: "Final aprovado", d: DIRECTION_FINAL, note: "Ora com corte · Ori só anel + ponto" },
  { name: "G1 · mesmo corte com deslize", d: DIRECTIONS_G[0], note: "o corte da Ora também no anel da Ori" },
  { name: "G2 · corte sutil", d: DIRECTIONS_G[1], note: "entalhe por fora nos dois ícones" },
];

function Kinship({ dark }: { dark: boolean }) {
  const t = dark ? K : L;
  return (
    <div className="overflow-x-auto rounded-xl border border-border/70" style={{ background: t.bg, color: t.ink }}>
      <div className="grid min-w-[30rem] grid-cols-[5.5rem_repeat(3,minmax(0,1fr))] items-center gap-x-4 gap-y-6 px-5 py-5">
        <span />
        {COLS.map((c) => (
          <div key={c.name}>
            <p className="text-[0.74rem] font-semibold">{c.name}</p>
            <p className="text-[0.66rem] opacity-60">{c.note}</p>
          </div>
        ))}

        <span className="text-[0.68rem] opacity-60">ícones Ora · Ori (64)</span>
        {COLS.map(({ name, d }) => (
          <span key={name} className="flex items-center gap-3" style={{ ["--ora-accent" as string]: dark ? d.accent.dark : d.accent.light } as CSSProperties}>
            <d.OraIcon fg={t.bg} style={{ width: 64, height: 64 }} />
            <d.OriIcon fg={t.bg} style={{ width: 64, height: 64 }} />
          </span>
        ))}

        <span className="text-[0.68rem] opacity-60">32 · 24 · 16 px</span>
        {COLS.map(({ name, d }) => (
          <span key={name} className="flex items-end gap-2" style={{ ["--ora-accent" as string]: dark ? d.accent.dark : d.accent.light } as CSSProperties}>
            {[32, 24, 16].map((s) => <d.OraIcon key={`a${s}`} fg={t.bg} style={{ width: s, height: s }} />)}
            <span className="w-2" />
            {[32, 24, 16].map((s) => <d.OriIcon key={`i${s}`} fg={t.bg} style={{ width: s, height: s }} />)}
          </span>
        ))}

        <span className="text-[0.68rem] opacity-60">wordmark 44 · 22 · 16</span>
        {COLS.map(({ name, d }) => (
          <span key={name} className="flex flex-wrap items-end gap-x-4 gap-y-2" style={{ ["--ora-accent" as string]: dark ? d.accent.dark : d.accent.light } as CSSProperties}>
            {[44, 22, 16].map((h) => <d.Ora key={h} className="w-auto" style={{ height: h }} />)}
          </span>
        ))}

        <span className="text-[0.68rem] opacity-60">ori 44 · 22 · 16</span>
        {COLS.map(({ name, d }) => (
          <span key={name} className="flex flex-wrap items-end gap-x-4 gap-y-2" style={{ ["--ora-accent" as string]: dark ? d.accent.dark : d.accent.light } as CSSProperties}>
            {[44, 22, 16].map((h) => <Fragment key={h}><d.OriWord className="w-auto" style={{ height: h * 1.35 }} /></Fragment>)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function BrandingOraCortePage() {
  const { dark, toggleMode } = useTheme();
  return (
    <main className="mx-auto w-full max-w-[72rem] px-4 pb-32 pt-8 sm:px-8">
      <header className="flex flex-wrap items-start gap-4">
        <div className="max-w-2xl">
          <p className="label-mono">Página temporária · rebranding · o corte como parentesco</p>
          <h1 className="mt-1 text-[2.4rem] font-bold leading-none tracking-[-0.05em]">Ora + Ori · o mesmo corte</h1>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">
            O anel <b className="text-foreground">não</b> vai para a Ora. O corte vira a <b className="text-foreground">única medida compartilhada</b>:
            mesma altura (meia altura-x) e mesma abertura (7 un.) em todas as peças. A base híbrida aprovada não muda: a Ora segue sendo o wordmark D2-A e o “a” cortado.
          </p>
          <p className="mt-3 rounded-lg bg-hover px-3.5 py-2.5 text-[0.84rem] leading-relaxed">
            <b>Como interpretei o pedido:</b> a Ora já tinha corte (o entalhe no “o” e o corte no “a”). O que faltava era o ícone da Ori, que era só anel + ponto.
            Então o parentesco agora é o <b>mesmo corte, com a mesma medida, nas duas</b>, e a Ori mantém o anel e o ponto de cor como personalidade própria.
            Se você quis dizer outra coisa, é só me dizer.
          </p>
        </div>
        <button onClick={toggleMode} className="ml-auto rounded-full bg-hover px-4 py-2 text-[0.82rem] transition-colors hover:bg-muted">
          Tema: {dark ? "escuro" : "claro"} · alternar
        </button>
      </header>

      <nav className="mt-6 flex flex-wrap gap-2 text-[0.82rem]">
        <a href="#comparar" className="rounded-full bg-hover px-3.5 py-1.5 hover:bg-muted">Comparação</a>
        {DIRECTIONS_G.map((d) => <a key={d.id} href={`#dir-${d.id}`} className="rounded-full bg-hover px-3.5 py-1.5 hover:bg-muted">{d.title}</a>)}
      </nav>

      <section id="comparar" className="mt-8">
        <Label n={1}>Parentesco entre Ora e Ori · tamanhos reais</Label>
        <div className="grid gap-3 xl:grid-cols-2"><Kinship dark={false} /><Kinship dark /></div>
      </section>

      {DIRECTIONS_G.map((d) => (
        <div key={d.id} id={`dir-${d.id}`}><DirectionSection d={d} dark={dark} /></div>
      ))}
    </main>
  );
}
