"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { api } from "@/services/api-client";
import { computeStatus, isStandalone, registerWithServer, currentSubscription, subscribeDevice, unsubscribeDevice, registration, type PushStatus } from "@/lib/push-client";

type Dialog = null | "ask" | "blocked" | "ios" | "unsupported" | "not-configured";

export interface PushApi {
  status: PushStatus;
  busy: boolean;
  /** Chamado quando a pessoa escolhe um lembrete: explica e pede a permissão no momento certo (nunca ao entrar no app). */
  ask: () => void;
  /** Ativa neste aparelho (pede a permissão do navegador). Vem de um toque da pessoa. */
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  /** Manda uma notificação de teste para os aparelhos da conta. Devolve a mensagem para mostrar. */
  sendTest: () => Promise<string>;
  /** Desliga este aparelho ao sair da conta (para os avisos de uma pessoa não continuarem chegando para a próxima). */
  releaseDevice: () => Promise<void>;
  /** Diálogos de explicação: renderize em algum lugar da tela. */
  dialogs: ReactNode;
}

const BLOCKED = "As notificações estão bloqueadas neste navegador. Para receber os avisos da Ori, libere as notificações do ora nas configurações do site (toque no cadeado ao lado do endereço) e tente de novo.";
const IOS = "No iPhone e no iPad, os avisos funcionam quando o ora está na Tela de Início. Toque em Compartilhar, depois em “Adicionar à Tela de Início”, abra o ora por lá e ative os lembretes de novo.";
const UNSUPPORTED = "Este navegador não permite notificações. Experimente o Chrome, o Edge, o Firefox ou o Safari atualizados.";
const NOT_CONFIGURED = "As notificações ainda não foram configuradas neste servidor.";

/**
 * Controla as notificações deste aparelho. Ao abrir o app NÃO pergunta nada: só registra o service worker e, se a
 * pessoa já permitiu e tem lembretes, garante que este aparelho está inscrito na conta logada.
 */
export function usePush({ notify, enabled, hasReminders }: { notify: (message: string) => void; enabled: boolean; hasReminders: boolean }): PushApi {
  const [status, setStatus] = useState<PushStatus>("checking");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const dismissed = useRef(false); // "Agora não" vale até recarregar: não insistimos
  const synced = useRef(false);

  const refresh = useCallback(async () => setStatus(await computeStatus()), []);

  // ao entrar: registra o service worker e confere o estado; se já está inscrito, reafirma a inscrição para ESTA conta
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    (async () => {
      await registration();
      const s = await computeStatus();
      if (alive) setStatus(s);
      if (synced.current) return;
      if (s === "granted-on") {
        synced.current = true;
        const sub = await currentSubscription();
        if (sub) await registerWithServer(sub).catch(() => void 0); // renova a inscrição e a passa para a conta logada
      } else if (s === "granted-off" && hasReminders) {
        synced.current = true;
        // a pessoa já permitiu antes e tem lembretes: volta a inscrever este aparelho, sem perguntar de novo
        await subscribeDevice().then(
          () => void 0,
          (e) => { synced.current = false; console.warn("[push] auto-subscribe falhou", e); }, // tenta de novo na próxima abertura
        );
      }
      // o estado final vem sempre do navegador (evita sobrescrever com um valor lido antes da inscrição terminar)
      setStatus(await computeStatus());
    })();
    return () => { alive = false; };
  }, [enabled, hasReminders]);

  const enable = useCallback(async () => {
    const s = await computeStatus();
    if (s === "ios-install") return void setDialog("ios");
    if (s === "unsupported") return void setDialog("unsupported");
    if (s === "not-configured") return void setDialog("not-configured");
    setBusy(true);
    try {
      // a permissão precisa ser pedida logo após o toque da pessoa
      const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (perm === "denied") { setStatus("denied"); setDialog("blocked"); return; }
      if (perm !== "granted") { setStatus("default"); return; }
      await subscribeDevice();
      setStatus("granted-on");
      notify("Pronto! A Ori vai te avisar neste aparelho.");
    } catch (e) {
      console.warn("[push] ativar falhou", e);
      notify("Não consegui ativar as notificações agora. Em janela anônima o Chrome não permite; tente numa janela normal.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [notify, refresh]);

  const ask = useCallback(() => {
    void (async () => {
      const s = await computeStatus();
      setStatus(s);
      if (s === "granted-on") return;
      if (s === "granted-off") return void (await enable());
      if (s === "default") { if (!dismissed.current) setDialog("ask"); return; }
      if (s === "denied") return void setDialog("blocked");
      if (s === "ios-install") return void setDialog("ios");
      if (s === "unsupported") return void setDialog("unsupported");
      if (s === "not-configured") return void setDialog("not-configured");
    })();
  }, [enable]);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      await unsubscribeDevice();
      await refresh();
      notify("Notificações desativadas neste aparelho.");
    } finally {
      setBusy(false);
    }
  }, [notify, refresh]);

  const sendTest = useCallback(async () => {
    try {
      const r = await api.pushTest();
      return r.sent > 0 ? "Enviado. A notificação deve chegar em instantes." : "Não consegui entregar agora. Tente de novo.";
    } catch (e) {
      return e instanceof Error ? e.message : "Não consegui enviar o teste.";
    }
  }, []);

  const releaseDevice = useCallback(async () => {
    // não segura a saída da conta se a rede estiver ruim
    await Promise.race([unsubscribeDevice().catch(() => void 0), new Promise((r) => setTimeout(r, 3000))]);
  }, []);

  const close = () => setDialog(null);
  const dialogs = (
    <>
      <ConfirmDialog
        open={dialog === "ask"}
        title="A Ori pode te avisar?"
        body="A Ori pode te avisar quando uma tarefa ou compromisso estiver chegando."
        confirmLabel="Permitir notificações"
        cancelLabel="Agora não"
        onCancel={() => { dismissed.current = true; close(); }}
        onConfirm={() => { close(); void enable(); }}
      />
      <ConfirmDialog open={dialog === "blocked"} title="Notificações bloqueadas" body={BLOCKED} confirmLabel="Entendi" hideCancel onCancel={close} onConfirm={close} />
      <ConfirmDialog open={dialog === "ios"} title="Adicione o ora à Tela de Início" body={IOS} confirmLabel="Entendi" hideCancel onCancel={close} onConfirm={close} />
      <ConfirmDialog open={dialog === "unsupported"} title="Sem suporte a notificações" body={UNSUPPORTED} confirmLabel="Entendi" hideCancel onCancel={close} onConfirm={close} />
      <ConfirmDialog open={dialog === "not-configured"} title="Notificações indisponíveis" body={NOT_CONFIGURED} confirmLabel="Entendi" hideCancel onCancel={close} onConfirm={close} />
    </>
  );

  return useMemo(
    () => ({ status, busy, ask, enable, disable, sendTest, releaseDevice, dialogs }),
    // os diálogos dependem de `dialog`; o resto é estável
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, busy, ask, enable, disable, sendTest, releaseDevice, dialog],
  );
}

export { isStandalone };
