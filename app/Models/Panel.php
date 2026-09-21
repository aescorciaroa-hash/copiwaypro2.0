<?php
// Modelo del panel/dashboard de administrador: resumen del dia (ventas, pedidos
// por estado, stock bajo, productos top).

class Panel {

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

    public function resumenDeHoy() {
        $hoy = date('Y-m-d');

        $stmtVentas = $this->consulta(
            "SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS cantidad
             FROM PEDIDO WHERE DATE(fecha_hora) = ? AND estado != 'cancelado'",
            [$hoy]
        );
        $filaVentas = $stmtVentas->get_result()->fetch_assoc();
        $stmtVentas->close();

        $stmtEstados = $this->consulta('SELECT estado, COUNT(*) AS cantidad FROM PEDIDO GROUP BY estado');
        $porEstado = $stmtEstados->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmtEstados->close();

        $stmtStockBajo = $this->consulta(
            'SELECT id_ingrediente AS id, nombre AS name, cantidad_stock AS stock, umbral_minimo AS threshold
             FROM INGREDIENTE WHERE cantidad_stock <= umbral_minimo ORDER BY cantidad_stock ASC'
        );
        $stockBajo = $stmtStockBajo->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmtStockBajo->close();

        $stmtTop = $this->consulta(
            "SELECT dp.nombre_producto AS name, SUM(dp.cantidad) AS quantity, SUM(dp.cantidad * dp.precio_unitario) AS revenue
             FROM DETALLE_PEDIDO dp
             JOIN PEDIDO p ON p.id_pedido = dp.id_pedido
             WHERE p.estado != 'cancelado'
             GROUP BY dp.nombre_producto
             ORDER BY quantity DESC
             LIMIT 5"
        );
        $topProductos = $stmtTop->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmtTop->close();

        return [
            'salesToday' => (float) $filaVentas['total'],
            'ordersToday' => (int) $filaVentas['cantidad'],
            'ordersByStatus' => array_column($porEstado, 'cantidad', 'estado'),
            'lowStockItems' => $stockBajo,
            'topProducts' => $topProductos,
        ];
    }
}
