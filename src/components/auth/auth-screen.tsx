"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell, Field, Notice, inputClass } from "./auth-shell";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

type Mode = "entrar" | "criar" | "esqueci";

const COPY: Record<Mode, { title: string; ori: string }> = {
  entrar: { title: "Oi de novo.", ori: "Entre para ver o seu dia." },
  criar: { title: "Vamos começar.", ori: "Crie a sua conta. Cada pessoa tem a própria agenda e a própria ori." },
  esqueci: { title: "Sem problema.", ori: "Me diga o seu e-mail que eu mando o link para criar uma senha nova." },
};

const MIN_PASSWORD = 8;

/** Mensagens do Supabase Auth em português, sem expor detalhes técnicos. */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Falta confirmar o e-mail. Abra o link que enviamos para você.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Já existe uma conta com esse e-mail. Entre ou recupere a senha.";
  if (m.includes("password") && (m.includes("least") || m.includes("short") || m.includes("weak"))) return `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`;
  if (m.includes("rate limit") || m.includes("too many") || m.includes("seconds")) return "Muitas tentativas seguidas. Espere um instante e tente de novo.";
  if (m.includes("invalid") && m.includes("email")) return "Esse e-mail não parece válido.";
  if (m.includes("fetch") || m.includes("network")) return "Sem conexão com o servidor. Tente de novo.";
  return "Não foi possível concluir agora. Tente de novo.";
}

export function AuthScreen({ linkError }: { linkError?: boolean }) {
  const [mode, setMode] = useState<Mode>("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(linkError ? "Esse link expirou ou já foi usado. Peça um novo." : null);
  const [notice, setNotice] = useState<string | null>(null);
  const copy = COPY[mode];

  const go = (m: Mode) => {
    setMode(m);
    setError(null);
    setNotice(null);
    setConfirm("");
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setNotice(null);
    const mail = email.trim();
    if (!mail) return setError("Digite o seu e-mail.");
    if (mode !== "esqueci" && !password) return setError("Digite a senha.");
    if (mode === "criar") {
      if (password.length < MIN_PASSWORD) return setError(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`);
      if (password !== confirm) return setError("As senhas não são iguais.");
    }

    setBusy(true);
    const auth = supabaseBrowser().auth;
    try {
      if (mode === "entrar") {
        const { error: err } = await auth.signInWithPassword({ email: mail, password });
        if (err) throw err;
        window.location.assign("/"); // recarrega: o servidor já enxerga a sessão
        return;
      }
      if (mode === "criar") {
        const { data, error: err } = await auth.signUp({ email: mail, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
        if (err) throw err;
        if (data.session) {
          window.location.assign("/"); // confirmação de e-mail desligada: já entra
          return;
        }
        // com a confirmação ligada, o Supabase devolve uma conta "fantasma" (sem identidades) quando o e-mail já existe
        if (data.user && data.user.identities?.length === 0) return setError("Já existe uma conta com esse e-mail. Entre ou recupere a senha.");
        setNotice(`Enviamos um link de confirmação para ${mail}. Abra o e-mail e depois entre por aqui.`);
        setMode("entrar");
        setPassword("");
        setConfirm("");
        return;
      }
      const { error: err } = await auth.resetPasswordForEmail(mail, { redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha` });
      if (err) throw err;
      // mesma resposta exista a conta ou não (não revela quem tem conta)
      setNotice("Se existir uma conta com esse e-mail, o link para criar uma senha nova já está a caminho.");
    } catch (err) {
      setError(friendly(err instanceof Error ? err.message : String(err)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title={copy.title} ori={copy.ori}>
      {mode !== "esqueci" && (
        <div role="tablist" aria-label="Acesso" className="mb-6 grid grid-cols-2 rounded-xl bg-hover p-1">
          {(["entrar", "criar"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => go(m)}
              className={cn("h-10 rounded-lg text-[0.875rem] font-medium transition-colors", mode === m ? "bg-surface text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground")}
            >
              {m === "entrar" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {error && <Notice tone="error">{error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}

        <Field label="E-mail">
          <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" className={inputClass} />
        </Field>

        {mode !== "esqueci" && (
          <Field label="Senha">
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                autoComplete={mode === "criar" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "criar" ? `Pelo menos ${MIN_PASSWORD} caracteres` : "Sua senha"}
                className={cn(inputClass, "pr-12")}
              />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Esconder a senha" : "Mostrar a senha"} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground transition-colors hover:text-foreground">
                {show ? <EyeOff className="h-[1.0625rem] w-[1.0625rem]" strokeWidth={1.7} /> : <Eye className="h-[1.0625rem] w-[1.0625rem]" strokeWidth={1.7} />}
              </button>
            </div>
          </Field>
        )}

        {mode === "criar" && (
          <Field label="Confirmar senha">
            <input type={show ? "text" : "password"} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repita a senha" className={inputClass} />
          </Field>
        )}

        <Button type="submit" disabled={busy} className="mt-1 h-12 w-full text-[0.9375rem] sm:h-11">
          {busy ? "Um instante…" : mode === "entrar" ? "Entrar" : mode === "criar" ? "Criar conta" : "Enviar link"}
        </Button>

        {mode === "entrar" && (
          <button type="button" onClick={() => go("esqueci")} className="self-start rounded-md py-1 text-[0.84rem] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline">
            Esqueci minha senha
          </button>
        )}
        {mode === "esqueci" && (
          <button type="button" onClick={() => go("entrar")} className="self-start rounded-md py-1 text-[0.84rem] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline">
            Voltar para entrar
          </button>
        )}
      </form>
    </AuthShell>
  );
}
