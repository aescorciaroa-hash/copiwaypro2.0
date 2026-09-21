<?php

namespace App\Middleware;

use App\Core\Request;
use App\Core\Response;
use App\Core\Session;

/**
 * Protección CSRF basada en cabecera personalizada (X-CSRF-Token) comparada
 * contra el token guardado en sesión. Se aplica a rutas mutadoras (POST/PUT/PATCH/DELETE)
 * consumidas por la SPA vía fetch con credentials:'include', que ya envía la cookie de sesión.
 */
class CsrfMiddleware
{
    public function handle(Request $request): void
    {
        if (in_array($request->method, ['GET', 'HEAD', 'OPTIONS'], true)) {
            return;
        }

        $token = $request->header('X-CSRF-Token');
        $expected = Session::get('_csrf_token');

        if (!$token || !$expected || !hash_equals($expected, $token)) {
            Response::error('Token CSRF inválido o ausente.', 419);
        }
    }
}
