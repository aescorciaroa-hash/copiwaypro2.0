<?php
// Modelo de INTENTO_LOGIN. Consolida el registro (antes LoginAttempt) y el
// conteo de fallos recientes (antes la consulta cruda de RateLimitMiddleware)
// en un solo lugar: no hay capa de Middleware, asi que AuthController::login()
// llama contarFallosRecientes() al inicio y registrar() al final.

class IntentoLogin {

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

    public function registrar($identificador, $ip, $exitoso) {
        $stmt = $this->consulta(
            'INSERT INTO INTENTO_LOGIN (id_intento, identificador, ip, exitoso) VALUES (?, ?, ?, ?)',
            ['', $identificador, $ip, $exitoso ? 1 : 0]
        );
        $stmt->close();
    }

    /** Fallos recientes por identificador (correo) O ip, dentro de la ventana de minutos dada. */
    public function contarFallosRecientes($identificador, $ip) {
        $ventanaMinutos = (int) env('RATE_LIMIT_LOGIN_WINDOW_MINUTES', 15);
        $stmt = $this->consulta(
            'SELECT COUNT(*) AS total FROM INTENTO_LOGIN
             WHERE (identificador = ? OR ip = ?)
               AND exitoso = 0
               AND fecha_hora > (NOW() - INTERVAL ? MINUTE)',
            [$identificador, $ip, $ventanaMinutos]
        );
        $fila = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return (int) $fila['total'];
    }

    /** true si ya se supero el umbral de intentos fallidos permitidos. */
    public function excedeLimite($identificador, $ip) {
        $maximo = (int) env('RATE_LIMIT_LOGIN_MAX_ATTEMPTS', 5);
        return $this->contarFallosRecientes($identificador, $ip) >= $maximo;
    }
}
