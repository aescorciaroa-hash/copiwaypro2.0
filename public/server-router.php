<?php

/**
 * Router para el servidor embebido de PHP (php -S localhost:8000 -t public public/server-router.php).
 * Sirve archivos estaticos que existan tal cual; todo lo demas va a la API o
 * a la vista PHP de la SPA, igual que hace el .htaccess con Apache.
 */

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

// Archivo estatico real dentro de public/ (assets compilados por Vite, etc.)
$file = __DIR__ . $uri;
if ($uri !== '/' && is_file($file)) {
    return false; // deja que el servidor embebido lo sirva directamente
}

if (preg_match('#^/api(/|$)#', $uri)) {
    require __DIR__ . '/index.php';
    return true;
}

require __DIR__ . '/spa.php';
return true;
