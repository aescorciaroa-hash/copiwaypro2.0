<?php

class IngredientController {

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
        responderJson((new Ingrediente($conn))->listarIngredientes());
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
        $fila = $ingredienteModelo->buscar($id);
        responderJson($ingredienteModelo->comoIngrediente($fila), 201);
    }

    public function update($id) {
        global $conn;
        $ingredienteModelo = new Ingrediente($conn);
        if (!$ingredienteModelo->buscar($id)) {
            responderError('Ingrediente no encontrado.', 404);
        }

        $ingredienteModelo->actualizar($id, $this->entrada());
        responderJson($ingredienteModelo->comoIngrediente($ingredienteModelo->buscar($id)));
    }

    public function destroy($id) {
        global $conn;
        $ingredienteModelo = new Ingrediente($conn);
        if (!$ingredienteModelo->buscar($id)) {
            responderError('Ingrediente no encontrado.', 404);
        }

        $ingredienteModelo->eliminar($id);
        responderJson(['ok' => true]);
    }
}
