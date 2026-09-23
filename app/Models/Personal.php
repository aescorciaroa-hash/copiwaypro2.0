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
        $stmtCocina = $this->consulta(
            'SELECT ac.*, a.nombre AS creado_por_nombre FROM AYUDANTE_COCINA ac
             LEFT JOIN ADMINISTRADOR a ON a.id_admin = ac.creado_por
             ORDER BY ac.creado_en DESC'
        );
        $cocina = $stmtCocina->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmtCocina->close();

        $stmtDomicilio = $this->consulta(
            'SELECT d.*, a.nombre AS creado_por_nombre FROM DOMICILIARIO d
             LEFT JOIN ADMINISTRADOR a ON a.id_admin = d.creado_por
             ORDER BY d.creado_en DESC'
        );
        $domicilio = $stmtDomicilio->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmtDomicilio->close();

        $resultado = array_map([$this, 'comoJsonCocina'], $cocina);
        foreach ($domicilio as $fila) {
            $resultado[] = $this->comoJsonDomicilio($fila);
        }
        return $resultado;
    }

    public function comoJsonCocina($fila) {
        return personal_cocina_a_json($fila);
    }

    public function comoJsonDomicilio($fila) {
        $stmt = $this->consulta(
            "SELECT id_pedido FROM PEDIDO WHERE id_domiciliario = ? AND estado = 'en_camino' LIMIT 1",
            [$fila['id_domiciliario']]
        );
        $pedido = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        $currentOrderId = $pedido ? $pedido['id_pedido'] : null;

        return personal_domicilio_a_json($fila, $currentOrderId);
    }

    /** Crea un miembro de staff en AYUDANTE_COCINA o DOMICILIARIO segun $datos['role']. */
    public function crear($datos, $idAdmin) {
        $hash = password_hash($datos['password'], PASSWORD_DEFAULT);
        $hashPin = !empty($datos['pin']) ? password_hash($datos['pin'], PASSWORD_DEFAULT) : null;

        if ($datos['role'] === 'Ayudante de cocina') {
            $stmt = $this->consulta(
                'INSERT INTO AYUDANTE_COCINA (nombre, correo, telefono, contrasena, pin, creado_por)
                 VALUES (?, ?, ?, ?, ?, ?)',
                [$datos['name'], $datos['email'], $datos['phone'] ?? '', $hash, $hashPin, $idAdmin]
            );
            $stmt->close();
            return $this->conn->insert_id;
        }

        if ($datos['role'] === 'Domiciliario') {
            $stmt = $this->consulta(
                'INSERT INTO DOMICILIARIO
                    (nombre, correo, telefono, contrasena, pin, tipo_vehiculo, modelo_vehiculo, placa,
                     base_efectivo_asignada, creado_por)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $datos['name'], $datos['email'], $datos['phone'] ?? '', $hash, $hashPin,
                    $datos['vehicle'] ?? 'moto', $datos['vehicleModel'] ?? null, $datos['plate'] ?? null,
                    $datos['baseCash'] ?? 0, $idAdmin,
                ]
            );
            $stmt->close();
            return $this->conn->insert_id;
        }

        throw new Exception("Rol de staff inválido: {$datos['role']}");
    }

    /**
     * Actualiza al miembro de staff con este id, buscando primero en
     * AYUDANTE_COCINA y luego en DOMICILIARIO -- Y ESO ERA UN BUG: ahora que
     * los ids son autoincrementales por tabla (ya no UUID unico global), el
     * id_ayudante=1 y el id_domiciliario=1 son DOS personas distintas con el
     * MISMO numero. Buscar "primero en cocina" significaba que editar a
     * cualquier domiciliario con un id que tambien existiera como ayudante
     * actualizaba al ayudante equivocado en silencio (el domiciliario real
     * nunca cambiaba). Por eso ahora, si $datos trae 'role' (el frontend
     * siempre lo manda), se va directo a la tabla correcta; el escaneo de
     * ambas tablas queda solo como respaldo si por algun motivo no llega.
     * Devuelve la tabla usada, o null si no se encontro el id en ninguna.
     */
    public function actualizar($id, $datos) {
        $rol = $datos['role'] ?? null;

        if ($rol === 'Ayudante de cocina') {
            $stmt = $this->consulta('SELECT id_ayudante FROM AYUDANTE_COCINA WHERE id_ayudante = ?', [$id]);
            $existe = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            if (!$existe) {
                return null;
            }
            $this->actualizarCocina($id, $datos);
            return 'kitchen';
        }

        if ($rol === 'Domiciliario') {
            $stmt = $this->consulta('SELECT id_domiciliario FROM DOMICILIARIO WHERE id_domiciliario = ?', [$id]);
            $existe = $stmt->get_result()->fetch_assoc();
            $stmt->close();
            if (!$existe) {
                return null;
            }
            $this->actualizarDomicilio($id, $datos);
            return 'delivery';
        }

        // Respaldo (sin 'role' en el payload): comportamiento anterior.
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
        if (!empty($datos['pin'])) {
            $sets[] = 'pin = ?';
            $valores[] = password_hash($datos['pin'], PASSWORD_DEFAULT);
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
            'plate' => 'placa', 'vehicle' => 'tipo_vehiculo', 'vehicleModel' => 'modelo_vehiculo',
            'baseCash' => 'base_efectivo_asignada',
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
        if (!empty($datos['pin'])) {
            $sets[] = 'pin = ?';
            $valores[] = password_hash($datos['pin'], PASSWORD_DEFAULT);
        }
        if (empty($sets)) {
            return;
        }
        $valores[] = $id;
        $stmt = $this->consulta('UPDATE DOMICILIARIO SET ' . implode(', ', $sets) . ' WHERE id_domiciliario = ?', $valores);
        $stmt->close();
    }

    /**
     * Soft delete (activo = 0) — nunca DELETE real. $rol (si se pasa) evita la
     * misma ambiguedad de id repetido entre tablas que actualizar(); sin el,
     * cae al escaneo de ambas tablas como antes. Devuelve la tabla usada o null.
     */
    public function eliminarSuave($id, $rol = null) {
        if ($rol === 'Ayudante de cocina') {
            $stmt = $this->consulta('UPDATE AYUDANTE_COCINA SET activo = 0 WHERE id_ayudante = ?', [$id]);
            $afectadas = $stmt->affected_rows;
            $stmt->close();
            return $afectadas > 0 ? 'kitchen' : null;
        }
        if ($rol === 'Domiciliario') {
            $stmt = $this->consulta('UPDATE DOMICILIARIO SET activo = 0 WHERE id_domiciliario = ?', [$id]);
            $afectadas = $stmt->affected_rows;
            $stmt->close();
            return $afectadas > 0 ? 'delivery' : null;
        }

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
