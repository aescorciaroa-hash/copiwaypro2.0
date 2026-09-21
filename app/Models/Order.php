<?php

namespace App\Models;

use App\Core\Model;
use PDO;

class Order extends Model
{
    private const STATUS_DB_TO_APP = [
        'pendiente' => 'Pendiente',
        'en_preparacion' => 'En Preparación',
        'listo' => 'Listos',
        'en_camino' => 'En Camino',
        'entregado' => 'Entregado',
        'cancelado' => 'Cancelado',
    ];

    public const STATUS_APP_TO_DB = [
        'Pendiente' => 'pendiente',
        'En Preparación' => 'en_preparacion',
        'Listos' => 'listo',
        'En Camino' => 'en_camino',
        'Entregado' => 'entregado',
        'entregado' => 'entregado',
        'Cancelado' => 'cancelado',
    ];

    /**
     * Devuelve pedidos según el rol del solicitante:
     *  - admin/kitchen: todos
     *  - delivery: los suyos + los 'listo' aún sin domiciliario asignado
     *  - client: solo los propios (por id_cliente)
     */
    public static function forRole(string $role, string $userId): array
    {
        $pdo = static::db();

        $sql = 'SELECT p.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono,
                       d.nombre AS domiciliario_nombre, d.telefono AS domiciliario_telefono,
                       d.placa AS domiciliario_placa, d.tipo_vehiculo AS domiciliario_vehiculo
                FROM PEDIDO p
                JOIN CLIENTE c ON c.id_cliente = p.id_cliente
                LEFT JOIN DOMICILIARIO d ON d.id_domiciliario = p.id_domiciliario';

        $params = [];
        if ($role === 'client') {
            $sql .= ' WHERE p.id_cliente = ?';
            $params[] = $userId;
        } elseif ($role === 'delivery') {
            $sql .= ' WHERE p.id_domiciliario = ? OR (p.estado = \'listo\' AND p.id_domiciliario IS NULL)';
            $params[] = $userId;
        }
        // admin / kitchen: sin filtro, ven todo

        $sql .= ' ORDER BY p.fecha_hora DESC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        return array_map(fn($row) => self::shape($row, $role, $userId), $rows);
    }

    public static function find(string $id): ?array
    {
        $pdo = static::db();
        $stmt = $pdo->prepare(
            'SELECT p.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono,
                    d.nombre AS domiciliario_nombre, d.telefono AS domiciliario_telefono,
                    d.placa AS domiciliario_placa, d.tipo_vehiculo AS domiciliario_vehiculo
             FROM PEDIDO p
             JOIN CLIENTE c ON c.id_cliente = p.id_cliente
             LEFT JOIN DOMICILIARIO d ON d.id_domiciliario = p.id_domiciliario
             WHERE p.id_pedido = ? OR p.numero_pedido = ?'
        );
        $numero = self::numeroFromDisplayId($id);
        $stmt->execute([$id, $numero]);
        $row = $stmt->fetch();
        return $row ? self::shape($row, null, null) : null;
    }

    public static function findRawByDisplayId(string $displayId): ?array
    {
        $pdo = static::db();
        $numero = self::numeroFromDisplayId($displayId);
        $stmt = $pdo->prepare('SELECT * FROM PEDIDO WHERE id_pedido = ? OR numero_pedido = ? LIMIT 1');
        $stmt->execute([$displayId, $numero]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function numeroFromDisplayId(string $displayId): ?int
    {
        if (preg_match('/(\d+)$/', $displayId, $m)) {
            return (int) $m[1];
        }
        return null;
    }

    public static function displayId(array $row): string
    {
        return '#ORD-' . $row['numero_pedido'];
    }

    public static function itemsFor(string $idPedido): array
    {
        $pdo = static::db();
        $stmt = $pdo->prepare('SELECT * FROM DETALLE_PEDIDO WHERE id_pedido = ?');
        $stmt->execute([$idPedido]);
        $detalles = $stmt->fetchAll();

        $items = [];
        foreach ($detalles as $detalle) {
            $pStmt = $pdo->prepare('SELECT * FROM PERSONALIZACION WHERE id_detalle = ?');
            $pStmt->execute([$detalle['id_detalle']]);
            $personalizaciones = $pStmt->fetchAll();

            $extras = [];
            $removed = [];
            foreach ($personalizaciones as $p) {
                $entry = ['id' => $p['id_ingrediente'], 'name' => $p['nombre_ingrediente'], 'quantity' => (float) $p['cantidad']];
                if ($p['accion_modificacion'] === 'agregar') {
                    $extras[] = $entry;
                } else {
                    $removed[] = $entry;
                }
            }

            $items[] = [
                'id' => $detalle['id_detalle'],
                'productId' => $detalle['id_producto'],
                'name' => $detalle['nombre_producto'],
                'quantity' => (int) $detalle['cantidad'],
                'price' => (float) $detalle['precio_unitario'],
                'finalPrice' => (float) $detalle['precio_unitario'],
                'isCustom' => (bool) $detalle['es_personalizado'],
                'extras' => $extras,
                'removed' => $removed,
            ];
        }

        return $items;
    }

    private static function shape(array $row, ?string $viewerRole, ?string $viewerId): array
    {
        $estado = self::STATUS_DB_TO_APP[$row['estado']] ?? $row['estado'];

        // Regla 9: el contacto del cliente solo es visible al domiciliario asignado
        // mientras el pedido está "En Camino"; el admin/cocina/el propio cliente siempre lo ven.
        $showClientPhone = true;
        if ($viewerRole === 'delivery') {
            $showClientPhone = $row['estado'] === 'en_camino' && $row['id_domiciliario'] === $viewerId;
        }

        return [
            'id' => self::displayId($row),
            'status' => $estado,
            'client' => $row['cliente_nombre'],
            'clientPhone' => $showClientPhone ? $row['cliente_telefono'] : null,
            'driverName' => $row['domiciliario_nombre'],
            'driverPhone' => $row['domiciliario_nombre'] ? $row['domiciliario_telefono'] : null,
            'driverPlate' => $row['domiciliario_placa'],
            'driverVehicle' => $row['domiciliario_vehiculo'],
            'deliveryPin' => $row['pin_entrega'],
            'total' => (float) $row['total'],
            'subtotal' => (float) $row['subtotal'],
            'shipping' => (float) $row['costo_domicilio'],
            'discount' => (float) $row['descuento_cumpleanos'],
            'pointsEarned' => (int) $row['puntos_ganados'],
            'items' => self::itemsFor($row['id_pedido']),
            'address' => $row['direccion_entrega'],
            'date' => $row['fecha_hora'],
            'time' => date('H:i', strtotime($row['fecha_hora'])),
            'paymentMethod' => $row['metodo_pago'] === 'efectivo' ? 'cash' : 'online',
            'paymentStatus' => $row['estado_pago'] === 'aprobado' ? 'Pagado' : ucfirst($row['estado_pago']),
        ];
    }
}
