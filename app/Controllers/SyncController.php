<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Models\Client;
use App\Models\Ingredient;
use App\Models\Order;
use App\Models\Product;
use App\Models\Setting;
use App\Models\Staff;

/**
 * Sustituye los onSnapshot de Firestore (FirebaseSync.tsx) por polling corto con
 * ETag: el frontend hace fetch cada 2-3s con If-None-Match; si nada cambió se
 * responde 304 (sin payload). El alcance de datos se filtra por rol para no
 * exponer todo abiertamente como hacían las reglas de Firestore actuales.
 */
class SyncController extends Controller
{
    public function index(Request $request): void
    {
        $role = Auth::check() ? Auth::role() : 'guest';
        $userId = Auth::check() ? Auth::id() : null;

        $payload = [
            'products' => Product::all($role !== 'admin'),
            'settings' => Setting::get(),
        ];

        if (in_array($role, ['admin', 'kitchen'], true)) {
            $payload['inventory'] = Ingredient::allAsInventory();
            $payload['ingredients'] = Ingredient::allAsIngredients();
            $payload['staff'] = Staff::all();
            $payload['orders'] = Order::forRole($role, $userId);
        }

        if ($role === 'admin') {
            $payload['clients'] = Client::all();
        }

        if ($role === 'delivery') {
            $payload['orders'] = Order::forRole($role, $userId);
        }

        if ($role === 'client') {
            $payload['orders'] = Order::forRole($role, $userId);
            $payload['ingredients'] = Ingredient::allAsIngredients();
        }

        $etag = '"' . md5(json_encode($payload)) . '"';
        $clientEtag = $request->header('If-None-Match');

        if ($clientEtag === $etag) {
            header("ETag: {$etag}");
            Response::notModified();
        }

        Response::json($payload, 200, ['ETag' => $etag]);
    }
}
