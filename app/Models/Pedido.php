<?php
// Modelo de PEDIDO (+ DETALLE_PEDIDO, PERSONALIZACION). Solo acceso a datos:
// listar/buscar pedidos y armar su JSON. Las reglas de negocio (checkout,
// transiciones de estado, resena) viven en app/Services/PedidoService.php.

class Pedido {

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

    // ---------------------------------------------------------------
    // Lectura
    // ---------------------------------------------------------------

    /**
     * Pedidos segun el rol de quien pregunta:
     *  - admin/cocina: todos
     *  - domiciliario: los suyos + los 'listo' sin domiciliario asignado todavia
     *  - cliente: solo los propios
     */
    public function porRol($rol, $usuarioId) {
        $sql = "SELECT p.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono,
                       d.nombre AS domiciliario_nombre, d.telefono AS domiciliario_telefono,
                       d.placa AS domiciliario_placa, d.tipo_vehiculo AS domiciliario_vehiculo
                FROM PEDIDO p
                JOIN CLIENTE c ON c.id_cliente = p.id_cliente
                LEFT JOIN DOMICILIARIO d ON d.id_domiciliario = p.id_domiciliario";

        if ($rol === 'client') {
            $sql .= ' WHERE p.id_cliente = ? ORDER BY p.fecha_hora DESC';
            $stmt = $this->consulta($sql, [$usuarioId]);
        } elseif ($rol === 'delivery') {
            $sql .= " WHERE p.id_domiciliario = ? OR (p.estado = 'listo' AND p.id_domiciliario IS NULL) ORDER BY p.fecha_hora DESC";
            $stmt = $this->consulta($sql, [$usuarioId]);
        } else {
            $sql .= ' ORDER BY p.fecha_hora DESC';
            $stmt = $this->consulta($sql);
        }

        $filas = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        $pedidos = [];
        foreach ($filas as $fila) {
            $pedidos[] = $this->formar($fila, $rol, $usuarioId);
        }
        return $pedidos;
    }

    /**
     * Busca por id interno o por numero visible (#ORD-123).
     * $rolQueVe/$idQueVe son opcionales (compatibilidad con las llamadas
     * internas tras una transicion, donde el actor ya esta autorizado por la
     * accion misma); cuando se pasan, se aplica la MISMA visibilidad que
     * porRol(): un cliente solo puede ver sus propios pedidos, un domiciliario
     * solo los suyos (o uno sin asignar y ya 'listo'). admin/kitchen ven
     * cualquiera, igual que en el listado. Si no pasa el filtro, devuelve null
     * (el controlador responde 404, no 403, para no confirmar que el id existe).
     */
    public function buscar($id, $rolQueVe = null, $idQueVe = null) {
        $numero = $this->numeroDesdeId($id);
        $sql = "SELECT p.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono,
                       d.nombre AS domiciliario_nombre, d.telefono AS domiciliario_telefono,
                       d.placa AS domiciliario_placa, d.tipo_vehiculo AS domiciliario_vehiculo
                FROM PEDIDO p
                JOIN CLIENTE c ON c.id_cliente = p.id_cliente
                LEFT JOIN DOMICILIARIO d ON d.id_domiciliario = p.id_domiciliario
                WHERE p.id_pedido = ? OR p.numero_pedido = ?";
        $stmt = $this->consulta($sql, [$id, $numero]);
        $fila = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$fila) {
            return null;
        }

        if ($rolQueVe === 'client' && $fila['id_cliente'] !== $idQueVe) {
            return null;
        }
        if ($rolQueVe === 'delivery') {
            $esSuyo = $fila['id_domiciliario'] === $idQueVe;
            $esDisponible = $fila['estado'] === 'listo' && $fila['id_domiciliario'] === null;
            if (!$esSuyo && !$esDisponible) {
                return null;
            }
        }

        return $this->formar($fila, $rolQueVe, $idQueVe);
    }

    /** Version cruda (sin formar el JSON) por id interno o numero visible. */
    public function buscarCrudo($id) {
        $numero = $this->numeroDesdeId($id);
        $stmt = $this->consulta('SELECT * FROM PEDIDO WHERE id_pedido = ? OR numero_pedido = ? LIMIT 1', [$id, $numero]);
        $fila = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $fila ?: null;
    }

    /**
     * Extrae el numero solo si $idVisible tiene el formato "#ORD-123" (el id
     * que ve el frontend). Un UUID interno (id_pedido) tambien termina en
     * digitos, asi que un patron laxo de "digitos al final" coincidia por
     * accidente con OTRO pedido via numero_pedido en la consulta OR de
     * buscar()/buscarCrudo() -- bug real, devolvia datos del pedido equivocado.
     */
    private function numeroDesdeId($idVisible) {
        if (preg_match('/^#ORD-(\d+)$/', $idVisible, $m)) {
            return (int) $m[1];
        }
        return 0;
    }

    public function itemsDe($idPedido) {
        $stmt = $this->consulta('SELECT * FROM DETALLE_PEDIDO WHERE id_pedido = ?', [$idPedido]);
        $detalles = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        $items = [];
        foreach ($detalles as $detalle) {
            $stmtP = $this->consulta('SELECT * FROM PERSONALIZACION WHERE id_detalle = ?', [$detalle['id_detalle']]);
            $personalizaciones = $stmtP->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmtP->close();

            $extras = [];
            $removidos = [];
            foreach ($personalizaciones as $p) {
                $entrada = ['id' => $p['id_ingrediente'], 'name' => $p['nombre_ingrediente'], 'quantity' => (float) $p['cantidad']];
                if ($p['accion_modificacion'] === 'agregar') {
                    $extras[] = $entrada;
                } else {
                    $removidos[] = $entrada;
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
                'removed' => $removidos,
            ];
        }
        return $items;
    }

    private function formar($fila, $rolQueVe, $idQueVe) {
        $items = $this->itemsDe($fila['id_pedido']);
        return pedido_a_json($fila, $items, $rolQueVe, $idQueVe);
    }
}
