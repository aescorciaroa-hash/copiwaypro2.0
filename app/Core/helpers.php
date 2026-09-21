<?php
// Funciones de ayuda usadas en toda la app. Sin clases, sin namespaces.

// Funciones puras "fila cruda -> JSON camelCase" usadas por los Models para dar
// forma a la respuesta que espera el frontend. Sin clases, sin namespaces
// (igual estilo que este archivo); se cargan aqui porque helpers.php es lo
// primero que requieren todos los puntos de entrada (public/index.php, y
// public/server-router.php que a su vez requiere index.php).
require_once dirname(__DIR__) . '/Views/json/pedido.php';
require_once dirname(__DIR__) . '/Views/json/ingrediente.php';
require_once dirname(__DIR__) . '/Views/json/cliente.php';
require_once dirname(__DIR__) . '/Views/json/producto.php';
require_once dirname(__DIR__) . '/Views/json/personal.php';

/**
 * Ruta base bajo la que corre la app (ej. '/copiwaypro'), para que las rutas
 * y el front de React funcionen igual en subcarpeta, servidor embebido o raiz.
 * APP_BASE_PATH en .env la sobreescribe si hace falta.
 */
function rutaBase() {
    static $base = null;
    if ($base !== null) {
        return $base;
    }

    $forzada = env('APP_BASE_PATH', '');
    if ($forzada !== '') {
        return $base = rtrim($forzada, '/');
    }

    $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
    $directorioScript = str_replace('\\', '/', dirname($scriptName));
    $calculada = preg_replace('#/public$#', '', $directorioScript);
    $calculada = rtrim($calculada, '/');

    if ($calculada === '' || $calculada === '.') {
        return $base = '';
    }
    return $base = $calculada;
}

/** Quita el prefijo de ruta base de un path (p.ej. REQUEST_URI). */
function quitarRutaBase($path) {
    $base = rutaBase();
    if ($base !== '' && strpos($path, $base) === 0) {
        $path = substr($path, strlen($base));
    }
    return $path === '' ? '/' : $path;
}

/** Carga Controllers/Models por nombre de clase, sin Composer. */
function registrarAutoload() {
    spl_autoload_register(function ($clase) {
        foreach (['Controllers', 'Models'] as $carpeta) {
            $ruta = dirname(__DIR__) . "/$carpeta/$clase.php";
            if (is_file($ruta)) {
                require $ruta;
                return;
            }
        }
    });
}

/** Si algo revienta sin capturar, log real + mensaje generico (nunca detalles tecnicos). */
function configurarManejadorErrores() {
    set_exception_handler(function ($e) {
        error_log($e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
        $debug = env('APP_DEBUG', false);
        responderError(
            $debug ? $e->getMessage() : 'Ocurrio un error interno.',
            500,
            $debug ? ['trace' => explode("\n", $e->getTraceAsString())] : []
        );
    });
}

/** Cabeceras de seguridad + CORS de mismo origen (sin dominio fijo). */
function configurarSeguridadHttp() {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header("Content-Security-Policy: default-src 'self'");

    $origen = $_SERVER['HTTP_ORIGIN'] ?? '';
    $host = explode(':', $_SERVER['HTTP_HOST'] ?? '')[0];
    if ($origen !== '' && parse_url($origen, PHP_URL_HOST) === $host) {
        header("Access-Control-Allow-Origin: $origen");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    }
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/** Genera un UUID v4 (para los inserts que lo necesiten). */
function generarUuid() {
    $datos = random_bytes(16);
    $datos[6] = chr(ord($datos[6]) & 0x0f | 0x40);
    $datos[8] = chr(ord($datos[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($datos), 4));
}

/** Guarda un aviso para mostrar en la siguiente pantalla (login, formularios, etc.). */
function mensaje($tipo, $titulo, $texto) {
    $_SESSION['_flash'] = ['tipo' => $tipo, 'titulo' => $titulo, 'texto' => $texto];
}

/** Toma el aviso guardado (si hay) y lo borra, para no repetirlo al recargar. */
function tomarMensaje() {
    if (!isset($_SESSION['_flash'])) {
        return null;
    }
    $flash = $_SESSION['_flash'];
    unset($_SESSION['_flash']);
    return $flash;
}

/** Redirige (con la ruta base incluida) y termina la ejecucion. */
function redirect($ruta) {
    header('Location: ' . rutaBase() . $ruta);
    exit;
}

/** Token CSRF de la sesion actual; lo genera si todavia no existe. */
function csrfToken() {
    if (empty($_SESSION['_csrf'])) {
        $_SESSION['_csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['_csrf'];
}

/**
 * Verifica el token CSRF de la peticion actual (header X-CSRF-Token para
 * llamadas a la API en JSON, o campo _csrf para formularios POST normales).
 * Si no coincide, responde con error y termina.
 */
function verificarCsrf($rutaVuelta = null) {
    $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (in_array($metodo, ['GET', 'HEAD', 'OPTIONS'])) {
        return true;
    }

    $enviado = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ($_POST['_csrf'] ?? '');
    $esperado = $_SESSION['_csrf'] ?? '';

    if ($enviado === '' || $esperado === '' || !hash_equals($esperado, $enviado)) {
        if ($rutaVuelta !== null) {
            mensaje('danger', 'Formulario invalido', 'Tu sesion expiro o la peticion no es valida. Intenta de nuevo.');
            redirect($rutaVuelta);
        }
        responderError('Token CSRF invalido o ausente.', 419);
    }
    return true;
}

/** Responde en JSON y termina la ejecucion. */
function responderJson($datos, $codigo = 200) {
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Responde un error en JSON (con detalles de validacion opcionales) y termina. */
function responderError($mensaje, $codigo = 400, $detalles = []) {
    $cuerpo = ['error' => $mensaje];
    if (!empty($detalles)) {
        $cuerpo['errors'] = $detalles;
    }
    responderJson($cuerpo, $codigo);
}

/** Incluye una vista PHP de app/Views/paginas, con $datos disponibles como variables. */
function mostrarVista($vista, $datos = []) {
    extract($datos);
    $ruta = dirname(__DIR__) . '/Views/paginas/' . $vista . '.php';
    if (!is_file($ruta)) {
        http_response_code(500);
        echo 'Vista no encontrada: ' . htmlspecialchars($vista);
        exit;
    }
    require $ruta;
}

/**
 * Exige una sesion activa Y VIGENTE: vuelve a leer la cuenta en la base de
 * datos para que una cuenta desactivada (activo=0) pierda el acceso de
 * inmediato, no solo la proxima vez que inicie sesion. Devuelve el usuario.
 */
function requiereSesion($esApi = true) {
    global $conn;

    if (!isset($_SESSION['usuario_id'], $_SESSION['usuario_rol'])) {
        if ($esApi) {
            responderError('No autenticado.', 401);
        }
        redirect('/login');
    }

    $auth = new Autenticacion($conn);
    $usuario = $auth->usuarioActual();
    if ($usuario === null) {
        if ($esApi) {
            responderError('Sesion invalida o cuenta inactiva.', 401);
        }
        redirect('/login');
    }
    return $usuario;
}

/** Exige uno de los roles dados (y sesion vigente). Devuelve el usuario. */
function requiereRol($roles, $esApi = true) {
    $usuario = requiereSesion($esApi);
    if (!in_array($_SESSION['usuario_rol'], $roles)) {
        if ($esApi) {
            responderError('No autorizado para este recurso.', 403);
        }
        redirect('/login');
    }
    return $usuario;
}

/**
 * Recorre config/rutas.php, encuentra la ruta que coincide con metodo+path,
 * exige el rol si hace falta, e invoca [Controlador, accion](...parametros).
 */
function despacharRuta($metodo, $ruta) {
    $tabla = require dirname(__DIR__, 2) . '/config/rutas.php';
    $huboCoincidenciaDePath = false;

    foreach ($tabla as $clave => $destino) {
        list($metodoRuta, $patron) = explode(' ', $clave, 2);
        $regex = preg_replace('#\{[a-zA-Z_]+\}#', '([^/]+)', $patron);
        $regex = '#^' . $regex . '$#';

        if (!preg_match($regex, $ruta, $coincidencias)) {
            continue;
        }
        $huboCoincidenciaDePath = true;

        if ($metodoRuta !== $metodo) {
            continue;
        }

        list($controlador, $accion, $roles) = $destino;
        if (!empty($roles)) {
            requiereRol($roles);
        }

        array_shift($coincidencias);
        $instancia = new $controlador();
        call_user_func_array([$instancia, $accion], $coincidencias);
        return;
    }

    if ($huboCoincidenciaDePath) {
        responderError('Metodo no permitido.', 405);
    }
    responderError('Ruta no encontrada.', 404);
}

/**
 * Recorre config/paginas.php, exige el rol si hace falta (modo pagina: si
 * no hay sesion o el rol no coincide, redirige a /login en vez de dar 401/403
 * en JSON), e invoca [Controlador, accion]().
 */
function despacharPagina($ruta) {
    $tabla = require dirname(__DIR__, 2) . '/config/paginas.php';

    if (!isset($tabla[$ruta])) {
        http_response_code(404);
        echo 'Pagina no encontrada.';
        exit;
    }

    list($controlador, $accion, $roles) = $tabla[$ruta];
    if (!empty($roles)) {
        requiereRol($roles, false);
    }

    $instancia = new $controlador();
    $instancia->$accion();
}

/**
 * Sirve el bundle de React (public/index.html, compilado por Vite) inyectando
 * window.__APP_BASE__ y window.__DATOS__ (usuario en sesion, rol, csrfToken,
 * configuracion de la tienda) ANTES de los scripts. El componente montado es
 * el mismo para toda la SPA, asi que el diseño no cambia entre paginas; lo
 * unico que cambia es que datos ya vienen listos sin una llamada extra.
 */
function renderizarSpa($datos) {
    $rutaIndex = dirname(__DIR__, 2) . '/public/index.html';
    if (!is_file($rutaIndex)) {
        http_response_code(500);
        echo 'El frontend aun no ha sido compilado. Ejecuta: npm install && npm run build';
        exit;
    }

    $html = file_get_contents($rutaIndex);

    $datosJson = json_encode($datos, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
    $baseJson = json_encode(rutaBase());
    $inyeccion = "<script>window.__APP_BASE__=$baseJson;window.__DATOS__=$datosJson;</script>\n";
    $html = preg_replace('#(<head[^>]*>)#i', '$1' . "\n" . $inyeccion, $html, 1);
    if ($html === null) {
        $html = $inyeccion . file_get_contents($rutaIndex);
    }

    header('Content-Type: text/html; charset=utf-8');
    echo $html;
    exit;
}
