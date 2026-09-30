<?php
// Modelo de PUSH_SUSCRIPCION: solo acceso a datos (guardar/listar/borrar
// suscripciones Web Push por cliente). El envio real vive en
// PushNotificationService.

class PushSuscripcion {

    private $conn;

    public function __construct($conn) {
        $this->conn = $conn;
    }

    /** Crea o actualiza (mismo endpoint = mismo dispositivo/navegador). */
    public function guardar($idCliente, $endpoint, $claveP256dh, $claveAuth) {
        $stmt = $this->conn->prepare(
            'INSERT INTO PUSH_SUSCRIPCION (id_cliente, endpoint, clave_p256dh, clave_auth)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE id_cliente = VALUES(id_cliente), clave_p256dh = VALUES(clave_p256dh), clave_auth = VALUES(clave_auth)'
        );
        $stmt->bind_param('isss', $idCliente, $endpoint, $claveP256dh, $claveAuth);
        $stmt->execute();
        $stmt->close();
    }

    public function eliminarPorEndpoint($endpoint) {
        $stmt = $this->conn->prepare('DELETE FROM PUSH_SUSCRIPCION WHERE endpoint = ?');
        $stmt->bind_param('s', $endpoint);
        $stmt->execute();
        $stmt->close();
    }

    /** @return array<int, array{endpoint:string, clave_p256dh:string, clave_auth:string}> */
    public function listarPorCliente($idCliente) {
        $stmt = $this->conn->prepare('SELECT endpoint, clave_p256dh, clave_auth FROM PUSH_SUSCRIPCION WHERE id_cliente = ?');
        $stmt->bind_param('i', $idCliente);
        $stmt->execute();
        $filas = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return $filas;
    }
}
