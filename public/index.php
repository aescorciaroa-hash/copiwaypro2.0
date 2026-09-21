<?php

declare(strict_types=1);

use App\Core\Config;
use App\Core\Env;
use App\Core\Logger;
use App\Core\Request;
use App\Core\Response;
use App\Core\Router;
use App\Core\Session;

$root = dirname(__DIR__);

require $root . '/vendor/autoload.php';

Env::load($root);
date_default_timezone_set((string) Config::get('app', 'timezone', Env::get('APP_TIMEZONE', 'America/Bogota')));

// ---- Cabeceras de seguridad ----
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header("Content-Security-Policy: default-src 'self'");

// ---- CORS: solo mismo origen, sin dominio fijo ----
// Frontend y API viven bajo el mismo host (o se accede al backend via el proxy
// de Vite en desarrollo), asi que nunca hace falta un dominio fijo aqui: basta
// con comparar el host del header Origin contra el host de esta misma peticion.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    $originHost = parse_url($origin, PHP_URL_HOST);
    $currentHost = explode(':', $_SERVER['HTTP_HOST'] ?? '')[0];

    if ($originHost !== null && $originHost === $currentHost) {
        header("Access-Control-Allow-Origin: {$origin}");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token, Authorization');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    }
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

Session::start();

set_exception_handler(function (Throwable $e) {
    Logger::error($e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    $debug = Env::get('APP_DEBUG', false);
    Response::error(
        $debug ? $e->getMessage() : 'Ocurrió un error interno.',
        500,
        $debug ? ['trace' => $e->getTraceAsString()] : []
    );
});

$request = new Request();
$router = new Router();

(function (Router $router) use ($root) {
    require $root . '/config/routes.php';
})($router);

$router->dispatch($request);
