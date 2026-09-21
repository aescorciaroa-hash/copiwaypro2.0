# CopiwayPRO

Plataforma multi-rol para una dark kitchen (Cliente, Administrador, Ayudante de Cocina, Domiciliario y Programador). Backend PHP MVC + MySQL, frontend React/Vite (sin cambios de diseño respecto a la versión original sobre Firebase).

Corre 100% en local con **`localhost`** — sin dominios `.test`, sin host virtual y sin tocar el archivo `hosts` de Windows.

## Arquitectura

```
/app            Backend PHP (Core, Controllers, Models, Middleware, Services)
/config         app.php, database.php, routes.php
/database       schema.sql (esquema completo) y seed.sql (datos demo opcionales)
/docs           documentación, archivos legacy y respaldos no funcionales
/public         Front controller (index.php), server-router.php, spa.php (vista de la SPA) + build compilado (index.html, assets/)
/storage        logs/, uploads/
/bin            create-admin.php (CLI para el rol Programador)
/src            Frontend React (sin tocar visualmente durante la migración)
install.bat     Instala todo (BD, dependencias, build) de un solo paso
start.bat       Sirve el sitio en http://localhost:8000/ sin Apache
```

Flujo de una petición API: `.htaccess`/`server-router.php` → `public/index.php` → `App\Core\Router` → `Middleware` → `Controller` → `Model`/`Service` → JSON.
Flujo de una petición de página: `.htaccess`/`server-router.php` → `public/spa.php` (inyecta `window.__APP_BASE__` en el `index.html` compilado por Vite) → React Router hace el resto.

## Instalación (automática)

```powershell
cd C:\laragon\www\copiwaypro
install.bat
```

`install.bat` detecta el PHP/MySQL de Laragon (cualquier versión instalada), verifica que MySQL esté activo, crea la base de datos desde `database\schema.sql`, ofrece cargar datos de demo (`database\seed.sql`), copia `.env.example` a `.env` si no existe, instala Composer y npm, y compila el frontend. Al final te indica la URL exacta para abrir.

## Instalación manual (paso a paso)

1. **Crea la base de datos**:
   ```powershell
   cd C:\laragon\www\copiwaypro
   "C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysql.exe" -u root < database\schema.sql
   ```
   (Ajusta la ruta de `mysql.exe` a la versión que tengas instalada en `C:\laragon\bin\mysql\`.) Esto crea la base `hamburguer_copiway` con las 22 tablas, triggers de UUID/PIN, y la fila inicial de configuración.

   **(Opcional)** Datos de demostración — **nunca en producción**:
   ```powershell
   "C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysql.exe" -u root hamburguer_copiway < database\seed.sql
   ```
   | Rol | Correo | Contraseña |
   |---|---|---|
   | Programador | programador@copiway.com | Copiway2024! |
   | Administrador | admin@copiway.com | Copiway2024! |
   | Ayudante de Cocina | carlos.mendoza@copiway.com | Copiway2024! |
   | Domiciliario | valentina.rojas@copiway.com | Copiway2024! |
   | Cliente | juan.perez@email.com | Cliente2024! |

2. **Variables de entorno**: `copy .env.example .env`. No hace falta editar nada para desarrollo local estándar de Laragon (MySQL sin contraseña en `127.0.0.1:3306`).

3. **Dependencias PHP**: `php C:\laragon\bin\composer\composer.phar install`

4. **Frontend**: `npm install` y luego `npm run build` (compila directo a `public/`, sin borrar el backend PHP que ya vive ahí).

5. **Primer Administrador** (opcional si ya cargaste `seed.sql`): `php bin\create-admin.php`

## Cómo abrir el sitio (tres métodos, sin vhost)

### A) Laragon, subcarpeta bajo `localhost`

Con el proyecto en `C:\laragon\www\copiwaypro`, abre **`http://localhost/copiwaypro/`**.

> **Importante:** desactiva "Auto Virtual Hosts" en Laragon (**Menú → Preferencias → General**) para que no se cree ningún `.test` automáticamente. No es obligatorio (este método funciona igual aunque el `.test` exista en paralelo), pero así te aseguras de que el sitio se sirve únicamente por `localhost`.

### B) Servidor embebido de PHP (sin Apache)

```powershell
start.bat
```
Abre **`http://localhost:8000/`**. Usa `public/server-router.php`, que sirve los archivos estáticos ya compilados y enruta `/api/*` y el resto de rutas igual que el `.htaccess`.

### Convenciones de nombres

- Clases y archivos PHP: PascalCase y sustantivos claros.
- Vistas y carpetas de frontend: nombres de directorio y archivo en minúsculas con guiones.
- Métodos y variables: camelCase descriptivo.
- Los nombres `app.php`, `router.php`, `useStore` y `api.ts` quedaron reemplazados por nombres más explícitos para mantener claridad sin afectar la lógica.

### C) Desarrollo con recarga en caliente (Vite)

```powershell
npm run dev
```
Levanta Vite en `http://localhost:3000` con proxy de `/api/*` hacia el backend (por defecto `http://localhost:8000`, es decir, corre `start.bat` en paralelo). Si prefieres usar el método A (Apache/subcarpeta) como backend mientras desarrollas, cambia `VITE_API_PROXY_TARGET` en `.env` a `http://localhost/copiwaypro`.

Los tres métodos usan **el mismo build** (`public/index.html` + `public/assets/`) — no hay que recompilar para cambiar de método.

## Rutas 100% portables

- **Assets (JS/CSS/imágenes/fuentes)**: Vite compila con `base: './'` (rutas relativas), así que cargan igual en cualquiera de los tres métodos.
- **React Router**: el `basename` de `<BrowserRouter>` se lee de `window.__APP_BASE__`, que `public/spa.php` inyecta automáticamente detectando la ruta real del front controller (`App\Core\BasePath`, basado en `SCRIPT_NAME`). Nunca hay una ruta escrita a mano. Recargar (F5) en `/admin`, `/client`, `/kitchen`, `/delivery`, `/login`, `/register` o `/forgot-password` funciona en los tres métodos.
- **Cliente API** (`src/lib/api.ts`): la URL base de la API es `window.__APP_BASE__ + '/api'` — nunca un dominio fijo.
- **Cookies de sesión**: sin `Domain` fijo, `Path` según la ruta base detectada, `Secure` solo si la conexión es HTTPS, `SameSite=Lax`. Funcionan en `http://localhost` sin HTTPS.
- **CORS**: se permite únicamente el mismo origen (se compara el host del header `Origin` contra el host de la propia petición) — no hay ningún dominio hardcodeado.

Si algún día cambias de carpeta o de puerto, no hay que tocar código: todo se recalcula solo en cada petición.

## Variables de entorno (`.env`)

| Variable | Descripción |
|---|---|
| `APP_ENV` / `APP_DEBUG` | Entorno y modo debug (nunca `true` en producción) |
| `APP_BASE_PATH` | Ruta base bajo el host. Vacío = autodetectar (recomendado). Solo se usa como override manual si la autodetección no aplica a tu setup. |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASS` | Conexión MySQL (por defecto: `127.0.0.1`, `3306`, `hamburguer_copiway`, `root`, vacío — configuración estándar de Laragon) |
| `SESSION_NAME` / `SESSION_LIFETIME` | Cookie de sesión |
| `RATE_LIMIT_LOGIN_MAX_ATTEMPTS` / `RATE_LIMIT_LOGIN_WINDOW_MINUTES` | Límite de intentos de login fallidos |
| `VITE_API_PROXY_TARGET` | Solo para `npm run dev`: a dónde reenviar `/api/*` (por defecto `http://localhost:8000`) |

## Endpoints principales

Todas las rutas mutadoras validan rol vía `RoleMiddleware`; las de catálogo (`products`, `ingredients`, `settings` en modo lectura) son públicas para que el sitio funcione antes de iniciar sesión.

- `POST /api/auth/login|register|logout`, `GET /api/auth/me`
- `POST /api/auth/forgot-password/request|reset`
- `GET/POST/PUT/DELETE /api/products`, `/api/ingredients`, `/api/inventory`, `/api/inventory-logs`
- `GET/POST/PUT/DELETE /api/staff` (soft delete), `PATCH /api/staff/{id}/location`
- `GET/PUT /api/clients`, `/api/clients/{id}/notifications`
- `GET/POST /api/orders`, `PATCH /api/orders/{id}/preparing|ready|accept|deliver|review`
- `GET/PUT /api/settings`, `/api/settings/categories`
- `POST/GET /api/cash-closing`, `GET /api/dashboard`
- `GET /api/sync` — polling con ETag (sustituye los `onSnapshot` de Firestore; responde `304` si nada cambió)

## Migración desde Firebase/Firestore

Este proyecto reemplaza por completo el backend original (Firebase/Firestore) por PHP MVC + MySQL, manteniendo el frontend visualmente idéntico. Puntos clave:

- **Cero credenciales en el código**: el login original (y los mini-logins embebidos en los paneles de cocina/domiciliario) tenían contraseñas y atajos hardcodeados. Todo esto se eliminó; la autenticación es 100% server-side con `password_hash`/`password_verify`.
- **Reglas de negocio en el servidor**: horario de atención, tarifa de domicilio, descuento de inventario (con `SELECT ... FOR UPDATE` dentro de una transacción), puntos de fidelización y PIN de entrega se validan y calculan en PHP.
- **Cierre de caja persistente**: `POST /api/cash-closing` calcula el consumo real a partir de las recetas vendidas, archiva los pedidos del turno (no los borra) y liquida a cada domiciliario.
- **Sin dependencia de Firebase ni de dominios fijos**: no queda ninguna referencia a Firebase, ni a `.test`, ni a URLs absolutas escritas a mano.

## Notas de seguridad para producción

- Cambia **todas** las contraseñas demo del `seed.sql` (o no lo ejecutes en producción).
- Genera un `APP_KEY` propio en `.env` y pon `APP_DEBUG=false`.
- Sirve el sitio por HTTPS (las cookies de sesión se marcan `secure` automáticamente si `HTTPS`/`X-Forwarded-Proto` lo indican).
- `PaymentService` incluye un driver simulado para desarrollo; para producción, implementa `PaymentDriver` con la pasarela real y su webhook.
