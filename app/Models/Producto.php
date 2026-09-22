<?php
// Modelo de PRODUCTO (+ RECETA). El producto "sombra" Hamburguesa Personalizada
// (usado por Pedido::crear para el creador interactivo) nunca aparece en el
// catalogo gestionable desde el panel.

class Producto {

    public $conn;

    public function __construct($conn) {
        $this->conn = $conn;
    }

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

    /**
     * $soloActivos=true para catalogos publicos; false para gestion de admin.
     * $esAdmin controla el shape del JSON (costPrice/receta/empaques solo para
     * el panel de gestion, nunca en el catalogo publico o de cliente).
     */
    public function listar($soloActivos = false, $esAdmin = false) {
        $sql = "SELECT p.*, c.nombre AS categoria_nombre
                FROM PRODUCTO p
                JOIN CATEGORIA c ON c.id_categoria = p.id_categoria
                WHERE p.nombre != 'Hamburguesa Personalizada'";
        if ($soloActivos) {
            $sql .= " AND p.estado = 'activo'";
        }
        $sql .= ' ORDER BY p.creado_en DESC';

        $stmt = $this->consulta($sql);
        $filas = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return array_map(function ($fila) use ($esAdmin) {
            return $this->comoJson($fila, $esAdmin);
        }, $filas);
    }

    public function buscar($id, $esAdmin = false) {
        $stmt = $this->consulta(
            'SELECT p.*, c.nombre AS categoria_nombre
             FROM PRODUCTO p
             JOIN CATEGORIA c ON c.id_categoria = p.id_categoria
             WHERE p.id_producto = ? LIMIT 1',
            [$id]
        );
        $fila = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $fila ? $this->comoJson($fila, $esAdmin) : null;
    }

    public function comoJson($fila, $esAdmin = false) {
        $receta = $this->recetaDe($fila['id_producto']);
        return producto_a_json($fila, $receta['ingredientes'], $receta['empaques'], $esAdmin);
    }

    private function recetaDe($idProducto) {
        $stmt = $this->consulta(
            'SELECT r.cantidad_necesaria, i.id_ingrediente, i.nombre, c.ambito
             FROM RECETA r
             JOIN INGREDIENTE i ON i.id_ingrediente = r.id_ingrediente
             JOIN CATEGORIA c ON c.id_categoria = i.id_categoria
             WHERE r.id_producto = ?',
            [$idProducto]
        );
        $filas = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        $ingredientes = [];
        $empaques = [];
        foreach ($filas as $r) {
            $entrada = ['id' => $r['id_ingrediente'], 'name' => $r['nombre'], 'quantityDeduct' => (float) $r['cantidad_necesaria']];
            if ($r['ambito'] === 'empaque_desechable') {
                $empaques[] = $entrada;
            } else {
                $ingredientes[] = $entrada;
            }
        }
        return ['ingredientes' => $ingredientes, 'empaques' => $empaques];
    }

    /** Crea el producto junto con su RECETA (ingredients + packaging), en transaccion. */
    public function crear($datos) {
        $this->conn->begin_transaction();
        try {
            $idCategoria = $this->resolverCategoria($datos['category'] ?? null);

            $stmt = $this->consulta(
                'INSERT INTO PRODUCTO
                    (id_producto, id_categoria, nombre, descripcion, precio, costo_calculado,
                     imagen, tiempo_preparacion, estado, etiqueta_destacada)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    '', $idCategoria, $datos['name'], $datos['description'] ?? null, $datos['price'],
                    $datos['costPrice'] ?? null, $datos['image'] ?? null, $datos['prepTime'] ?? null,
                    ($datos['active'] ?? true) ? 'activo' : 'oculto', $datos['badge'] ?? 'ninguna',
                ]
            );
            $stmt->close();

            $stmtId = $this->consulta('SELECT id_producto FROM PRODUCTO WHERE nombre = ? ORDER BY creado_en DESC LIMIT 1', [$datos['name']]);
            $id = $stmtId->get_result()->fetch_assoc()['id_producto'];
            $stmtId->close();

            $this->sincronizarReceta($id, $datos['ingredients'] ?? [], $datos['packaging'] ?? []);

            $this->conn->commit();
            return $id;
        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e;
        }
    }

    public function actualizar($id, $datos) {
        $this->conn->begin_transaction();
        try {
            $mapa = [
                'name' => 'nombre', 'description' => 'descripcion', 'price' => 'precio',
                'costPrice' => 'costo_calculado', 'image' => 'imagen', 'prepTime' => 'tiempo_preparacion',
            ];

            $campos = [];
            $valores = [];
            foreach ($mapa as $claveJson => $columna) {
                if (array_key_exists($claveJson, $datos)) {
                    $campos[] = "$columna = ?";
                    $valores[] = $datos[$claveJson];
                }
            }

            if (array_key_exists('active', $datos)) {
                $campos[] = 'estado = ?';
                $valores[] = $datos['active'] ? 'activo' : 'oculto';
            }
            if (array_key_exists('badge', $datos)) {
                $campos[] = 'etiqueta_destacada = ?';
                $valores[] = $datos['badge'] ?: 'ninguna';
            }
            if (array_key_exists('category', $datos)) {
                $campos[] = 'id_categoria = ?';
                $valores[] = $this->resolverCategoria($datos['category']);
            }

            if (!empty($campos)) {
                $valores[] = $id;
                $stmt = $this->consulta('UPDATE PRODUCTO SET ' . implode(', ', $campos) . ' WHERE id_producto = ?', $valores);
                $stmt->close();
            }

            if (array_key_exists('ingredients', $datos) || array_key_exists('packaging', $datos)) {
                $this->sincronizarReceta($id, $datos['ingredients'] ?? [], $datos['packaging'] ?? []);
            }

            $this->conn->commit();
        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e;
        }
    }

    public function eliminar($id) {
        $stmt = $this->consulta('DELETE FROM PRODUCTO WHERE id_producto = ?', [$id]);
        $stmt->close();
    }

    private function sincronizarReceta($idProducto, $ingredientes, $empaques) {
        $stmtDel = $this->consulta('DELETE FROM RECETA WHERE id_producto = ?', [$idProducto]);
        $stmtDel->close();

        foreach (array_merge($ingredientes, $empaques) as $item) {
            if (empty($item['id'])) {
                continue;
            }
            $stmtIns = $this->consulta(
                'INSERT INTO RECETA (id_receta, id_producto, id_ingrediente, cantidad_necesaria) VALUES (?, ?, ?, ?)',
                ['', $idProducto, $item['id'], $item['quantityDeduct'] ?? 1]
            );
            $stmtIns->close();
        }
    }

    private function resolverCategoria($nombreCategoria) {
        $nombreCategoria = trim((string) $nombreCategoria);
        if ($nombreCategoria === '') {
            throw new Exception('La categoría del producto es obligatoria.');
        }

        $stmt = $this->consulta('SELECT id_categoria FROM CATEGORIA WHERE nombre = ? AND ambito = ? LIMIT 1', [$nombreCategoria, 'menu']);
        $fila = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if ($fila) {
            return $fila['id_categoria'];
        }

        $stmtIns = $this->consulta('INSERT INTO CATEGORIA (id_categoria, nombre, ambito) VALUES (?, ?, ?)', ['', $nombreCategoria, 'menu']);
        $stmtIns->close();

        $stmtBuscar = $this->consulta('SELECT id_categoria FROM CATEGORIA WHERE nombre = ? AND ambito = ? LIMIT 1', [$nombreCategoria, 'menu']);
        $filaNueva = $stmtBuscar->get_result()->fetch_assoc();
        $stmtBuscar->close();
        return $filaNueva['id_categoria'];
    }
}
