<?php
// Modelo de PEDIDO (+ DETALLE_PEDIDO, PERSONALIZACION, RESENA). Concentra todo
// el ciclo de vida del pedido: creacion (checkout), transiciones de estado y
// resenas. Metodos con nombres claros; SQL solo aqui, con transacciones y
// SELECT ... FOR UPDATE donde hace falta bloquear filas.

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

    private const ESTADO_BD_A_APP = [
        'pendiente' => 'Pendiente',
        'en_preparacion' => 'En Preparación',
        'listo' => 'Listos',
        'en_camino' => 'En Camino',
        'entregado' => 'Entregado',
        'cancelado' => 'Cancelado',
    ];

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

    private function idVisible($fila) {
        return '#ORD-' . $fila['numero_pedido'];
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

    // ---------------------------------------------------------------
    // Creacion (checkout)
    // ---------------------------------------------------------------

    /**
     * Crea un pedido nuevo. Recalcula precios/total en el servidor (nunca
     * confia en el cliente), valida horario, cobra (simulado) si es pago
     * digital, y dentro de una transaccion inserta el pedido + descuenta
     * inventario por receta. Lanza Exception con un mensaje claro si algo
     * falla (tienda cerrada, pago rechazado, sin stock, etc).
     */
    public function crear($idCliente, $payload) {
        $configuracion = new Configuracion($this->conn);
        if (!$configuracion->tiendaAbiertaAhora()) {
            throw new Exception('La tienda está cerrada o pausada en este momento. No se pueden procesar pagos.');
        }

        $items = $payload['items'] ?? [];
        if (empty($items)) {
            throw new InvalidArgumentException('El pedido no tiene ítems.');
        }

        $stmtCliente = $this->consulta('SELECT * FROM CLIENTE WHERE id_cliente = ? LIMIT 1', [$idCliente]);
        $cliente = $stmtCliente->get_result()->fetch_assoc();
        $stmtCliente->close();
        if (!$cliente) {
            throw new InvalidArgumentException('Cliente no encontrado.');
        }

        // ---- Recalcula todo en el servidor; nunca confia en precios/totales del cliente ----
        $itemsResueltos = [];
        $subtotal = 0.0;

        foreach ($items as $item) {
            $cantidad = max(1, (int) ($item['quantity'] ?? 1));

            if (empty($item['productId']) && !empty($item['stack'])) {
                // "Creador interactivo": hamburguesa armada capa por capa, sin producto base.
                $pila = $this->resolverIngredientes($item['stack']);
                if (empty($pila)) {
                    throw new InvalidArgumentException('La hamburguesa personalizada no tiene ingredientes válidos.');
                }
                $producto = $this->productoPersonalizadoOculto();
                $precioUnitario = array_sum(array_map(function ($e) { return (float) $e['precio_extra']; }, $pila));
                $subtotal += $precioUnitario * $cantidad;

                $itemsResueltos[] = [
                    'producto' => $producto,
                    'cantidad' => $cantidad,
                    'precioUnitario' => $precioUnitario,
                    'extras' => $pila,
                    'removidos' => [],
                ];
                continue;
            }

            $stmtProd = $this->consulta("SELECT * FROM PRODUCTO WHERE id_producto = ? AND estado = 'activo' LIMIT 1", [$item['productId'] ?? '']);
            $producto = $stmtProd->get_result()->fetch_assoc();
            $stmtProd->close();
            if (!$producto) {
                throw new InvalidArgumentException('Uno de los productos del carrito ya no está disponible.');
            }

            $extras = $this->resolverIngredientes($item['extras'] ?? []);
            $removidos = $this->resolverIngredientes($item['removed'] ?? []);

            $costoExtras = array_sum(array_map(function ($e) { return (float) $e['precio_extra']; }, $extras));
            $precioUnitario = (float) $producto['precio'] + $costoExtras;
            $subtotal += $precioUnitario * $cantidad;

            $itemsResueltos[] = [
                'producto' => $producto,
                'cantidad' => $cantidad,
                'precioUnitario' => $precioUnitario,
                'extras' => $extras,
                'removidos' => $removidos,
            ];
        }

        $envio = (float) $configuracion->tarifaDomicilio();
        $descuento = $this->descuentoCumpleanos($cliente, $subtotal);
        $total = round($subtotal - $descuento + $envio, 2);
        $puntos = (int) floor($total / 1000);

        $esEfectivo = ($payload['paymentMethod'] ?? 'online') === 'cash';
        $metodoPago = $esEfectivo ? 'efectivo' : 'digital';
        $estadoPago = 'pendiente';
        $fechaPago = null;
        $comprobante = null;

        if (!$esEfectivo) {
            $pago = $this->cobrarPagoSimulado($total);
            if (!$pago['aprobado']) {
                // Un pago digital rechazado NUNCA crea un pedido (cero credito).
                throw new Exception('El pago fue rechazado por la pasarela. Intenta con otro método.');
            }
            $estadoPago = 'aprobado';
            $fechaPago = date('Y-m-d H:i:s');
            $comprobante = $pago['referencia'];
        }
        // Si es efectivo: el pedido SI pasa a cocina, pero el pago queda 'pendiente'
        // hasta que el domiciliario liquide el efectivo en el cierre de caja.

        $this->conn->begin_transaction();
        try {
            $idPedido = generarUuid();
            $insertar = $this->consulta(
                "INSERT INTO PEDIDO
                    (id_pedido, id_cliente, direccion_entrega, destino_lat, destino_lng, estado,
                     canal_origen, metodo_pago, estado_pago, fecha_pago, comprobante_pago,
                     subtotal, costo_domicilio, descuento_cumpleanos, puntos_ganados, total)
                 VALUES (?, ?, ?, ?, ?, 'pendiente', 'web', ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    $idPedido, $idCliente, $payload['address'] ?? $cliente['direccion'],
                    $payload['lat'] ?? null, $payload['lng'] ?? null,
                    $metodoPago, $estadoPago, $fechaPago, $comprobante,
                    $subtotal, $envio, $descuento, $puntos, $total,
                ]
            );
            $insertar->close();

            $lineasDescuento = [];

            foreach ($itemsResueltos as $resuelto) {
                $producto = $resuelto['producto'];
                $idDetalle = generarUuid();
                $esPersonalizado = (!empty($resuelto['extras']) || !empty($resuelto['removidos'])) ? 1 : 0;

                $stmtDetalle = $this->consulta(
                    'INSERT INTO DETALLE_PEDIDO (id_detalle, id_pedido, id_producto, nombre_producto, cantidad, precio_unitario, es_personalizado)
                     VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [$idDetalle, $idPedido, $producto['id_producto'], $producto['nombre'], $resuelto['cantidad'], $resuelto['precioUnitario'], $esPersonalizado]
                );
                $stmtDetalle->close();

                foreach ($resuelto['extras'] as $extra) {
                    $stmtExtra = $this->consulta(
                        "INSERT INTO PERSONALIZACION (id_personalizacion, id_detalle, id_ingrediente, nombre_ingrediente, accion_modificacion, cantidad, costo_aplicado)
                         VALUES ('', ?, ?, ?, 'agregar', 1, ?)",
                        [$idDetalle, $extra['id_ingrediente'], $extra['nombre'], $extra['precio_extra']]
                    );
                    $stmtExtra->close();

                    $lineasDescuento[] = [
                        'id_ingrediente' => $extra['id_ingrediente'],
                        'cantidad' => $resuelto['cantidad'],
                        'motivo' => 'Extra pedido #ORD-' . $this->numeroPendiente($idPedido),
                    ];
                }

                foreach ($resuelto['removidos'] as $removido) {
                    $stmtQuitar = $this->consulta(
                        "INSERT INTO PERSONALIZACION (id_personalizacion, id_detalle, id_ingrediente, nombre_ingrediente, accion_modificacion, cantidad, costo_aplicado)
                         VALUES ('', ?, ?, ?, 'quitar', 1, 0)",
                        [$idDetalle, $removido['id_ingrediente'], $removido['nombre']]
                    );
                    $stmtQuitar->close();
                }

                // Receta base del producto (ingredientes + empaques), menos lo removido, por la cantidad pedida.
                $idsRemovidos = array_column($resuelto['removidos'], 'id_ingrediente');
                $stmtReceta = $this->consulta('SELECT id_ingrediente, cantidad_necesaria FROM RECETA WHERE id_producto = ?', [$producto['id_producto']]);
                $receta = $stmtReceta->get_result()->fetch_all(MYSQLI_ASSOC);
                $stmtReceta->close();

                foreach ($receta as $linea) {
                    if (in_array($linea['id_ingrediente'], $idsRemovidos, true)) {
                        continue;
                    }
                    $lineasDescuento[] = [
                        'id_ingrediente' => $linea['id_ingrediente'],
                        'cantidad' => (float) $linea['cantidad_necesaria'] * $resuelto['cantidad'],
                        'motivo' => 'Venta pedido',
                    ];
                }
            }

            // Bolsa de empaque global (1 por pedido, configurable por el admin).
            $idBolsa = $configuracion->idIngredienteBolsaGlobal();
            if ($idBolsa) {
                $lineasDescuento[] = ['id_ingrediente' => $idBolsa, 'cantidad' => 1, 'motivo' => 'Empaque global pedido'];
            }

            if (!empty($lineasDescuento)) {
                $ingredienteModelo = new Ingrediente($this->conn);
                $ingredienteModelo->descontarPorReceta($lineasDescuento, $idPedido);
            }

            $stmtPuntos = $this->consulta(
                'UPDATE CLIENTE SET puntos_fidelidad = puntos_fidelidad + ?, total_gastado = total_gastado + ? WHERE id_cliente = ?',
                [$puntos, $total, $idCliente]
            );
            $stmtPuntos->close();

            $this->conn->commit();
        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e;
        }

        return $this->buscar($idPedido, 'client', $idCliente);
    }

    /**
     * Producto "sombra" (oculto del catalogo) usado como ancla de FK para los
     * items 100% personalizados del creador interactivo. Se crea una sola vez.
     */
    private function productoPersonalizadoOculto() {
        $stmt = $this->consulta("SELECT * FROM PRODUCTO WHERE nombre = 'Hamburguesa Personalizada' AND estado = 'oculto' LIMIT 1");
        $producto = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if ($producto) {
            return $producto;
        }

        $stmtBuscarCat = $this->consulta("SELECT id_categoria FROM CATEGORIA WHERE nombre = 'Personalizado' AND ambito = 'menu' LIMIT 1");
        $filaCategoria = $stmtBuscarCat->get_result()->fetch_assoc();
        $stmtBuscarCat->close();

        if (!$filaCategoria) {
            $stmtCrearCat = $this->consulta("INSERT INTO CATEGORIA (id_categoria, nombre, ambito) VALUES ('', 'Personalizado', 'menu')");
            $stmtCrearCat->close();
            $stmtBuscarCat2 = $this->consulta("SELECT id_categoria FROM CATEGORIA WHERE nombre = 'Personalizado' AND ambito = 'menu' LIMIT 1");
            $filaCategoria = $stmtBuscarCat2->get_result()->fetch_assoc();
            $stmtBuscarCat2->close();
        }

        $stmtCrearProd = $this->consulta(
            "INSERT INTO PRODUCTO (id_producto, id_categoria, nombre, precio, estado)
             VALUES ('', ?, 'Hamburguesa Personalizada', 0, 'oculto')",
            [$filaCategoria['id_categoria']]
        );
        $stmtCrearProd->close();

        $stmtFinal = $this->consulta("SELECT * FROM PRODUCTO WHERE nombre = 'Hamburguesa Personalizada' AND estado = 'oculto' LIMIT 1");
        $producto = $stmtFinal->get_result()->fetch_assoc();
        $stmtFinal->close();
        return $producto;
    }

    private function numeroPendiente($idPedido) {
        $stmt = $this->consulta('SELECT numero_pedido FROM PEDIDO WHERE id_pedido = ?', [$idPedido]);
        $fila = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $fila ? (int) $fila['numero_pedido'] : 0;
    }

    /** @return array de {id_ingrediente, nombre, precio_extra} */
    private function resolverIngredientes($referencias) {
        $resueltos = [];
        foreach ($referencias as $ref) {
            $fila = null;
            if (!empty($ref['id'])) {
                $stmt = $this->consulta('SELECT * FROM INGREDIENTE WHERE id_ingrediente = ? LIMIT 1', [$ref['id']]);
                $fila = $stmt->get_result()->fetch_assoc();
                $stmt->close();
            }
            if (!$fila && !empty($ref['name'])) {
                $stmt = $this->consulta('SELECT * FROM INGREDIENTE WHERE LOWER(nombre) = LOWER(?) LIMIT 1', [$ref['name']]);
                $fila = $stmt->get_result()->fetch_assoc();
                $stmt->close();
            }
            if (!$fila) {
                continue; // ingrediente desconocido: se ignora en vez de romper el pedido
            }
            $resueltos[] = [
                'id_ingrediente' => $fila['id_ingrediente'],
                'nombre' => $fila['nombre'],
                'precio_extra' => (float) $fila['precio_extra'],
            ];
        }
        return $resueltos;
    }

    private function descuentoCumpleanos($cliente, $subtotal) {
        if (empty($cliente['fecha_nacimiento'])) {
            return 0.0;
        }
        $hoy = date('m-d');
        $cumple = date('m-d', strtotime($cliente['fecha_nacimiento']));
        return $cumple === $hoy ? round($subtotal * 0.15, 2) : 0.0;
    }

    /** Pasarela simulada (deterministica, sin aleatoriedad) para pagos digitales. */
    private function cobrarPagoSimulado($monto) {
        return [
            'aprobado' => true,
            'referencia' => 'SIM-' . strtoupper(bin2hex(random_bytes(6))),
        ];
    }

    // ---------------------------------------------------------------
    // Transiciones de estado
    // ---------------------------------------------------------------

    public function marcarPreparando($idPedido) {
        $this->transicion($idPedido, ['pendiente'], 'en_preparacion');
    }

    public function marcarListo($idPedido) {
        $this->transicion($idPedido, ['pendiente', 'en_preparacion'], 'listo');
    }

    public function aceptarEntrega($idPedido, $idDomiciliario) {
        $this->conn->begin_transaction();
        try {
            $stmt = $this->consulta('SELECT estado, id_domiciliario FROM PEDIDO WHERE id_pedido = ? FOR UPDATE', [$idPedido]);
            $fila = $stmt->get_result()->fetch_assoc();
            $stmt->close();

            if (!$fila || $fila['estado'] !== 'listo' || $fila['id_domiciliario'] !== null) {
                throw new Exception('Este pedido ya no está disponible para reparto.');
            }

            $stmtUpd = $this->consulta("UPDATE PEDIDO SET estado = 'en_camino', id_domiciliario = ? WHERE id_pedido = ?", [$idDomiciliario, $idPedido]);
            $stmtUpd->close();

            $this->conn->commit();
        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e;
        }
    }

    /** Entrega solo con PIN de 4 digitos verificado en el servidor. */
    public function confirmarEntrega($idPedido, $idDomiciliario, $pin) {
        $stmt = $this->consulta('SELECT pin_entrega, estado, id_domiciliario FROM PEDIDO WHERE id_pedido = ?', [$idPedido]);
        $fila = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$fila || $fila['estado'] !== 'en_camino' || $fila['id_domiciliario'] !== $idDomiciliario) {
            throw new Exception('No puedes confirmar la entrega de este pedido.');
        }
        if (!hash_equals($fila['pin_entrega'], $pin)) {
            throw new Exception('PIN incorrecto.');
        }

        $stmtUpd = $this->consulta("UPDATE PEDIDO SET estado = 'entregado' WHERE id_pedido = ?", [$idPedido]);
        $stmtUpd->close();
    }

    private function transicion($idPedido, $desdeValidos, $hacia) {
        $stmt = $this->consulta('SELECT estado FROM PEDIDO WHERE id_pedido = ?', [$idPedido]);
        $fila = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$fila || !in_array($fila['estado'], $desdeValidos, true)) {
            throw new Exception('Transición de estado no permitida.');
        }

        $stmtUpd = $this->consulta('UPDATE PEDIDO SET estado = ? WHERE id_pedido = ?', [$hacia, $idPedido]);
        $stmtUpd->close();
    }

    // ---------------------------------------------------------------
    // Resena
    // ---------------------------------------------------------------

    public function calificar($idPedido, $puntaje, $comentario) {
        $stmt = $this->consulta(
            'INSERT INTO RESENA (id_resena, id_pedido, puntaje, comentario)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE puntaje = VALUES(puntaje), comentario = VALUES(comentario)',
            ['', $idPedido, $puntaje, $comentario]
        );
        $stmt->close();
    }
}
