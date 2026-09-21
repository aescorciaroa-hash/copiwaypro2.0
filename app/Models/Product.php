<?php

namespace App\Models;

use App\Core\Model;

class Product extends Model
{
    /**
     * $onlyActive=true para catálogos públicos (cliente/cocina/domiciliario);
     * false para la gestión de administrador, que también ve productos ocultos.
     * En ambos casos se excluye el producto "sombra" que usa OrderService para
     * los ítems 100% personalizados del creador interactivo (nunca es un
     * producto gestionable desde el panel).
     */
    public static function all(bool $onlyActive = false): array
    {
        $pdo = static::db();
        $sql = 'SELECT p.*, c.nombre AS categoria_nombre
                FROM PRODUCTO p
                JOIN CATEGORIA c ON c.id_categoria = p.id_categoria
                WHERE p.nombre != \'Hamburguesa Personalizada\'';
        if ($onlyActive) {
            $sql .= " AND p.estado = 'activo'";
        }
        $sql .= ' ORDER BY p.creado_en DESC';

        $rows = $pdo->query($sql)->fetchAll();

        return array_map([self::class, 'toJson'], $rows);
    }

    public static function find(string $id): ?array
    {
        $pdo = static::db();
        $stmt = $pdo->prepare(
            'SELECT p.*, c.nombre AS categoria_nombre
             FROM PRODUCTO p
             JOIN CATEGORIA c ON c.id_categoria = p.id_categoria
             WHERE p.id_producto = ? LIMIT 1'
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row ? self::toJson($row) : null;
    }

    public static function toJson(array $row): array
    {
        $recipe = self::recipeFor($row['id_producto']);

        $badge = $row['etiqueta_destacada'];
        if ($badge === 'ninguna') {
            $badge = null;
        }

        return [
            'id' => $row['id_producto'],
            'name' => $row['nombre'],
            'description' => $row['descripcion'],
            'price' => (float) $row['precio'],
            'active' => $row['estado'] === 'activo',
            'image' => $row['imagen'],
            'ingredients' => $recipe['ingredients'],
            'packaging' => $recipe['packaging'],
            'category' => $row['categoria_nombre'],
            'prepTime' => $row['tiempo_preparacion'] !== null ? (int) $row['tiempo_preparacion'] : null,
            'badge' => $badge,
            'costPrice' => $row['costo_calculado'] !== null ? (float) $row['costo_calculado'] : null,
        ];
    }

    private static function recipeFor(string $productId): array
    {
        $pdo = static::db();
        $stmt = $pdo->prepare(
            'SELECT r.cantidad_necesaria, i.id_ingrediente, i.nombre, c.ambito
             FROM RECETA r
             JOIN INGREDIENTE i ON i.id_ingrediente = r.id_ingrediente
             JOIN CATEGORIA c ON c.id_categoria = i.id_categoria
             WHERE r.id_producto = ?'
        );
        $stmt->execute([$productId]);

        $ingredients = [];
        $packaging = [];

        foreach ($stmt->fetchAll() as $r) {
            $entry = [
                'id' => $r['id_ingrediente'],
                'name' => $r['nombre'],
                'quantityDeduct' => (float) $r['cantidad_necesaria'],
            ];
            if ($r['ambito'] === 'empaque_desechable') {
                $packaging[] = $entry;
            } else {
                $ingredients[] = $entry;
            }
        }

        return ['ingredients' => $ingredients, 'packaging' => $packaging];
    }

    /**
     * Crea un producto junto con sus filas de RECETA (ingredients + packaging)
     * dentro de una transacción. Devuelve el id creado.
     *
     * Nota: costPrice se guarda tal cual lo envía el cliente (costo_calculado);
     * el recálculo automático server-side queda fuera de alcance de esta fase.
     */
    public static function create(array $data): string
    {
        $pdo = static::db();
        $pdo->beginTransaction();

        try {
            $categoryId = self::resolveCategoryId($data['category'] ?? null);

            $stmt = $pdo->prepare(
                'INSERT INTO PRODUCTO
                    (id_producto, id_categoria, nombre, descripcion, precio, costo_calculado,
                     imagen, tiempo_preparacion, estado, etiqueta_destacada)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                '',
                $categoryId,
                $data['name'],
                $data['description'] ?? null,
                $data['price'],
                $data['costPrice'] ?? null,
                $data['image'] ?? null,
                $data['prepTime'] ?? null,
                ($data['active'] ?? true) ? 'activo' : 'oculto',
                $data['badge'] ?? 'ninguna',
            ]);

            $stmt = $pdo->prepare('SELECT id_producto FROM PRODUCTO WHERE nombre = ? ORDER BY creado_en DESC LIMIT 1');
            $stmt->execute([$data['name']]);
            $id = $stmt->fetchColumn();

            self::syncRecipe($pdo, $id, $data['ingredients'] ?? [], $data['packaging'] ?? []);

            $pdo->commit();
            return $id;
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public static function update(string $id, array $data): void
    {
        $pdo = static::db();
        $pdo->beginTransaction();

        try {
            $map = [
                'name' => 'nombre',
                'description' => 'descripcion',
                'price' => 'precio',
                'costPrice' => 'costo_calculado',
                'image' => 'imagen',
                'prepTime' => 'tiempo_preparacion',
            ];

            $fields = [];
            $params = [];

            foreach ($map as $jsonKey => $column) {
                if (array_key_exists($jsonKey, $data)) {
                    $fields[] = "{$column} = ?";
                    $params[] = $data[$jsonKey];
                }
            }

            if (array_key_exists('active', $data)) {
                $fields[] = 'estado = ?';
                $params[] = $data['active'] ? 'activo' : 'oculto';
            }

            if (array_key_exists('badge', $data)) {
                $fields[] = 'etiqueta_destacada = ?';
                $params[] = $data['badge'] ?: 'ninguna';
            }

            if (array_key_exists('category', $data)) {
                $fields[] = 'id_categoria = ?';
                $params[] = self::resolveCategoryId($data['category']);
            }

            if (!empty($fields)) {
                $params[] = $id;
                $stmt = $pdo->prepare('UPDATE PRODUCTO SET ' . implode(', ', $fields) . ' WHERE id_producto = ?');
                $stmt->execute($params);
            }

            if (array_key_exists('ingredients', $data) || array_key_exists('packaging', $data)) {
                self::syncRecipe($pdo, $id, $data['ingredients'] ?? [], $data['packaging'] ?? []);
            }

            $pdo->commit();
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    public static function delete(string $id): void
    {
        $pdo = static::db();
        $stmt = $pdo->prepare('DELETE FROM PRODUCTO WHERE id_producto = ?');
        $stmt->execute([$id]);
    }

    private static function syncRecipe(\PDO $pdo, string $productId, array $ingredients, array $packaging): void
    {
        $stmt = $pdo->prepare('DELETE FROM RECETA WHERE id_producto = ?');
        $stmt->execute([$productId]);

        $insert = $pdo->prepare(
            'INSERT INTO RECETA (id_receta, id_producto, id_ingrediente, cantidad_necesaria) VALUES (?, ?, ?, ?)'
        );

        foreach (array_merge($ingredients, $packaging) as $item) {
            if (empty($item['id'])) {
                continue;
            }
            $insert->execute(['', $productId, $item['id'], $item['quantityDeduct'] ?? 1]);
        }
    }

    private static function resolveCategoryId(?string $categoryName): string
    {
        $pdo = static::db();
        $categoryName = trim((string) $categoryName);

        if ($categoryName === '') {
            throw new \RuntimeException('La categoría del producto es obligatoria.');
        }

        $stmt = $pdo->prepare('SELECT id_categoria FROM CATEGORIA WHERE nombre = ? AND ambito = ? LIMIT 1');
        $stmt->execute([$categoryName, 'menu']);
        $id = $stmt->fetchColumn();

        if ($id) {
            return $id;
        }

        $stmt = $pdo->prepare('INSERT INTO CATEGORIA (id_categoria, nombre, ambito) VALUES (?, ?, ?)');
        $stmt->execute(['', $categoryName, 'menu']);

        $stmt = $pdo->prepare('SELECT id_categoria FROM CATEGORIA WHERE nombre = ? AND ambito = ? LIMIT 1');
        $stmt->execute([$categoryName, 'menu']);
        return $stmt->fetchColumn();
    }
}
