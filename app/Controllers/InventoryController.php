<?php

class InventoryController {

    private function entrada() {
        $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $cuerpo = [];
        if (!in_array($metodo, ['GET', 'HEAD'])) {
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
            if (stripos($contentType, 'application/json') !== false) {
                $decodificado = json_decode(file_get_contents('php://input') ?: '[]', true);
                $cuerpo = is_array($decodificado) ? $decodificado : [];
            } else {
                $cuerpo = $_POST;
            }
        }
        return array_merge($_GET, $cuerpo);
    }

    public function index() {
        global $conn;
        responderJson((new Ingrediente($conn))->listarInventario());
    }

    public function store() {
        global $conn;
        $datos = $this->entrada();

        $errores = [];
        if (empty($datos['name'])) $errores['name'] = ['El campo name es obligatorio.'];
        if (empty($datos['category'])) $errores['category'] = ['El campo category es obligatorio.'];
        if (!empty($errores)) {
            responderError('Datos inválidos.', 422, $errores);
        }

        $auth = new Autenticacion($conn);
        $ingredienteModelo = new Ingrediente($conn);
        $id = $ingredienteModelo->crearConStockInicial($datos, $auth->idActual());
        responderJson($ingredienteModelo->comoInventario($ingredienteModelo->buscar($id)), 201);
    }

    public function update($id) {
        global $conn;
        $ingredienteModelo = new Ingrediente($conn);
        if (!$ingredienteModelo->buscar($id)) {
            responderError('Insumo no encontrado.', 404);
        }

        $ingredienteModelo->actualizar($id, $this->entrada());
        responderJson($ingredienteModelo->comoInventario($ingredienteModelo->buscar($id)));
    }

    public function destroy($id) {
        global $conn;
        $ingredienteModelo = new Ingrediente($conn);
        if (!$ingredienteModelo->buscar($id)) {
            responderError('Insumo no encontrado.', 404);
        }

        $ingredienteModelo->eliminar($id);
        responderJson(['ok' => true]);
    }

    public function adjustStock($id) {
        global $conn;
        $ingredienteModelo = new Ingrediente($conn);
        if (!$ingredienteModelo->buscar($id)) {
            responderError('Insumo no encontrado.', 404);
        }

        $datos = $this->entrada();
        if (!isset($datos['amount']) || !is_numeric($datos['amount'])) {
            responderError('Datos inválidos.', 422, ['amount' => ['El campo amount debe ser numérico.']]);
        }

        $auth = new Autenticacion($conn);
        try {
            $ingredienteModelo->ajustarStock($id, (float) $datos['amount'], $auth->idActual());
        } catch (Exception $e) {
            responderError($e->getMessage(), 422);
        }

        responderJson($ingredienteModelo->comoInventario($ingredienteModelo->buscar($id)));
    }

    public function logs() {
        global $conn;
        responderJson((new Ingrediente($conn))->registrosDeMovimientos());
    }
}
