<?php
// Arranque de la sesion PHP con cookies seguras. El resto del codigo usa
// $_SESSION directamente (sin envoltorio); no hace falta mas que esto.

function iniciarSesion() {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $duracionMinutos = (int) env('SESSION_LIFETIME', 120);
    $rutaCookie = rutaBase();
    if ($rutaCookie === '') {
        $rutaCookie = '/';
    } else {
        $rutaCookie .= '/';
    }

    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

    session_set_cookie_params([
        'lifetime' => $duracionMinutos * 60,
        'path' => $rutaCookie,
        'domain' => '',
        'secure' => $https,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    session_name(env('SESSION_NAME', 'copiway_session'));
    session_start();
}

function cerrarSesionCompleta() {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $parametros = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $parametros['path'], $parametros['domain'], $parametros['secure'], $parametros['httponly']);
    }
    session_destroy();
}
