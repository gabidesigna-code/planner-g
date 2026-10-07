"use client";

import type { CSSProperties, ReactNode } from "react";
import { useTheme } from "@/theme/theme-provider";
import { ALL_DIRECTIONS, DIRECTIONS, DIRECTIONS_D2, type Direction } from "../branding-ora/marks";
import { DirectionSection } from "../branding-ora/mocks";

/**
 * PÁGINA TEMPORÁRIA: Direção D2 (legibilidade primeiro), três variações. Nada daqui é aplicado ao app.
 * Remover src/app/branding-ora-d2 (e branding-ora, branding-ora-d) quando a marca for definida.
 */

const L = { bg: "#F6F5F0", ink: "#161A18" };
const K = { bg: "#111614", ink: "#E8EEE9" };

/** Referência de legibilidade: A (a mais clara), a D anterior e as três D2 */
const A = DIRECTIONS.find((x) => x.id === "A")!;
const D_PREV = ALL_DIRECTIONS.find((x) => x.id === "D")!;
const CMP: { label: string; d: Direction }[] = [
  { label: "A (referência)", d: A },
  { label: "D (anterior)", d: D_PREV },
  ...DIRECTIONS_D2.map((d) => ({ label: d.name, d })),
];

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <span className="text-[0.68rem] leading-tight opacity-60">{label}</span>
      {children}
    </>
  );
}

function Compare({ dark }: { dark: boolean }) {
  const t = dark ? K : L;
  const acc = (d: Direction) => ({ ["--ora-accent" as string]: dark ? d.accent.dark : d.accent.light }) as CSSProperties;
  return (
    <div className="overflow-x-auto rounded-xl border border-border/70" style={{ background: t.bg, color: t.ink }}>
      <div className="grid min-w-[34rem] grid-cols-[5.5rem_repeat(5,minmax(0,1fr))] items-center gap-x-3 gap-y-5 px-5 py-5">
        <span />
        {CMP.map((c) => <span key={c.label} className="text-[0.7rem] font-semibold opacity-70">{c.label}</span>)}
        {[28, 18, 12].map((h) => (
          <Row key={h} label={`ora ${h}px`}>
            {CMP.map(({ label, d }) => { const W = d.Ora; return <span key={label} style={acc(d)}><W className="w-auto" style={{ height: h * 0.5 }} /></span>; })}
          </Row>
        ))}
        {[18, 12].map((h) => (
          <Row key={`o${h}`} label={`ori ${h}px`}>
            {CMP.map(({ label, d }) => { const W = d.OriWord; return <span key={label} style={acc(d)}><W className="w-auto" style={{ height: h }} /></span>; })}
          </Row>
        ))}
        <Row label="ícone ora 32·24·16">
          {CMP.map(({ label, d }) => {
            const I = d.OraIcon;
            return <span key={label} className="flex items-end gap-1.5" style={acc(d)}>{[32, 24, 16].map((s) => <I key={s} fg={t.bg} style={{ width: s, height: s }} />)}</span>;
          })}
        </Row>
        <Row label="ícone ori 32·24·16">
          {CMP.map(({ label, d }) => {
            const I = d.OriIcon;
            return <span key={label} className="flex items-end gap-1.5" style={acc(d)}>{[32, 24, 16].map((s) => <I key={s} fg={t.bg} style={{ width: s, height: s }} />)}</span>;
          })}
        </Row>
      </div>
    </div>
  );
}

export default function BrandingOraD2Page() {
  const { dark, toggleMode } = useTheme();
  return (
    <main className="mx-auto w-full max-w-[72rem] px-4 pb-32 pt-8 sm:px-8">
      <header className="flex flex-wrap items-start gap-4">
        <div className="max-w-2xl">
          <p className="label-mono">Página temporária · rebranding · direção D2</p>
          <h1 className="mt-1 text-[2.4rem] font-bold leading-none tracking-[-0.05em]">D2 · legibilidade primeiro</h1>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">
            Base no wordmark A (largo, claro). <b className="text-foreground">Um único gesto autoral, em uma única parte</b>, e nenhum corte atravessando letras:
            D2-A mexe só no “o”, D2-B só no “a”, D2-C só na ligação entre “r” e “a”. Nas três, a Ori usa a mesma geometria, e o ponto do “i” é o detalhe de cor.
          </p>
        </div>
        <button onClick={toggleMode} className="ml-auto rounded-full bg-hover px-4 py-2 text-[0.82rem] transition-colors hover:bg-muted">
          Tema: {dark ? "escuro" : "claro"} · alternar
        </button>
      </header>

      <nav className="mt-6 flex flex-wrap gap-2 text-[0.82rem]">
        <a href="#teste" className="rounded-full bg-hover px-3.5 py-1.5 hover:bg-muted">Teste de legibilidade</a>
        {DIRECTIONS_D2.map((d) => <a key={d.id} href={`#dir-${d.id}`} className="rounded-full bg-hover px-3.5 py-1.5 hover:bg-muted">{d.title}</a>)}
      </nav>

      <section id="teste" className="mt-10">
        <p className="label-mono mb-1">Teste de legibilidade · tamanhos reais</p>
        <p className="mb-3 text-[0.82rem] text-muted-foreground">A referência (A) e a D anterior ao lado das três D2. Os tamanhos são os reais de uso (wordmark de 14, 9 e 6 px de altura equivalem a ≈ 28, 18 e 12 px de largura de leitura da sidebar).</p>
        <div className="grid gap-3 xl:grid-cols-2">
          <Compare dark={false} />
          <Compare dark />
        </div>
      </section>

      {DIRECTIONS_D2.map((d) => (
        <div key={d.id} id={`dir-${d.id}`}><DirectionSection d={d} dark={dark} /></div>
      ))}
    </main>
  );
}
