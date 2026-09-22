<?php

class CashClosingController {

    /**
     * Vista previa de solo lectura: mismo calculo que store(), sin archivar
     * nada. El admin la ve antes de decidir si confirma con store().
     */
    public function preview() {
        global $conn;
        $auth = new Autenticacion($conn);

        try {
            $reporte = (new CajaService($conn))->previsualizar($auth->idActual());
            responderJson($reporte);
        } catch (Exception $e) {
            responderError($e->getMessage(), 409);
        }
    }

    /** Genera y archiva el cierre de caja del dia para el admin autenticado. */
    public function store() {
        global $conn;
        $auth = new Autenticacion($conn);

        try {
            $reporte = (new CajaService($conn))->generar($auth->idActual());
            responderJson($reporte, 201);
        } catch (Exception $e) {
            responderError($e->getMessage(), 409);
        }
    }

    /** Historial de cierres ya generados (para auditoria/consulta). */
    public function index() {
        global $conn;
        $auth = new Autenticacion($conn);
        responderJson((new Caja($conn))->historialDeAdmin($auth->idActual()));
    }

    public function show($id) {
        global $conn;
        try {
            responderJson((new Caja($conn))->reporte($id));
        } catch (Exception $e) {
            responderError('Cierre no encontrado.', 404);
        }
    }
}
