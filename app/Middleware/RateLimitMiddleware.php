<?php

namespace App\Middleware;

use App\Core\Database;
use App\Core\Env;
use App\Core\Request;
use App\Core\Response;

/**
 * Limita intentos de login por identificador (correo) e IP, usando la tabla
 * INTENTO_LOGIN. Se registra cada intento desde AuthController; aquí solo se
 * verifica el umbral antes de procesar la petición.
 */
class RateLimitMiddleware
{
    public function handle(Request $request): void
    {
        $maxAttempts = (int) Env::get('RATE_LIMIT_LOGIN_MAX_ATTEMPTS', 5);
        $windowMinutes = (int) Env::get('RATE_LIMIT_LOGIN_WINDOW_MINUTES', 15);

        $identificador = (string) $request->input('email', '');
        $ip = $request->ip();

        $pdo = Database::connection();
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM INTENTO_LOGIN
             WHERE (identificador = ? OR ip = ?)
               AND exitoso = 0
               AND fecha_hora > (NOW() - INTERVAL ? MINUTE)'
        );
        $stmt->execute([$identificador, $ip, $windowMinutes]);
        $failedAttempts = (int) $stmt->fetchColumn();

        if ($failedAttempts >= $maxAttempts) {
            Response::error(
                'Demasiados intentos fallidos. Intenta de nuevo en unos minutos.',
                429
            );
        }
    }
}
