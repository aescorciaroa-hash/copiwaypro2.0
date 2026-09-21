<?php

namespace App\Core;

/**
 * Detecta la ruta base bajo la cual vive la app, para que funcione igual en:
 *  - http://localhost/<carpeta>/          (subcarpeta bajo un DocumentRoot compartido)
 *  - http://localhost:8000/               (servidor embebido de PHP, siempre en la raiz)
 *  - http://<lo-que-sea>/                 (cualquier vhost, siempre en la raiz)
 * sin depender de ningun dominio ni configuracion fija.
 *
 * SCRIPT_NAME refleja la ruta URL real del script PHP que atendio la
 * peticion (p.ej. '/copiwaypro/public/index.php' o '/public/index.php' o
 * '/index.php'). Le quitamos el segmento final '/public' (donde vive el
 * front controller) y lo que queda es la base real de la app.
 */
class BasePath
{
    private static ?string $cached = null;

    public static function detect(): string
    {
        if (self::$cached !== null) {
            return self::$cached;
        }

        $override = Env::get('APP_BASE_PATH', '');
        if ($override !== '') {
            return self::$cached = rtrim($override, '/');
        }

        $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
        $scriptDir = str_replace('\\', '/', dirname($scriptName));

        $base = preg_replace('#/public$#', '', $scriptDir);
        $base = rtrim($base, '/');

        if ($base === '' || $base === '.') {
            return self::$cached = '';
        }

        return self::$cached = $base;
    }

    /** Quita el prefijo de ruta base de un path (p.ej. REQUEST_URI) si esta presente. */
    public static function strip(string $path): string
    {
        $base = self::detect();
        if ($base !== '' && str_starts_with($path, $base)) {
            $path = substr($path, strlen($base));
        }
        return $path === '' ? '/' : $path;
    }
}
