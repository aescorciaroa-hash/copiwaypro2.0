<?php
// Modelo de CODIGO_VERIFICACION (recuperacion de contrasena, paso 1 y 2).

class CodigoVerificacion {

    public $conn;

    public function __construct($conn) {
        $this->conn = $conn;
    }

    private function consulta($sql, $parametros = []) {
        $stmt = $this->conn->prepare($sql);
        if (!empty($parametros)) {
            $tipos = '';
            foreach ($parametros as $p) {
                if (is_int($p)) {
                    $tipos .= 'i';
                } elseif (is_float($p)) {
                    $tipos .= 'd';
                } else {
                    $tipos .= 's';
                }
            }
            $stmt->bind_param($tipos, ...$parametros);
        }
        $stmt->execute();
        return $stmt;
    }

    public function crearParaCliente($idCliente, $codigo) {
        $stmt = $this->consulta(
            "INSERT INTO CODIGO_VERIFICACION (id_codigo, id_cliente, codigo_hash, canal_envio, fecha_expiracion)
             VALUES (?, ?, ?, 'email', DATE_ADD(NOW(), INTERVAL 15 MINUTE))",
            ['', $idCliente, password_hash($codigo, PASSWORD_DEFAULT)]
        );
        $stmt->close();
    }

    public function buscarValidoPorCorreo($correo) {
        $stmt = $this->consulta(
            'SELECT cv.* FROM CODIGO_VERIFICACION cv
             JOIN CLIENTE c ON c.id_cliente = cv.id_cliente
             WHERE c.correo = ? AND cv.usado = 0 AND cv.fecha_expiracion > NOW() AND cv.intentos < 5
             ORDER BY cv.fecha_generacion DESC',
            [$correo]
        );
        $fila = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $fila ?: null;
    }

    public function marcarUsado($idCodigo) {
        $stmt = $this->consulta('UPDATE CODIGO_VERIFICACION SET usado = 1 WHERE id_codigo = ?', [$idCodigo]);
        $stmt->close();
    }

    /** Registra un intento fallido de verificacion; al quinto, el codigo deja de ser valido. */
    public function incrementarIntentos($idCodigo) {
        $stmt = $this->consulta('UPDATE CODIGO_VERIFICACION SET intentos = intentos + 1 WHERE id_codigo = ?', [$idCodigo]);
        $stmt->close();
    }
}
