<?php

namespace App\Services;

use App\Core\Database;
use App\Core\Model;
use PDO;
use Throwable;

/**
 * Cierre de caja (regla 11): consolida efectivo vs digital, consumo real de
 * insumos (vs. el placeholder aleatorio que usa hoy AdminDashboard.tsx) y
 * ganancia neta; ARCHIVA (no borra) los pedidos del turno asignándoles
 * id_reporte, y liquida a cada domiciliario su efectivo recolectado.
 */
class CashClosingService extends Model
{
    /**
     * Genera el cierre del día para el admin autenticado. Solo considera
     * pedidos 'entregado' o 'cancelado' que todavía no pertenecen a ningún
     * reporte (id_reporte IS NULL) — así un cierre nunca se repite ni se pisa.
     */
    public static function generate(string $idAdmin): array
    {
        $pdo = static::db();
        $today = date('Y-m-d');

        $pdo->beginTransaction();
        try {
            $existing = $pdo->prepare('SELECT id_reporte FROM REPORTE_CAJA WHERE id_admin = ? AND fecha = ?');
            $existing->execute([$idAdmin, $today]);
            if ($existing->fetchColumn()) {
                throw new \RuntimeException('Ya se generó un cierre de caja hoy para este administrador.');
            }

            $ordersStmt = $pdo->query(
                "SELECT * FROM PEDIDO WHERE estado IN ('entregado') AND id_reporte IS NULL"
            );
            $orders = $ordersStmt->fetchAll();

            $totalVentas = 0.0;
            $totalEfectivo = 0.0;
            $totalDigital = 0.0;
            $cashByDriver = []; // id_domiciliario => monto efectivo recolectado

            foreach ($orders as $order) {
                $totalVentas += (float) $order['total'];
                if ($order['metodo_pago'] === 'efectivo') {
                    $totalEfectivo += (float) $order['total'];
                    if ($order['id_domiciliario']) {
                        $cashByDriver[$order['id_domiciliario']] = ($cashByDriver[$order['id_domiciliario']] ?? 0) + (float) $order['total'];
                    }
                } else {
                    $totalDigital += (float) $order['total'];
                }
            }

            $idReporte = static::uuid();
            $pdo->prepare(
                'INSERT INTO REPORTE_CAJA (id_reporte, id_admin, fecha, total_ventas, total_efectivo, total_digital)
                 VALUES (?, ?, ?, ?, ?, ?)'
            )->execute([$idReporte, $idAdmin, $today, $totalVentas, $totalEfectivo, $totalDigital]);

            // Archiva los pedidos del turno (no se borran, regla 11)
            if (!empty($orders)) {
                $ids = array_column($orders, 'id_pedido');
                $placeholders = implode(',', array_fill(0, count($ids), '?'));
                $pdo->prepare("UPDATE PEDIDO SET id_reporte = ? WHERE id_pedido IN ({$placeholders})")
                    ->execute(array_merge([$idReporte], $ids));
            }

            // Liquidación por domiciliario: base asignada + efectivo recolectado en el turno.
            $driversStmt = $pdo->query('SELECT id_domiciliario, base_efectivo_asignada FROM DOMICILIARIO WHERE activo = 1');
            foreach ($driversStmt->fetchAll() as $driver) {
                $recolectado = $cashByDriver[$driver['id_domiciliario']] ?? 0;
                if ($recolectado <= 0) {
                    continue;
                }
                $pdo->prepare(
                    'INSERT INTO LIQUIDACION_DOMICILIARIO (id_liquidacion, id_reporte, id_domiciliario, base_asignada, efectivo_recolectado, efectivo_liquidado)
                     VALUES (?, ?, ?, ?, ?, ?)'
                )->execute(['', $idReporte, $driver['id_domiciliario'], $driver['base_efectivo_asignada'], $recolectado, $driver['base_efectivo_asignada'] + $recolectado]);
            }

            // Consumo real de insumos: RECETA x cantidad vendida en los pedidos del turno,
            // comparado contra el stock físico actual (auditoría teórico vs. real).
            $insumos = self::theoreticalConsumption($pdo, array_column($orders, 'id_pedido'));
            foreach ($insumos as $idIngrediente => $data) {
                $stockReal = $pdo->prepare('SELECT cantidad_stock FROM INGREDIENTE WHERE id_ingrediente = ?');
                $stockReal->execute([$idIngrediente]);
                $pdo->prepare(
                    'INSERT INTO DETALLE_AUDITORIA (id_auditoria, id_reporte, id_ingrediente, nombre, stock_teorico, stock_real)
                     VALUES (?, ?, ?, ?, ?, ?)'
                )->execute(['', $idReporte, $idIngrediente, $data['nombre'], $data['consumido'], (float) $stockReal->fetchColumn()]);
            }

            $activeOrdersCount = (int) $pdo->query(
                "SELECT COUNT(*) FROM PEDIDO WHERE estado NOT IN ('entregado', 'cancelado')"
            )->fetchColumn();

            $pdo->commit();

            return array_merge(self::report($idReporte), ['activeOrdersCount' => $activeOrdersCount]);
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    private static function theoreticalConsumption(PDO $pdo, array $orderIds): array
    {
        if (empty($orderIds)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
        $stmt = $pdo->prepare(
            "SELECT i.id_ingrediente, i.nombre, SUM(r.cantidad_necesaria * dp.cantidad) AS consumido
             FROM DETALLE_PEDIDO dp
             JOIN RECETA r ON r.id_producto = dp.id_producto
             JOIN INGREDIENTE i ON i.id_ingrediente = r.id_ingrediente
             WHERE dp.id_pedido IN ({$placeholders})
             GROUP BY i.id_ingrediente, i.nombre"
        );
        $stmt->execute($orderIds);

        $result = [];
        foreach ($stmt->fetchAll() as $row) {
            $result[$row['id_ingrediente']] = ['nombre' => $row['nombre'], 'consumido' => (float) $row['consumido']];
        }
        return $result;
    }

    public static function report(string $idReporte): array
    {
        $pdo = static::db();

        $stmt = $pdo->prepare('SELECT * FROM REPORTE_CAJA WHERE id_reporte = ?');
        $stmt->execute([$idReporte]);
        $reporte = $stmt->fetch();

        $liqStmt = $pdo->prepare(
            'SELECT l.*, d.nombre AS driver_nombre FROM LIQUIDACION_DOMICILIARIO l
             JOIN DOMICILIARIO d ON d.id_domiciliario = l.id_domiciliario
             WHERE l.id_reporte = ?'
        );
        $liqStmt->execute([$idReporte]);

        $auditStmt = $pdo->prepare('SELECT nombre, stock_teorico, stock_real FROM DETALLE_AUDITORIA WHERE id_reporte = ?');
        $auditStmt->execute([$idReporte]);

        $ordersStmt = $pdo->prepare(
            'SELECT p.numero_pedido, p.total, p.metodo_pago, c.nombre AS cliente
             FROM PEDIDO p JOIN CLIENTE c ON c.id_cliente = p.id_cliente
             WHERE p.id_reporte = ?'
        );
        $ordersStmt->execute([$idReporte]);

        return [
            'date' => $reporte['fecha'],
            'totalVentas' => (float) $reporte['total_ventas'],
            'totalOrdenes' => (int) $ordersStmt->rowCount(),
            'desglose' => [
                'efectivo' => (float) $reporte['total_efectivo'],
                'digital' => (float) $reporte['total_digital'],
            ],
            'driverLiquidations' => array_map(function ($l) use ($pdo, $idReporte) {
                $countStmt = $pdo->prepare(
                    "SELECT COUNT(*) FROM PEDIDO WHERE id_reporte = ? AND id_domiciliario = ? AND metodo_pago = 'efectivo'"
                );
                $countStmt->execute([$idReporte, $l['id_domiciliario']]);
                return [
                    'driverName' => $l['driver_nombre'],
                    'ordersCount' => (int) $countStmt->fetchColumn(),
                    'baseCash' => (float) $l['base_asignada'],
                    'cashCollected' => (float) $l['efectivo_recolectado'],
                    'totalDue' => (float) $l['efectivo_liquidado'],
                ];
            }, $liqStmt->fetchAll()),
            'insumosConsumidos' => array_map(fn($a) => [
                'name' => $a['nombre'],
                'used' => (float) $a['stock_teorico'],
                'stockReal' => (float) $a['stock_real'],
            ], $auditStmt->fetchAll()),
            'orders' => array_map(fn($o) => [
                'id' => '#ORD-' . $o['numero_pedido'],
                'client' => $o['cliente'],
                'total' => (float) $o['total'],
                'paymentMethod' => $o['metodo_pago'] === 'efectivo' ? 'cash' : 'online',
            ], $ordersStmt->fetchAll()),
        ];
    }
}
