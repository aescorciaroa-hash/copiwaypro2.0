<?php

require __DIR__ . '/../config/database.php';
require __DIR__ . '/../app/Core/helpers.php';

$basePath = rutaBase();

$indexPath = __DIR__ . '/index.html';

if (!is_file($indexPath)) {
    http_response_code(500);
    echo 'El frontend aun no ha sido compilado. Ejecuta: npm install && npm run build';
    exit;
}

$html = file_get_contents($indexPath);

// Inyecta la ruta base detectada ANTES de los scripts compilados, para que
// React Router (basename) y el cliente API (src/lib/api.ts) sepan bajo que
// subcarpeta esta montada la app, sin tocar el HTML/CSS generado por Vite.
$inject = '<script>window.__APP_BASE__=' . json_encode($basePath) . ';</script>' . "\n";
$html = preg_replace('#(<head[^>]*>)#i', '$1' . "\n" . $inject, $html, 1) ?? ($inject . $html);

header('Content-Type: text/html; charset=utf-8');
echo $html;
