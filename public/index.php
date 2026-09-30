<?php
// Front controller unico de la app (API y paginas). Sin namespaces, sin Composer.

// Unica dependencia de Composer del proyecto (minishlink/web-push, ver
// composer.json): el resto de la app sigue sin namespaces ni Composer. Se
// guarda asi por si el deploy aun no corrio "composer install" (las push
// notifications simplemente no se envian, el resto de la app sigue igual).
if (is_file(__DIR__ . '/../vendor/autoload.php')) {
    require __DIR__ . '/../vendor/autoload.php';
}

require __DIR__ . '/../config/database.php';
$config = require __DIR__ . '/../config/app.php';
require __DIR__ . '/../app/Core/helpers.php';
require __DIR__ . '/../app/Core/Session.php';
require __DIR__ . '/../app/Core/Auth.php';

registrarAutoload();
configurarManejadorErrores();
date_default_timezone_set($config['zona_horaria']);
configurarSeguridadHttp();
iniciarSesion();

$ruta = quitarRutaBase(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');
$ruta = rtrim($ruta, '/') ?: '/';

if (strpos($ruta, '/api') === 0) {
    despacharRuta($_SERVER['REQUEST_METHOD'], $ruta);
} else {
    despacharPagina($ruta);
}
