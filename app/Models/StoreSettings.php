<?php

namespace App\Models;

use App\Core\Model;

class StoreSettings extends Model
{
    /**
     * Devuelve la fila única de CONFIGURACION_SISTEMA formateada según el shape
     * StoreConfig del frontend (openTime, closeTime, isOpen, isPaused, shippingRate,
     * profitMargin, categories[]).
     */
    public static function get(): array
    {
        $pdo = static::db();
        $row = $pdo->query('SELECT * FROM CONFIGURACION_SISTEMA LIMIT 1')->fetch();

        if (!$row) {
            $row = [
                'horario_apertura' => '11:00:00',
                'horario_cierre' => '22:00:00',
                'tienda_abierta_manual' => 1,
                'pausa_emergencia_activa' => 0,
                'tarifa_plana_domicilio' => 0,
                'margen_ganancia_defecto' => 30,
            ];
        }

        $stmt = $pdo->prepare('SELECT nombre FROM CATEGORIA WHERE ambito = ? ORDER BY nombre ASC');
        $stmt->execute(['menu']);
        $categories = $stmt->fetchAll(\PDO::FETCH_COLUMN);

        return [
            'openTime' => substr((string) $row['horario_apertura'], 0, 5),
            'closeTime' => substr((string) $row['horario_cierre'], 0, 5),
            'isOpen' => (bool) $row['tienda_abierta_manual'],
            'isPaused' => (bool) $row['pausa_emergencia_activa'],
            'shippingRate' => (float) $row['tarifa_plana_domicilio'],
            'profitMargin' => (float) $row['margen_ganancia_defecto'],
            'categories' => $categories,
        ];
    }

    /**
     * Actualiza los campos editables de CONFIGURACION_SISTEMA. $fields usa las
     * claves camelCase del frontend (openTime, closeTime, isOpen, isPaused,
     * shippingRate, profitMargin); solo se actualizan las presentes.
     */
    public static function update(array $fields): void
    {
        $map = [
            'openTime' => 'horario_apertura',
            'closeTime' => 'horario_cierre',
            'isOpen' => 'tienda_abierta_manual',
            'isPaused' => 'pausa_emergencia_activa',
            'shippingRate' => 'tarifa_plana_domicilio',
            'profitMargin' => 'margen_ganancia_defecto',
        ];

        $sets = [];
        $params = [];

        foreach ($map as $jsonKey => $column) {
            if (!array_key_exists($jsonKey, $fields)) {
                continue;
            }
            $value = $fields[$jsonKey];
            if (in_array($jsonKey, ['openTime', 'closeTime'], true)) {
                $value = strlen((string) $value) === 5 ? $value . ':00' : $value;
            } elseif (in_array($jsonKey, ['isOpen', 'isPaused'], true)) {
                $value = $value ? 1 : 0;
            }
            $sets[] = "{$column} = ?";
            $params[] = $value;
        }

        if (empty($sets)) {
            return;
        }

        $pdo = static::db();
        $id = $pdo->query('SELECT id_config FROM CONFIGURACION_SISTEMA LIMIT 1')->fetchColumn();
        $sql = 'UPDATE CONFIGURACION_SISTEMA SET ' . implode(', ', $sets) . ' WHERE id_config = ?';
        $params[] = $id;
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    }

    /**
     * Agrega una categoría de menú (INSERT en CATEGORIA con ambito='menu') si no
     * existe ya una con el mismo nombre (comparación case-insensitive).
     */
    public static function addCategory(string $name): void
    {
        $name = trim($name);
        $pdo = static::db();

        $stmt = $pdo->prepare('SELECT id_categoria FROM CATEGORIA WHERE ambito = ? AND LOWER(nombre) = LOWER(?)');
        $stmt->execute(['menu', $name]);
        if ($stmt->fetchColumn()) {
            return;
        }

        $stmt = $pdo->prepare('INSERT INTO CATEGORIA (id_categoria, nombre, ambito) VALUES (?, ?, ?)');
        $stmt->execute(['', $name, 'menu']);
    }

    /**
     * Elimina una categoría de menú. Rechaza el borrado (con excepción de mensaje
     * claro) si hay algún PRODUCTO activo referenciándola, en vez de dejar que
     * reviente la FK de PRODUCTO.id_categoria con un error SQL crudo.
     */
    public static function removeCategory(string $name): void
    {
        $pdo = static::db();

        $stmt = $pdo->prepare('SELECT id_categoria FROM CATEGORIA WHERE ambito = ? AND nombre = ?');
        $stmt->execute(['menu', $name]);
        $id = $stmt->fetchColumn();

        if (!$id) {
            throw new \RuntimeException('La categoría no existe.');
        }

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM PRODUCTO WHERE id_categoria = ? AND estado = 'activo'");
        $stmt->execute([$id]);
        if ((int) $stmt->fetchColumn() > 0) {
            throw new \RuntimeException('No se puede eliminar la categoría: hay productos activos que la usan.');
        }

        $stmt = $pdo->prepare('DELETE FROM CATEGORIA WHERE id_categoria = ?');
        $stmt->execute([$id]);
    }

    /**
     * Regla de negocio reutilizable: la tienda está cerrada si el flag manual isOpen
     * está en false, o si pausa_emergencia_activa está activa, o si la hora actual del
     * servidor está fuera de [openTime, closeTime].
     */
    public static function isStoreOpenNow(): bool
    {
        $config = self::get();

        if (!$config['isOpen'] || $config['isPaused']) {
            return false;
        }

        $now = date('H:i');
        $open = $config['openTime'];
        $close = $config['closeTime'];

        if ($open <= $close) {
            return $now >= $open && $now <= $close;
        }

        return $now >= $open || $now <= $close;
    }

    /** Tarifa plana de domicilio vigente. */
    public static function shippingRate(): float
    {
        $pdo = static::db();
        return (float) $pdo->query('SELECT tarifa_plana_domicilio FROM CONFIGURACION_SISTEMA LIMIT 1')->fetchColumn();
    }

    /** Id del insumo INGREDIENTE configurado como "bolsa de empaque global". */
    public static function globalBagIngredientId(): ?string
    {
        $pdo = static::db();
        $id = $pdo->query('SELECT id_ingrediente_bolsa_global FROM CONFIGURACION_SISTEMA LIMIT 1')->fetchColumn();
        return $id ?: null;
    }
}
