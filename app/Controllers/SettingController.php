<?php

class SettingController {

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

    public function show() {
        global $conn;
        responderJson((new Configuracion($conn))->obtener());
    }

    public function update() {
        global $conn;
        $configuracionModelo = new Configuracion($conn);
        $configuracionModelo->actualizar($this->entrada());
        responderJson($configuracionModelo->obtener());
    }

    public function addCategory() {
        global $conn;
        $datos = $this->entrada();
        $categoria = trim((string) ($datos['category'] ?? ''));
        if ($categoria === '') {
            responderError('Datos inválidos.', 422, ['category' => ['El campo category es obligatorio.']]);
        }

        $configuracionModelo = new Configuracion($conn);
        $configuracionModelo->agregarCategoria($categoria);
        responderJson($configuracionModelo->obtener());
    }

    public function removeCategory($category) {
        global $conn;
        $configuracionModelo = new Configuracion($conn);
        try {
            $configuracionModelo->eliminarCategoria(urldecode($category));
        } catch (Exception $e) {
            responderError($e->getMessage(), 409);
        }

        responderJson($configuracionModelo->obtener());
    }
}
