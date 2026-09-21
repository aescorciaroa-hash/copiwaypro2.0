<?php

use App\Core\Env;

return [
    'name' => 'CopiwayPRO',
    'env' => Env::get('APP_ENV', 'production'),
    'debug' => Env::get('APP_DEBUG', false),
    'key' => Env::get('APP_KEY', ''),
    'timezone' => Env::get('APP_TIMEZONE', 'America/Bogota'),
    // Ruta base bajo el host (ej. '/copiwaypro'). Vacio si el string no se
    // detecta o si la app vive en la raiz del dominio. Ver App\Core\BasePath.
    'base_path' => Env::get('APP_BASE_PATH', ''),
];
