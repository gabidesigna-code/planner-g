import { api } from "@/services/api-client";

/**
 * Web Push no navegador: service worker, permissão e inscrição deste aparelho.
 * Nada daqui funciona de verdade sem o service worker (public/sw.js): é ele que recebe o aviso mesmo com o app fechado.
 */

export type PushStatus =
  | "checking"
  | "not-configured" // faltam as chaves VAPID no servidor (NEXT_PUBLIC_VAPID_PUBLIC_KEY)
  | "unsupported" // o navegador não oferece push
  | "ios-install" // iPhone/iPad: só funciona com o ora adicionado à Tela de Início
  | "default" // ainda não perguntamos
  | "denied" // a pessoa bloqueou no navegador
  | "granted-off" // permitido, mas este aparelho não está inscrito
  | "granted-on"; // permitido e inscrito

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export const isIOS = () =>
  typeof navigator !== "undefined" && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

export const isStandalone = () =>
  typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

export const pushApiAvailable = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** "iPhone · Safari", "Android · Chrome", "Windows · Edge"… (só para a pessoa reconhecer o aparelho) */
export function deviceName(): string {
  const ua = navigator.userAgent;
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "Aparelho";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "navegador";
  return `${os} · ${browser}`;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Registra (ou reaproveita) o service worker e espera ele ficar ativo. */
export async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!pushApiAvailable()) return null;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await registration();
  return reg ? reg.pushManager.getSubscription() : null;
}

/** Estado atual deste aparelho. */
export async function computeStatus(): Promise<PushStatus> {
  if (!VAPID_PUBLIC_KEY) return "not-configured";
  if (isIOS() && !isStandalone()) return "ios-install";
  if (!pushApiAvailable()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission === "default") return "default";
  return (await currentSubscription()) ? "granted-on" : "granted-off";
}

/** Manda a inscrição deste aparelho para a conta logada (o servidor valida e associa à sessão). */
export async function registerWithServer(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error("Inscrição de notificação incompleta.");
  await api.pushSubscribe({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth }, deviceName: deviceName() });
}

/** Inscreve este aparelho (reaproveita a inscrição se já existe) e a registra na conta. Exige permissão já concedida. */
/** O serviço de push do navegador às vezes demora ou trava: melhor avisar a pessoa do que deixar o botão esperando para sempre. */
const withTimeout = <T,>(p: Promise<T>, ms = 25000) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("O serviço de notificações do navegador não respondeu.")), ms))]);

let subscribing: Promise<void> | null = null;

/** Inscreve este aparelho. Chamadas simultâneas (ativar à mão + inscrição automática) dividem a mesma execução, para não criar duas inscrições. */
export function subscribeDevice(): Promise<void> {
  subscribing ??= doSubscribe().finally(() => { subscribing = null; });
  return subscribing;
}

async function doSubscribe(): Promise<void> {
  const reg = await registration();
  if (!reg) throw new Error("Este navegador não permite notificações.");
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await withTimeout(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }));
    } catch (e) {
      // inscrição antiga criada com outra chave: refaz do zero
      if (e instanceof DOMException && e.name === "InvalidStateError") {
        await (await reg.pushManager.getSubscription())?.unsubscribe();
        sub = await withTimeout(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }));
      } else throw e;
    }
  }
  await registerWithServer(sub);
}

/** Desliga este aparelho: apaga na conta e cancela no navegador (usado ao sair da conta e em "Desativar"). */
export async function unsubscribeDevice(): Promise<void> {
  if (!pushApiAvailable()) return;
  const sub = await (await registration())?.pushManager.getSubscription();
  if (!sub) return;
  await api.pushUnsubscribe(sub.endpoint).catch(() => void 0);
  await sub.unsubscribe().catch(() => void 0);
}
