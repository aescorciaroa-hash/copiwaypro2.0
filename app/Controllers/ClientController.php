<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Controller;
use App\Core\Request;
use App\Models\Client;

class ClientController extends Controller
{
    public function index(Request $request): void
    {
        $this->json(Client::all());
    }

    public function show(Request $request, string $id): void
    {
        $this->authorizeSelfOrAdmin($id);

        $client = Client::find($id);
        if (!$client) {
            $this->error('Cliente no encontrado.', 404);
        }
        $this->json($client);
    }

    public function update(Request $request, string $id): void
    {
        $this->authorizeSelfOrAdmin($id);

        if (!Client::find($id)) {
            $this->error('Cliente no encontrado.', 404);
        }

        $data = $request->all();

        // Un cliente editando su propio perfil no puede tocar puntos/gasto total/pedidos;
        // solo el admin puede modificar esos campos.
        if (Auth::role() !== 'admin') {
            $allowed = ['name', 'phone', 'address', 'birthday'];
            $data = array_intersect_key($data, array_flip($allowed));
        }

        Client::update($id, $data);
        $this->json(Client::find($id));
    }

    public function notifications(Request $request, string $id): void
    {
        $this->authorizeSelfOrAdmin($id);

        if (!Client::find($id)) {
            $this->error('Cliente no encontrado.', 404);
        }

        $this->json(Client::notificationsFor($id));
    }

    public function markNotificationRead(Request $request, string $id, string $notifId): void
    {
        $this->authorizeSelfOrAdmin($id);

        $ok = Client::markNotificationRead($id, $notifId);
        if (!$ok) {
            $this->error('Notificación no encontrada.', 404);
        }

        $this->json(['ok' => true]);
    }

    private function authorizeSelfOrAdmin(string $id): void
    {
        if (!Auth::check()) {
            $this->error('No autenticado.', 401);
        }

        $isSelf = Auth::role() === 'client' && Auth::id() === $id;
        $isAdmin = Auth::role() === 'admin';

        if (!$isSelf && !$isAdmin) {
            $this->error('No autorizado para este recurso.', 403);
        }
    }
}
