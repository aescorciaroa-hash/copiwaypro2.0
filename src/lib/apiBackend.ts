// Cliente HTTP hacia la API PHP (reemplaza a firebase.ts). Usa cookies de
// sesión (credentials:'include') en vez de Firebase Auth, y un token CSRF
// guardado en memoria que se obtiene en cada login/register/me.

// window.__APP_BASE__ lo inyecta public/spa.php (ver App\Core\BasePath) con la
// subcarpeta real bajo la que corre el sitio (o '' si vive en la raíz). Nunca
// hay un dominio ni una ruta fija escrita aquí.
const BASE_URL = (window.__APP_BASE__ || '') + '/api';

let csrfToken: string | null = null;

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public errors?: Record<string, string[]>) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (csrfToken && method !== 'GET') {
    headers['X-CSRF-Token'] = csrfToken;
  }

  const res = await fetch(BASE_URL + path, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204 || res.status === 304) {
    return undefined as T;
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new ApiError(data?.error || `Error ${res.status}`, res.status, data?.errors);
  }

  // Cualquier respuesta de Auth trae un csrfToken fresco; lo capturamos aquí
  // para no tener que repetir esta lógica en cada llamada de auth.
  if (data && typeof data === 'object' && 'csrfToken' in data) {
    setCsrfToken(data.csrfToken as string);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

/**
 * Poll corto con ETag (sustituye a los onSnapshot de Firestore). Devuelve
 * `null` si el servidor respondió 304 (nada cambió desde el último poll).
 */
let syncEtag: string | null = null;

export async function fetchSync<T>(): Promise<T | null> {
  const headers: Record<string, string> = {};
  if (syncEtag) {
    headers['If-None-Match'] = syncEtag;
  }

  const res = await fetch(BASE_URL + '/sync', { headers, credentials: 'include' });

  if (res.status === 304) {
    return null;
  }

  syncEtag = res.headers.get('ETag');

  if (!res.ok) {
    throw new ApiError(`Error ${res.status}`, res.status);
  }

  return (await res.json()) as T;
}
