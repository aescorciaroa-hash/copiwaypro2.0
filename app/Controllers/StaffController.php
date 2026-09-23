<?php

class StaffController {

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
        responderJson((new Personal($conn))->listar());
    }

    public function store() {
        global $conn;
        $datos = $this->entrada();

        $errores = [];
        if (empty($datos['name'])) $errores['name'] = ['El campo name es obligatorio.'];
        if (empty($datos['email']) || !filter_var($datos['email'], FILTER_VALIDATE_EMAIL)) $errores['email'] = ['El campo email debe ser un correo válido.'];
        if (empty($datos['password']) || strlen((string) $datos['password']) < 8) $errores['password'] = ['El campo password debe tener al menos 8 caracteres.'];
        if (empty($datos['role']) || !in_array($datos['role'], ['Ayudante de cocina', 'Domiciliario'])) $errores['role'] = ['El campo role no es válido.'];
        if (($datos['role'] ?? null) === 'Domiciliario' && !empty($datos['vehicle']) && !in_array($datos['vehicle'], ['moto', 'bicicleta', 'carro', 'a_pie'])) {
            $errores['vehicle'] = ['El campo vehicle no es válido.'];
        }
        if (empty($datos['pin']) || !preg_match('/^\d{4}$/', (string) $datos['pin'])) {
            $errores['pin'] = ['El PIN debe tener exactamente 4 dígitos.'];
        }
        if (!empty($errores)) {
            responderError('Datos inválidos.', 422, $errores);
        }

        if (correoUsadoEnCualquierTabla($conn, $datos['email'])) {
            responderError('Ya existe una cuenta con ese correo.', 409);
        }

        $auth = new Autenticacion($conn);
        $personalModelo = new Personal($conn);

        try {
            $id = $personalModelo->crear($datos, $auth->idActual());
        } catch (Exception $e) {
            responderError($e->getMessage(), 422);
        }

        $todos = $personalModelo->listar();
        $creado = array_values(array_filter($todos, function ($s) use ($id) { return $s['id'] === (string) $id; }));
        responderJson($creado[0] ?? ['id' => (string) $id], 201);
    }

    public function update($id) {
        global $conn;
        $datos = $this->entrada();

        if (!empty($datos['password']) && strlen((string) $datos['password']) < 8) {
            responderError('Datos inválidos.', 422, ['password' => ['El campo password debe tener al menos 8 caracteres.']]);
        }
        if (!empty($datos['email']) && correoUsadoEnCualquierTabla($conn, $datos['email'], $id)) {
            responderError('Ya existe una cuenta con ese correo.', 409);
        }
        if (!empty($datos['vehicle']) && !in_array($datos['vehicle'], ['moto', 'bicicleta', 'carro', 'a_pie'])) {
            responderError('Datos inválidos.', 422, ['vehicle' => ['El campo vehicle no es válido.']]);
        }
        if (!empty($datos['pin']) && !preg_match('/^\d{4}$/', (string) $datos['pin'])) {
            responderError('Datos inválidos.', 422, ['pin' => ['El PIN debe tener exactamente 4 dígitos.']]);
        }

        $personalModelo = new Personal($conn);
        $tabla = $personalModelo->actualizar($id, $datos);
        if ($tabla === null) {
            responderError('Miembro de staff no encontrado.', 404);
        }

        $todos = $personalModelo->listar();
        $actualizado = array_values(array_filter($todos, function ($s) use ($id) { return $s['id'] === (string) $id; }));
        responderJson($actualizado[0] ?? ['id' => (string) $id]);
    }

    public function destroy($id) {
        global $conn;
        // 'role' es opcional (query string) para desambiguar el mismo id entre
        // AYUDANTE_COCINA y DOMICILIARIO -- ver Personal::eliminarSuave().
        $rol = $_GET['role'] ?? null;
        $tabla = (new Personal($conn))->eliminarSuave($id, $rol);
        if ($tabla === null) {
            responderError('Miembro de staff no encontrado.', 404);
        }
        responderJson(['ok' => true]);
    }

    /** El domiciliario solo puede actualizar su propia ubicacion (extra al rol de la ruta). */
    public function updateLocation($id) {
        global $conn;
        $auth = new Autenticacion($conn);

        if (!$auth->haySesion() || $auth->rolActual() !== 'delivery' || (string) $auth->idActual() !== (string) $id) {
            responderError('No autorizado para este recurso.', 403);
        }

        $datos = $this->entrada();
        $errores = [];
        if (!isset($datos['lat']) || !is_numeric($datos['lat'])) $errores['lat'] = ['El campo lat debe ser numérico.'];
        if (!isset($datos['lng']) || !is_numeric($datos['lng'])) $errores['lng'] = ['El campo lng debe ser numérico.'];
        if (!empty($errores)) {
            responderError('Datos inválidos.', 422, $errores);
        }

        $ok = (new Personal($conn))->actualizarUbicacion($id, (float) $datos['lat'], (float) $datos['lng']);
        if (!$ok) {
            responderError('Domiciliario no encontrado.', 404);
        }

        responderJson(['ok' => true]);
    }
}
