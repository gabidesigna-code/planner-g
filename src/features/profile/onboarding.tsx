"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { OriMonogram, Wordmark } from "@/components/brand/logo";
import { Notice, inputClass } from "@/components/auth/auth-shell";

export const MAX_NAME = 40;

/**
 * Primeiro acesso: a ori pergunta como chamar a pessoa. O nome vai para o PERFIL da conta (banco) e passa a valer
 * nas saudações de todos os aparelhos. Só some quando há um nome.
 */
export function Onboarding({ email, onSave, onSignOut }: { email: string | null; onSave: (name: string) => Promise<void>; onSignOut: () => void }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const clean = name.replace(/\s+/g, " ").trim();
    if (!clean) return setError("Me diga um nome ou apelido.");
    if (clean.length > MAX_NAME) return setError(`No máximo ${MAX_NAME} letras.`);
    setBusy(true);
    setError(null);
    try {
      await onSave(clean);
    } catch {
      setError("Não consegui salvar agora. Tente de novo.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[26rem] flex-col justify-center px-5 py-10">
      <div className="mb-10 text-foreground"><Wordmark className="h-[1.75rem] w-auto" /></div>

      <div className="animate-rise flex items-start gap-3">
        <OriMonogram tile className="mt-0.5 h-10 w-10 shrink-0" />
        <p className="text-[1.5rem] font-semibold leading-[1.15] tracking-[-0.035em] sm:text-[1.75rem]">
          Oi! Antes da gente começar: como você quer que eu te chame?
        </p>
      </div>

      <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-4">
        {error && <Notice tone="error">{error}</Notice>}
        <label className="flex flex-col gap-1.5">
          <span className="label-mono text-[0.625rem] tracking-[0.14em]">Nome ou apelido</span>
          <input
            autoFocus
            value={name}
            maxLength={MAX_NAME}
            autoComplete="given-name"
            onChange={(e) => setName(e.target.value)}
            placeholder="Gabi, Duda, Carol…"
            className={inputClass}
          />
        </label>
        <Button type="submit" disabled={busy} className="h-12 w-full sm:h-11">{busy ? "Salvando…" : "Continuar"}</Button>
        <p className="text-[0.78rem] leading-snug text-muted-foreground">Você pode mudar isso depois, na área Você.</p>
      </form>

      <p className="mt-10 text-[0.78rem] text-muted-foreground">
        {email ? <>Conta: {email}. </> : null}
        <button type="button" onClick={onSignOut} className="underline underline-offset-4 transition-colors hover:text-foreground">Sair</button>
      </p>
    </main>
  );
}
