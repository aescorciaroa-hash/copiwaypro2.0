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
            // carrito y su tema preferido en cada cambio); points/totalSpent
            // siguen solo para admin. email SÍ es autoservicio: el cliente
            // puede editar el suyo (se valida duplicado más abajo).
            $permitidos = ['name', 'email', 'phone', 'address', 'birthday', 'cart', 'preferences'];
            $datos = array_intersect_key($datos, array_flip($permitidos));
        }

        if (!empty($datos['email']) && correoUsadoEnCualquierTabla($conn, $datos['email'], $id)) {
            responderError('Ya existe una cuenta con ese correo.', 409);
        }

        $clienteModelo->actualizar($id, $datos);
        responderJson($clienteModelo->buscar($id));
    }

    /**
     * Cambio de contraseña autenticado (distinto del flujo de "olvidé mi
     * contraseña", que es para cuando NO tienes sesión). Antes el modal de
     * "Cambiar Contraseña" en Mi Perfil no llamaba a ningún endpoint real --
     * los campos ni siquiera estaban conectados a un estado, así que el botón
     * "Actualizar" solo mostraba un mensaje de éxito falso.
     */
    public function changePassword($id) {
        global $conn;
        $auth = new Autenticacion($conn);

        // Solo el propio cliente puede cambiar su contraseña (nunca el admin
        // por esta vía: no conoce la contraseña actual del cliente).
        if (!$auth->haySesion() || $auth->rolActual() !== 'client' || (string) $auth->idActual() !== (string) $id) {
            responderError('No autorizado para este recurso.', 403);
        }

        $datos = $this->entrada();
        $errores = [];
        if (empty($datos['currentPassword'])) $errores['currentPassword'] = ['La contraseña actual es obligatoria.'];
        if (empty($datos['newPassword']) || strlen((string) $datos['newPassword']) < 8) {
            $errores['newPassword'] = ['La nueva contraseña debe tener al menos 8 caracteres.'];
        }
        if (!empty($errores)) {
            responderError('Datos inválidos.', 422, $errores);
        }

        $clienteModelo = new Cliente($conn);
        $filaCruda = $clienteModelo->buscarCrudo($id);
        if (!$filaCruda) {
            responderError('Cliente no encontrado.', 404);
        }
        if (!password_verify((string) $datos['currentPassword'], $filaCruda['contrasena'])) {
            responderError('La contraseña actual no es correcta.', 422, ['currentPassword' => ['La contraseña actual no es correcta.']]);
        }

        $clienteModelo->actualizarContrasena($id, password_hash((string) $datos['newPassword'], PASSWORD_DEFAULT));
        responderJson(['ok' => true]);
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

        $esPropio = $auth->rolActual() === 'client' && (string) $auth->idActual() === (string) $id;
        $esAdmin = $auth->rolActual() === 'admin';

        if (!$esPropio && !$esAdmin) {
            responderError('No autorizado para este recurso.', 403);
        }
    }
}
