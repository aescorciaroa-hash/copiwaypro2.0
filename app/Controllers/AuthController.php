<?php
// Autenticacion de los 4 roles con sesion web (admin, kitchen, delivery, client).
// El rate-limit de login (antes RateLimitMiddleware) vive aqui al inicio de
// login(), ya que no hay capa de Middleware en este proyecto.

class AuthController {

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

    /** Registro de cliente (Habeas Data obligatorio, con fecha+IP). */
    public function register() {
        global $conn;
        $datos = $this->entrada();

        $errores = [];
        if (empty($datos['name'])) $errores['name'] = ['El campo name es obligatorio.'];
        if (empty($datos['phone']) || strlen((string) $datos['phone']) < 10) $errores['phone'] = ['El campo phone debe tener al menos 10 caracteres.'];
        if (empty($datos['email']) || !filter_var($datos['email'], FILTER_VALIDATE_EMAIL)) $errores['email'] = ['El campo email debe ser un correo válido.'];
        if (empty($datos['birthday'])) $errores['birthday'] = ['El campo birthday es obligatorio.'];
        if (empty($datos['password']) || strlen((string) $datos['password']) < 8) $errores['password'] = ['El campo password debe tener al menos 8 caracteres.'];

        if (!empty($errores)) {
            responderError('Datos inválidos.', 422, $errores);
        }

        if (empty($datos['terms'])) {
            responderError('Debes aceptar los términos y la política de tratamiento de datos (Habeas Data).', 422);
        }

        $password = (string) $datos['password'];
        if ($password !== (string) ($datos['confirmPassword'] ?? '')) {
            responderError('Las contraseñas no coinciden.', 422);
        }

        $email = trim((string) $datos['email']);
        $telefono = trim((string) $datos['phone']);

        $clienteModelo = new Cliente($conn);
        if ($clienteModelo->correoOTelefonoExiste($email, $telefono)) {
            responderError('Ya existe una cuenta con ese correo o teléfono.', 409);
        }

        $idCliente = $clienteModelo->crear([
            'name' => $datos['name'],
            'phone' => $telefono,
            'email' => $email,
            'birthday' => $datos['birthday'],
            'password' => $password,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0',
        ]);

        $filaCruda = $clienteModelo->buscarCrudo($idCliente);

        $auth = new Autenticacion($conn);
        $usuario = $auth->iniciarSesionUsuario('client', $filaCruda);

        responderJson(['user' => $usuario, 'csrfToken' => csrfToken()], 201);
    }

    /** Paso 1 de recuperacion: genera un codigo de un solo uso. */
    public function forgotPasswordRequest() {
        global $conn;
        $datos = $this->entrada();
        $email = trim((string) ($datos['email'] ?? ''));

        $clienteModelo = new Cliente($conn);
        $idCliente = $clienteModelo->buscarIdPorCorreo($email);

        // Respuesta identica exista o no la cuenta, para no filtrar que correos estan registrados.
        if ($idCliente) {
            $codigo = (string) random_int(100000, 999999);
            (new CodigoVerificacion($conn))->crearParaCliente($idCliente, $codigo);

            // TODO Fase futura: enviar $codigo real por correo/SMS via un proveedor.
            // Solo en entorno local: nunca exponer el codigo en staging/produccion,
            // ni siquiera si APP_DEBUG quedo mal configurado a true por error.
            if (env('APP_ENV', 'production') === 'local') {
                responderJson(['ok' => true, 'debugCode' => $codigo]);
            }
        }

        responderJson(['ok' => true]);
    }

    /** Paso 2: valida el codigo y establece la nueva contrasena. */
    public function forgotPasswordReset() {
        global $conn;
        $datos = $this->entrada();

        $errores = [];
        if (empty($datos['email'])) $errores['email'] = ['El campo email es obligatorio.'];
        if (empty($datos['code'])) $errores['code'] = ['El campo code es obligatorio.'];
        if (empty($datos['newPassword']) || strlen((string) $datos['newPassword']) < 8) $errores['newPassword'] = ['El campo newPassword debe tener al menos 8 caracteres.'];
        if (!empty($errores)) {
            responderError('Datos inválidos.', 422, $errores);
        }

        $email = trim((string) $datos['email']);
        $codigo = (string) $datos['code'];

        $codigoModelo = new CodigoVerificacion($conn);
        $coincidencia = $codigoModelo->buscarValidoPorCorreo($email);
        if (!$coincidencia) {
            responderError('Código inválido o expirado.', 422);
        }
        if (!password_verify($codigo, $coincidencia['codigo_hash'])) {
            $codigoModelo->incrementarIntentos($coincidencia['id_codigo']);
            responderError('Código inválido o expirado.', 422);
        }

        $codigoModelo->marcarUsado($coincidencia['id_codigo']);
        (new Cliente($conn))->actualizarContrasena($coincidencia['id_cliente'], password_hash((string) $datos['newPassword'], PASSWORD_DEFAULT));

        responderJson(['ok' => true]);
    }

    public function login() {
        global $conn;
        $datos = $this->entrada();

        $errores = [];
        if (empty($datos['email']) || !filter_var($datos['email'], FILTER_VALIDATE_EMAIL)) $errores['email'] = ['El campo email debe ser un correo válido.'];
        if (empty($datos['password'])) $errores['password'] = ['El campo password es obligatorio.'];
        if (!empty($errores)) {
            responderError('Datos inválidos.', 422, $errores);
        }

        $email = trim((string) $datos['email']);
        $password = (string) $datos['password'];
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

        $intentoModelo = new IntentoLogin($conn);
        if ($intentoModelo->excedeLimite($email, $ip)) {
            responderError('Demasiados intentos fallidos. Intenta de nuevo en unos minutos.', 429);
        }

        $auth = new Autenticacion($conn);
        $usuario = $auth->intentarLogin($email, $password);

        $intentoModelo->registrar($email, $ip, (bool) $usuario);

        if (!$usuario) {
            responderError('Correo o contraseña incorrectos.', 401);
        }

        responderJson(['user' => $usuario, 'csrfToken' => csrfToken()]);
    }

    public function logout() {
        global $conn;
        (new Autenticacion($conn))->cerrarSesion();
        responderJson(['ok' => true]);
    }

    public function me() {
        global $conn;
        $auth = new Autenticacion($conn);

        if (!$auth->haySesion()) {
            responderError('No autenticado.', 401);
        }

        $usuario = $auth->usuarioActual();
        if ($usuario === null) {
            responderError('Sesión inválida.', 401);
        }

        responderJson([
            'user' => $usuario,
            'role' => $auth->rolActual(),
            'csrfToken' => csrfToken(),
        ]);
    }
}
