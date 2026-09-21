<?php
// Front controller unico de la API. Sin namespaces, sin Composer.

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

despacharRuta($_SERVER['REQUEST_METHOD'], $ruta);
