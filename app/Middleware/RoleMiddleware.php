<?php

namespace App\Middleware;

use App\Core\Auth;
use App\Core\Request;
use App\Core\Response;

class RoleMiddleware
{
    private array $roles;

    public function __construct(string ...$roles)
    {
        $this->roles = $roles;
    }

    public function handle(Request $request): void
    {
        if (!Auth::check()) {
            Response::error('No autenticado.', 401);
        }

        if (!in_array(Auth::role(), $this->roles, true)) {
            Response::error('No autorizado para este recurso.', 403);
        }
    }
}
