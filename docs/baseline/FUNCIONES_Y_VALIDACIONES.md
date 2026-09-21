# Línea base — Fase 0

Capturado el 2026-09-21, antes de iniciar el refactor a MVC "sencillo" (MySQLi, sin namespaces/Composer). Este documento es la referencia de paridad: al final de la Fase 5 cada punto debe seguir cumpliéndose exactamente igual.

## Respuestas JSON de referencia

En `docs/baseline/json/`, capturadas contra una base recién sembrada (`database/schema.sql` + `database/seed.sql`), servidor embebido de PHP (`public/server-router.php`), sin datos generados por pruebas previas:

- `products.json`, `settings.json`, `ingredients.json` — catálogo público (sin sesión).
- `auth_login_admin|kitchen|delivery|client.json` — respuesta de `POST /api/auth/login` por rol.
- `auth_me_admin.json` — `GET /api/auth/me`.
- `staff.json`, `clients.json`, `inventory.json`, `inventory_logs.json`, `dashboard.json` — vistas de admin.
- `orders_admin|client|kitchen|delivery.json` — `GET /api/orders` visto por cada rol (verifica el filtrado por rol y la visibilidad condicional de `clientPhone`).
- `sync_admin.json`, `sync_client.json` — `GET /api/sync`, payload filtrado por rol.

**Verificación en Fase 5:** repetir exactamente esta secuencia de comandos (ver abajo) contra el código refactorizado y diff byte a byte (excepto IDs/UUIDs/timestamps/PINs, que son no-determinísticos por diseño).

## Inventario de funciones y validaciones que deben sobrevivir

### Autenticación y cuentas
- [ ] Login: 4 tablas de roles (`ADMINISTRADOR`, `AYUDANTE_COCINA`, `DOMICILIARIO`, `CLIENTE`), `password_verify` contra hash bcrypt — `App\Core\Auth::attempt()`.
- [ ] **Límite de intentos**: 5 fallos en 15 min por correo **o** IP, IP = `REMOTE_ADDR` exclusivamente (nunca `X-Forwarded-For`) — `App\Middleware\RateLimitMiddleware`, tabla `INTENTO_LOGIN`. *(Nota: hoy `Request::ip()` sí mira `X-Forwarded-For`/`X-Client-IP` para otros usos — el rate limit de login debe fijarse a `REMOTE_ADDR` puro; ya es así en `RateLimitMiddleware` al usar `$request->ip()`... revisar en Fase 6 si `ip()` genérico se reutiliza ahí, puede requerir separar.)*
- [ ] Cuenta inactiva (`activo=0`) sin acceso — chequeado en `Auth::attempt()` y en cada petición autenticada vía `Auth::user()`.
- [ ] `session_regenerate_id(true)` al iniciar sesión — `Auth::login()` → `Session::regenerate()`.
- [ ] Cookies `HttpOnly` + `SameSite=Lax`, `Secure` solo si HTTPS, `Path` según base detectada — `Session::start()`.
- [ ] Correo único entre las 4 tablas de cuentas — hoy se verifica indirectamente (cada tabla tiene `UNIQUE` en `correo`); falta una comprobación cruzada explícita antes de insertar (verificar si ya existe o si hay que añadirla).
- [ ] Contraseña mínima 8 caracteres — `Validator::minLength` en `AuthController::register()`; falta confirmarlo también en creación de personal (`StaffController`) y en reset de contraseña.
- [ ] Habeas Data obligatorio, `fecha_aceptacion_habeas_data` + `ip_aceptacion_habeas_data` `NOT NULL` — `AuthController::register()`, `Client::create()`.
- [ ] Recuperación de contraseña real: código de 6 dígitos, guardado con `password_hash`, expira 15 min, un solo uso (`usado=1` tras consumirse) — `AuthController::forgotPasswordRequest/Reset()`, tabla `CODIGO_VERIFICACION`. **Falta hoy:** tope de 5 intentos de verificación del código (no implementado — agregar en refactor). **Falta hoy:** el modo debug (`APP_DEBUG`) devuelve el código en la respuesta — restringir explícitamente a `APP_ENV=local`, no solo `APP_DEBUG=true`.
- [ ] CSRF: `Session::csrfToken()` existe y `CsrfMiddleware` existe, pero **no está aplicado a ninguna ruta todavía** (gap real, confirmado en `config/routes.php` — ninguna ruta usa `CsrfMiddleware::class`). Debe aplicarse en el refactor.

### Pedidos e inventario
- [ ] Horario de tienda + pausa de emergencia bloquean el pago — `Setting::isStoreOpenNow()`, `OrderService::create()`.
- [ ] Precios y totales recalculados en servidor, nunca confiando en el cliente — `OrderService::create()`.
- [ ] Tarifa plana de domicilio solo la cambia el admin, aplicada por servidor — `Setting::shippingRate()`.
- [ ] Descuento de cumpleaños 15% calculado en servidor — `OrderService::birthdayDiscount()`.
- [ ] Puntos de fidelización `floor(total/1000)` calculados en servidor — `OrderService::create()`.
- [ ] Descuento de inventario por receta dentro de transacción con `SELECT ... FOR UPDATE`, rechazo con mensaje claro si falta stock — `InventoryService::deduct()`.
- [ ] PIN de entrega de 4 dígitos generado en servidor (trigger SQL) y verificado en servidor antes de marcar entregado — `OrderService::confirmDelivery()`.
- [ ] Transiciones de estado válidas por rol (cocina prepara/lista; domiciliario acepta/entrega) — `OrderService::markPreparing/markReady/acceptDelivery/confirmDelivery()`.
- [ ] Teléfono del cliente visible al domiciliario solo mientras el pedido está "En Camino" — `Order::shape()`.
- [ ] **Falta hoy (gap real, para Fase 6):** `deliveryPin` se devuelve en el JSON de pedido a **cualquiera** que pueda verlo (admin/cocina incluidos), no solo al cliente dueño.
- [ ] **Falta hoy:** `GET /api/orders/{id}` no valida que el solicitante sea el dueño o admin/cocina — cualquier usuario autenticado puede pedir cualquier ID.
- [ ] Cierre de caja: archiva pedidos (asigna `id_reporte`, no borra), liquida domiciliarios, calcula consumo real de insumos — `CashClosingService::generate()`. **Falta hoy:** "Generar" ya persiste directamente (no hay paso de vista previa separado de confirmación) — Fase 6 pide separar preview/confirmación.
- [ ] Soft delete de personal (`activo=0`, nunca `DELETE`) — `Staff::softDelete()` (nombre exacto a verificar en el modelo actual).

### Rutas y control de acceso
- [ ] Todas las rutas mutadoras protegidas por `RoleMiddleware` según rol.
- [ ] Catálogo público (`products` activos, `ingredients`, `settings` lectura) sin sesión.
- [ ] **Falta hoy:** `costPrice`, receta completa y `stock` interno viajan en `GET /api/products` público (visible a cualquiera, no solo admin) — gap de Fase 6.

## Estructura de archivos ya renombrada (fuera de esta sesión, se toma como base)

- `src/store/almacenAplicacion.ts` (antes `useStore.ts`)
- `src/lib/apiBackend.ts` (antes `api.ts`)
- `src/utils/generarCierrePdf.ts` (antes `generateCierrePDF.ts`)
- `public/spa.php` (antes `app.php`), `public/server-router.php` (antes `router.php`)
- `app/Core/Config.php` (nuevo, no existía en la sesión anterior)

## Build / lint

- `npx tsc --noEmit`: **3 errores preexistentes** en `KitchenDashboard.tsx` (líneas 490/516/543, prop `key` en `OrderCard`) — no relacionados con el backend, ya presentes antes de este refactor. Deben seguir siendo los únicos errores (o cero, si Fase 4 los corrige al dividir el componente).
- `npm run build`: compila sin errores, bundle principal ~1.86MB (advertencia de tamaño de chunk, no error).
