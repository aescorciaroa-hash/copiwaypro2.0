<?php
// Conexion a MySQL con MySQLi. Sin Composer, sin namespaces.
// Expone $conn (mysqli) para que los modelos hagan sus propias consultas preparadas.

/**
 * Lee un archivo .env simple (KEY=VALOR por linea, admite comentarios con #
 * y lineas vacias). No usamos parse_ini_file porque los comentarios con #
 * y valores con caracteres especiales le rompen el parseo.
 */
function leerEnv($ruta) {
    $valores = [];
    if (!is_file($ruta)) {
        return $valores;
    }

    $lineas = file($ruta, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lineas as $linea) {
        $linea = trim($linea);
        if ($linea === '' || $linea[0] === '#') {
            continue;
        }
        if (strpos($linea, '=') === false) {
            continue;
        }
        list($clave, $valor) = explode('=', $linea, 2);
        $clave = trim($clave);
        $valor = trim($valor);
        // Quita comillas envolventes si las hay.
        if (strlen($valor) >= 2 && ($valor[0] === '"' || $valor[0] === "'") && $valor[strlen($valor) - 1] === $valor[0]) {
            $valor = substr($valor, 1, -1);
        }
        $valores[$clave] = $valor;
    }
    return $valores;
}

$raizProyecto = dirname(__DIR__);
$env = array_merge(leerEnv($raizProyecto . '/.env.example'), leerEnv($raizProyecto . '/.env'));

foreach ($env as $clave => $valor) {
    if (getenv($clave) === false) {
        putenv($clave . '=' . $valor);
    }
    if (!isset($_ENV[$clave])) {
        $_ENV[$clave] = $valor;
    }
}

function env($clave, $porDefecto = null) {
    $valor = $_ENV[$clave] ?? getenv($clave);
    if ($valor === false || $valor === null || $valor === '') {
        return $porDefecto;
    }
    if ($valor === 'true') return true;
    if ($valor === 'false') return false;
    return $valor;
}

$dbHost = env('DB_HOST', '127.0.0.1');
$dbPuerto = (int) env('DB_PORT', 3306);
$dbNombre = env('DB_NAME', 'hamburguer_copiway');
$dbUsuario = env('DB_USER', 'root');
$dbClave = env('DB_PASS', '');

try {
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    $conn = new mysqli($dbHost, $dbUsuario, $dbClave, $dbNombre, $dbPuerto);
    $conn->set_charset('utf8mb4');
    $conn->query("SET time_zone = '-05:00'");
} catch (mysqli_sql_exception $e) {
    // Nunca mostrar host/usuario/mensaje tecnico al usuario final.
    error_log('Error de conexion a la base de datos: ' . $e->getMessage());
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Ocurrio un error interno. Intenta de nuevo mas tarde.']);
    exit;
}
