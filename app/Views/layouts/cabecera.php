<?php
// $datos y $pagina ya estan definidos por la vista que incluye este layout.
// Nombres de archivo FIJOS (sin hash, sin manifest) definidos en vite.config.ts;
// el cache-busting se hace aqui con ?v=filemtime(), no con el nombre del archivo.

$rutaAssets = dirname(__DIR__, 3) . '/public/assets';
$verCss = @filemtime($rutaAssets . '/main.css') ?: time();

$datosJson = json_encode($datos, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
$baseJson = json_encode(rutaBase());

header('Content-Type: text/html; charset=utf-8');
?><!doctype html>
<html lang="es">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CopiwayPRO</title>
    <link rel="stylesheet" href="<?php echo rutaBase(); ?>/assets/main.css?v=<?php echo $verCss; ?>">
    <script>window.__APP_BASE__=<?php echo $baseJson; ?>;window.__DATOS__=<?php echo $datosJson; ?>;</script>
</head>
<body>
    <div id="app" data-pagina="<?php echo htmlspecialchars($pagina, ENT_QUOTES); ?>">
