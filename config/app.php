<?php
// Configuracion general de la app. require_once database.php antes de este archivo
// para que env() ya este disponible.

return [
    'nombre' => 'CopiwayPRO',
    'entorno' => env('APP_ENV', 'production'),
    'debug' => env('APP_DEBUG', false),
    'zona_horaria' => env('APP_TIMEZONE', 'America/Bogota'),
    'ruta_base' => env('APP_BASE_PATH', ''),
];
