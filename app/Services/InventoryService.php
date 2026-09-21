<?php

namespace App\Services;

use App\Core\Database;
use App\Core\Model;
use App\Services\Exceptions\InsufficientStockException;
use PDO;
use RuntimeException;

/**
 * Descuento de inventario por receta (regla de negocio 12).
 * Debe ejecutarse SIEMPRE dentro de una transacción ya abierta por el llamador
 * (OrderService), usando SELECT ... FOR UPDATE para evitar condiciones de
 * carrera entre dos pedidos simultáneos sobre el mismo insumo.
 */
class InventoryService
{
    /**
     * @param array $lines Cada línea: ['id_ingrediente' => string, 'cantidad' => float, 'motivo' => string]
     * @throws RuntimeException si algún insumo no tiene stock suficiente (mensaje claro para el 409 del controlador)
     */
    public static function deduct(PDO $pdo, array $lines, ?string $idPedido, ?string $idAdmin = null): void
    {
        // Consolida cantidades por insumo para bloquear cada fila una sola vez.
        $consolidated = [];
        foreach ($lines as $line) {
            $id = $line['id_ingrediente'];
            $consolidated[$id]['cantidad'] = ($consolidated[$id]['cantidad'] ?? 0) + $line['cantidad'];
            $consolidated[$id]['motivos'][] = $line['motivo'];
        }

        // Bloquea las filas en un orden determinístico (por id) para evitar deadlocks
        // entre transacciones concurrentes que descuentan varios insumos en común.
        $ids = array_keys($consolidated);
        sort($ids);

        $lockedStock = [];
        $lockedNombre = [];
        foreach ($ids as $id) {
            $stmt = $pdo->prepare('SELECT id_ingrediente, nombre, cantidad_stock FROM INGREDIENTE WHERE id_ingrediente = ? FOR UPDATE');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) {
                throw new InsufficientStockException("Insumo no encontrado (id {$id}).");
            }
            $lockedStock[$id] = (float) $row['cantidad_stock'];
            $lockedNombre[$id] = $row['nombre'];
        }

        foreach ($ids as $id) {
            $needed = (float) $consolidated[$id]['cantidad'];
            if ($lockedStock[$id] < $needed) {
                throw new InsufficientStockException(
                    "Sin stock suficiente de \"{$lockedNombre[$id]}\" (disponible: {$lockedStock[$id]}, requerido: {$needed})."
                );
            }
        }

        foreach ($ids as $id) {
            $needed = (float) $consolidated[$id]['cantidad'];
            $update = $pdo->prepare('UPDATE INGREDIENTE SET cantidad_stock = cantidad_stock - ? WHERE id_ingrediente = ?');
            $update->execute([$needed, $id]);

            $motivo = implode(' + ', array_unique($consolidated[$id]['motivos']));
            $log = $pdo->prepare(
                'INSERT INTO MOVIMIENTO_INVENTARIO (id_movimiento, id_ingrediente, id_admin, id_pedido, tipo_movimiento, cantidad, motivo)
                 VALUES (?, ?, ?, ?, \'salida\', ?, ?)'
            );
            $log->execute(['', $id, $idAdmin, $idPedido, $needed, $motivo]);
        }
    }

    /** Ajuste manual de stock (entrada/salida) hecho por el admin desde el panel de inventario. */
    public static function adjustManual(string $idIngrediente, float $amount, string $idAdmin): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare('SELECT cantidad_stock FROM INGREDIENTE WHERE id_ingrediente = ? FOR UPDATE');
            $stmt->execute([$idIngrediente]);
            $row = $stmt->fetch();
            if (!$row) {
                throw new RuntimeException('Insumo no encontrado.');
            }

            $newStock = max(0, (float) $row['cantidad_stock'] + $amount);
            $update = $pdo->prepare('UPDATE INGREDIENTE SET cantidad_stock = ? WHERE id_ingrediente = ?');
            $update->execute([$newStock, $idIngrediente]);

            $log = $pdo->prepare(
                'INSERT INTO MOVIMIENTO_INVENTARIO (id_movimiento, id_ingrediente, id_admin, tipo_movimiento, cantidad, motivo)
                 VALUES (?, ?, ?, ?, ?, \'Ajuste manual\')'
            );
            $log->execute(['', $idIngrediente, $idAdmin, $amount >= 0 ? 'entrada' : 'salida', abs($amount)]);

            $pdo->commit();
            return ['stock' => $newStock];
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }
}
