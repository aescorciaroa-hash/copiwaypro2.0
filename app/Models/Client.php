<?php

namespace App\Models;

use App\Core\Model;

class Client extends Model
{
    public static function all(): array
    {
        $pdo = static::db();
        $rows = $pdo->query('SELECT * FROM CLIENTE ORDER BY creado_en DESC')->fetchAll();
        return array_map([self::class, 'toJson'], $rows);
    }

    public static function find(string $id): ?array
    {
        $pdo = static::db();
        $stmt = $pdo->prepare('SELECT * FROM CLIENTE WHERE id_cliente = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ? self::toJson($row) : null;
    }

    public static function toJson(array $row): array
    {
        $pdo = static::db();

        $stmt = $pdo->prepare('SELECT COUNT(*) FROM PEDIDO WHERE id_cliente = ?');
        $stmt->execute([$row['id_cliente']]);
        $ordersCount = (int) $stmt->fetchColumn();

        $stmt = $pdo->prepare('SELECT MAX(fecha_hora) FROM PEDIDO WHERE id_cliente = ?');
        $stmt->execute([$row['id_cliente']]);
        $lastOrderDate = $stmt->fetchColumn() ?: null;

        return [
            'id' => $row['id_cliente'],
            'name' => $row['nombre'],
            'phone' => $row['telefono'],
            'email' => $row['correo'],
            'address' => $row['direccion'],
            'ordersCount' => $ordersCount,
            'totalSpent' => (float) $row['total_gastado'],
            'points' => (int) $row['puntos_fidelidad'],
            'lastOrderDate' => $lastOrderDate,
            'notifications' => self::notificationsFor($row['id_cliente']),
            'birthday' => $row['fecha_nacimiento'],
            'preferences' => null,
        ];
    }

    public static function notificationsFor(string $clientId): array
    {
        $pdo = static::db();
        $stmt = $pdo->prepare(
            'SELECT * FROM CLIENTE_NOTIFICACION WHERE id_cliente = ? ORDER BY fecha DESC'
        );
        $stmt->execute([$clientId]);

        return array_map(function (array $n): array {
            return [
                'id' => $n['id_notificacion_cliente'],
                'title' => $n['titulo'],
                'message' => $n['mensaje'],
                'date' => $n['fecha'],
                'read' => (bool) $n['leida'],
                'type' => $n['tipo'],
            ];
        }, $stmt->fetchAll());
    }

    public static function markNotificationRead(string $clientId, string $notificationId): bool
    {
        $pdo = static::db();
        $stmt = $pdo->prepare(
            'UPDATE CLIENTE_NOTIFICACION SET leida = 1 WHERE id_notificacion_cliente = ? AND id_cliente = ?'
        );
        $stmt->execute([$notificationId, $clientId]);
        return $stmt->rowCount() > 0;
    }

    /**
     * Actualiza campos permitidos del cliente. $fields usa claves camelCase.
     */
    public static function update(string $id, array $fields): void
    {
        $map = [
            'name' => 'nombre',
            'phone' => 'telefono',
            'address' => 'direccion',
            'email' => 'correo',
            'birthday' => 'fecha_nacimiento',
            'points' => 'puntos_fidelidad',
            'totalSpent' => 'total_gastado',
        ];

        $sets = [];
        $params = [];

        foreach ($map as $jsonKey => $column) {
            if (array_key_exists($jsonKey, $fields)) {
                $sets[] = "{$column} = ?";
                $params[] = $fields[$jsonKey];
            }
        }

        if (empty($sets)) {
            return;
        }

        $params[] = $id;
        $pdo = static::db();
        $stmt = $pdo->prepare('UPDATE CLIENTE SET ' . implode(', ', $sets) . ' WHERE id_cliente = ?');
        $stmt->execute($params);
    }

    /**
     * Método de creación reservado para el flujo de Registro (Auth), que se
     * implementará en otra parte de esta fase. No se expone ruta aquí.
     */
    public static function create(array $data): string
    {
        $pdo = static::db();
        $stmt = $pdo->prepare(
            'INSERT INTO CLIENTE
                (id_cliente, nombre, telefono, correo, contrasena, direccion, fecha_nacimiento,
                 fecha_aceptacion_habeas_data, ip_aceptacion_habeas_data)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            '',
            $data['name'],
            $data['phone'],
            $data['email'],
            password_hash($data['password'], PASSWORD_DEFAULT),
            $data['address'] ?? null,
            $data['birthday'],
            date('Y-m-d H:i:s'),
            $data['ip'] ?? '0.0.0.0',
        ]);

        $stmt = $pdo->prepare('SELECT id_cliente FROM CLIENTE WHERE correo = ? LIMIT 1');
        $stmt->execute([$data['email']]);
        return $stmt->fetchColumn();
    }
}
