<?php
// Modelo de cierre de caja (REPORTE_CAJA + LIQUIDACION_DOMICILIARIO +
// DETALLE_AUDITORIA). Solo acceso a datos: consultas de lectura y el shape
// final del reporte ya persistido. La orquestacion (calcular totales, decidir
// si ya se genero hoy, archivar pedidos, liquidar domiciliarios) vive en
// app/Services/CajaService.php.

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

    /** true si este admin ya genero un cierre en esa fecha (evita duplicar/pisar). */
    public function yaGeneradoHoy($idAdmin, $fecha) {
        $stmt = $this->consulta('SELECT id_reporte FROM REPORTE_CAJA WHERE id_admin = ? AND fecha = ?', [$idAdmin, $fecha]);
        $existe = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return (bool) $existe;
    }

    /** Pedidos 'entregado' que todavia no pertenecen a ningun reporte (turno actual). */
    public function pedidosDelTurno() {
        $stmt = $this->consulta(
            "SELECT p.*, c.nombre AS cliente_nombre FROM PEDIDO p
             JOIN CLIENTE c ON c.id_cliente = p.id_cliente
             WHERE p.estado = 'entregado' AND p.id_reporte IS NULL"
        );
        $pedidos = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $pedidos;
    }

    /** Consumo real de insumos: RECETA x cantidad vendida, para los pedidos dados. */
    public function consumoTeorico($idsPedidos) {
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

    /** Domiciliarios activos, para calcular su liquidacion del turno. */
    public function domiciliariosActivos() {
        $stmt = $this->consulta("SELECT id_domiciliario, nombre, base_efectivo_asignada FROM DOMICILIARIO WHERE activo = 1");
        $filas = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $filas;
    }

    public function stockActual($idIngrediente) {
        $stmt = $this->consulta('SELECT cantidad_stock FROM INGREDIENTE WHERE id_ingrediente = ?', [$idIngrediente]);
        $fila = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return (float) $fila['cantidad_stock'];
    }

    public function pedidosActivosCount() {
        $stmt = $this->consulta("SELECT COUNT(*) AS total FROM PEDIDO WHERE estado NOT IN ('entregado', 'cancelado')");
        $total = (int) $stmt->get_result()->fetch_assoc()['total'];
        $stmt->close();
        return $total;
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
            'SELECT p.id_pedido, p.total, p.metodo_pago, c.nombre AS cliente
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
                    'id' => '#ORD-' . $o['id_pedido'],
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
