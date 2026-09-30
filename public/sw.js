// Service Worker minimo: solo existe para poder recibir Web Push (VAPID) y
// mostrar notificaciones reales del sistema operativo cuando el pedido de un
// cliente llega, aunque la pestaña/app este cerrada. No cachea nada (no es
// un service worker "offline-first"): si algo falla aqui, la app normal
// sigue funcionando igual, solo no llegan notificaciones push.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'CopiwayPRO', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'CopiwayPRO';
  const options = {
    body: data.body || '',
    icon: 'favicon.svg',
    badge: 'favicon.svg',
    tag: data.tag || 'copiway-pedido',
    data: { url: data.url || '.' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '.', self.registration.scope).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
