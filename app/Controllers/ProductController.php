<?php

class ProductController {

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
        $auth = new Autenticacion($conn);
        $esAdmin = $auth->haySesion() && $auth->rolActual() === 'admin';
        responderJson((new Producto($conn))->listar(!$esAdmin, $esAdmin));
    }

    public function show($id) {
        global $conn;
        $auth = new Autenticacion($conn);
        $esAdmin = $auth->haySesion() && $auth->rolActual() === 'admin';
        $producto = (new Producto($conn))->buscar($id, $esAdmin);
        if (!$producto) {
            responderError('Producto no encontrado.', 404);
        }
        responderJson($producto);
    }

    public function store() {
        global $conn;
        $datos = $this->entrada();

        $errores = [];
        if (empty($datos['name'])) $errores['name'] = ['El campo name es obligatorio.'];
        if (!isset($datos['price']) || !is_numeric($datos['price'])) $errores['price'] = ['El campo price debe ser numérico.'];
        if (empty($datos['category'])) $errores['category'] = ['El campo category es obligatorio.'];
        if (!empty($errores)) {
            responderError('Datos inválidos.', 422, $errores);
        }

        $productoModelo = new Producto($conn);
        try {
            $id = $productoModelo->crear($datos);
        } catch (Exception $e) {
            responderError($e->getMessage(), 422);
        }

        responderJson($productoModelo->buscar($id, true), 201);
    }

    public function update($id) {
        global $conn;
        $productoModelo = new Producto($conn);
        if (!$productoModelo->buscar($id)) {
            responderError('Producto no encontrado.', 404);
        }

        $datos = $this->entrada();

        if (array_key_exists('price', $datos) && !is_numeric($datos['price'])) {
            responderError('Datos inválidos.', 422, ['price' => ['El campo price debe ser numérico.']]);
        }

        try {
            $productoModelo->actualizar($id, $datos);
        } catch (Exception $e) {
            responderError($e->getMessage(), 422);
        }

        responderJson($productoModelo->buscar($id, true));
    }

    public function destroy($id) {
        global $conn;
        $productoModelo = new Producto($conn);
        if (!$productoModelo->buscar($id)) {
            responderError('Producto no encontrado.', 404);
        }

        $productoModelo->eliminar($id);
        responderJson(['ok' => true]);
    }
}
