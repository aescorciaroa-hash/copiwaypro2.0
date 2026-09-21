<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Controller;
use App\Core\Database;
use App\Core\Env;
use App\Core\Request;
use App\Core\Session;
use App\Core\Validator;
use App\Models\Client;
use App\Models\LoginAttempt;
use App\Models\VerificationCode;

class AuthController extends Controller
{
    /** Registro de cliente (regla 4: Habeas Data obligatorio, con fecha+IP). */
    public function register(Request $request): void
    {
        $validator = Validator::make($request->all())
            ->required('name')
            ->required('phone')->minLength('phone', 10)
            ->required('email')->email('email')
            ->required('birthday')
            ->required('password')->minLength('password', 8);

        if ($validator->fails()) {
            $this->validationError($validator->errors());
        }

        if (!$request->input('terms')) {
            $this->error('Debes aceptar los términos y la política de tratamiento de datos (Habeas Data).', 422);
        }

        $password = (string) $request->input('password');
        if ($password !== (string) $request->input('confirmPassword')) {
            $this->error('Las contraseñas no coinciden.', 422);
        }

        $pdo = Database::connection();
        $email = trim((string) $request->input('email'));
        $phone = trim((string) $request->input('phone'));

        $exists = $pdo->prepare('SELECT COUNT(*) FROM CLIENTE WHERE correo = ? OR telefono = ?');
        $exists->execute([$email, $phone]);
        if ((int) $exists->fetchColumn() > 0) {
            $this->error('Ya existe una cuenta con ese correo o teléfono.', 409);
        }

        $clientId = Client::create([
            'name' => $request->input('name'),
            'phone' => $phone,
            'email' => $email,
            'birthday' => $request->input('birthday'),
            'password' => $password,
            'ip' => $request->ip(),
        ]);

        $stmt = $pdo->prepare('SELECT * FROM CLIENTE WHERE id_cliente = ?');
        $stmt->execute([$clientId]);
        $row = $stmt->fetch();

        $user = Auth::login('client', $row);
        $this->json(['user' => $user, 'csrfToken' => Session::csrfToken()], 201);
    }

    /** Paso 1 de recuperación: genera un código de un solo uso (regla: token expirable, no simulado). */
    public function forgotPasswordRequest(Request $request): void
    {
        $email = trim((string) $request->input('email', ''));
        $pdo = Database::connection();

        $stmt = $pdo->prepare('SELECT id_cliente FROM CLIENTE WHERE correo = ?');
        $stmt->execute([$email]);
        $clientId = $stmt->fetchColumn();

        // Respuesta idéntica exista o no la cuenta, para no filtrar qué correos están registrados.
        if ($clientId) {
            $code = (string) random_int(100000, 999999);
            VerificationCode::createForClient($clientId, $code);

            // TODO Fase futura: enviar `$code` real por correo/SMS vía un proveedor.
            // En entorno de desarrollo (APP_DEBUG) se devuelve para poder probar el flujo.
            if (Env::get('APP_DEBUG', false)) {
                $this->json(['ok' => true, 'debugCode' => $code]);
            }
        }

        $this->json(['ok' => true]);
    }

    /** Paso 2: valida el código y establece la nueva contraseña. */
    public function forgotPasswordReset(Request $request): void
    {
        $validator = Validator::make($request->all())
            ->required('email')->required('code')->required('newPassword')->minLength('newPassword', 8);
        if ($validator->fails()) {
            $this->validationError($validator->errors());
        }

        $pdo = Database::connection();
        $email = trim((string) $request->input('email'));
        $code = (string) $request->input('code');

        $match = VerificationCode::findValidForEmail($email);
        if (!$match || !password_verify($code, $match['codigo_hash'])) {
            $this->error('Código inválido o expirado.', 422);
        }

        VerificationCode::markUsed($match['id_codigo']);
        $pdo->prepare('UPDATE CLIENTE SET contrasena = ? WHERE id_cliente = ?')
            ->execute([password_hash((string) $request->input('newPassword'), PASSWORD_DEFAULT), $match['id_cliente']]);

        $this->json(['ok' => true]);
    }

    public function login(Request $request): void
    {
        $validator = Validator::make($request->all())
            ->required('email')->email('email')
            ->required('password');

        if ($validator->fails()) {
            $this->validationError($validator->errors());
        }

        $email = trim((string) $request->input('email'));
        $password = (string) $request->input('password');
        $ip = $request->ip();

        $user = Auth::attempt($email, $password);

        LoginAttempt::record($email, $ip, (bool) $user);

        if (!$user) {
            $this->error('Correo o contraseña incorrectos.', 401);
        }

        $this->json(['user' => $user, 'csrfToken' => Session::csrfToken()]);
    }

    public function logout(Request $request): void
    {
        Auth::logout();
        $this->json(['ok' => true]);
    }

    public function me(Request $request): void
    {
        if (!Auth::check()) {
            $this->error('No autenticado.', 401);
        }

        $user = Auth::user();
        if (!$user) {
            Auth::logout();
            $this->error('Sesión inválida.', 401);
        }

        $this->json([
            'user' => $user,
            'role' => Auth::role(),
            'csrfToken' => Session::csrfToken(),
        ]);
    }
}
