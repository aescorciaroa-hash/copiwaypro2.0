<?php

namespace App\Models;

use App\Core\Model;

class LoginAttempt extends Model
{
    public static function record(string $identifier, string $ip, bool $success): void
    {
        $pdo = static::db();
        $stmt = $pdo->prepare(
            'INSERT INTO INTENTO_LOGIN (id_intento, identificador, ip, exitoso) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute(['', $identifier, $ip, $success ? 1 : 0]);
    }
}
