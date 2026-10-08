"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { AuthShell, Field, Notice, inputClass } from "./auth-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";

const MIN_PASSWORD = 8;

/** Depois de abrir o link de recuperação (que já criou uma sessão): escolher a senha nova. */
export function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser().auth.getUser().then(({ data }) => {
      setSignedIn(!!data.user);
      setReady(true);
    });
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (password.length < MIN_PASSWORD) return setError(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`);
    if (password !== confirm) return setError("As senhas não são iguais.");
    setBusy(true);
    const { error: err } = await supabaseBrowser().auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(/same|different/i.test(err.message) ? "Escolha uma senha diferente da anterior." : "Não foi possível trocar a senha agora. Tente de novo.");
    window.location.assign("/");
  }

  if (ready && !signedIn) {
    return (
      <AuthShell title="Link vencido." ori="Esse link de recuperação não está mais valendo. Peça um novo na tela de entrada.">
        <Button className="h-12 w-full sm:h-11" onClick={() => window.location.assign("/login")}>Voltar para entrar</Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Senha nova." ori="Escolha uma senha para entrar da próxima vez.">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {error && <Notice tone="error">{error}</Notice>}
        <Field label="Nova senha">
          <input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={`Pelo menos ${MIN_PASSWORD} caracteres`} className={inputClass} />
        </Field>
        <Field label="Confirmar senha">
          <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repita a senha" className={inputClass} />
        </Field>
        <Button type="submit" disabled={busy || !ready} className="mt-1 h-12 w-full sm:h-11">{busy ? "Um instante…" : "Salvar e entrar"}</Button>
      </form>
    </AuthShell>
  );
}
