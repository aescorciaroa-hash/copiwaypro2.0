<?php

namespace App\Core;

class Logger
{
    private static function path(string $file): string
    {
        $dir = dirname(__DIR__, 2) . '/storage/logs';
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        return $dir . '/' . $file;
    }

    private static function write(string $file, string $level, string $message): void
    {
        $line = sprintf("[%s] %s: %s\n", date('Y-m-d H:i:s'), $level, $message);
        file_put_contents(self::path($file), $line, FILE_APPEND | LOCK_EX);
    }

    public static function error(string $message): void
    {
        self::write('error.log', 'ERROR', $message);
    }

    public static function info(string $message): void
    {
        self::write('app.log', 'INFO', $message);
    }

    public static function security(string $message): void
    {
        self::write('security.log', 'SECURITY', $message);
    }
}
