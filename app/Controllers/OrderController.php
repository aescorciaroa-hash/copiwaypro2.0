<?php
// Los roles ya se validan a nivel de ruta (config/rutas.php -> despacharRuta),
// asi que este controlador no repite chequeos de rol salvo donde la regla es
// mas fina que "uno de estos roles" (aqui no hace falta: review/transiciones
// ya coinciden 1:1 con las rutas).

class OrderController {

    private function entrada() {
        $metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $cuerpo = [];
        if (!in_array($metodo, ['GET', 'HEAD'])) {
            $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
            if (stripos($contentType, 'application/json') !== false) {
                $decodificado = json_decode(file_get_contents('php://input') ?: '[]', true);
                $cuerpo = is_array($decodificado) ? $decodificado : [];
            } else {
                $cuerpo = $_POST;
            }
        }
        return array_merge($_GET, $cuerpo);
    }

    public function index() {
        global $conn;
        $auth = new Autenticacion($conn);
        responderJson((new Pedido($conn))->porRol($auth->rolActual(), $auth->idActual()));
    }

    public function show($id) {
        global $conn;
        $pedido = (new Pedido($conn))->buscar($id);
        if (!$pedido) {
            responderError('Pedido no encontrado.', 404);
        }
        responderJson($pedido);
    }

    /** Toda la validacion de negocio (horario, pago, inventario) vive en Pedido::crear. */
    public function store() {
        global $conn;
        $auth = new Autenticacion($conn);
        $datos = $this->entrada();

        $errores = [];
        if (empty($datos['items'])) $errores['items'] = ['El campo items es obligatorio.'];
        if (empty($datos['address'])) $errores['address'] = ['El campo address es obligatorio.'];
        if (empty($datos['paymentMethod']) || !in_array($datos['paymentMethod'], ['cash', 'online'])) $errores['paymentMethod'] = ['El campo paymentMethod no es válido.'];
        if (!empty($errores)) {
            responderError('Datos inválidos.', 422, $errores);
        }

        try {
            $pedido = (new Pedido($conn))->crear($auth->idActual(), $datos);
            responderJson($pedido, 201);
        } catch (InvalidArgumentException $e) {
            responderError($e->getMessage(), 422);
        } catch (Exception $e) {
            $mensaje = $e->getMessage();
            if (stripos($mensaje, 'cerrada') !== false || stripos($mensaje, 'pausada') !== false) {
                responderError($mensaje, 403);
            } elseif (stripos($mensaje, 'rechazado') !== false) {
                responderError($mensaje, 402);
            } else {
                responderError($mensaje, 409);
            }
        }
    }

    /** Cocina: Pendiente -> En Preparacion */
    public function markPreparing($id) {
        global $conn;
        $this->aplicarTransicion($id, function ($pedidoModelo, $idInterno) {
            $pedidoModelo->marcarPreparando($idInterno);
        });
    }

    /** Cocina: -> Listos */
    public function markReady($id) {
        global $conn;
        $this->aplicarTransicion($id, function ($pedidoModelo, $idInterno) {
            $pedidoModelo->marcarListo($idInterno);
        });
    }

    /** Domiciliario acepta un pedido 'Listos' -> En Camino */
    public function accept($id) {
        global $conn;
        $auth = new Autenticacion($conn);
        $this->aplicarTransicion($id, function ($pedidoModelo, $idInterno) use ($auth) {
            $pedidoModelo->aceptarEntrega($idInterno, $auth->idActual());
        });
    }

    /** Entrega solo con PIN valido -> Entregado */
    public function deliver($id) {
        global $conn;
        $auth = new Autenticacion($conn);
        $pin = (string) ($this->entrada()['pin'] ?? '');
        if ($pin === '') {
            responderError('El PIN es obligatorio.', 422);
        }
        $this->aplicarTransicion($id, function ($pedidoModelo, $idInterno) use ($auth, $pin) {
            $pedidoModelo->confirmarEntrega($idInterno, $auth->idActual(), $pin);
        });
    }

    /** Cliente califica un pedido ya entregado. */
    public function review($id) {
        global $conn;
        $auth = new Autenticacion($conn);
        $pedidoModelo = new Pedido($conn);

        $crudo = $pedidoModelo->buscarCrudo($id);
        if (!$crudo || $crudo['id_cliente'] !== $auth->idActual()) {
            responderError('Pedido no encontrado.', 404);
        }
        if ($crudo['estado'] !== 'entregado') {
            responderError('Solo puedes calificar un pedido ya entregado.', 409);
        }

        $datos = $this->entrada();
        $puntaje = (int) ($datos['rating'] ?? 0);
        $textoResena = (string) ($datos['reviewText'] ?? '');
        if ($puntaje < 1 || $puntaje > 5) {
            responderError('La calificación debe estar entre 1 y 5.', 422);
        }

        $pedidoModelo->calificar($crudo['id_pedido'], $puntaje, $textoResena);

        responderJson($pedidoModelo->buscar($id));
    }

    private function aplicarTransicion($idVisible, callable $fn) {
        global $conn;
        $pedidoModelo = new Pedido($conn);
        $crudo = $pedidoModelo->buscarCrudo($idVisible);
        if (!$crudo) {
            responderError('Pedido no encontrado.', 404);
        }

        try {
            $fn($pedidoModelo, $crudo['id_pedido']);
        } catch (Exception $e) {
            responderError($e->getMessage(), 409);
        }

        responderJson($pedidoModelo->buscar($idVisible));
    }
}
