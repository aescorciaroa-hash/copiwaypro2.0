<?php

namespace App\Models;

use App\Core\Model;
use PDO;

/**
 * Modelo de la tabla INGREDIENTE. Sirve dos roles del frontend (que en Firestore
 * eran colecciones separadas y duplicadas): InventoryItem (gestión de stock,
 * usado por /api/inventory) e Ingredient (catálogo de extras de personalización
 * de productos, usado por /api/ingredients). Ambos shapes se construyen aquí.
 */
class Ingredient extends Model
{
    public static function allAsInventory(): array
    {
        $pdo = static::db();
        $rows = $pdo->query(
            'SELECT i.*, c.nombre AS categoria_nombre
             FROM INGREDIENTE i
             JOIN CATEGORIA c ON c.id_categoria = i.id_categoria
             ORDER BY i.nombre ASC'
        )->fetchAll();

        return array_map([self::class, 'toInventoryItem'], $rows);
    }

    public static function allAsIngredients(): array
    {
        $pdo = static::db();
        $rows = $pdo->query(
            'SELECT i.*, c.nombre AS categoria_nombre
             FROM INGREDIENTE i
             JOIN CATEGORIA c ON c.id_categoria = i.id_categoria
             ORDER BY i.nombre ASC'
        )->fetchAll();

        return array_map([self::class, 'toIngredient'], $rows);
    }

    public static function find(string $id): ?array
    {
        $pdo = static::db();
        $stmt = $pdo->prepare(
            'SELECT i.*, c.nombre AS categoria_nombre
             FROM INGREDIENTE i
             JOIN CATEGORIA c ON c.id_categoria = i.id_categoria
             WHERE i.id_ingrediente = ? LIMIT 1'
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public static function toInventoryItem(array $row): array
    {
        return [
            'id' => $row['id_ingrediente'],
            'name' => $row['nombre'],
            'stock' => (float) $row['cantidad_stock'],
            'totalCost' => $row['costo_total'] !== null ? (float) $row['costo_total'] : null,
            'unitCost' => (float) $row['costo_unitario'],
            'unit' => $row['unidad_medida'],
            'category' => $row['categoria_nombre'],
            'supplier' => $row['proveedor'],
            'notes' => $row['notas'],
            'createdAt' => $row['creado_en'],
        ];
    }

    public static function toIngredient(array $row): array
    {
        $price = (float) $row['precio_extra'];
        if ($price <= 0) {
            $price = (float) $row['costo_unitario'];
        }

        return [
            'id' => $row['id_ingrediente'],
            'name' => $row['nombre'],
            'price' => $price,
            'category' => $row['categoria_nombre'],
            'stock' => (float) $row['cantidad_stock'],
        ];
    }

    /**
     * Crea un INGREDIENTE junto con su movimiento inicial de inventario 'entrada'
     * en una sola transacción (mirroring del addInventoryItem actual del frontend).
     */
    public static function createWithInitialStock(array $data, ?string $adminId): string
    {
        $pdo = static::db();
        $pdo->beginTransaction();

        try {
            $categoryId = self::resolveCategoryId($data['category'] ?? null);

            $stmt = $pdo->prepare(
                'INSERT INTO INGREDIENTE
                    (id_ingrediente, id_categoria, nombre, unidad_medida, cantidad_stock,
                     costo_unitario, costo_total, precio_extra, proveedor, notas)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                '',
                $categoryId,
                $data['name'],
                $data['unit'] ?? 'unidad',
                $data['stock'] ?? 0,
                $data['unitCost'] ?? 0,
                $data['totalCost'] ?? null,
                $data['price'] ?? 0,
                $data['supplier'] ?? null,
                $data['notes'] ?? null,
            ]);

            $stmt = $pdo->prepare('SELECT id_ingrediente FROM INGREDIENTE WHERE nombre = ? AND id_categoria = ? ORDER BY creado_en DESC LIMIT 1');
            $stmt->execute([$data['name'], $categoryId]);
            $id = $stmt->fetchColumn();

            $stock = (float) ($data['stock'] ?? 0);
            if ($stock > 0) {
                $stmt = $pdo->prepare(
                    'INSERT INTO MOVIMIENTO_INVENTARIO
                        (id_movimiento, id_ingrediente, id_admin, tipo_movimiento, cantidad, motivo)
                     VALUES (?, ?, ?, ?, ?, ?)'
                );
                $stmt->execute(['', $id, $adminId, 'entrada', $stock, 'Stock inicial']);
            }

            $pdo->commit();
            return $id;
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public static function update(string $id, array $data): void
    {
        $fields = [];
        $params = [];

        $map = [
            'name' => 'nombre',
            'unit' => 'unidad_medida',
            'stock' => 'cantidad_stock',
            'unitCost' => 'costo_unitario',
            'totalCost' => 'costo_total',
            'price' => 'precio_extra',
            'supplier' => 'proveedor',
            'notes' => 'notas',
        ];

        foreach ($map as $jsonKey => $column) {
            if (array_key_exists($jsonKey, $data)) {
                $fields[] = "{$column} = ?";
                $params[] = $data[$jsonKey];
            }
        }

        if (array_key_exists('category', $data)) {
            $fields[] = 'id_categoria = ?';
            $params[] = self::resolveCategoryId($data['category']);
        }

        if (empty($fields)) {
            return;
        }

        $params[] = $id;
        $pdo = static::db();
        $stmt = $pdo->prepare('UPDATE INGREDIENTE SET ' . implode(', ', $fields) . ' WHERE id_ingrediente = ?');
        $stmt->execute($params);
    }

    public static function delete(string $id): void
    {
        $pdo = static::db();
        $stmt = $pdo->prepare('DELETE FROM INGREDIENTE WHERE id_ingrediente = ?');
        $stmt->execute([$id]);
    }

    /**
     * Ajusta cantidad_stock en $amount (positivo o negativo), clamp a 0 mínimo,
     * y registra el movimiento correspondiente. Devuelve el nuevo stock.
     */
    public static function adjustStock(string $id, float $amount, ?string $adminId): float
    {
        $pdo = static::db();
        $pdo->beginTransaction();

        try {
            $stmt = $pdo->prepare('SELECT cantidad_stock FROM INGREDIENTE WHERE id_ingrediente = ? FOR UPDATE');
            $stmt->execute([$id]);
            $current = $stmt->fetchColumn();

            if ($current === false) {
                throw new \RuntimeException('Insumo no encontrado.');
            }

            $newStock = max(0, (float) $current + $amount);

            $stmt = $pdo->prepare('UPDATE INGREDIENTE SET cantidad_stock = ? WHERE id_ingrediente = ?');
            $stmt->execute([$newStock, $id]);

            $stmt = $pdo->prepare(
                'INSERT INTO MOVIMIENTO_INVENTARIO
                    (id_movimiento, id_ingrediente, id_admin, tipo_movimiento, cantidad, motivo)
                 VALUES (?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute(['', $id, $adminId, $amount > 0 ? 'entrada' : 'salida', abs($amount), 'Ajuste manual']);

            $pdo->commit();
            return $newStock;
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Resuelve un nombre de categoría a id_categoria. Si no existe, la crea con
     * ambito='insumo_alimenticio' por defecto (uso genérico para inventario/ingredientes).
     */
    private static function resolveCategoryId(?string $categoryName): string
    {
        $pdo = static::db();
        $categoryName = trim((string) $categoryName) ?: 'Sin categoría';

        $stmt = $pdo->prepare('SELECT id_categoria FROM CATEGORIA WHERE nombre = ? AND ambito IN (?, ?) LIMIT 1');
        $stmt->execute([$categoryName, 'insumo_alimenticio', 'empaque_desechable']);
        $id = $stmt->fetchColumn();

        if ($id) {
            return $id;
        }

        $stmt = $pdo->prepare('INSERT INTO CATEGORIA (id_categoria, nombre, ambito) VALUES (?, ?, ?)');
        $stmt->execute(['', $categoryName, 'insumo_alimenticio']);

        $stmt = $pdo->prepare('SELECT id_categoria FROM CATEGORIA WHERE nombre = ? AND ambito = ? LIMIT 1');
        $stmt->execute([$categoryName, 'insumo_alimenticio']);
        return $stmt->fetchColumn();
    }

    public static function inventoryLogs(): array
    {
        $pdo = static::db();
        $rows = $pdo->query(
            "SELECT m.*, i.nombre AS item_nombre
             FROM MOVIMIENTO_INVENTARIO m
             JOIN INGREDIENTE i ON i.id_ingrediente = m.id_ingrediente
             ORDER BY m.fecha_hora DESC"
        )->fetchAll();

        return array_map(function (array $row): array {
            $amount = (float) $row['cantidad'];
            if ($row['tipo_movimiento'] === 'salida') {
                $amount = -abs($amount);
            } else {
                $amount = abs($amount);
            }

            return [
                'id' => $row['id_movimiento'],
                'date' => $row['fecha_hora'],
                'itemId' => $row['id_ingrediente'],
                'itemName' => $row['item_nombre'],
                'amount' => $amount,
                'type' => $row['tipo_movimiento'] === 'salida' ? 'Salida' : 'Entrada',
                'reason' => $row['motivo'],
            ];
        }, $rows);
    }
}
