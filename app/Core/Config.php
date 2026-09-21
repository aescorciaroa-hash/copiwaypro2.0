<?php

namespace App\Core;

class Config
{
    /**
     * Carga un bloque de configuración desde config/*.php.
     * Mantiene el comportamiento actual de la app y centraliza la lectura.
     */
    public static function load(string $name): array
    {
        $path = dirname(__DIR__, 2) . '/config/' . ltrim($name, '/') . '.php';

        if (!is_file($path)) {
            return [];
        }

        $config = require $path;

        return is_array($config) ? $config : [];
    }

    /**
     * Devuelve un valor del bloque de configuración, respetando el valor por
     * defecto si no existe la clave. Esto evita duplicar acceso directo a arrays.
     */
    public static function get(string $name, string $key, mixed $default = null): mixed
    {
        $config = self::load($name);

        if (!array_key_exists($key, $config)) {
            return $default;
        }

        return $config[$key];
    }
}
