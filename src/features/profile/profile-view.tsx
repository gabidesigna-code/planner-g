"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ViewHeader } from "@/components/view-header";
import { OriMonogram } from "@/components/brand/logo";
import { inputClass } from "@/components/auth/auth-shell";
import { MAX_NAME } from "./onboarding";
import { useApp } from "@/lib/app-context";
import type { PushStatus } from "@/lib/push-client";

const NOTE: Record<PushStatus, string> = {
  checking: "Verificando…",
  "not-configured": "As notificações ainda não foram configuradas neste servidor.",
  unsupported: "Este navegador não permite notificações.",
  "ios-install": "No iPhone, as notificações funcionam com o ora na Tela de Início.",
  default: "Desativadas neste aparelho.",
  denied: "Bloqueadas neste navegador.",
  "granted-off": "Desativadas neste aparelho.",
  "granted-on": "Ativadas neste aparelho. A Ori avisa quando um item com lembrete estiver chegando.",
};

/** Você: o nome que a ori usa, as notificações, a conta e sair. */
export function ProfileView() {
  const { ownerName, account, saveDisplayName, signOut, push } = useApp();
  const [testMsg, setTestMsg] = useState<string | null>(null);
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
          <p className="label-mono text-[0.625rem] tracking-[0.14em]">Notificações neste aparelho</p>
          <p className="mt-2 text-[0.9375rem]">{NOTE[push.status]}</p>
          {push.status === "ios-install" && <p className="mt-1 text-[0.8125rem] leading-snug text-muted-foreground">Toque em Compartilhar e depois em “Adicionar à Tela de Início”. Abra o ora por lá para ativar.</p>}
          {push.status === "denied" && <p className="mt-1 text-[0.8125rem] leading-snug text-muted-foreground">Para receber os avisos, libere as notificações do ora nas configurações do site (toque no cadeado ao lado do endereço).</p>}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(push.status === "default" || push.status === "granted-off" || push.status === "ios-install") && (
              <Button className="h-11 sm:h-9" disabled={push.busy} onClick={() => void push.enable()}><Bell className="h-4 w-4" strokeWidth={1.7} /> Ativar neste aparelho</Button>
            )}
            {push.status === "granted-on" && (
              <>
                <Button variant="soft" className="h-11 sm:h-9" disabled={push.busy} onClick={async () => setTestMsg(await push.sendTest())}>Enviar teste</Button>
                <Button variant="ghost" className="h-11 sm:h-9" disabled={push.busy} onClick={() => void push.disable()}>Desativar neste aparelho</Button>
              </>
            )}
          </div>
          {testMsg && <p role="status" className="mt-2 text-[0.8125rem] text-muted-foreground">{testMsg}</p>}
          <p className="mt-3 text-[0.78rem] leading-snug text-muted-foreground">Escolha o lembrete ao criar ou editar uma tarefa ou compromisso com horário. Cada aparelho precisa ser ativado uma vez.</p>
        </div>

        <div className="mt-10 border-t border-border pt-8">
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
