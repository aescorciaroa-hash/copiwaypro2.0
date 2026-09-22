# CopiwayPRO

Plataforma multi-rol para una dark kitchen (Cliente, Administrador, Ayudante de Cocina, Domiciliario y Programador). Backend PHP plano (sin framework, sin Composer, MySQLi con prepared statements) + MySQL, frontend React/Vite renderizado por PHP como una SPA server-driven (sin React Router).

Corre 100% en local con **`localhost`** — sin dominios `.test` obligatorios y sin tocar el archivo `hosts` de Windows.

## Arquitectura

```
/app
  /Controllers   Un controlador por recurso de la API + PaginaController (paginas HTML)
  /Core          helpers.php (rutas, sesion, CSRF, autoload, despacho), Auth.php
  /Models        Un modelo por tabla (Usuario, Cliente, Producto, Ingrediente, Pedido, Personal, Configuracion, Caja...)
  /Views
    /layouts     cabecera.php / pie.php (shell HTML que monta el bundle de React)
    /paginas     Una vista delgada por pantalla (landing, login, admin, cliente, cocina, domiciliario...)
    /json        Funciones que dan forma al JSON de cada endpoint (camelCase, igual que siempre consumio el frontend)
/config          database.php, rutas.php (API), paginas.php (paginas HTML)
/database        schema.sql (esquema completo) y seed.sql (datos demo opcionales)
/docs            documentacion y baseline de verificacion (docs/baseline)
/public          Front controller unico (index.php, <=40 lineas) + build compilado (assets/main.js, assets/main.css)
/storage         logs/, uploads/
/bin             create-admin.php (CLI para el rol Programador)
/src             Frontend React — presentacion pura: sin fetch ni logica de negocio fuera de src/servicios y src/store
install.bat      Instala todo (BD, dependencias, build) de un solo paso
start.bat        Sirve el sitio en http://localhost:8000/ sin Apache
```

No hay `namespace`, no hay Composer/autoload de paquetes externos, no hay clases de framework genericas (Router/Request/Response/Validator): las rutas son arrays planos en `config/`, el despacho lo hace `app/Core/helpers.php` (`despacharRuta()` para `/api/*`, `despacharPagina()` para paginas), y cada modelo abre su propia conexion MySQLi (`global $conn`) con un helper `consulta($sql, $parametros)` que infiere el tipo de cada parametro para `bind_param` automaticamente.

**Flujo de una petición API**: `.htaccess` → `public/index.php` → `despacharRuta()` (lee `config/rutas.php`, exige sesion/rol si aplica) → `Controller::metodo()` → `Model` (MySQLi + prepared statements) → `responderJson()`.

**Flujo de una petición de página**: `.htaccess` → `public/index.php` → `despacharPagina()` (lee `config/paginas.php`) → `PaginaController::metodo()` → `mostrarVista()` renderiza `app/Views/layouts/cabecera.php` + la vista + `pie.php`. El layout inyecta `window.__APP_BASE__` y `window.__DATOS__` (usuario en sesion, CSRF token, settings de tienda) y monta `<div id="app" data-pagina="...">`. `src/main.tsx` lee ese `data-pagina` y monta el componente de React correspondiente — **no hay React Router**: navegar entre pantallas es una recarga normal de pagina (`window.location.href`, via el helper `irA()` de `src/servicios/api.ts`), igual que un sitio multipagina clasico.

## Instalación (automática)

```powershell
cd C:\laragon\www\copiwaypro
install.bat
```

`install.bat` detecta el PHP/MySQL de Laragon (cualquier versión instalada), verifica que MySQL esté activo, crea la base de datos desde `database\schema.sql`, ofrece cargar datos de demo (`database\seed.sql`), copia `.env.example` a `.env` si no existe, e instala y compila el frontend (`npm install` + `npm run build`). No hay paso de Composer: el backend es PHP plano sin dependencias externas. Al final te indica la URL exacta para abrir.

## Instalación manual (paso a paso)

1. **Crea la base de datos**:
   ```powershell
   cd C:\laragon\www\copiwaypro
   "C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysql.exe" -u root --default-character-set=utf8mb4 < database\schema.sql
   ```
   (Ajusta la ruta de `mysql.exe` a la versión que tengas instalada en `C:\laragon\bin\mysql\`. El flag `--default-character-set=utf8mb4` es importante: sin él, los nombres con tildes/ñ quedan corruptos al importar.) Esto crea la base `hamburguer_copiway` con las tablas, triggers de UUID/PIN, y la fila inicial de configuración.

   **(Opcional)** Datos de demostración — **nunca en producción**:
   ```powershell
   "C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysql.exe" -u root --default-character-set=utf8mb4 hamburguer_copiway < database\seed.sql
   ```
   | Rol | Correo | Contraseña |
   |---|---|---|
   | Programador | programador@copiway.com | Copiway2024! |
   | Administrador | admin@copiway.com | Copiway2024! |
   | Ayudante de Cocina | carlos.mendoza@copiway.com | Copiway2024! |
   | Domiciliario | valentina.rojas@copiway.com | Copiway2024! |
   | Cliente | juan.perez@email.com | Cliente2024! |

2. **Variables de entorno**: `copy .env.example .env`. No hace falta editar nada para desarrollo local estándar de Laragon (MySQL sin contraseña en `127.0.0.1:3306`).

3. **Frontend**: `npm install` y luego `npm run build` (compila a `public/assets/main.js` y `public/assets/main.css`, con nombres fijos — sin hash — para que PHP los referencie directo con `?v=filemtime()` como cache-busting).

4. **Primer Administrador** (opcional si ya cargaste `seed.sql`): `php bin\create-admin.php`

## Cómo abrir el sitio

### A) Vhost de Laragon (recomendado): `http://copiwaypro.test/`

Si "Auto Virtual Hosts" está activo en Laragon (**Menú → Preferencias → Auto Virtual Hosts**), el proyecto en `C:\laragon\www\copiwaypro` queda disponible automáticamente en **`http://copiwaypro.test/`**.

### B) Subcarpeta bajo `localhost`: `http://localhost/copiwaypro/`

Con el proyecto en `C:\laragon\www\copiwaypro`, también abre en **`http://localhost/copiwaypro/`** (Apache por defecto sirve `C:\laragon\www` como raíz, y `copiwaypro/` es la subcarpeta del proyecto).

> ⚠️ **`http://localhost/` a secas NO es el sitio** — es la página de bienvenida de Laragon que lista todos los proyectos en `www\`. Si ves un 404 en una ruta como `/login`, casi siempre es porque falta el prefijo `/copiwaypro/` (o el dominio `copiwaypro.test`) en la URL. Los enlaces internos de la app (botones, `irA()`, redirecciones del backend) siempre construyen la URL correcta con `window.__APP_BASE__` — el problema solo aparece al teclear la URL a mano u olvidar el prefijo en un bookmark.

### C) Servidor embebido de PHP (sin Apache)

```powershell
start.bat
```
Abre **`http://localhost:8000/`**. Usa `public/server-router.php`, que sirve los archivos estáticos ya compilados y enruta `/api/*` y el resto de rutas igual que el `.htaccess`.

### D) Desarrollo con recarga en caliente (Vite)

```powershell
npm run dev
```
Levanta Vite en `http://localhost:3000` con proxy de `/api/*` hacia el backend (por defecto `http://localhost:8000`, es decir, corre `start.bat` en paralelo). Si prefieres usar el método A/B (Apache) como backend mientras desarrollas, cambia `VITE_API_PROXY_TARGET` en `.env`.

Los cuatro métodos usan **el mismo build** (`public/assets/main.js` + `public/assets/main.css`) — no hay que recompilar para cambiar de método.

### Convenciones de nombres

- Clases y archivos PHP: PascalCase y nombres en español para Modelos/Vistas (`Usuario`, `Cliente`, `Producto`, `Ingrediente`, `Pedido`, `Personal`, `Configuracion`, `Caja`).
- Vistas y carpetas de frontend: nombres de directorio y archivo en minúsculas con guiones o PascalCase para componentes React.
- Métodos y variables: camelCase descriptivo.

## Rutas 100% portables

- **Ruta base**: `rutaBase()` en `app/Core/helpers.php` la calcula sola a partir de `SCRIPT_NAME` en cada petición (o se puede fijar a mano con `APP_BASE_PATH` en `.env`). Nunca hay una ruta escrita a mano en el backend.
- **Assets (JS/CSS)**: `app/Views/layouts/cabecera.php`/`pie.php` construyen la URL de `main.js`/`main.css` como `rutaBase() . '/assets/...'`, así que cargan igual sin importar la subcarpeta o el dominio.
- **Navegación de página (sin React Router)**: `src/main.tsx` monta el componente según `data-pagina`; `src/servicios/api.ts` expone `irA(ruta)` (`window.location.href = rutaBase() + ruta`) y `rutaBase()` (lee `window.__APP_BASE__`, inyectado por el layout PHP) para cualquier navegación o `<a href>` del frontend.
- **Cliente API** (`src/servicios/api.ts`): la URL base de la API es `rutaBase() + '/api'` — nunca un dominio fijo.
- **Cookies de sesión**: sin `Domain` fijo, `Path` según la ruta base detectada, `Secure` solo si la conexión es HTTPS, `SameSite=Lax`. Funcionan en `http://localhost` sin HTTPS.

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

Todas las rutas mutadoras validan sesión y rol vía `requiereSesion()`/`requiereRol()`; las de catálogo (`products`, `ingredients`, `settings` en modo lectura) son públicas para que el sitio funcione antes de iniciar sesión.

- `POST /api/auth/login|register|logout`, `GET /api/auth/me`
- `POST /api/auth/forgot-password/request|reset`
- `GET/POST/PUT/DELETE /api/products`, `/api/ingredients`, `/api/inventory`, `/api/inventory-logs`
- `GET/POST/PUT/DELETE /api/staff` (soft delete), `PATCH /api/staff/{id}/location`
- `GET/PUT /api/clients`, `/api/clients/{id}/notifications`
- `GET/POST /api/orders`, `PATCH /api/orders/{id}/preparing|ready|accept|deliver|review`
- `GET/PUT /api/settings`, `/api/settings/categories`
- `POST/GET /api/cash-closing`, `GET /api/dashboard`
- `GET /api/sync` — polling con ETag (responde `304` si nada cambió)

## Migración desde Firebase/Firestore

Este proyecto reemplaza por completo el backend original (Firebase/Firestore) por PHP plano + MySQL (MySQLi, prepared statements), manteniendo el frontend visualmente idéntico. Puntos clave:

- **Cero credenciales en el código**: el login original (y los mini-logins embebidos en los paneles de cocina/domiciliario) tenían contraseñas y atajos hardcodeados. Todo esto se eliminó; la autenticación es 100% server-side con `password_hash`/`password_verify`.
- **Reglas de negocio en el servidor**: horario de atención, tarifa de domicilio, descuento de inventario (con `SELECT ... FOR UPDATE` dentro de una transacción), puntos de fidelización y PIN de entrega se validan y calculan en PHP.
- **Cierre de caja persistente**: `POST /api/cash-closing` calcula el consumo real a partir de las recetas vendidas, archiva los pedidos del turno (no los borra) y liquida a cada domiciliario.
- **Sin dependencia de Firebase, Composer ni dominios fijos**: no queda ninguna referencia a Firebase, ni a paquetes de Composer, ni a URLs absolutas escritas a mano.

## Notas de seguridad para producción

- Cambia **todas** las contraseñas demo del `seed.sql` (o no lo ejecutes en producción).
- Pon `APP_DEBUG=false` y `APP_ENV=production` en `.env`.
- Sirve el sitio por HTTPS (las cookies de sesión se marcan `secure` automáticamente si `HTTPS`/`X-Forwarded-Proto` lo indican).
- Antes de salir a producción, revisa `docs/baseline/FUNCIONES_Y_VALIDACIONES.md` — documenta el checklist de paridad funcional y los gaps de seguridad pendientes (CSRF sin aplicar a rutas mutadoras, tope de intentos en verificación de código de recuperación, exposición de `deliveryPin`/datos de producto, entre otros).
