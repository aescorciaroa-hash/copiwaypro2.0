<?php
// Modelo de CONFIGURACION_SISTEMA (+ CATEGORIA de ambito 'menu').

class Configuracion {

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

    /** Fila unica de CONFIGURACION_SISTEMA formateada al shape StoreConfig del frontend. */
    public function obtener() {
        $resultado = $this->conn->query('SELECT * FROM CONFIGURACION_SISTEMA LIMIT 1');
        $fila = $resultado->fetch_assoc();

        if (!$fila) {
            $fila = [
                'horario_apertura' => '11:00:00',
                'horario_cierre' => '22:00:00',
                'tienda_abierta_manual' => 1,
                'pausa_emergencia_activa' => 0,
                'tarifa_plana_domicilio' => 0,
                'margen_ganancia_defecto' => 30,
            ];
        }

        $stmtCat = $this->consulta("SELECT nombre FROM CATEGORIA WHERE ambito = 'menu' ORDER BY nombre ASC");
        $filasCat = $stmtCat->get_result()->fetch_all(MYSQLI_ASSOC);
        $stmtCat->close();
        $categorias = array_map(function ($f) { return $f['nombre']; }, $filasCat);

        return [
            'openTime' => substr((string) $fila['horario_apertura'], 0, 5),
            'closeTime' => substr((string) $fila['horario_cierre'], 0, 5),
            'isOpen' => (bool) $fila['tienda_abierta_manual'],
            'isPaused' => (bool) $fila['pausa_emergencia_activa'],
            'shippingRate' => (float) $fila['tarifa_plana_domicilio'],
            'profitMargin' => (float) $fila['margen_ganancia_defecto'],
            'categories' => $categorias,
        ];
    }

    /** Actualiza los campos presentes en $campos (claves camelCase del frontend). */
    public function actualizar($campos) {
        $mapa = [
            'openTime' => 'horario_apertura', 'closeTime' => 'horario_cierre',
            'isOpen' => 'tienda_abierta_manual', 'isPaused' => 'pausa_emergencia_activa',
            'shippingRate' => 'tarifa_plana_domicilio', 'profitMargin' => 'margen_ganancia_defecto',
        ];

        $sets = [];
        $valores = [];
        foreach ($mapa as $claveJson => $columna) {
            if (!array_key_exists($claveJson, $campos)) {
                continue;
            }
            $valor = $campos[$claveJson];
            if ($claveJson === 'openTime' || $claveJson === 'closeTime') {
                $valor = strlen((string) $valor) === 5 ? $valor . ':00' : $valor;
            } elseif ($claveJson === 'isOpen' || $claveJson === 'isPaused') {
                $valor = $valor ? 1 : 0;
            }
            $sets[] = "$columna = ?";
            $valores[] = $valor;
        }

        if (empty($sets)) {
            return;
        }

        $resultadoId = $this->conn->query('SELECT id_config FROM CONFIGURACION_SISTEMA LIMIT 1');
        $filaId = $resultadoId->fetch_assoc();
        $valores[] = $filaId['id_config'];

        $stmt = $this->consulta('UPDATE CONFIGURACION_SISTEMA SET ' . implode(', ', $sets) . ' WHERE id_config = ?', $valores);
        $stmt->close();
    }

    /** Agrega una categoria de menu si no existe ya (comparacion sin distinguir mayusculas). */
    public function agregarCategoria($nombre) {
        $nombre = trim($nombre);

        $stmt = $this->consulta('SELECT id_categoria FROM CATEGORIA WHERE ambito = ? AND LOWER(nombre) = LOWER(?)', ['menu', $nombre]);
        $existe = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if ($existe) {
            return;
        }

        $stmtIns = $this->consulta("INSERT INTO CATEGORIA (id_categoria, nombre, ambito) VALUES ('', ?, 'menu')", [$nombre]);
        $stmtIns->close();
    }

    /** Elimina una categoria de menu; rechaza si algun PRODUCTO activo la usa. */
    public function eliminarCategoria($nombre) {
        $stmt = $this->consulta("SELECT id_categoria FROM CATEGORIA WHERE ambito = 'menu' AND nombre = ?", [$nombre]);
        $fila = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if (!$fila) {
            throw new Exception('La categoría no existe.');
        }
        $id = $fila['id_categoria'];

        $stmtCuenta = $this->consulta("SELECT COUNT(*) AS total FROM PRODUCTO WHERE id_categoria = ? AND estado = 'activo'", [$id]);
        $filaCuenta = $stmtCuenta->get_result()->fetch_assoc();
        $stmtCuenta->close();
        if ((int) $filaCuenta['total'] > 0) {
            throw new Exception('No se puede eliminar la categoría: hay productos activos que la usan.');
        }

        $stmtDel = $this->consulta('DELETE FROM CATEGORIA WHERE id_categoria = ?', [$id]);
        $stmtDel->close();
    }

    /** La tienda esta cerrada si isOpen=false, isPaused=true, o la hora actual esta fuera de [openTime, closeTime]. */
    public function tiendaAbiertaAhora() {
        $config = $this->obtener();
        if (!$config['isOpen'] || $config['isPaused']) {
            return false;
        }

        $ahora = date('H:i');
        $abre = $config['openTime'];
        $cierra = $config['closeTime'];

        if ($abre <= $cierra) {
            return $ahora >= $abre && $ahora <= $cierra;
        }
        return $ahora >= $abre || $ahora <= $cierra;
    }

    public function tarifaDomicilio() {
        $resultado = $this->conn->query('SELECT tarifa_plana_domicilio FROM CONFIGURACION_SISTEMA LIMIT 1');
        $fila = $resultado->fetch_assoc();
        return (float) $fila['tarifa_plana_domicilio'];
    }

    public function idIngredienteBolsaGlobal() {
        $resultado = $this->conn->query('SELECT id_ingrediente_bolsa_global FROM CONFIGURACION_SISTEMA LIMIT 1');
        $fila = $resultado->fetch_assoc();
        return $fila['id_ingrediente_bolsa_global'] ?: null;
    }
}
