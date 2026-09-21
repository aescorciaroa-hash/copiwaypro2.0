<?php

namespace App\Models;

use App\Core\Model;

class VerificationCode extends Model
{
    public static function createForClient(string $clientId, string $code): void
    {
        $pdo = static::db();
        $stmt = $pdo->prepare(
            'INSERT INTO CODIGO_VERIFICACION (id_codigo, id_cliente, codigo_hash, canal_envio, fecha_expiracion)
             VALUES (?, ?, ?, \'email\', DATE_ADD(NOW(), INTERVAL 15 MINUTE))'
        );
        $stmt->execute(['', $clientId, password_hash($code, PASSWORD_DEFAULT)]);
    }

    public static function findValidForEmail(string $email): ?array
    {
        $pdo = static::db();
        $stmt = $pdo->prepare(
            'SELECT cv.* FROM CODIGO_VERIFICACION cv
             JOIN CLIENTE c ON c.id_cliente = cv.id_cliente
             WHERE c.correo = ? AND cv.usado = 0 AND cv.fecha_expiracion > NOW()
             ORDER BY cv.fecha_generacion DESC'
        );
        $stmt->execute([$email]);

        return $stmt->fetch() ?: null;
    }

    public static function markUsed(string $idCodigo): void
    {
        $pdo = static::db();
        $stmt = $pdo->prepare('UPDATE CODIGO_VERIFICACION SET usado = 1 WHERE id_codigo = ?');
        $stmt->execute([$idCodigo]);
    }
}
