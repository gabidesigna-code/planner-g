/*
 * Service worker do ora: existe só para receber as notificações push da Ori e abrir o app ao tocar nelas.
 * Não guarda nada em cache (o app continua sempre atualizado) e não intercepta nenhuma requisição.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Ori";
  // o iPhone exige que TODO push mostre uma notificação (não existe push silencioso)
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      tag: data.tag || undefined,
      icon: data.icon || "/icons/ori-192.png",
      badge: data.badge || "/icons/badge-96.png",
      data: { url: data.url || "/" },
      lang: "pt-BR",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
