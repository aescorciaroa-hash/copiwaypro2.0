<?php

namespace App\Models;

use App\Core\Model;

class CashClosingReport extends Model
{
    public static function byAdmin(string $adminId): array
    {
        $pdo = static::db();
        $stmt = $pdo->prepare(
            'SELECT id_reporte, fecha, total_ventas, total_efectivo, total_digital
             FROM REPORTE_CAJA WHERE id_admin = ? ORDER BY fecha DESC'
        );
        $stmt->execute([$adminId]);

        return $stmt->fetchAll();
    }
}
