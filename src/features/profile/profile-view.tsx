"use client";

import { useEffect, useState, type FormEvent } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewHeader } from "@/components/view-header";
import { OriMonogram } from "@/components/brand/logo";
import { inputClass } from "@/components/auth/auth-shell";
import { MAX_NAME } from "./onboarding";
import { useApp } from "@/lib/app-context";

/** Você: o nome que a ori usa, a conta e sair. */
export function ProfileView() {
  const { ownerName, account, saveDisplayName, signOut } = useApp();
  const [name, setName] = useState(ownerName);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // se o nome mudou em outro aparelho e aqui não há edição em andamento, acompanha
  useEffect(() => {
    setName((cur) => (cur === "" || cur === ownerName ? ownerName : cur));
  }, [ownerName]);

  const clean = name.replace(/\s+/g, " ").trim();
  const dirty = clean !== ownerName;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!dirty || busy) return;
    if (!clean) return setError("A ori precisa de um nome ou apelido para te chamar.");
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await saveDisplayName(clean);
      setName(clean);
      setSaved(true);
    } catch {
      setError("Não consegui salvar agora. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[45rem] px-4 pb-36 pt-6 sm:px-8 lg:max-w-[65rem] lg:px-8 lg:pt-8 xl:max-w-[73.75rem] 2xl:max-w-[87.5rem] sm:pb-32 sm:pt-16">
      <ViewHeader eyebrow="Perfil" title="Você" />

      <div className="max-w-[28rem]">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="label-mono text-[0.625rem] tracking-[0.14em]">Como a ori deve te chamar?</span>
            <input
              value={name}
              maxLength={MAX_NAME}
              autoComplete="given-name"
              onChange={(e) => { setName(e.target.value); setSaved(false); setError(null); }}
              placeholder="Gabi, Duda, Carol…"
              className={inputClass}
            />
          </label>
          {error && <p role="alert" className="text-[0.8125rem] text-urgent">{error}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!dirty || busy} className="h-11 sm:h-9">{busy ? "Salvando…" : "Salvar"}</Button>
            {saved && !dirty && (
              <span role="status" className="flex items-center gap-2 text-[0.8438rem] text-muted-foreground">
                <OriMonogram crop className="h-3.5 w-auto text-foreground" /> Pronto. Vou te chamar de {ownerName}.
              </span>
            )}
          </div>
        </form>

        <div className="mt-12 border-t border-border pt-8">
          <p className="label-mono text-[0.625rem] tracking-[0.14em]">Conta</p>
          <p className="mt-2 break-all text-[0.9375rem]">{account.email ?? "—"}</p>
          <p className="mt-1 text-[0.8125rem] leading-snug text-muted-foreground">Suas tarefas, compromissos e conversas com a ori ficam guardados nesta conta e aparecem em qualquer aparelho em que você entrar.</p>
          <Button variant="soft" className="mt-5 h-11 sm:h-9" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" strokeWidth={1.7} /> Sair da conta
          </Button>
        </div>
      </div>
    </div>
  );
}
