<?php
// Modelo de ADMINISTRADOR (incluye el rol 'programador', que no tiene login
// web: solo se usa desde bin/create-admin.php para crear al primer Admin).

class Usuario {

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

    public function buscarPorCorreo($correo) {
        $stmt = $this->consulta('SELECT * FROM ADMINISTRADOR WHERE correo = ? LIMIT 1', [$correo]);
        $fila = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $fila ?: null;
    }

    public function esUsado($correo, $telefono) {
        $stmt = $this->consulta('SELECT COUNT(*) AS total FROM ADMINISTRADOR WHERE correo = ? OR telefono = ?', [$correo, $telefono]);
        $fila = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return (int) $fila['total'] > 0;
    }

    /** Crea un ADMINISTRADOR (nivel_acceso 'programador' o 'maestro'). Devuelve la fila creada. */
    public function crear($datos) {
        $stmt = $this->consulta(
            "INSERT INTO ADMINISTRADOR (nombre, correo, telefono, contrasena, nivel_acceso, creado_por)
             VALUES (?, ?, ?, ?, ?, ?)",
            [
                $datos['nombre'], $datos['correo'], $datos['telefono'],
                password_hash($datos['password'], PASSWORD_BCRYPT),
                $datos['nivel_acceso'], $datos['creado_por'] ?? null,
            ]
        );
        $stmt->close();
        return $this->buscarPorCorreo($datos['correo']);
    }
}
