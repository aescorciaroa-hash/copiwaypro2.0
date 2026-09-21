<?php

namespace App\Models;

use App\Core\Model;

/**
 * Unifica AYUDANTE_COCINA y DOMICILIARIO (una sola colección "staff" en
 * Firestore, ahora dos tablas) en el shape Staff del frontend.
 */
class Staff extends Model
{
    public static function all(): array
    {
        $pdo = static::db();

        $kitchen = $pdo->query('SELECT * FROM AYUDANTE_COCINA ORDER BY creado_en DESC')->fetchAll();
        $delivery = $pdo->query('SELECT * FROM DOMICILIARIO ORDER BY creado_en DESC')->fetchAll();

        $result = array_map([self::class, 'kitchenToJson'], $kitchen);
        foreach ($delivery as $row) {
            $result[] = self::deliveryToJson($row);
        }

        return $result;
    }

    public static function kitchenToJson(array $row): array
    {
        return [
            'id' => $row['id_ayudante'],
            'name' => $row['nombre'],
            'email' => $row['correo'],
            'phone' => $row['telefono'],
            'role' => 'Ayudante de cocina',
            'active' => (bool) $row['activo'],
        ];
    }

    public static function deliveryToJson(array $row): array
    {
        $pdo = static::db();
        $stmt = $pdo->prepare(
            "SELECT id_pedido FROM PEDIDO WHERE id_domiciliario = ? AND estado = 'en_camino' LIMIT 1"
        );
        $stmt->execute([$row['id_domiciliario']]);
        $currentOrderId = $stmt->fetchColumn() ?: null;

        $location = null;
        if ($row['ubicacion_lat'] !== null && $row['ubicacion_lng'] !== null) {
            $location = [(float) $row['ubicacion_lat'], (float) $row['ubicacion_lng']];
        }

        return [
            'id' => $row['id_domiciliario'],
            'name' => $row['nombre'],
            'email' => $row['correo'],
            'phone' => $row['telefono'],
            'role' => 'Domiciliario',
            'active' => (bool) $row['activo'],
            'location' => $location,
            'currentOrderId' => $currentOrderId,
            'plate' => $row['placa'],
            'vehicle' => $row['tipo_vehiculo'],
            'baseCash' => (float) $row['base_efectivo_asignada'],
        ];
    }

    /**
     * Crea un miembro de staff en AYUDANTE_COCINA o DOMICILIARIO según $data['role'].
     */
    public static function create(array $data, string $adminId): string
    {
        $pdo = static::db();
        $hash = password_hash($data['password'], PASSWORD_DEFAULT);

        if ($data['role'] === 'Ayudante de cocina') {
            $stmt = $pdo->prepare(
                'INSERT INTO AYUDANTE_COCINA (id_ayudante, nombre, correo, telefono, contrasena, creado_por)
                 VALUES (?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute(['', $data['name'], $data['email'], $data['phone'] ?? '', $hash, $adminId]);

            $stmt = $pdo->prepare('SELECT id_ayudante FROM AYUDANTE_COCINA WHERE correo = ? LIMIT 1');
            $stmt->execute([$data['email']]);
            return $stmt->fetchColumn();
        }

        if ($data['role'] === 'Domiciliario') {
            $stmt = $pdo->prepare(
                'INSERT INTO DOMICILIARIO
                    (id_domiciliario, nombre, correo, telefono, contrasena, tipo_vehiculo, placa,
                     base_efectivo_asignada, creado_por)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                '',
                $data['name'],
                $data['email'],
                $data['phone'] ?? '',
                $hash,
                $data['vehicle'] ?? 'moto',
                $data['plate'] ?? null,
                $data['baseCash'] ?? 0,
                $adminId,
            ]);

            $stmt = $pdo->prepare('SELECT id_domiciliario FROM DOMICILIARIO WHERE correo = ? LIMIT 1');
            $stmt->execute([$data['email']]);
            return $stmt->fetchColumn();
        }

        throw new \RuntimeException("Rol de staff inválido: {$data['role']}");
    }

    /**
     * Actualiza al miembro de staff con este id, buscando primero en
     * AYUDANTE_COCINA y luego en DOMICILIARIO. Devuelve la tabla usada, o null
     * si no se encontró el id en ninguna.
     */
    public static function update(string $id, array $data): ?string
    {
        $pdo = static::db();

        $stmt = $pdo->prepare('SELECT id_ayudante FROM AYUDANTE_COCINA WHERE id_ayudante = ?');
        $stmt->execute([$id]);
        if ($stmt->fetchColumn()) {
            self::updateKitchen($id, $data);
            return 'kitchen';
        }

        $stmt = $pdo->prepare('SELECT id_domiciliario FROM DOMICILIARIO WHERE id_domiciliario = ?');
        $stmt->execute([$id]);
        if ($stmt->fetchColumn()) {
            self::updateDelivery($id, $data);
            return 'delivery';
        }

        return null;
    }

    private static function updateKitchen(string $id, array $data): void
    {
        $map = ['name' => 'nombre', 'email' => 'correo', 'phone' => 'telefono'];
        $sets = [];
        $params = [];

        foreach ($map as $jsonKey => $column) {
            if (array_key_exists($jsonKey, $data)) {
                $sets[] = "{$column} = ?";
                $params[] = $data[$jsonKey];
            }
        }

        if (array_key_exists('active', $data)) {
            $sets[] = 'activo = ?';
            $params[] = $data['active'] ? 1 : 0;
        }

        if (!empty($data['password'])) {
            $sets[] = 'contrasena = ?';
            $params[] = password_hash($data['password'], PASSWORD_DEFAULT);
        }

        if (empty($sets)) {
            return;
        }

        $params[] = $id;
        $pdo = static::db();
        $stmt = $pdo->prepare('UPDATE AYUDANTE_COCINA SET ' . implode(', ', $sets) . ' WHERE id_ayudante = ?');
        $stmt->execute($params);
    }

    private static function updateDelivery(string $id, array $data): void
    {
        $map = [
            'name' => 'nombre',
            'email' => 'correo',
            'phone' => 'telefono',
            'plate' => 'placa',
            'vehicle' => 'tipo_vehiculo',
            'baseCash' => 'base_efectivo_asignada',
        ];
        $sets = [];
        $params = [];

        foreach ($map as $jsonKey => $column) {
            if (array_key_exists($jsonKey, $data)) {
                $sets[] = "{$column} = ?";
                $params[] = $data[$jsonKey];
            }
        }

        if (array_key_exists('active', $data)) {
            $sets[] = 'activo = ?';
            $params[] = $data['active'] ? 1 : 0;
        }

        if (!empty($data['password'])) {
            $sets[] = 'contrasena = ?';
            $params[] = password_hash($data['password'], PASSWORD_DEFAULT);
        }

        if (empty($sets)) {
            return;
        }

        $params[] = $id;
        $pdo = static::db();
        $stmt = $pdo->prepare('UPDATE DOMICILIARIO SET ' . implode(', ', $sets) . ' WHERE id_domiciliario = ?');
        $stmt->execute($params);
    }

    /**
     * Soft delete (activo = 0) — nunca DELETE real, regla de negocio explícita
     * para revocar acceso conservando el historial. Devuelve la tabla usada o
     * null si el id no existe en ninguna.
     */
    public static function softDelete(string $id): ?string
    {
        $pdo = static::db();

        $stmt = $pdo->prepare('UPDATE AYUDANTE_COCINA SET activo = 0 WHERE id_ayudante = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() > 0) {
            return 'kitchen';
        }

        $stmt = $pdo->prepare('UPDATE DOMICILIARIO SET activo = 0 WHERE id_domiciliario = ?');
        $stmt->execute([$id]);
        if ($stmt->rowCount() > 0) {
            return 'delivery';
        }

        return null;
    }

    public static function updateLocation(string $id, float $lat, float $lng): bool
    {
        $pdo = static::db();
        $stmt = $pdo->prepare(
            'UPDATE DOMICILIARIO SET ubicacion_lat = ?, ubicacion_lng = ?, ubicacion_actualizada = NOW()
             WHERE id_domiciliario = ?'
        );
        $stmt->execute([$lat, $lng, $id]);
        return $stmt->rowCount() > 0;
    }
}
