<?php

namespace App\Models;

use App\Core\Model;
use PDO;
use Throwable;

class OrderTransition extends Model
{
    public static function markPreparing(string $idPedido): void
    {
        self::transition($idPedido, ['pendiente'], 'en_preparacion');
    }

    public static function markReady(string $idPedido): void
    {
        self::transition($idPedido, ['pendiente', 'en_preparacion'], 'listo');
    }

    public static function acceptDelivery(string $idPedido, string $driverId): void
    {
        $pdo = static::db();
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("SELECT estado, id_domiciliario FROM PEDIDO WHERE id_pedido = ? FOR UPDATE");
            $stmt->execute([$idPedido]);
            $row = $stmt->fetch();
            if (!$row || $row['estado'] !== 'listo' || $row['id_domiciliario'] !== null) {
                throw new \RuntimeException('Este pedido ya no está disponible para reparto.');
            }
            $pdo->prepare("UPDATE PEDIDO SET estado = 'en_camino', id_domiciliario = ? WHERE id_pedido = ?")
                ->execute([$driverId, $idPedido]);
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public static function confirmDelivery(string $idPedido, string $driverId, string $pin): void
    {
        $pdo = static::db();
        $stmt = $pdo->prepare('SELECT pin_entrega, estado, id_domiciliario FROM PEDIDO WHERE id_pedido = ?');
        $stmt->execute([$idPedido]);
        $row = $stmt->fetch();

        if (!$row || $row['estado'] !== 'en_camino' || $row['id_domiciliario'] !== $driverId) {
            throw new \RuntimeException('No puedes confirmar la entrega de este pedido.');
        }

        if (!hash_equals($row['pin_entrega'], $pin)) {
            throw new \RuntimeException('PIN incorrecto.');
        }

        $pdo->prepare("UPDATE PEDIDO SET estado = 'entregado' WHERE id_pedido = ?")->execute([$idPedido]);
    }

    private static function transition(string $idPedido, array $allowedFrom, string $to): void
    {
        $pdo = static::db();
        $stmt = $pdo->prepare('SELECT estado FROM PEDIDO WHERE id_pedido = ?');
        $stmt->execute([$idPedido]);
        $estado = $stmt->fetchColumn();

        if ($estado === false || !in_array($estado, $allowedFrom, true)) {
            throw new \RuntimeException('Transición de estado no permitida.');
        }

        $pdo->prepare('UPDATE PEDIDO SET estado = ? WHERE id_pedido = ?')->execute([$to, $idPedido]);
    }
}
