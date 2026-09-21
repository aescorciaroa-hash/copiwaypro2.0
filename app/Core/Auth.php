<?php
// Autenticacion para los 4 roles que inician sesion en la SPA (admin, kitchen,
// delivery, client). El rol Programador no tiene login web: solo existe para
// crear al primer Administrador via bin/create-admin.php.

class Autenticacion {

    public $conn;

    public function __construct($conn) {
        $this->conn = $conn;
    }

    /** Tabla, llave primaria y columna de estado para cada rol que inicia sesion. */
    private function tablasPorRol() {
        return [
            'admin' => ['tabla' => 'ADMINISTRADOR', 'pk' => 'id_admin'],
            'kitchen' => ['tabla' => 'AYUDANTE_COCINA', 'pk' => 'id_ayudante'],
            'delivery' => ['tabla' => 'DOMICILIARIO', 'pk' => 'id_domiciliario'],
            'client' => ['tabla' => 'CLIENTE', 'pk' => 'id_cliente'],
        ];
    }

    /** Intenta iniciar sesion probando las 4 tablas de cuentas. Devuelve el usuario o null. */
    public function intentarLogin($correo, $clave) {
        foreach ($this->tablasPorRol() as $rol => $info) {
            $sql = "SELECT * FROM {$info['tabla']} WHERE correo = ? LIMIT 1";
            $stmt = $this->conn->prepare($sql);
            $stmt->bind_param('s', $correo);
            $stmt->execute();
            $fila = $stmt->get_result()->fetch_assoc();
            $stmt->close();

            if (!$fila) {
                continue;
            }

            if (!password_verify($clave, $fila['contrasena'])) {
                return null;
            }
            if (!$fila['activo']) {
                return null;
            }

            return $this->iniciarSesionUsuario($rol, $fila);
        }
        return null;
    }

    /** Guarda al usuario en sesion (con regeneracion de ID contra fijacion de sesion). */
    public function iniciarSesionUsuario($rol, $fila) {
        $info = $this->tablasPorRol()[$rol];
        session_regenerate_id(true);
        $_SESSION['usuario_id'] = $fila[$info['pk']];
        $_SESSION['usuario_rol'] = $rol;

        return [
            'id' => $fila[$info['pk']],
            'role' => $rol,
            'name' => $fila['nombre'],
            'email' => $fila['correo'],
        ];
    }

    public function haySesion() {
        return isset($_SESSION['usuario_id'], $_SESSION['usuario_rol']);
    }

    public function rolActual() {
        return $_SESSION['usuario_rol'] ?? null;
    }

    public function idActual() {
        return $_SESSION['usuario_id'] ?? null;
    }

    /**
     * Vuelve a leer al usuario desde la base de datos (no solo de sesion), para
     * que una cuenta desactivada pierda el acceso de inmediato aunque ya tenga
     * sesion abierta. Si ya no existe o esta inactiva, cierra la sesion.
     */
    public function usuarioActual() {
        if (!$this->haySesion()) {
            return null;
        }

        $info = $this->tablasPorRol()[$this->rolActual()];
        $sql = "SELECT * FROM {$info['tabla']} WHERE {$info['pk']} = ? LIMIT 1";
        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param('s', $_SESSION['usuario_id']);
        $stmt->execute();
        $fila = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$fila || !$fila['activo']) {
            $this->cerrarSesion();
            return null;
        }

        unset($fila['contrasena']);
        $fila['role'] = $this->rolActual();
        return $fila;
    }

    public function esAdminMaestro() {
        if ($this->rolActual() !== 'admin') {
            return false;
        }
        $stmt = $this->conn->prepare('SELECT nivel_acceso FROM ADMINISTRADOR WHERE id_admin = ?');
        $stmt->bind_param('s', $_SESSION['usuario_id']);
        $stmt->execute();
        $fila = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $fila && $fila['nivel_acceso'] === 'maestro';
    }

    public function cerrarSesion() {
        unset($_SESSION['usuario_id'], $_SESSION['usuario_rol']);
        cerrarSesionCompleta();
    }
}
