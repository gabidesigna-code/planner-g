"use client";

import type { CSSProperties, ReactNode } from "react";
import { useTheme } from "@/theme/theme-provider";
import { DIRECTIONS_D2, DIRECTION_FINAL, IconD2B_Ora, IconD2B_Ori } from "../branding-ora/marks";
import { DirectionSection, Label, Panel } from "../branding-ora/mocks";

/**
 * PÁGINA TEMPORÁRIA: sistema híbrido final (wordmark D2-A + ícone D2-B). Nada daqui é aplicado ao app.
 * As outras explorações (branding-ora, -d, -d2) continuam disponíveis para comparação.
 */

const L = { bg: "#F6F5F0", ink: "#161A18" };
const K = { bg: "#111614", ink: "#E8EEE9" };
const d = DIRECTION_FINAL;
const D2A = DIRECTIONS_D2[0];

function Cell({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {children}
      <span className="text-[0.62rem] opacity-60">{label}</span>
    </div>
  );
}

/** Ícones em tamanho real: o D2-B de antes contra o final refeito para 16 px */
function IconTest({ dark }: { dark: boolean }) {
  const t = dark ? K : L;
  const acc = ({ ["--ora-accent" as string]: dark ? d.accent.dark : d.accent.light }) as CSSProperties;
  const rows: { name: string; Ora: typeof d.OraIcon; Ori: typeof d.OriIcon }[] = [
    { name: "D2-B (antes)", Ora: IconD2B_Ora, Ori: IconD2B_Ori },
    { name: "Final", Ora: d.OraIcon, Ori: d.OriIcon },
  ];
  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 px-5 py-4" style={{ background: t.bg, color: t.ink, ...acc }}>
      <div className="grid grid-cols-[6.5rem_1fr_1fr] items-end gap-x-6 gap-y-4">
        <span />
        <span className="text-[0.7rem] font-semibold opacity-70">Ora · 32 · 24 · 16 px</span>
        <span className="text-[0.7rem] font-semibold opacity-70">Ori · 32 · 24 · 16 px</span>
        {rows.map((r) => (
          <>
            <span key={r.name} className="text-[0.72rem] opacity-70">{r.name}</span>
            <span className="flex items-end gap-3">{[32, 24, 16].map((s) => <r.Ora key={s} fg={t.bg} style={{ width: s, height: s }} />)}</span>
            <span className="flex items-end gap-3">{[32, 24, 16].map((s) => <r.Ori key={s} fg={t.bg} style={{ width: s, height: s }} />)}</span>
          </>
        ))}
      </div>
    </div>
  );
}

/** Wordmark da D2-A de antes contra o final (fenda reforçada), em tamanho real */
function WordTest({ dark }: { dark: boolean }) {
  const t = dark ? K : L;
  const acc = ({ ["--ora-accent" as string]: dark ? d.accent.dark : d.accent.light }) as CSSProperties;
  const items = [
    { name: "D2-A (antes)", Ora: D2A.Ora, Ori: D2A.OriWord },
    { name: "Final", Ora: d.Ora, Ori: d.OriWord },
  ];
  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 px-5 py-4" style={{ background: t.bg, color: t.ink, ...acc }}>
      <div className="grid grid-cols-[6.5rem_1fr] items-center gap-x-6 gap-y-4">
        {items.map((it) => (
          <>
            <span key={it.name} className="text-[0.72rem] opacity-70">{it.name}</span>
            <span className="flex flex-wrap items-end gap-x-6 gap-y-2">
              {[44, 22, 16, 12].map((h) => <it.Ora key={h} className="w-auto" style={{ height: h }} />)}
              {[22, 16].map((h) => <it.Ori key={`i${h}`} className="w-auto" style={{ height: h * 1.4 }} />)}
              <span className="text-[0.62rem] opacity-60">ora 44 · 22 · 16 · 12 px · ori 31 · 22 px</span>
            </span>
          </>
        ))}
      </div>
    </div>
  );
}

export default function BrandingOraFinalPage() {
  const { dark, toggleMode } = useTheme();
  const Icon = d.OraIcon;
  const OriIcon = d.OriIcon;
  const accent = (isDark: boolean) => (isDark ? d.accent.dark : d.accent.light);

  return (
    <main className="mx-auto w-full max-w-[72rem] px-4 pb-32 pt-8 sm:px-8">
      <header className="flex flex-wrap items-start gap-4">
        <div className="max-w-2xl">
          <p className="label-mono">Página temporária · sistema final proposto</p>
          <h1 className="mt-1 text-[2.4rem] font-bold leading-none tracking-[-0.05em]">ora <span className="text-muted-foreground/60">+ ori</span> · híbrido</h1>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">
            Wordmark da <b className="text-foreground">D2-A</b> (o “o” com a fenda) e ícone, favicon e avatar da <b className="text-foreground">D2-B</b> (o “a” com o bojo cortado), com ajustes para unir os dois.
            Nada foi aplicado ao app.
          </p>
        </div>
        <button onClick={toggleMode} className="ml-auto rounded-full bg-hover px-4 py-2 text-[0.82rem] transition-colors hover:bg-muted">
          Tema: {dark ? "escuro" : "claro"} · alternar
        </button>
      </header>

      {/* o que veio de onde */}
      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-hover p-4 text-[0.86rem] leading-relaxed">
          <p className="label-mono mb-1.5">Veio da D2-A</p>
          Proporção e desenho das letras (elipses largas, traço 12, “a” de um andar), espaçamento, e o gesto: a fenda na parede direita do “o”, no “ora” e no “ori”.
        </div>
        <div className="rounded-xl bg-hover p-4 text-[0.86rem] leading-relaxed">
          <p className="label-mono mb-1.5">Veio da D2-B</p>
          O ícone: o “a” de um andar com o bojo cortado e deslizado, e o par da Ori (anel inteiro com o ponto de cor no canto).
        </div>
        <div className="rounded-xl bg-hover p-4 text-[0.86rem] leading-relaxed">
          <p className="label-mono mb-1.5">Ajustes para unir</p>
          Gesto do “o”: abertura 4 → 6,5 un., mas agora um entalhe só por fora (a fenda que atravessava fazia o “o” ler “c”) · ícone: traço 14 → 16, corte 5 → 7, deslize 6 → 8, símbolo maior no quadrado · ponto da Ori 10 → 11 un.
        </div>
      </section>

      {/* testes de tamanho */}
      <section className="mt-10">
        <Label n={1}>Wordmark: D2-A antes e final com o entalhe reforçado (tamanhos reais)</Label>
        <div className="grid gap-3 lg:grid-cols-2"><WordTest dark={false} /><WordTest dark /></div>
        <div className="mt-6" />
        <Label n={2}>Ícone: D2-B antes e final (32 · 24 · 16 px reais)</Label>
        <div className="grid gap-3 lg:grid-cols-2"><IconTest dark={false} /><IconTest dark /></div>
      </section>

      {/* avatar / app icon */}
      <section className="mt-10">
        <Label n={3}>Avatar e ícone do app</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {[L, K].map((p, i) => (
            <Panel key={p.bg} bg={p.bg} ink={p.ink} accent={accent(i === 1)} className="flex flex-wrap items-end justify-center gap-6 px-5 py-8">
              <Cell label="app 180"><Icon fg={p.bg} style={{ width: 96, height: 96 }} /></Cell>
              <Cell label="64"><Icon fg={p.bg} style={{ width: 64, height: 64 }} /></Cell>
              <Cell label="Ori 96"><OriIcon fg={p.bg} style={{ width: 96, height: 96 }} /></Cell>
              <Cell label="Ori 48 círculo">
                <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-full" style={{ background: p.ink }}>
                  <OriIcon tile={false} fg={p.bg} style={{ width: 34, height: 34, color: p.bg }} />
                </span>
              </Cell>
              <Cell label="Ori 32 círculo">
                <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full" style={{ background: p.ink }}>
                  <OriIcon tile={false} fg={p.bg} style={{ width: 23, height: 23, color: p.bg }} />
                </span>
              </Cell>
            </Panel>
          ))}
        </div>
      </section>

      <div id="dir-F"><DirectionSection d={d} dark={dark} /></div>
    </main>
  );
}
