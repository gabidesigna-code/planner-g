"use client";

import type { CSSProperties } from "react";
import { useTheme } from "@/theme/theme-provider";
import { ALL_DIRECTIONS, D_SLIP, D_W, DIRECTION_D, Slip, dBowl, stroke } from "../branding-ora/marks";
import { BrowserTab, Label, OriApplication, OriChat, Panel, Phone, SidebarCollapsed, SidebarOpen } from "../branding-ora/mocks";

/**
 * PÁGINA TEMPORÁRIA: Direção D (híbrida) para "ora" e "ori". Nada daqui é aplicado ao app.
 * Remover src/app/branding-ora-d (e src/app/branding-ora) quando a marca for definida.
 */

// Ora em grafite / verde profundo; a Ori ganha o acento
const L = { bg: "#F6F5F0", ink: "#17221D" };
const K = { bg: "#111614", ink: "#E8EEE9" };

const d = DIRECTION_D;

/** Anatomia: mostra a regra de construção sobre o wordmark */
function Anatomy() {
  const guide = "hsl(var(--muted-foreground))";
  return (
    <svg viewBox="-24 -104 200 128" role="img" aria-label="Anatomia do wordmark ora" className="w-full max-w-[44rem] text-foreground">
      {/* altura-x e linha de base */}
      <g stroke={guide} strokeWidth={0.4} strokeDasharray="1.5 1.5" opacity={0.7}>
        <path d="M-24 -60H176M-24 0H176" />
      </g>
      <text x={-23} y={-62} fontSize={4.2} fill={guide} fontFamily="var(--font-mono)">altura-x</text>
      <text x={-23} y={5} fontSize={4.2} fill={guide} fontFamily="var(--font-mono)">base</text>

      {/* o wordmark */}
      <g {...stroke(D_W)}>
        <Slip>{dBowl(33)}</Slip>
        <path d="M72 0V-60" />
        <path d="M72 -34A22 20 0 0 1 94 -54H126" />
        <Slip>{dBowl(126)}</Slip>
        <path d="M153 0V-60" />
      </g>

      {/* o corte */}
      <path d="M-24 -30H176" stroke="var(--ora-accent)" strokeWidth={0.7} strokeDasharray="3 2" />
      <text x={120} y={-33.5} fontSize={4.6} fill="var(--ora-accent)" fontFamily="var(--font-mono)" textAnchor="end" transform="translate(54 0)">corte · 6 un.</text>

      {/* linha contínua no alto */}
      <path d="M0 -74H159" stroke="var(--ora-accent)" strokeWidth={0.8} />
      <path d="M0 -77V-71M159 -77V-71" stroke="var(--ora-accent)" strokeWidth={0.8} />
      <text x={80} y={-80} fontSize={4.8} fill="var(--ora-accent)" fontFamily="var(--font-mono)" textAnchor="middle">no alto: o · r · a ligados numa linha</text>

      {/* deslize das metades de baixo */}
      <g stroke="var(--ora-accent)" strokeWidth={0.8} fill="none">
        <path d={`M33 12H${33 + D_SLIP}`} />
        <path d={`M${33 + D_SLIP + 2.4} 9.8L${33 + D_SLIP} 12L${33 + D_SLIP + 2.4} 14.2`} />
        <path d={`M126 12H${126 + D_SLIP}`} />
        <path d={`M${126 + D_SLIP + 2.4} 9.8L${126 + D_SLIP} 12L${126 + D_SLIP + 2.4} 14.2`} />
      </g>
      <text x={80} y={19} fontSize={4.8} fill="var(--ora-accent)" fontFamily="var(--font-mono)" textAnchor="middle">embaixo: as metades redondas escorregam 9 un. para trás</text>

      {/* hastes inteiras */}
      <text x={73} y={-45} fontSize={0.01}>.</text>
    </svg>
  );
}

function Compare({ dark }: { dark: boolean }) {
  const bg = dark ? K.bg : L.bg;
  const ink = dark ? K.ink : L.ink;
  return (
    <div className="overflow-hidden rounded-xl border border-border/70" style={{ background: bg, color: ink }}>
      <div className="grid grid-cols-[3.5rem_repeat(4,minmax(0,1fr))] items-center gap-x-3 gap-y-5 px-4 py-5 sm:grid-cols-[5rem_repeat(4,minmax(0,1fr))] sm:px-6">
        <span />
        {ALL_DIRECTIONS.map((x) => (
          <span key={x.id} className="text-[0.72rem] font-semibold tracking-wide opacity-70">{x.id === "D" ? "D · híbrida" : x.id}</span>
        ))}
        {[
          { label: "wordmark 28px", h: 28 },
          { label: "wordmark 18px", h: 18 },
          { label: "wordmark 12px", h: 12 },
        ].map((r) => (
          <Row key={r.label} label={r.label}>
            {ALL_DIRECTIONS.map((x) => {
              const W = x.Ora;
              return <span key={x.id} style={{ ["--ora-accent" as string]: dark ? x.accent.dark : x.accent.light } as CSSProperties}><W className="w-auto" style={{ height: r.h * 0.5 }} /></span>;
            })}
          </Row>
        ))}
        <Row label="ori 18px">
          {ALL_DIRECTIONS.map((x) => {
            const W = x.OriWord;
            return <span key={x.id} style={{ ["--ora-accent" as string]: dark ? x.accent.dark : x.accent.light } as CSSProperties}><W className="w-auto" style={{ height: 18 }} /></span>;
          })}
        </Row>
        <Row label="ícones 32 · 24 · 16">
          {ALL_DIRECTIONS.map((x) => {
            const I = x.OraIcon;
            const O = x.OriIcon;
            return (
              <span key={x.id} className="flex items-end gap-1.5" style={{ ["--ora-accent" as string]: dark ? x.accent.dark : x.accent.light } as CSSProperties}>
                <I fg={bg} style={{ width: 32, height: 32 }} /><I fg={bg} style={{ width: 24, height: 24 }} /><I fg={bg} style={{ width: 16, height: 16 }} />
                <O fg={bg} style={{ width: 24, height: 24 }} />
              </span>
            );
          })}
        </Row>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <span className="text-[0.68rem] leading-tight opacity-60">{label}</span>
      {children}
    </>
  );
}

export default function BrandingOraDPage() {
  const { dark, toggleMode } = useTheme();
  const Ora = d.Ora;
  const Ori = d.OriWord;
  const OraIcon = d.OraIcon;
  const OriIcon = d.OriIcon;
  const accent = (isDark: boolean) => (isDark ? d.accent.dark : d.accent.light);

  return (
    <main className="mx-auto w-full max-w-[72rem] px-4 pb-32 pt-8 sm:px-8" style={{ ["--ora-accent" as string]: accent(dark) } as CSSProperties}>
      <header className="flex flex-wrap items-start gap-4">
        <div className="max-w-2xl">
          <p className="label-mono">Página temporária · rebranding · direção D</p>
          <h1 className="mt-1 text-[2.4rem] font-bold leading-none tracking-[-0.05em]">{d.title}</h1>
          <p className="mt-2 text-[1.05rem] text-muted-foreground">{d.tagline}</p>
          <ul className="mt-4 space-y-1.5 text-[0.9rem] leading-relaxed text-foreground/85">
            {d.idea.map((t) => <li key={t} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground/50" />{t}</li>)}
          </ul>
          <p className="mt-3 rounded-lg bg-hover px-3.5 py-2.5 text-[0.88rem]"><span className="font-semibold">Ori:</span> {d.ori}</p>
          <p className="mt-2 text-[0.78rem] text-muted-foreground">
            Cores por enquanto: Ora em grafite/verde profundo; acento da Ori em <b className="text-foreground">{d.accent.name}</b> ({d.accent.light} · {d.accent.dark}). A paleta definitiva vem depois.
          </p>
        </div>
        <button onClick={toggleMode} className="ml-auto rounded-full bg-hover px-4 py-2 text-[0.82rem] transition-colors hover:bg-muted">
          Tema: {dark ? "escuro" : "claro"} · alternar
        </button>
      </header>

      <div className="mt-8 rounded-xl border border-border/70 p-4 sm:p-6">
        <p className="label-mono mb-3">Anatomia · a regra de construção</p>
        <Anatomy />
      </div>

      <div className="mt-10 grid gap-8">
        {/* 1 · 2 wordmarks */}
        <div>
          <Label n={1}>Wordmark ora · 2 · Wordmark ori</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {[L, K].map((p, i) => (
              <Panel key={p.bg} bg={p.bg} ink={p.ink} accent={accent(i === 1)} className="gap-9 px-6 py-11">
                <Ora className="h-[5rem] w-auto" />
                <Ori className="h-[3.8rem] w-auto" />
              </Panel>
            ))}
          </div>
          <Panel bg={L.bg} ink={L.ink} accent={accent(false)} className="mt-3 grid-flow-col justify-center gap-8 px-6 py-5">
            {[56, 36, 24, 18].map((h) => <Ora key={h} className="w-auto" style={{ height: h * 0.5 }} />)}
            <span className="text-[0.72rem] opacity-60">28 · 18 · 12 · 9 px de altura</span>
          </Panel>
        </div>

        {/* 3 · 4 ícones */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <Label n={3}>Ícone ora · 4 · Ícone ori</Label>
            <div className="grid grid-cols-2 gap-3">
              {[L, K].map((p, i) => (
                <Panel key={p.bg} bg={p.bg} ink={p.ink} accent={accent(i === 1)} className="gap-4 px-4 py-8">
                  <OraIcon className="h-28 w-28" fg={p.bg} />
                  <OriIcon className="h-28 w-28" fg={p.bg} />
                </Panel>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-5 rounded-xl border border-border/70 px-4 py-3">
              <OraIcon tile={false} className="h-14 w-14" />
              <OriIcon tile={false} className="h-14 w-14" />
              <span className="text-[0.74rem] text-muted-foreground">símbolo solto, sem o quadrado</span>
            </div>
          </div>

          {/* 5 · favicon */}
          <div>
            <Label n={5}>Favicon</Label>
            <div className="flex flex-wrap items-end gap-6 rounded-xl border border-border/70 p-5">
              <BrowserTab d={d} />
              <div className="flex items-end gap-4 text-foreground">
                {[32, 24, 16].map((s) => <OraIcon key={s} fg="hsl(var(--background))" style={{ width: s, height: s }} />)}
                <span className="text-[0.72rem] text-muted-foreground">32 · 24 · 16 px</span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-4 rounded-xl border border-border/70 p-5 text-foreground">
              <OraIcon className="h-[4.5rem] w-[4.5rem] shadow-soft" />
              <span className="text-[0.78rem] text-muted-foreground">ícone do iPhone / app (180 px)</span>
              <div className="ml-auto flex items-end gap-2">
                {[64, 40].map((s) => <OraIcon key={s} fg="hsl(var(--background))" style={{ width: s, height: s }} />)}
              </div>
            </div>
          </div>
        </div>

        {/* 6 · 7 · 8 */}
        <div className="grid items-start gap-6 md:grid-cols-[auto_auto_auto] md:justify-start">
          <div><Label n={6}>Sidebar aberta</Label><SidebarOpen d={d} /></div>
          <div><Label n={7}>Sidebar recolhida</Label><SidebarCollapsed d={d} /></div>
          <div><Label n={8}>Mobile</Label><Phone d={d} /></div>
        </div>

        {/* 9 · chat */}
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <div><Label n={9}>Cabeçalho do chat da ori</Label><OriChat d={d} /></div>
          <div><Label n={9}>Ori no app (menu, botão, avatares)</Label><OriApplication d={d} /></div>
        </div>

        {/* 10 · comparação */}
        <div>
          <Label n={10}>Comparação pequena · A / B / C / D</Label>
          <div className="grid gap-3 lg:grid-cols-2">
            <Compare dark={false} />
            <Compare dark />
          </div>
          <p className="mt-2 text-[0.74rem] text-muted-foreground">As cores de acento mostradas são as de cada direção (proposta); a D usa ultramar.</p>
        </div>
      </div>
    </main>
  );
}
