<?php
// Sustituye los onSnapshot de Firestore por polling corto con ETag: el
// frontend hace fetch cada 2-3s con If-None-Match; si nada cambio se responde
// 304 (sin payload). El alcance de datos se filtra por rol.

class SyncController {

    public function index() {
        global $conn;
        $auth = new Autenticacion($conn);
        $rol = $auth->haySesion() ? $auth->rolActual() : 'guest';
        $idUsuario = $auth->haySesion() ? $auth->idActual() : null;

        $payload = [
            'products' => (new Producto($conn))->listar($rol !== 'admin', $rol === 'admin'),
            'settings' => (new Configuracion($conn))->obtener(),
        ];

        if (in_array($rol, ['admin', 'kitchen'])) {
            $ingredienteModelo = new Ingrediente($conn);
            $payload['inventory'] = $ingredienteModelo->listarInventario();
            $payload['ingredients'] = $ingredienteModelo->listarIngredientes();
            $payload['inventoryLogs'] = $ingredienteModelo->registrosDeMovimientos();
            $payload['staff'] = (new Personal($conn))->listar();
            $payload['orders'] = (new Pedido($conn))->porRol($rol, $idUsuario);
        }

        if ($rol === 'admin') {
            $payload['clients'] = (new Cliente($conn))->listar();
        }

        if ($rol === 'delivery') {
            $payload['orders'] = (new Pedido($conn))->porRol($rol, $idUsuario);
        }

        if ($rol === 'client') {
            $payload['orders'] = (new Pedido($conn))->porRol($rol, $idUsuario);
            $payload['ingredients'] = (new Ingrediente($conn))->listarIngredientes();
            // El cliente necesita ver su propio registro en "Mi Perfil" (nombre,
            // correo, telefono, etc.). Antes 'clients' solo se enviaba para admin,
            // asi que el perfil del cliente se quedaba con los datos de ejemplo
            // hardcodeados en ClientDashboard.tsx y nunca los reales.
            $cliente = (new Cliente($conn))->buscar($idUsuario);
            if ($cliente) {
                $payload['clients'] = [$cliente];
            }
        }

        $etag = '"' . md5(json_encode($payload)) . '"';
        $etagCliente = $_SERVER['HTTP_IF_NONE_MATCH'] ?? null;

        if ($etagCliente === $etag) {
            header("ETag: $etag");
            http_response_code(304);
            exit;
        }

        header("ETag: $etag");
        responderJson($payload, 200);
    }
}
