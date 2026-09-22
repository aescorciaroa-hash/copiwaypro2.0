<?php

class ClientController {

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
        responderJson((new Cliente($conn))->listar());
    }

    public function show($id) {
        global $conn;
        $this->autorizarPropioOAdmin($id);

        $cliente = (new Cliente($conn))->buscar($id);
        if (!$cliente) {
            responderError('Cliente no encontrado.', 404);
        }
        responderJson($cliente);
    }

    public function update($id) {
        global $conn;
        $this->autorizarPropioOAdmin($id);

        $clienteModelo = new Cliente($conn);
        if (!$clienteModelo->buscar($id)) {
            responderError('Cliente no encontrado.', 404);
        }

        $datos = $this->entrada();

        $auth = new Autenticacion($conn);
        if ($auth->rolActual() !== 'admin') {
            // cart/preferences son autoservicio (el propio cliente guarda su
            // carrito y su tema preferido en cada cambio); el resto de campos
            // sensibles (email, points, totalSpent) siguen solo para admin.
            $permitidos = ['name', 'phone', 'address', 'birthday', 'cart', 'preferences'];
            $datos = array_intersect_key($datos, array_flip($permitidos));
        }

        if (!empty($datos['email']) && correoUsadoEnCualquierTabla($conn, $datos['email'], $id)) {
            responderError('Ya existe una cuenta con ese correo.', 409);
        }

        $clienteModelo->actualizar($id, $datos);
        responderJson($clienteModelo->buscar($id));
    }

    public function notifications($id) {
        global $conn;
        $this->autorizarPropioOAdmin($id);

        $clienteModelo = new Cliente($conn);
        if (!$clienteModelo->buscar($id)) {
            responderError('Cliente no encontrado.', 404);
        }

        responderJson($clienteModelo->notificacionesDe($id));
    }

    public function markNotificationRead($id, $notifId) {
        global $conn;
        $this->autorizarPropioOAdmin($id);

        $ok = (new Cliente($conn))->marcarNotificacionLeida($id, $notifId);
        if (!$ok) {
            responderError('Notificación no encontrada.', 404);
        }

        responderJson(['ok' => true]);
    }

    private function autorizarPropioOAdmin($id) {
        global $conn;
        $auth = new Autenticacion($conn);

        if (!$auth->haySesion()) {
            responderError('No autenticado.', 401);
        }

        $esPropio = $auth->rolActual() === 'client' && $auth->idActual() === $id;
        $esAdmin = $auth->rolActual() === 'admin';

        if (!$esPropio && !$esAdmin) {
            responderError('No autorizado para este recurso.', 403);
        }
    }
}
