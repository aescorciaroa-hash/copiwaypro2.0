<?php
// Servicio de cierre de caja: decide y ejecuta el cierre del dia (consolida
// efectivo vs digital, calcula consumo real de insumos, archiva los pedidos
// del turno y liquida a cada domiciliario). El Model (Caja.php) solo hace
// las consultas; aqui vive la logica de "que significa cerrar caja hoy".

class CajaService {

    public $conn;
    private $cajaModelo;

    public function __construct($conn) {
        $this->conn = $conn;
        $this->cajaModelo = new Caja($conn);
    }

    /**
     * Vista previa del cierre: exactamente el mismo calculo que generar(),
     * pero de SOLO LECTURA -- no inserta REPORTE_CAJA/LIQUIDACION_DOMICILIARIO/
     * DETALLE_AUDITORIA, no archiva pedidos (no toca id_reporte). El admin ve
     * el resultado antes de decidir si confirma (CajaService::generar(), que
     * sigue siendo el unico paso que persiste algo).
     */
    public function previsualizar($idAdmin) {
        $hoy = date('Y-m-d');

        if ($this->cajaModelo->yaGeneradoHoy($idAdmin, $hoy)) {
            throw new Exception('Ya se generó un cierre de caja hoy para este administrador.');
        }

        $pedidos = $this->cajaModelo->pedidosDelTurno();
        $totales = $this->calcularTotales($pedidos);

        $driverLiquidations = [];
        foreach ($this->cajaModelo->domiciliariosActivos() as $domiciliario) {
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
        $insumosConsumidos = [];
        foreach ($this->cajaModelo->consumoTeorico($idsPedidos) as $idIngrediente => $datos) {
            $insumosConsumidos[] = [
                'name' => $datos['nombre'],
                'used' => $datos['consumido'],
                'stockReal' => $this->cajaModelo->stockActual($idIngrediente),
            ];
        }

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
            'activeOrdersCount' => $this->cajaModelo->pedidosActivosCount(),
        ];
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
            if ($this->cajaModelo->yaGeneradoHoy($idAdmin, $hoy)) {
                throw new Exception('Ya se generó un cierre de caja hoy para este administrador.');
            }

            $pedidos = $this->cajaModelo->pedidosDelTurno();
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
            foreach ($this->cajaModelo->domiciliariosActivos() as $domiciliario) {
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
            foreach ($this->cajaModelo->consumoTeorico($idsPedidos) as $idIngrediente => $datos) {
                $stmtAud = $this->consulta(
                    'INSERT INTO DETALLE_AUDITORIA (id_auditoria, id_reporte, id_ingrediente, nombre, stock_teorico, stock_real)
                     VALUES (?, ?, ?, ?, ?, ?)',
                    ['', $idReporte, $idIngrediente, $datos['nombre'], $datos['consumido'], $this->cajaModelo->stockActual($idIngrediente)]
                );
                $stmtAud->close();
            }

            $activeOrdersCount = $this->cajaModelo->pedidosActivosCount();

            $this->conn->commit();

            return array_merge($this->cajaModelo->reporte($idReporte), ['activeOrdersCount' => $activeOrdersCount]);
        } catch (Exception $e) {
            $this->conn->rollback();
            throw $e;
        }
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
}
