<?php
// Envia Web Push real (VAPID) a los dispositivos suscritos de un cliente,
// para que la notificacion aparezca como una notificacion nativa del sistema
// operativo aunque el navegador este cerrado -- no un aviso dentro de la app.
//
// Unico lugar del proyecto que usa una clase de Composer (minishlink/web-push,
// ver composer.json): el cifrado AES128GCM + ECDH que exige el estandar Push
// API es demasiado delicado para reimplementarlo a mano sin riesgo de bugs de
// seguridad. El resto de la app sigue sin namespaces ni autoload de Composer.

use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

class PushNotificationService {

    private $conn;
    private $suscripcionModelo;

    public function __construct($conn) {
        $this->conn = $conn;
        $this->suscripcionModelo = new PushSuscripcion($conn);
    }

    private function webPush() {
        $publicKey = env('VAPID_PUBLIC_KEY', '');
        $privateKey = env('VAPID_PRIVATE_KEY', '');
        if ($publicKey === '' || $privateKey === '') {
            return null;
        }

        return new WebPush([
            'VAPID' => [
                'subject' => env('VAPID_SUBJECT', 'mailto:soporte@copiway.com'),
                'publicKey' => $publicKey,
                'privateKey' => $privateKey,
            ],
        ]);
    }

    /** Avisa al cliente que su pedido llego, con deep-link directo a calificarlo. */
    public function notificarPedidoEntregado($idPedido, $idCliente) {
        $this->enviarATodosLosDispositivos($idCliente, $idPedido, [
            'title' => '¡Tu pedido ha llegado!',
            'body' => 'Cuéntanos, ¿cómo estuvo tu comida?',
            'tag' => 'pedido-entregado-' . $idPedido,
            'url' => rutaBase() . '/?calificarPedido=' . $idPedido,
        ]);
    }

    private function enviarATodosLosDispositivos($idCliente, $idPedido, array $payload) {
        $webPush = $this->webPush();
        if ($webPush === null) {
            return; // VAPID no configurado todavia (ver .env.example): no hay como enviar.
        }

        $suscripciones = $this->suscripcionModelo->listarPorCliente($idCliente);
        if (empty($suscripciones)) {
            return;
        }

        foreach ($suscripciones as $fila) {
            $webPush->queueNotification(
                Subscription::create([
                    'endpoint' => $fila['endpoint'],
                    'publicKey' => $fila['clave_p256dh'],
                    'authToken' => $fila['clave_auth'],
                ]),
                json_encode($payload)
            );
        }

        $huboEnvio = false;
        foreach ($webPush->flush() as $reporte) {
            if ($reporte->isSuccess()) {
                $huboEnvio = true;
            } elseif ($reporte->isSubscriptionExpired()) {
                // El navegador invalido esta suscripcion (desinstalo la app,
                // revoco el permiso, etc.): se limpia para no reintentar en vano.
                $this->suscripcionModelo->eliminarPorEndpoint($reporte->getEndpoint());
            }
        }

        $this->registrarEnvio($idPedido, $huboEnvio);
    }

    /** Deja registro en NOTIFICACION (mismo log que whatsapp/sms/email) para poder auditar envios. */
    private function registrarEnvio($idPedido, $exito) {
        $stmt = $this->conn->prepare(
            "INSERT INTO NOTIFICACION (id_pedido, tipo, mensaje, estado_envio) VALUES (?, 'push', 'Tu pedido ha llegado', ?)"
        );
        $estado = $exito ? 'enviado' : 'fallido';
        $stmt->bind_param('is', $idPedido, $estado);
        $stmt->execute();
        $stmt->close();
    }
}
