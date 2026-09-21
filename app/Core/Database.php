<?php

namespace App\Core;

use PDO;
use PDOException;

class Database
{
    private static ?PDO $instance = null;

    /**
     * Centraliza la lectura de la configuración de conexión desde el archivo
     * config/database.php, manteniendo los valores de entorno como fallback.
     */
    private static function config(): array
    {
        static $config = null;

        if ($config === null) {
            $config = Config::load('database');
        }

        return $config;
    }

    public static function connection(): PDO
    {
        if (self::$instance === null) {
            $config = self::config();

            $host = Config::get('database', 'host', Env::get('DB_HOST', '127.0.0.1'));
            $port = Config::get('database', 'port', Env::get('DB_PORT', '3306'));
            $db = Config::get('database', 'database', Env::get('DB_NAME', 'hamburguer_copiway'));
            $user = Config::get('database', 'username', Env::get('DB_USER', 'root'));
            $pass = Config::get('database', 'password', Env::get('DB_PASS', ''));
            $charset = Config::get('database', 'charset', Env::get('DB_CHARSET', 'utf8mb4'));

            $dsn = "mysql:host={$host};port={$port};dbname={$db};charset={$charset}";

            try {
                self::$instance = new PDO($dsn, $user, $pass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]);
            } catch (PDOException $e) {
                Logger::error('Database connection failed: ' . $e->getMessage());
                throw $e;
            }
        }

        return self::$instance;
    }
}
