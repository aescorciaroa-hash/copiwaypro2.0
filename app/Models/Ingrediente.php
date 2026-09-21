<?php
// Modelo de INGREDIENTE (+ CATEGORIA, MOVIMIENTO_INVENTARIO). Sirve dos formas
// del frontend: InventoryItem (gestion de stock, /api/inventory) e Ingredient
// (catalogo de extras de personalizacion, /api/ingredients).

class Ingrediente {

    public $conn;

    public function __construct($conn) {
        $this->conn = $conn;
    }

    /**
     * Ejecuta una consulta preparada. El tipo de cada parametro (i/d/s) se
     * infiere solo del valor PHP, asi que nunca hay que contar caracteres a mano.
     */
    private function consulta($sql, $parametros = []) {
        $stmt = $this->conn->prepare($sql);
        if (!empty($parametros)) {
            $tipos = '';
            foreach ($parametros as $p) {
                if (is_int($p)) {
                    $tipos .= 'i';
                } elseif (is_float($p)) {
                    $tipos .= 'd';
                } else {
                    $tipos .= 's';
                }
            }
            $stmt->bind_param($tipos, ...$parametros);
        }
        $stmt->execute();
        return $stmt;
    }

    private function base() {
        return 'SELECT i.*, c.nombre AS categoria_nombre
                 FROM INGREDIENTE i
                 JOIN CATEGORIA c ON c.id_categoria = i.id_categoria';
    }

    public function listarInventario() {
        $stmt = $this->consulta($this->base() . ' ORDER BY i.nombre ASC');
        $filas = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return array_map('ingrediente_a_inventario', $filas);
    }

    public function listarIngredientes() {
        $stmt = $this->consulta($this->base() . ' ORDER BY i.nombre ASC');
        $filas = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return array_map('ingrediente_a_catalogo', $filas);
    }

    public function buscar($id) {
        $stmt = $this->consulta($this->base() . ' WHERE i.id_ingrediente = ? LIMIT 1', [$id]);
        $fila = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $fila ?: null;
    }

    /** Usado directamente por InventoryController. */
    public function comoInventario($fila) {
        return ingrediente_a_inventario($fila);
    }

    /** Usado directamente por IngredientController. */
    public function comoIngrediente($fila) {
        return ingrediente_a_catalogo($fila);
    }

    /** Crea el insumo y, si trae stock inicial, registra el movimiento 'entrada'. */
    public function crearConStockInicial($datos, $idAdmin) {
        $this->conn->begin_transaction();
        try {
            $idCategoria = $this->resolverCategoria($datos['category'] ?? null);

            $stmt = $this->consulta(
                'INSERT INTO INGREDIENTE
                    (id_ingrediente, id_categoria, nombre, unidad_medida, cantidad_stock,
                     costo_unitario, costo_total, precio_extra, proveedor, notas)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    '', $idCategoria, $datos['name'], $datos['unit'] ?? 'unidad', $datos['stock'] ?? 0,
                    $datos['unitCost'] ?? 0, $datos['totalCost'] ?? null, $datos['price'] ?? 0,
                    $datos['supplier'] ?? null, $datos['notes'] ?? null,
                ]
            );
            $stmt->close();

            $stmtId = $this->consulta('SELECT id_ingrediente FROM INGREDIENTE WHERE nombre = ? AND id_categoria = ? ORDER BY creado_en DESC LIMIT 1', [$datos['name'], $idCategoria]);
            $fila = $stmtId->get_result()->fetch_assoc();
            $stmtId->close();
            $id = $fila['id_ingrediente'];

            $stock = (float) ($datos['stock'] ?? 0);
            if ($stock > 0) {
                $stmtMov = $this->consulta(
                    "INSERT INTO MOVIMIENTO_INVENTARIO (id_movimiento, id_ingrediente, id_admin, tipo_movimiento, cantidad, motivo)
                     VALUES ('', ?, ?, 'entrada', ?, 'Stock inicial')",
                    [$id, $idAdmin, $stock]
                );
                $stmtMov->close();
            }

            $this->conn->commit();
            return $id;
        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e;
        }
    }

    public function actualizar($id, $datos) {
        $mapa = [
            'name' => 'nombre', 'unit' => 'unidad_medida', 'stock' => 'cantidad_stock',
            'unitCost' => 'costo_unitario', 'totalCost' => 'costo_total', 'price' => 'precio_extra',
            'supplier' => 'proveedor', 'notes' => 'notas',
        ];

        $campos = [];
        $valores = [];
        foreach ($mapa as $claveJson => $columna) {
            if (array_key_exists($claveJson, $datos)) {
                $campos[] = "$columna = ?";
                $valores[] = $datos[$claveJson];
            }
        }
        if (array_key_exists('category', $datos)) {
            $campos[] = 'id_categoria = ?';
            $valores[] = $this->resolverCategoria($datos['category']);
        }
        if (empty($campos)) {
            return;
        }

        $valores[] = $id;
        $stmt = $this->consulta('UPDATE INGREDIENTE SET ' . implode(', ', $campos) . ' WHERE id_ingrediente = ?', $valores);
        $stmt->close();
    }

    public function eliminar($id) {
        $stmt = $this->consulta('DELETE FROM INGREDIENTE WHERE id_ingrediente = ?', [$id]);
        $stmt->close();
    }

    /** Ajuste manual (entrada/salida) desde el panel de inventario. Devuelve el nuevo stock. */
    public function ajustarStock($id, $cantidad, $idAdmin) {
        $this->conn->begin_transaction();
        try {
            $stmt = $this->consulta('SELECT cantidad_stock FROM INGREDIENTE WHERE id_ingrediente = ? FOR UPDATE', [$id]);
            $fila = $stmt->get_result()->fetch_assoc();
            $stmt->close();

            if (!$fila) {
                throw new Exception('Insumo no encontrado.');
            }

            $nuevoStock = max(0, (float) $fila['cantidad_stock'] + $cantidad);
            $stmtUpd = $this->consulta('UPDATE INGREDIENTE SET cantidad_stock = ? WHERE id_ingrediente = ?', [$nuevoStock, $id]);
            $stmtUpd->close();

            $stmtMov = $this->consulta(
                'INSERT INTO MOVIMIENTO_INVENTARIO (id_movimiento, id_ingrediente, id_admin, tipo_movimiento, cantidad, motivo)
                 VALUES (?, ?, ?, ?, ?, ?)',
                ['', $id, $idAdmin, $cantidad > 0 ? 'entrada' : 'salida', abs($cantidad), 'Ajuste manual']
            );
            $stmtMov->close();

            $this->conn->commit();
            return $nuevoStock;
        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e;
        }
    }

    /**
     * Descuenta stock por receta dentro de la transaccion ya abierta por quien
     * llama (Pedido::crear). Bloquea cada insumo con FOR UPDATE en orden
     * deterministico por id (evita interbloqueos entre pedidos simultaneos),
     * valida que haya stock suficiente para TODO antes de descontar nada, y
     * lanza Exception con mensaje claro si falta stock de algun insumo.
     */
    public function descontarPorReceta($lineas, $idPedido, $idAdmin = null) {
        $consolidado = [];
        foreach ($lineas as $linea) {
            $id = $linea['id_ingrediente'];
            if (!isset($consolidado[$id])) {
                $consolidado[$id] = ['cantidad' => 0, 'motivos' => []];
            }
            $consolidado[$id]['cantidad'] += $linea['cantidad'];
            $consolidado[$id]['motivos'][] = $linea['motivo'];
        }

        $ids = array_keys($consolidado);
        sort($ids);

        $stockBloqueado = [];
        $nombreBloqueado = [];
        foreach ($ids as $id) {
            $stmt = $this->consulta('SELECT id_ingrediente, nombre, cantidad_stock FROM INGREDIENTE WHERE id_ingrediente = ? FOR UPDATE', [$id]);
            $fila = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            if (!$fila) {
                throw new Exception("Insumo no encontrado (id $id).");
            }
            $stockBloqueado[$id] = (float) $fila['cantidad_stock'];
            $nombreBloqueado[$id] = $fila['nombre'];
        }

        foreach ($ids as $id) {
            $necesario = (float) $consolidado[$id]['cantidad'];
            if ($stockBloqueado[$id] < $necesario) {
                throw new Exception("Sin stock suficiente de \"{$nombreBloqueado[$id]}\" (disponible: {$stockBloqueado[$id]}, requerido: $necesario).");
            }
        }

        foreach ($ids as $id) {
            $necesario = (float) $consolidado[$id]['cantidad'];
            $stmtUpd = $this->consulta('UPDATE INGREDIENTE SET cantidad_stock = cantidad_stock - ? WHERE id_ingrediente = ?', [$necesario, $id]);
            $stmtUpd->close();

            $motivo = implode(' + ', array_unique($consolidado[$id]['motivos']));
            $stmtMov = $this->consulta(
                "INSERT INTO MOVIMIENTO_INVENTARIO (id_movimiento, id_ingrediente, id_admin, id_pedido, tipo_movimiento, cantidad, motivo)
                 VALUES ('', ?, ?, ?, 'salida', ?, ?)",
                [$id, $idAdmin, $idPedido, $necesario, $motivo]
            );
            $stmtMov->close();
        }
    }

    /** Resuelve un nombre de categoria a id_categoria; la crea (insumo_alimenticio) si no existe. */
    private function resolverCategoria($nombreCategoria) {
        $nombreCategoria = trim((string) $nombreCategoria);
        if ($nombreCategoria === '') {
            $nombreCategoria = 'Sin categoría';
        }

        $stmt = $this->consulta('SELECT id_categoria FROM CATEGORIA WHERE nombre = ? AND ambito IN (?, ?) LIMIT 1', [$nombreCategoria, 'insumo_alimenticio', 'empaque_desechable']);
        $fila = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if ($fila) {
            return $fila['id_categoria'];
        }

        $stmtIns = $this->consulta("INSERT INTO CATEGORIA (id_categoria, nombre, ambito) VALUES ('', ?, 'insumo_alimenticio')", [$nombreCategoria]);
        $stmtIns->close();

        $stmtBuscar = $this->consulta("SELECT id_categoria FROM CATEGORIA WHERE nombre = ? AND ambito = 'insumo_alimenticio' LIMIT 1", [$nombreCategoria]);
        $filaNueva = $stmtBuscar->get_result()->fetch_assoc();
        $stmtBuscar->close();
        return $filaNueva['id_categoria'];
    }

    public function registrosDeMovimientos() {
        $stmt = $this->consulta(
            "SELECT m.*, i.nombre AS item_nombre
             FROM MOVIMIENTO_INVENTARIO m
             JOIN INGREDIENTE i ON i.id_ingrediente = m.id_ingrediente
             ORDER BY m.fecha_hora DESC"
        );
        $filas = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        return array_map(function ($fila) {
            $cantidad = abs((float) $fila['cantidad']);
            if ($fila['tipo_movimiento'] === 'salida') {
                $cantidad = -$cantidad;
            }
            return [
                'id' => $fila['id_movimiento'],
                'date' => $fila['fecha_hora'],
                'itemId' => $fila['id_ingrediente'],
                'itemName' => $fila['item_nombre'],
                'amount' => $cantidad,
                'type' => $fila['tipo_movimiento'] === 'salida' ? 'Salida' : 'Entrada',
                'reason' => $fila['motivo'],
            ];
        }, $filas);
    }
}
