<?php

namespace App\Models;

use App\Core\Model;

class DashboardSummary extends Model
{
    public static function summaryForToday(): array
    {
        $pdo = static::db();
        $today = date('Y-m-d');

        $salesToday = $pdo->prepare(
            "SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS cantidad
             FROM PEDIDO WHERE DATE(fecha_hora) = ? AND estado != 'cancelado'"
        );
        $salesToday->execute([$today]);
        $todayRow = $salesToday->fetch();

        $byStatus = $pdo->query(
            "SELECT estado, COUNT(*) AS cantidad FROM PEDIDO GROUP BY estado"
        )->fetchAll();

        $lowStock = $pdo->query(
            'SELECT id_ingrediente AS id, nombre AS name, cantidad_stock AS stock, umbral_minimo AS threshold
             FROM INGREDIENTE WHERE cantidad_stock <= umbral_minimo ORDER BY cantidad_stock ASC'
        )->fetchAll();

        $topProducts = $pdo->query(
            "SELECT dp.nombre_producto AS name, SUM(dp.cantidad) AS quantity, SUM(dp.cantidad * dp.precio_unitario) AS revenue
             FROM DETALLE_PEDIDO dp
             JOIN PEDIDO p ON p.id_pedido = dp.id_pedido
             WHERE p.estado != 'cancelado'
             GROUP BY dp.nombre_producto
             ORDER BY quantity DESC
             LIMIT 5"
        )->fetchAll();

        return [
            'salesToday' => (float) $todayRow['total'],
            'ordersToday' => (int) $todayRow['cantidad'],
            'ordersByStatus' => array_column($byStatus, 'cantidad', 'estado'),
            'lowStockItems' => $lowStock,
            'topProducts' => $topProducts,
        ];
    }
}
