<?php
// Suscripcion/desuscripcion del cliente a Web Push (VAPID). El envio en si
// vive en PushNotificationService, disparado desde PedidoService cuando el
// pedido pasa a 'entregado'.

class PushController {

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

    /** Clave publica VAPID: la necesita el navegador para crear la suscripcion (PushManager.subscribe). */
    public function publicKey() {
        responderJson(['publicKey' => env('VAPID_PUBLIC_KEY', '')]);
    }

    public function subscribe() {
        global $conn;
        $auth = new Autenticacion($conn);
        $datos = $this->entrada();

        $endpoint = (string) ($datos['endpoint'] ?? '');
        $p256dh = (string) ($datos['keys']['p256dh'] ?? '');
        $authKey = (string) ($datos['keys']['auth'] ?? '');

        if ($endpoint === '' || $p256dh === '' || $authKey === '') {
            responderError('Suscripción inválida.', 422);
        }

        (new PushSuscripcion($conn))->guardar($auth->idActual(), $endpoint, $p256dh, $authKey);
        responderJson(['ok' => true]);
    }

    public function unsubscribe() {
        global $conn;
        $datos = $this->entrada();
        $endpoint = (string) ($datos['endpoint'] ?? '');
        if ($endpoint !== '') {
            (new PushSuscripcion($conn))->eliminarPorEndpoint($endpoint);
        }
        responderJson(['ok' => true]);
    }
}
