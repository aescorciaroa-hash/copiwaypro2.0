<?php
// Modelo de CLIENTE (+ CLIENTE_NOTIFICACION). Incluye ademas los metodos que
// antes eran consultas SQL sueltas dentro de AuthController (duplicado de
// correo/telefono, actualizacion de contrasena) para que el controlador nunca
// toque SQL directamente.

class Cliente {

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

    public function listar() {
        $stmt = $this->consulta('SELECT * FROM CLIENTE ORDER BY creado_en DESC');
        $filas = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();
        return array_map([$this, 'comoJson'], $filas);
    }

    public function buscar($id) {
        $stmt = $this->consulta('SELECT * FROM CLIENTE WHERE id_cliente = ? LIMIT 1', [$id]);
        $fila = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $fila ? $this->comoJson($fila) : null;
    }

    /** Version cruda (sin formar el JSON), usada por Auth/register. */
    public function buscarCrudo($id) {
        $stmt = $this->consulta('SELECT * FROM CLIENTE WHERE id_cliente = ? LIMIT 1', [$id]);
        $fila = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $fila ?: null;
    }

    public function buscarIdPorCorreo($correo) {
        $stmt = $this->consulta('SELECT id_cliente FROM CLIENTE WHERE correo = ? LIMIT 1', [$correo]);
        $fila = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return $fila ? $fila['id_cliente'] : null;
    }

    /** Duplicado de correo o telefono (para el registro). */
    public function correoOTelefonoExiste($correo, $telefono) {
        $stmt = $this->consulta('SELECT COUNT(*) AS total FROM CLIENTE WHERE correo = ? OR telefono = ?', [$correo, $telefono]);
        $fila = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        return (int) $fila['total'] > 0;
    }

    public function comoJson($fila) {
        $stmtCount = $this->consulta('SELECT COUNT(*) AS total FROM PEDIDO WHERE id_cliente = ?', [$fila['id_cliente']]);
        $ordersCount = (int) $stmtCount->get_result()->fetch_assoc()['total'];
        $stmtCount->close();

        $stmtUltimo = $this->consulta('SELECT MAX(fecha_hora) AS ultimo FROM PEDIDO WHERE id_cliente = ?', [$fila['id_cliente']]);
        $lastOrderDate = $stmtUltimo->get_result()->fetch_assoc()['ultimo'] ?: null;
        $stmtUltimo->close();

        $datosCrudos = [
            'fila' => $fila,
            'ordersCount' => $ordersCount,
            'lastOrderDate' => $lastOrderDate,
            'notifications' => $this->notificacionesDe($fila['id_cliente']),
        ];
        return cliente_a_json($datosCrudos);
    }

    public function notificacionesDe($idCliente) {
        $stmt = $this->consulta('SELECT * FROM CLIENTE_NOTIFICACION WHERE id_cliente = ? ORDER BY fecha DESC', [$idCliente]);
        $filas = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmt->close();

        return array_map('notificacion_a_json', $filas);
    }

    public function marcarNotificacionLeida($idCliente, $idNotificacion) {
        $stmt = $this->consulta(
            'UPDATE CLIENTE_NOTIFICACION SET leida = 1 WHERE id_notificacion_cliente = ? AND id_cliente = ?',
            [$idNotificacion, $idCliente]
        );
        $afectadas = $stmt->affected_rows;
        $stmt->close();
        return $afectadas > 0;
    }

    /** Actualiza campos permitidos del cliente. $campos usa claves camelCase. */
    public function actualizar($id, $campos) {
        $mapa = [
            'name' => 'nombre', 'phone' => 'telefono', 'address' => 'direccion',
            'email' => 'correo', 'birthday' => 'fecha_nacimiento',
            'points' => 'puntos_fidelidad', 'totalSpent' => 'total_gastado',
        ];

        $sets = [];
        $valores = [];
        foreach ($mapa as $claveJson => $columna) {
            if (array_key_exists($claveJson, $campos)) {
                $sets[] = "$columna = ?";
                $valores[] = $campos[$claveJson];
            }
        }

        // 'cart' y 'preferences' no son columnas 1:1: el carrito se guarda como
        // JSON y el tema viene anidado en preferences.theme (unica preferencia
        // que el frontend usa hoy -- ver ThemeContext.tsx/ClientDashboard.tsx).
        if (array_key_exists('cart', $campos)) {
            $sets[] = 'carrito_guardado = ?';
            $valores[] = json_encode($campos['cart']);
        }
        if (array_key_exists('preferences', $campos) && is_array($campos['preferences']) && isset($campos['preferences']['theme'])) {
            $sets[] = 'tema_preferido = ?';
            $valores[] = $campos['preferences']['theme'];
        }

        if (empty($sets)) {
            return;
        }

        $valores[] = $id;
        $stmt = $this->consulta('UPDATE CLIENTE SET ' . implode(', ', $sets) . ' WHERE id_cliente = ?', $valores);
        $stmt->close();
    }

    /**
     * Crea el cliente (regla Habeas Data: fecha + IP de aceptacion obligatorias).
     * $datos['ip'] debe venir siempre de $_SERVER['REMOTE_ADDR'] (nunca de un
     * header que el cliente pueda falsificar).
     */
    public function crear($datos) {
        $stmt = $this->consulta(
            'INSERT INTO CLIENTE
                (nombre, telefono, correo, contrasena, direccion, fecha_nacimiento,
                 fecha_aceptacion_habeas_data, ip_aceptacion_habeas_data)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $datos['name'], $datos['phone'], $datos['email'],
                password_hash($datos['password'], PASSWORD_DEFAULT),
                $datos['address'] ?? null, $datos['birthday'],
                date('Y-m-d H:i:s'), $datos['ip'] ?? '0.0.0.0',
            ]
        );
        $stmt->close();

        return $this->conn->insert_id;
    }

    public function actualizarContrasena($id, $hash) {
        $stmt = $this->consulta('UPDATE CLIENTE SET contrasena = ? WHERE id_cliente = ?', [$hash, $id]);
        $stmt->close();
    }
}
