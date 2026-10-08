import type { ReactNode } from "react";
import { OriMonogram, Wordmark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/** Moldura das telas de acesso (entrar, criar conta, recuperar e redefinir senha): marca da ora + a ori falando. */
export function AuthShell({ title, ori, children }: { title: string; ori: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[26rem] flex-col justify-center px-5 py-10 sm:py-14">
      <div className="mb-9 text-foreground sm:mb-11"><Wordmark className="h-[1.75rem] w-auto sm:h-[2rem]" /></div>

      <div className="animate-rise">
        <h1 className="text-[2rem] font-semibold leading-[1.05] tracking-[-0.045em] sm:text-[2.25rem]">{title}</h1>
        <p className="mt-3 flex items-start gap-2.5 text-[0.9375rem] leading-snug text-muted-foreground">
          <OriMonogram crop className="mt-[0.1875rem] h-[1.125rem] w-auto shrink-0 text-foreground" />
          <span>{ori}</span>
        </p>
      </div>

      <div className="mt-8">{children}</div>
    </main>
  );
}

/** Campo de formulário no padrão do app (rótulo em mono + caixa). */
export function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: ReactNode }) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="label-mono text-[0.625rem] tracking-[0.14em]">{label}</span>
      {children}
      {error && <span className="text-[0.75rem] text-urgent">{error}</span>}
    </label>
  );
}

export const inputClass =
  "h-12 w-full min-w-0 rounded-lg border border-border bg-surface px-3.5 text-[1rem] transition-colors placeholder:text-muted-foreground/50 hover:border-foreground/25 focus:border-foreground/40 focus:outline-none sm:h-11 sm:text-[0.9375rem]";

export function Notice({ tone, children }: { tone: "error" | "info"; children: ReactNode }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={cn("rounded-lg px-3.5 py-2.5 text-[0.84rem] leading-snug", tone === "error" ? "bg-urgent-soft text-urgent" : "bg-hover text-foreground")}>
      {children}
    </p>
  );
}
