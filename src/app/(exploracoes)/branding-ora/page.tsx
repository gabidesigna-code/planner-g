"use client";

import { useTheme } from "@/theme/theme-provider";
import { DIRECTIONS } from "./marks";
import { DirectionSection } from "./mocks";

/**
 * PÁGINA TEMPORÁRIA: exploração da marca "ora" (app) e "ori" (assistente).
 * Nada daqui é aplicado ao app. Remover a pasta src/app/branding-ora quando a direção for escolhida.
 */

export default function BrandingOraPage() {
  const { dark, toggleMode } = useTheme();
  return (
    <main className="mx-auto w-full max-w-[72rem] px-4 pb-32 pt-8 sm:px-8">
      <header className="flex flex-wrap items-start gap-4">
        <div className="max-w-2xl">
          <p className="label-mono">Página temporária · rebranding</p>
          <h1 className="mt-1 text-[2.4rem] font-bold leading-none tracking-[-0.05em]">ora <span className="text-muted-foreground/60">+ ori</span></h1>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">
            Três direções para a marca do app (<b className="text-foreground">ora</b>) e da assistente (<b className="text-foreground">ori</b>).
            Ora = o app. Ori = quem organiza o seu dia. Nada foi aplicado ao app; as letras são desenhadas do zero e a marca “gabi” arquivada não foi tocada.
          </p>
        </div>
        <button onClick={toggleMode} className="ml-auto rounded-full bg-hover px-4 py-2 text-[0.82rem] transition-colors hover:bg-muted">
          Tema: {dark ? "escuro" : "claro"} · alternar
        </button>
      </header>

      <nav className="mt-6 flex flex-wrap gap-2 text-[0.82rem]">
        {DIRECTIONS.map((d) => <a key={d.id} href={`#dir-${d.id}`} className="rounded-full bg-hover px-3.5 py-1.5 hover:bg-muted">{d.title}</a>)}
      </nav>

      {DIRECTIONS.map((d) => (
        <div key={d.id} id={`dir-${d.id}`}><DirectionSection d={d} dark={dark} /></div>
      ))}
    </main>
  );
}
