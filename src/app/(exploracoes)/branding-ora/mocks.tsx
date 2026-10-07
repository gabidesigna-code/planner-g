"use client";

import type { CSSProperties, ReactNode } from "react";
import { Bell, CalendarDays, Check, Columns3, ListChecks, Menu, Minus, PanelLeftClose, Plus, Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Direction } from "./marks";

/** Aplicações de teste (mocks) compartilhadas pelas páginas temporárias de branding. Seguem o tema atual. */

export const LIGHT = { bg: "#F6F5F0", ink: "#161A18" };
export const DARK = { bg: "#121514", ink: "#EEF0EA" };

export function Panel({ bg, ink, accent, children, className }: { bg: string; ink: string; accent: string; children: ReactNode; className?: string }) {
  return (
    <div
      className={cn("grid place-items-center rounded-xl border border-border/70", className)}
      style={{ background: bg, color: ink, ["--ora-accent" as string]: accent } as CSSProperties}
    >
      {children}
    </div>
  );
}

export function Label({ n, children }: { n: number; children: ReactNode }) {
  return (
    <p className="label-mono mb-2.5 flex items-center gap-2">
      <span className="grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full bg-foreground px-1 text-[0.625rem] text-background">{n}</span>
      {children}
    </p>
  );
}

/* ---------------------------------------------------------------- aplicações (mocks; seguem o tema atual) */

const NAV = [
  { label: "Hoje", icon: Sun, active: true },
  { label: "Semana", icon: Columns3 },
  { label: "Calendário", icon: CalendarDays },
  { label: "Tarefas", icon: ListChecks },
];

export function SidebarOpen({ d }: { d: Direction }) {
  const Word = d.Ora;
  return (
    <div className="flex h-[24rem] w-[15rem] flex-col rounded-xl border border-border/70 bg-sidebar px-3 py-4">
      <div className="mb-6 flex h-10 items-center px-2 text-foreground"><Word className="w-auto" {...{ style: { height: d.sidebarH } }} /></div>
      <div className="flex flex-col gap-0.5">
        {NAV.map(({ label, icon: Icon, active }) => (
          <div key={label} className={cn("flex h-9 items-center gap-3 rounded-lg px-2.5 text-[0.84rem]", active ? "bg-primary font-medium text-primary-foreground shadow-btn" : "text-foreground/80")}>
            <Icon className="h-4 w-4" strokeWidth={1.7} /> {label}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-0.5 border-t border-border/80 pt-3 text-[0.84rem] text-foreground/80">
        <div className="flex h-9 items-center gap-3 px-2.5"><span className="ml-1 h-2 w-2 rounded-full bg-work" /> Trabalho</div>
        <div className="flex h-9 items-center gap-3 px-2.5"><span className="ml-1 h-2 w-2 rounded-full bg-personal" /> Pessoal</div>
      </div>
      <div className="mt-auto flex items-center justify-between px-1 text-muted-foreground"><PanelLeftClose className="h-4 w-4" strokeWidth={1.7} /><Sun className="h-4 w-4" strokeWidth={1.7} /></div>
    </div>
  );
}

export function SidebarCollapsed({ d }: { d: Direction }) {
  const Icon = d.OraIcon;
  return (
    <div className="flex h-[24rem] w-[3.5rem] flex-col items-center rounded-xl border border-border/70 bg-sidebar py-4 text-foreground">
      <div className="mb-6 grid h-10 place-items-center"><Icon tile={false} className="h-8 w-8" /></div>
      <div className="flex flex-col gap-1">
        {NAV.map(({ label, icon: I, active }) => (
          <div key={label} className={cn("grid h-9 w-9 place-items-center rounded-lg", active ? "bg-primary text-primary-foreground shadow-btn" : "text-foreground/70")}><I className="h-4 w-4" strokeWidth={1.7} /></div>
        ))}
      </div>
    </div>
  );
}

export function Phone({ d }: { d: Direction }) {
  const Word = d.Ora;
  return (
    <div className="relative h-[24rem] w-[12.5rem] overflow-hidden rounded-[1.75rem] border-[0.4rem] border-foreground/85 bg-background">
      <div className="flex items-center justify-between px-3 py-2.5 text-foreground">
        <Menu className="h-4 w-4" strokeWidth={1.7} />
        <Word className="w-auto" {...{ style: { height: 18 } }} />
        <span className="w-4" />
      </div>
      <div className="px-3 pt-2">
        <p className="label-mono text-[0.58rem] text-work">QUARTA</p>
        <p className="text-[2.6rem] font-bold leading-[0.85] tracking-[-0.06em]">07 <span className="text-work/55">OUT</span></p>
        <div className="mt-3 flex gap-1.5 text-[0.62rem]">
          <span className="rounded-full bg-primary px-2.5 py-1 text-primary-foreground">Tudo</span>
          <span className="rounded-full bg-surface px-2.5 py-1 ring-1 ring-border">Trabalho</span>
          <span className="rounded-full bg-surface px-2.5 py-1 ring-1 ring-border">Pessoal</span>
        </div>
        <div className="mt-4 space-y-2">
          <div className="rounded-lg bg-work-soft px-2.5 py-2 text-[0.7rem] font-semibold">Reunião com cliente <span className="font-mono font-normal text-muted-foreground">09:00</span></div>
          <div className="rounded-lg bg-personal-soft px-2.5 py-2 text-[0.7rem] font-semibold">Dentista <span className="font-mono font-normal text-muted-foreground">14:00</span></div>
        </div>
      </div>
      <div className="absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-btn"><Plus className="h-5 w-5" strokeWidth={1.8} /></div>
    </div>
  );
}

export function BrowserTab({ d }: { d: Direction }) {
  const Icon = d.OraIcon;
  return (
    <div className="w-[16rem]">
      <div className="flex items-center gap-2 rounded-t-lg border border-b-0 border-border bg-surface px-3 py-2 text-[0.78rem] text-foreground">
        <Icon className="h-4 w-4 shrink-0" /> <span className="truncate">ora · hoje</span> <X className="ml-auto h-3 w-3 text-muted-foreground" />
      </div>
      <div className="h-6 rounded-b-lg border border-border bg-hover" />
    </div>
  );
}

export function OriApplication({ d }: { d: Direction }) {
  const Icon = d.OriIcon;
  const Word = d.OriWord;
  return (
    <div className="w-[22rem] space-y-3">
      {/* entrada no menu Adicionar */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
        {["Tarefa", "Compromisso"].map((t) => (
          <div key={t} className="flex items-center gap-3 px-3 py-2 text-[0.84rem] text-foreground/80"><span className="h-4 w-4 rounded-sm border border-border" />{t}<span className="ml-auto kbd">⌘</span></div>
        ))}
        <div className="flex items-center gap-3 bg-hover px-3 py-2.5 text-[0.84rem] font-medium text-foreground">
          <Icon className="h-5 w-5 shrink-0" /> Organizar com <Word className="mt-0.5 w-auto" {...{ style: { height: 13 } }} />
          <span className="ml-auto kbd">⌘5</span>
        </div>
      </div>
      {/* botão flutuante e pílula */}
      <div className="flex items-center gap-3">
        <button className="flex h-11 items-center gap-2.5 rounded-full bg-primary pl-1.5 pr-4 text-[0.84rem] font-medium text-primary-foreground shadow-btn">
          <Icon tile className="h-8 w-8 text-background" fg="hsl(var(--primary))" /> Pergunte à ori
        </button>
        <span className="text-[0.75rem] text-muted-foreground">botão da assistente</span>
      </div>
      {/* avatares */}
      <div className="flex items-end gap-3 text-foreground">
        {[48, 32, 20].map((s) => <Icon key={s} tile style={{ width: s, height: s }} />)}
        <span className="ml-1 text-[0.75rem] text-muted-foreground">avatar em 48 · 32 · 20 px</span>
      </div>
    </div>
  );
}

export function OriChat({ d }: { d: Direction }) {
  const Icon = d.OriIcon;
  const Word = d.OriWord;
  return (
    <div className="w-[22rem] overflow-hidden rounded-2xl border border-border bg-surface shadow-pop">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 text-foreground">
        <Icon tile className="h-10 w-10 shrink-0" />
        <div className="min-w-0 leading-tight">
          <Word className="w-auto" {...{ style: { height: 17 } }} />
          <p className="mt-1.5 flex items-center gap-1.5 text-[0.72rem] text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-done" /> assistente da ora</p>
        </div>
        <div className="ml-auto flex items-center gap-1 text-muted-foreground"><Minus className="h-4 w-4" /><X className="h-4 w-4" /></div>
      </div>
      <div className="space-y-2.5 bg-background/60 px-4 py-4 text-[0.82rem]">
        <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-primary-foreground">amanhã às 14h reunião da FCA e antes conciliar o extrato</p>
        <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-surface px-3.5 py-2.5 ring-1 ring-border">
          <p className="mb-1.5 text-muted-foreground">Entendi assim:</p>
          <p className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-work" strokeWidth={2} /> Reunião FCA · amanhã 14:00</p>
          <p className="mt-1 flex items-center gap-2"><Check className="h-3.5 w-3.5 text-work" strokeWidth={2} /> Conciliar extrato FCA · amanhã</p>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-border px-3 py-2.5 text-[0.8rem] text-muted-foreground">
        <Bell className="h-4 w-4 opacity-0" />
        <span>Escreva para a ori…</span>
        <span className="ml-auto grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground"><Plus className="h-3.5 w-3.5" /></span>
      </div>
    </div>
  );
}


/* ---------------------------------------------------------------- seção de cada direção */

export function DirectionSection({ d, dark }: { d: Direction; dark: boolean }) {
  const accentOn = (isDarkSurface: boolean) => (isDarkSurface ? d.accent.dark : d.accent.light);
  const Ora = d.Ora;
  const Ori = d.OriWord;
  const OraIcon = d.OraIcon;
  const OriIcon = d.OriIcon;
  const appAccent = accentOn(dark);

  return (
    <section className="mt-20 border-t border-border pt-10" style={{ ["--ora-accent" as string]: appAccent } as CSSProperties}>
      <header className="max-w-2xl">
        <p className="label-mono">Direção {d.id}</p>
        <h2 className="mt-1 text-[1.9rem] font-semibold tracking-[-0.04em]">{d.title}</h2>
        <p className="mt-1 text-[1.05rem] text-muted-foreground">{d.tagline}</p>
        <ul className="mt-4 space-y-1.5 text-[0.9rem] leading-relaxed text-foreground/85">
          {d.idea.map((t) => <li key={t} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground/50" />{t}</li>)}
        </ul>
        <p className="mt-3 rounded-lg bg-hover px-3.5 py-2.5 text-[0.88rem]"><span className="font-semibold">Ori:</span> {d.ori}</p>
        <p className="mt-2 text-[0.78rem] text-muted-foreground">Cor proposta da Ori: <span className="font-medium text-foreground">{d.accent.name}</span> ({d.accent.light} · {d.accent.dark}). É só uma proposta; dá para trocar.</p>
      </header>

      {/* 1 · wordmark */}
      <div className="mt-8">
        <Label n={1}>Wordmark “ora” · e “ori”</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {[{ ...LIGHT, dk: false }, { ...DARK, dk: true }].map((p) => (
            <Panel key={p.bg} bg={p.bg} ink={p.ink} accent={accentOn(p.dk)} className="gap-8 px-6 py-10">
              <Ora className="h-[4.5rem] w-auto" />
              <Ori className="h-[3.4rem] w-auto" />
            </Panel>
          ))}
        </div>
        <Panel bg={LIGHT.bg} ink={LIGHT.ink} accent={accentOn(false)} className="mt-3 grid-flow-col justify-center gap-8 px-6 py-5">
          {[56, 36, 24, 18].map((h) => <Ora key={h} className="w-auto" {...{ style: { height: h * 0.5 } }} />)}
          <span className="text-[0.72rem] opacity-60">tamanhos pequenos (28 · 18 · 12 · 9 px de altura)</span>
        </Panel>
      </div>

      {/* 2 + 3 · ícone e favicon */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <Label n={2}>Ícone compacto · ora e ori</Label>
          <div className="grid grid-cols-2 gap-3">
            <Panel bg={LIGHT.bg} ink={LIGHT.ink} accent={accentOn(false)} className="gap-4 px-4 py-8">
              <OraIcon className="h-24 w-24" fg={LIGHT.bg} />
              <OriIcon className="h-24 w-24" fg={LIGHT.bg} />
            </Panel>
            <Panel bg={DARK.bg} ink={DARK.ink} accent={accentOn(true)} className="gap-4 px-4 py-8">
              <OraIcon className="h-24 w-24" fg={DARK.bg} />
              <OriIcon className="h-24 w-24" fg={DARK.bg} />
            </Panel>
          </div>
          <div className="mt-3 flex items-center gap-5 rounded-xl border border-border/70 px-4 py-3">
            <OraIcon tile={false} className="h-14 w-14" />
            <OriIcon tile={false} className="h-14 w-14" />
            <span className="text-[0.74rem] text-muted-foreground">símbolo solto, sem o quadrado</span>
          </div>
        </div>
        <div>
          <Label n={3}>Favicon</Label>
          <div className="flex flex-wrap items-end gap-6 rounded-xl border border-border/70 p-5">
            <BrowserTab d={d} />
            <div className="flex items-end gap-4 text-foreground">
              {[32, 24, 16].map((s) => <OraIcon key={s} fg="hsl(var(--background))" style={{ width: s, height: s }} />)}
              <span className="text-[0.72rem] text-muted-foreground">32 · 24 · 16 px</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 rounded-xl border border-border/70 p-5 text-foreground">
            <OraIcon className="h-[4.5rem] w-[4.5rem] shadow-soft" />
            <span className="text-[0.78rem] text-muted-foreground">ícone do iPhone / tela inicial (180 px)</span>
          </div>
        </div>
      </div>

      {/* 4 · 5 · 6 · sidebar e mobile */}
      <div className="mt-8">
        <div className="grid items-start gap-6 md:grid-cols-[auto_auto_auto] md:justify-start">
          <div><Label n={4}>Sidebar aberta</Label><SidebarOpen d={d} /></div>
          <div><Label n={5}>Sidebar recolhida</Label><SidebarCollapsed d={d} /></div>
          <div><Label n={6}>Mobile</Label><Phone d={d} /></div>
        </div>
      </div>

      {/* 7 · 8 · ori */}
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
        <div><Label n={7}>Aplicação da ori</Label><OriApplication d={d} /></div>
        <div><Label n={8}>Cabeçalho do chat da ori</Label><OriChat d={d} /></div>
      </div>
    </section>
  );
}

