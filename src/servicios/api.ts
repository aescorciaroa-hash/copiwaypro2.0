// Cliente HTTP hacia la API PHP. Usa cookies de sesión (credentials:'include')
// y un token CSRF guardado en memoria.

// window.__APP_BASE__ lo inyecta app/Views/layouts/cabecera.php con la
// subcarpeta real bajo la que corre el sitio (o '' si vive en la raíz). Nunca
// hay un dominio ni una ruta fija escrita aquí.
const BASE_URL = (window.__APP_BASE__ || '') + '/api';

// window.__DATOS__ lo inyecta el mismo layout PHP (usuario en sesión, rol,
// csrfToken, settings de la tienda) para evitar una llamada extra al montar.
// En "npm run dev" (sin PHP) no existe; el resto del código sigue funcionando
// igual, solo sin el ahorro de esa primera llamada.
let csrfToken: string | null = window.__DATOS__?.csrfToken ?? null;

export function setCsrfToken(token: string | null) {
  csrfToken = token;
}

/** Ruta base bajo la que corre la app (para construir hrefs absolutos). */
export function rutaBase(): string {
  return window.__APP_BASE__ || '';
}

/**
 * Navega a otra pagina de la app. Sin BrowserRouter no hay cambio de ruta en
 * memoria: esto es una recarga normal de navegador (cada pantalla la sirve
 * el backend PHP), igual que hacer clic en un <a href>.
 */
export function irA(ruta: string): void {
  window.location.href = rutaBase() + ruta;
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public errors?: Record<string, string[]>) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown, _retriedCsrf = false): Promise<T> {
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
    // 419 = token CSRF vencido o ausente (ej. la sesion del navegador
    // caducó del lado del servidor pero la pagina seguia con el token
    // viejo en memoria). En vez de mostrarle al usuario un error tecnico
    // por algo que no hizo mal, se pide un token fresco y se reintenta la
    // misma peticion una sola vez de forma transparente.
    if (res.status === 419 && !_retriedCsrf && path !== '/auth/csrf') {
      try {
        const fresh = await request<{ csrfToken: string }>('GET', '/auth/csrf');
        setCsrfToken(fresh.csrfToken);
        return request<T>(method, path, body, true);
      } catch {
        // Sin conectividad para refrescar el token: se cae al error original.
      }
    }
    // 401 en cualquier endpoint que NO sea de /auth/*: la sesion PHP se
    // perdio (expiro, GC del servidor, cuenta desactivada) mientras el SPA
    // seguia abierto sin recargar. /auth/* maneja su propio 401 en su UI
    // (ej. contraseña incorrecta en el login) y nunca debe disparar esto.
    // Recargar la pagina actual hace que PHP vuelva a evaluar la sesion en
    // despacharPagina() y redirija de verdad a /login, en vez de dejar al
    // usuario viendo un toast de error sin saber que debe volver a entrar.
    if (res.status === 401 && !path.startsWith('/auth/')) {
      window.location.reload();
    }
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
 * Sube un archivo real (multipart/form-data) en vez de mandarlo como JSON.
 * Usado para fotos de producto: antes se convertían a base64 y se guardaban
 * directo en la base de datos, lo que truncaba/reventaba la columna con
 * cualquier imagen real. Ahora el archivo se sube y solo se guarda su URL.
 */
export async function subirArchivo(path: string, campo: string, file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append(campo, file);

  const headers: Record<string, string> = {};
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  const res = await fetch(BASE_URL + path, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: formData,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    if (res.status === 401) {
      window.location.reload();
    }
    throw new ApiError(data?.error || `Error ${res.status}`, res.status, data?.errors);
  }

  return data as { url: string };
}

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
