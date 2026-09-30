// Notificaciones push reales (Web Push / VAPID): la notificacion de "tu
// pedido llego" debe aparecer como notificacion nativa del sistema operativo
// (bandeja/lockscreen), no como un banner dentro de la app. Requiere Service
// Worker (public/sw.js) + permiso del navegador + una suscripcion guardada
// en el backend (ver PushController/PushSuscripcion).

import { api, rutaBase } from '../servicios/api';

export function pushDisponible(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

async function registrarServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushDisponible()) return null;
  const base = rutaBase() || '/';
  const scope = base.endsWith('/') ? base : base + '/';
  try {
    return await navigator.serviceWorker.register(`${base}/sw.js`, { scope });
  } catch {
    return null;
  }
}

/**
 * Crea (o reutiliza) la suscripcion push del navegador y la guarda en el
 * backend. Solo tiene efecto si el permiso de notificaciones ya fue
 * concedido -- nunca dispara el prompt del navegador por si sola.
 */
export async function sincronizarSuscripcionPush(): Promise<boolean> {
  if (!pushDisponible() || Notification.permission !== 'granted') return false;

  const registration = await registrarServiceWorker();
  if (!registration) return false;

  try {
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const { publicKey } = await api.get<{ publicKey: string }>('/push/public-key');
      if (!publicKey) return false;
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(publicKey),
      });
    }

    const json = subscription.toJSON();
    await api.post('/push/subscribe', {
      endpoint: json.endpoint,
      keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
    });
    return true;
  } catch {
    return false;
  }
}

/** Pide el permiso al usuario (debe llamarse desde un click) y, si acepta, suscribe. */
export async function activarNotificacionesPush(): Promise<NotificationPermission | 'unsupported'> {
  if (!pushDisponible()) return 'unsupported';
  const permiso = await Notification.requestPermission();
  if (permiso === 'granted') {
    await sincronizarSuscripcionPush();
  }
  return permiso;
}
