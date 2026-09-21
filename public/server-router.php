<?php

/**
 * Router para el servidor embebido de PHP (php -S localhost:8000 -t public public/server-router.php).
 * Sirve archivos estaticos que existan tal cual; todo lo demas (API y
 * paginas) va al front controller unico, igual que hace el .htaccess.
 */

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

// Archivo estatico real dentro de public/ (assets compilados por Vite, etc.)
$file = __DIR__ . $uri;
if ($uri !== '/' && is_file($file)) {
    return false; // deja que el servidor embebido lo sirva directamente
}

require __DIR__ . '/index.php';
return true;
