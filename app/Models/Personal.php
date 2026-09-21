<?php
// Modelo de personal: unifica AYUDANTE_COCINA y DOMICILIARIO en un solo shape
// Staff del frontend (antes una sola coleccion "staff" en Firestore).

class Personal {

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
        $stmtCocina = $this->consulta('SELECT * FROM AYUDANTE_COCINA ORDER BY creado_en DESC');
        $cocina = $stmtCocina->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmtCocina->close();

        $stmtDomicilio = $this->consulta('SELECT * FROM DOMICILIARIO ORDER BY creado_en DESC');
        $domicilio = $stmtDomicilio->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmtDomicilio->close();

        $resultado = array_map([$this, 'comoJsonCocina'], $cocina);
        foreach ($domicilio as $fila) {
            $resultado[] = $this->comoJsonDomicilio($fila);
        }
        return $resultado;
    }

    public function comoJsonCocina($fila) {
        return [
            'id' => $fila['id_ayudante'],
            'name' => $fila['nombre'],
            'email' => $fila['correo'],
            'phone' => $fila['telefono'],
            'role' => 'Ayudante de cocina',
            'active' => (bool) $fila['activo'],
        ];
    }

    public function comoJsonDomicilio($fila) {
        $stmt = $this->consulta(
            "SELECT id_pedido FROM PEDIDO WHERE id_domiciliario = ? AND estado = 'en_camino' LIMIT 1",
            [$fila['id_domiciliario']]
        );
        $pedido = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        $currentOrderId = $pedido ? $pedido['id_pedido'] : null;

        $ubicacion = null;
        if ($fila['ubicacion_lat'] !== null && $fila['ubicacion_lng'] !== null) {
            $ubicacion = [(float) $fila['ubicacion_lat'], (float) $fila['ubicacion_lng']];
        }

        return [
            'id' => $fila['id_domiciliario'],
            'name' => $fila['nombre'],
            'email' => $fila['correo'],
            'phone' => $fila['telefono'],
            'role' => 'Domiciliario',
            'active' => (bool) $fila['activo'],
            'location' => $ubicacion,
            'currentOrderId' => $currentOrderId,
            'plate' => $fila['placa'],
            'vehicle' => $fila['tipo_vehiculo'],
            'baseCash' => (float) $fila['base_efectivo_asignada'],
        ];
    }

    /** Crea un miembro de staff en AYUDANTE_COCINA o DOMICILIARIO segun $datos['role']. */
    public function crear($datos, $idAdmin) {
        $hash = password_hash($datos['password'], PASSWORD_DEFAULT);

        if ($datos['role'] === 'Ayudante de cocina') {
            $stmt = $this->consulta(
                'INSERT INTO AYUDANTE_COCINA (id_ayudante, nombre, correo, telefono, contrasena, creado_por)
                 VALUES (?, ?, ?, ?, ?, ?)',
                ['', $datos['name'], $datos['email'], $datos['phone'] ?? '', $hash, $idAdmin]
            );
            $stmt->close();

            $stmtId = $this->consulta('SELECT id_ayudante FROM AYUDANTE_COCINA WHERE correo = ? LIMIT 1', [$datos['email']]);
            $id = $stmtId->get_result()->fetch_assoc()['id_ayudante'];
            $stmtId->close();
            return $id;
        }

        if ($datos['role'] === 'Domiciliario') {
            $stmt = $this->consulta(
                'INSERT INTO DOMICILIARIO
                    (id_domiciliario, nombre, correo, telefono, contrasena, tipo_vehiculo, placa,
                     base_efectivo_asignada, creado_por)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    '', $datos['name'], $datos['email'], $datos['phone'] ?? '', $hash,
                    $datos['vehicle'] ?? 'moto', $datos['plate'] ?? null, $datos['baseCash'] ?? 0, $idAdmin,
                ]
            );
            $stmt->close();

            $stmtId = $this->consulta('SELECT id_domiciliario FROM DOMICILIARIO WHERE correo = ? LIMIT 1', [$datos['email']]);
            $id = $stmtId->get_result()->fetch_assoc()['id_domiciliario'];
            $stmtId->close();
            return $id;
        }

        throw new Exception("Rol de staff inválido: {$datos['role']}");
    }

    /**
     * Actualiza al miembro de staff con este id, buscando primero en
     * AYUDANTE_COCINA y luego en DOMICILIARIO. Devuelve la tabla usada, o null
     * si no se encontro el id en ninguna.
     */
    public function actualizar($id, $datos) {
        $stmt = $this->consulta('SELECT id_ayudante FROM AYUDANTE_COCINA WHERE id_ayudante = ?', [$id]);
        $existeCocina = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if ($existeCocina) {
            $this->actualizarCocina($id, $datos);
            return 'kitchen';
        }

        $stmt = $this->consulta('SELECT id_domiciliario FROM DOMICILIARIO WHERE id_domiciliario = ?', [$id]);
        $existeDomicilio = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if ($existeDomicilio) {
            $this->actualizarDomicilio($id, $datos);
            return 'delivery';
        }

        return null;
    }

    private function actualizarCocina($id, $datos) {
        $mapa = ['name' => 'nombre', 'email' => 'correo', 'phone' => 'telefono'];
        $sets = [];
        $valores = [];
        foreach ($mapa as $claveJson => $columna) {
            if (array_key_exists($claveJson, $datos)) {
                $sets[] = "$columna = ?";
                $valores[] = $datos[$claveJson];
            }
        }
        if (array_key_exists('active', $datos)) {
            $sets[] = 'activo = ?';
            $valores[] = $datos['active'] ? 1 : 0;
        }
        if (!empty($datos['password'])) {
            $sets[] = 'contrasena = ?';
            $valores[] = password_hash($datos['password'], PASSWORD_DEFAULT);
        }
        if (empty($sets)) {
            return;
        }
        $valores[] = $id;
        $stmt = $this->consulta('UPDATE AYUDANTE_COCINA SET ' . implode(', ', $sets) . ' WHERE id_ayudante = ?', $valores);
        $stmt->close();
    }

    private function actualizarDomicilio($id, $datos) {
        $mapa = [
            'name' => 'nombre', 'email' => 'correo', 'phone' => 'telefono',
            'plate' => 'placa', 'vehicle' => 'tipo_vehiculo', 'baseCash' => 'base_efectivo_asignada',
        ];
        $sets = [];
        $valores = [];
        foreach ($mapa as $claveJson => $columna) {
            if (array_key_exists($claveJson, $datos)) {
                $sets[] = "$columna = ?";
                $valores[] = $datos[$claveJson];
            }
        }
        if (array_key_exists('active', $datos)) {
            $sets[] = 'activo = ?';
            $valores[] = $datos['active'] ? 1 : 0;
        }
        if (!empty($datos['password'])) {
            $sets[] = 'contrasena = ?';
            $valores[] = password_hash($datos['password'], PASSWORD_DEFAULT);
        }
        if (empty($sets)) {
            return;
        }
        $valores[] = $id;
        $stmt = $this->consulta('UPDATE DOMICILIARIO SET ' . implode(', ', $sets) . ' WHERE id_domiciliario = ?', $valores);
        $stmt->close();
    }

    /** Soft delete (activo = 0) — nunca DELETE real. Devuelve la tabla usada o null. */
    public function eliminarSuave($id) {
        $stmt = $this->consulta('UPDATE AYUDANTE_COCINA SET activo = 0 WHERE id_ayudante = ?', [$id]);
        $afectadas = $stmt->affected_rows;
        $stmt->close();
        if ($afectadas > 0) {
            return 'kitchen';
        }

        $stmt = $this->consulta('UPDATE DOMICILIARIO SET activo = 0 WHERE id_domiciliario = ?', [$id]);
        $afectadas = $stmt->affected_rows;
        $stmt->close();
        if ($afectadas > 0) {
            return 'delivery';
        }

        return null;
    }

    public function actualizarUbicacion($id, $lat, $lng) {
        $stmt = $this->consulta(
            'UPDATE DOMICILIARIO SET ubicacion_lat = ?, ubicacion_lng = ?, ubicacion_actualizada = NOW() WHERE id_domiciliario = ?',
            [$lat, $lng, $id]
        );
        $afectadas = $stmt->affected_rows;
        $stmt->close();
        return $afectadas > 0;
    }
}
