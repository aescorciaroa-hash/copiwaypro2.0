<?php
// Modelo de cierre de caja (REPORTE_CAJA + LIQUIDACION_DOMICILIARIO +
// DETALLE_AUDITORIA). Consolida efectivo vs digital, consumo real de insumos
// y ganancia neta; ARCHIVA (no borra) los pedidos del turno asignandoles
// id_reporte, y liquida a cada domiciliario su efectivo recolectado.

class Caja {

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
     * Vista previa del cierre: exactamente el mismo calculo que generar(),
     * pero de SOLO LECTURA -- no inserta REPORTE_CAJA/LIQUIDACION_DOMICILIARIO/
     * DETALLE_AUDITORIA, no archiva pedidos (no toca id_reporte). El admin ve
     * el resultado antes de decidir si confirma (POST /api/cash-closing, que
     * sigue siendo el unico paso que persiste algo).
     */
    public function previsualizar($idAdmin) {
        $hoy = date('Y-m-d');

        $stmtExiste = $this->consulta('SELECT id_reporte FROM REPORTE_CAJA WHERE id_admin = ? AND fecha = ?', [$idAdmin, $hoy]);
        $existe = $stmtExiste->get_result()->fetch_assoc();
        $stmtExiste->close();
        if ($existe) {
            throw new Exception('Ya se generó un cierre de caja hoy para este administrador.');
        }

        $pedidos = $this->pedidosDelTurno();
        $totales = $this->calcularTotales($pedidos);

        $stmtDomiciliarios = $this->consulta("SELECT id_domiciliario, nombre, base_efectivo_asignada FROM DOMICILIARIO WHERE activo = 1");
        $domiciliarios = $stmtDomiciliarios->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmtDomiciliarios->close();

        $driverLiquidations = [];
        foreach ($domiciliarios as $domiciliario) {
            $recolectado = $totales['efectivoPorDomiciliario'][$domiciliario['id_domiciliario']] ?? 0;
            if ($recolectado <= 0) {
                continue;
            }
            $ordersCount = 0;
            foreach ($pedidos as $pedido) {
                if ($pedido['id_domiciliario'] === $domiciliario['id_domiciliario'] && $pedido['metodo_pago'] === 'efectivo') {
                    $ordersCount++;
                }
            }
            $driverLiquidations[] = [
                'driverName' => $domiciliario['nombre'],
                'ordersCount' => $ordersCount,
                'baseCash' => (float) $domiciliario['base_efectivo_asignada'],
                'cashCollected' => $recolectado,
                'totalDue' => (float) $domiciliario['base_efectivo_asignada'] + $recolectado,
            ];
        }

        $idsPedidos = array_column($pedidos, 'id_pedido');
        $insumos = $this->consumoTeorico($idsPedidos);
        $insumosConsumidos = [];
        foreach ($insumos as $idIngrediente => $datos) {
            $stmtStock = $this->consulta('SELECT cantidad_stock FROM INGREDIENTE WHERE id_ingrediente = ?', [$idIngrediente]);
            $stockReal = (float) $stmtStock->get_result()->fetch_assoc()['cantidad_stock'];
            $stmtStock->close();
            $insumosConsumidos[] = ['name' => $datos['nombre'], 'used' => $datos['consumido'], 'stockReal' => $stockReal];
        }

        $stmtActivos = $this->consulta("SELECT COUNT(*) AS total FROM PEDIDO WHERE estado NOT IN ('entregado', 'cancelado')");
        $activeOrdersCount = (int) $stmtActivos->get_result()->fetch_assoc()['total'];
        $stmtActivos->close();

        return [
            'date' => $hoy,
            'totalVentas' => $totales['totalVentas'],
            'totalOrdenes' => count($pedidos),
            'desglose' => ['efectivo' => $totales['totalEfectivo'], 'digital' => $totales['totalDigital']],
            'driverLiquidations' => $driverLiquidations,
            'insumosConsumidos' => $insumosConsumidos,
            'orders' => array_map(function ($o) {
                return [
                    'id' => '#ORD-' . $o['numero_pedido'],
                    'client' => $o['cliente_nombre'] ?? null,
                    'total' => (float) $o['total'],
                    'paymentMethod' => $o['metodo_pago'] === 'efectivo' ? 'cash' : 'online',
                ];
            }, $pedidos),
            'activeOrdersCount' => $activeOrdersCount,
        ];
    }

    private function pedidosDelTurno() {
        $stmt = $this->consulta(
            "SELECT p.*, c.nombre AS cliente_nombre FROM PEDIDO p
             JOIN CLIENTE c ON c.id_cliente = p.id_cliente
             WHERE p.estado = 'entregado' AND p.id_reporte IS NULL"
        );
        $pedidos = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $pedidos;
    }

    private function calcularTotales($pedidos) {
        $totalVentas = 0.0;
        $totalEfectivo = 0.0;
        $totalDigital = 0.0;
        $efectivoPorDomiciliario = [];

        foreach ($pedidos as $pedido) {
            $totalVentas += (float) $pedido['total'];
            if ($pedido['metodo_pago'] === 'efectivo') {
                $totalEfectivo += (float) $pedido['total'];
                if ($pedido['id_domiciliario']) {
                    $efectivoPorDomiciliario[$pedido['id_domiciliario']] =
                        ($efectivoPorDomiciliario[$pedido['id_domiciliario']] ?? 0) + (float) $pedido['total'];
                }
            } else {
                $totalDigital += (float) $pedido['total'];
            }
        }

        return [
            'totalVentas' => $totalVentas,
            'totalEfectivo' => $totalEfectivo,
            'totalDigital' => $totalDigital,
            'efectivoPorDomiciliario' => $efectivoPorDomiciliario,
        ];
    }

    /**
     * Genera el cierre del dia para el admin autenticado. Solo considera
     * pedidos 'entregado' que todavia no pertenecen a ningun reporte
     * (id_reporte IS NULL) — asi un cierre nunca se repite ni se pisa.
     */
    public function generar($idAdmin) {
        $hoy = date('Y-m-d');

        $this->conn->begin_transaction();
        try {
            $stmtExiste = $this->consulta('SELECT id_reporte FROM REPORTE_CAJA WHERE id_admin = ? AND fecha = ?', [$idAdmin, $hoy]);
            $existe = $stmtExiste->get_result()->fetch_assoc();
            $stmtExiste->close();
            if ($existe) {
                throw new Exception('Ya se generó un cierre de caja hoy para este administrador.');
            }

            $pedidos = $this->pedidosDelTurno();
            $totales = $this->calcularTotales($pedidos);
            $totalVentas = $totales['totalVentas'];
            $totalEfectivo = $totales['totalEfectivo'];
            $totalDigital = $totales['totalDigital'];
            $efectivoPorDomiciliario = $totales['efectivoPorDomiciliario'];

            $idReporte = generarUuid();
            $stmtIns = $this->consulta(
                'INSERT INTO REPORTE_CAJA (id_reporte, id_admin, fecha, total_ventas, total_efectivo, total_digital)
                 VALUES (?, ?, ?, ?, ?, ?)',
                [$idReporte, $idAdmin, $hoy, $totalVentas, $totalEfectivo, $totalDigital]
            );
            $stmtIns->close();

            // Archiva los pedidos del turno (no se borran).
            if (!empty($pedidos)) {
                foreach ($pedidos as $pedido) {
                    $stmtUpd = $this->consulta('UPDATE PEDIDO SET id_reporte = ? WHERE id_pedido = ?', [$idReporte, $pedido['id_pedido']]);
                    $stmtUpd->close();
                }
            }

            // Liquidacion por domiciliario: base asignada + efectivo recolectado en el turno.
            $stmtDomiciliarios = $this->consulta("SELECT id_domiciliario, base_efectivo_asignada FROM DOMICILIARIO WHERE activo = 1");
            $domiciliarios = $stmtDomiciliarios->get_result()->fetch_all(MYSQLI_ASSOC);
            $stmtDomiciliarios->close();

            foreach ($domiciliarios as $domiciliario) {
                $recolectado = $efectivoPorDomiciliario[$domiciliario['id_domiciliario']] ?? 0;
                if ($recolectado <= 0) {
                    continue;
                }
                $stmtLiq = $this->consulta(
                    'INSERT INTO LIQUIDACION_DOMICILIARIO
                        (id_liquidacion, id_reporte, id_domiciliario, base_asignada, efectivo_recolectado, efectivo_liquidado)
                     VALUES (?, ?, ?, ?, ?, ?)',
                    [
                        '', $idReporte, $domiciliario['id_domiciliario'], $domiciliario['base_efectivo_asignada'],
                        $recolectado, (float) $domiciliario['base_efectivo_asignada'] + $recolectado,
                    ]
                );
                $stmtLiq->close();
            }

            // Consumo real de insumos: RECETA x cantidad vendida en los pedidos del turno,
            // comparado contra el stock fisico actual (auditoria teorico vs. real).
            $idsPedidos = array_column($pedidos, 'id_pedido');
            $insumos = $this->consumoTeorico($idsPedidos);
            foreach ($insumos as $idIngrediente => $datos) {
                $stmtStock = $this->consulta('SELECT cantidad_stock FROM INGREDIENTE WHERE id_ingrediente = ?', [$idIngrediente]);
                $stockReal = (float) $stmtStock->get_result()->fetch_assoc()['cantidad_stock'];
                $stmtStock->close();

                $stmtAud = $this->consulta(
                    'INSERT INTO DETALLE_AUDITORIA (id_auditoria, id_reporte, id_ingrediente, nombre, stock_teorico, stock_real)
                     VALUES (?, ?, ?, ?, ?, ?)',
                    ['', $idReporte, $idIngrediente, $datos['nombre'], $datos['consumido'], $stockReal]
                );
                $stmtAud->close();
            }

            $stmtActivos = $this->consulta("SELECT COUNT(*) AS total FROM PEDIDO WHERE estado NOT IN ('entregado', 'cancelado')");
            $activeOrdersCount = (int) $stmtActivos->get_result()->fetch_assoc()['total'];
            $stmtActivos->close();

            $this->conn->commit();

            return array_merge($this->reporte($idReporte), ['activeOrdersCount' => $activeOrdersCount]);
        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e;
        }
    }

    private function consumoTeorico($idsPedidos) {
        if (empty($idsPedidos)) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($idsPedidos), '?'));
        $stmt = $this->consulta(
            "SELECT i.id_ingrediente, i.nombre, SUM(r.cantidad_necesaria * dp.cantidad) AS consumido
             FROM DETALLE_PEDIDO dp
             JOIN RECETA r ON r.id_producto = dp.id_producto
             JOIN INGREDIENTE i ON i.id_ingrediente = r.id_ingrediente
             WHERE dp.id_pedido IN ($placeholders)
             GROUP BY i.id_ingrediente, i.nombre",
            $idsPedidos
        );
        $filas = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        $resultado = [];
        foreach ($filas as $fila) {
            $resultado[$fila['id_ingrediente']] = ['nombre' => $fila['nombre'], 'consumido' => (float) $fila['consumido']];
        }
        return $resultado;
    }

    public function reporte($idReporte) {
        $stmt = $this->consulta('SELECT * FROM REPORTE_CAJA WHERE id_reporte = ?', [$idReporte]);
        $reporte = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        $stmtLiq = $this->consulta(
            'SELECT l.*, d.nombre AS driver_nombre FROM LIQUIDACION_DOMICILIARIO l
             JOIN DOMICILIARIO d ON d.id_domiciliario = l.id_domiciliario
             WHERE l.id_reporte = ?',
            [$idReporte]
        );
        $liquidaciones = $stmtLiq->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmtLiq->close();

        $stmtAud = $this->consulta('SELECT nombre, stock_teorico, stock_real FROM DETALLE_AUDITORIA WHERE id_reporte = ?', [$idReporte]);
        $auditoria = $stmtAud->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmtAud->close();

        $stmtPedidos = $this->consulta(
            'SELECT p.numero_pedido, p.total, p.metodo_pago, c.nombre AS cliente
             FROM PEDIDO p JOIN CLIENTE c ON c.id_cliente = p.id_cliente
             WHERE p.id_reporte = ?',
            [$idReporte]
        );
        $pedidos = $stmtPedidos->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmtPedidos->close();

        return [
            'date' => $reporte['fecha'],
            'totalVentas' => (float) $reporte['total_ventas'],
            'totalOrdenes' => count($pedidos),
            'desglose' => [
                'efectivo' => (float) $reporte['total_efectivo'],
                'digital' => (float) $reporte['total_digital'],
            ],
            'driverLiquidations' => array_map(function ($l) use ($idReporte) {
                $stmtCount = $this->consulta(
                    "SELECT COUNT(*) AS total FROM PEDIDO WHERE id_reporte = ? AND id_domiciliario = ? AND metodo_pago = 'efectivo'",
                    [$idReporte, $l['id_domiciliario']]
                );
                $ordersCount = (int) $stmtCount->get_result()->fetch_assoc()['total'];
                $stmtCount->close();

                return [
                    'driverName' => $l['driver_nombre'],
                    'ordersCount' => $ordersCount,
                    'baseCash' => (float) $l['base_asignada'],
                    'cashCollected' => (float) $l['efectivo_recolectado'],
                    'totalDue' => (float) $l['efectivo_liquidado'],
                ];
            }, $liquidaciones),
            'insumosConsumidos' => array_map(function ($a) {
                return ['name' => $a['nombre'], 'used' => (float) $a['stock_teorico'], 'stockReal' => (float) $a['stock_real']];
            }, $auditoria),
            'orders' => array_map(function ($o) {
                return [
                    'id' => '#ORD-' . $o['numero_pedido'],
                    'client' => $o['cliente'],
                    'total' => (float) $o['total'],
                    'paymentMethod' => $o['metodo_pago'] === 'efectivo' ? 'cash' : 'online',
                ];
            }, $pedidos),
        ];
    }

    public function historialDeAdmin($idAdmin) {
        $stmt = $this->consulta(
            'SELECT id_reporte, fecha, total_ventas, total_efectivo, total_digital
             FROM REPORTE_CAJA WHERE id_admin = ? ORDER BY fecha DESC',
            [$idAdmin]
        );
        $filas = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $filas;
    }
}
