<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Controller;
use App\Core\Request;
use App\Core\Validator;
use App\Models\Order;
use App\Models\OrderReview;
use App\Services\Exceptions\InsufficientStockException;
use App\Services\Exceptions\PaymentDeclinedException;
use App\Services\Exceptions\StoreClosedException;
use App\Services\OrderService;
use Throwable;

class OrderController extends Controller
{
    public function index(Request $request): void
    {
        $this->json(Order::forRole(Auth::role(), Auth::id()));
    }

    public function show(Request $request, string $id): void
    {
        $order = Order::find($id);
        if (!$order) {
            $this->error('Pedido no encontrado.', 404);
        }
        $this->json($order);
    }

    /** Regla 1/2/5/6/12/13: toda la validación de negocio vive en OrderService. */
    public function store(Request $request): void
    {
        if (Auth::role() !== 'client') {
            $this->error('Solo un cliente puede crear pedidos.', 403);
        }

        $validator = Validator::make($request->all())
            ->required('items')
            ->required('address')
            ->required('paymentMethod')->in('paymentMethod', ['cash', 'online']);

        if ($validator->fails()) {
            $this->validationError($validator->errors());
        }

        try {
            $order = OrderService::create(Auth::id(), $request->all());
            $this->json($order, 201);
        } catch (StoreClosedException $e) {
            $this->error($e->getMessage(), 403);
        } catch (PaymentDeclinedException $e) {
            $this->error($e->getMessage(), 402);
        } catch (InsufficientStockException $e) {
            $this->error($e->getMessage(), 409);
        } catch (\InvalidArgumentException $e) {
            $this->error($e->getMessage(), 422);
        }
    }

    /** Cocina: Pendiente -> En Preparación */
    public function markPreparing(Request $request, string $id): void
    {
        $this->guardRole(['admin', 'kitchen']);
        $this->applyTransition($id, fn($idPedido) => OrderService::markPreparing($idPedido));
    }

    /** Cocina: -> Listos */
    public function markReady(Request $request, string $id): void
    {
        $this->guardRole(['admin', 'kitchen']);
        $this->applyTransition($id, fn($idPedido) => OrderService::markReady($idPedido));
    }

    /** Domiciliario acepta un pedido 'Listos' -> En Camino */
    public function accept(Request $request, string $id): void
    {
        $this->guardRole(['delivery']);
        $this->applyTransition($id, fn($idPedido) => OrderService::acceptDelivery($idPedido, Auth::id()));
    }

    /** Regla 8: entrega solo con PIN válido -> Entregado */
    public function deliver(Request $request, string $id): void
    {
        $this->guardRole(['delivery']);
        $pin = (string) $request->input('pin', '');
        if ($pin === '') {
            $this->error('El PIN es obligatorio.', 422);
        }
        $this->applyTransition($id, fn($idPedido) => OrderService::confirmDelivery($idPedido, Auth::id(), $pin));
    }

    /** Cliente califica un pedido ya entregado. */
    public function review(Request $request, string $id): void
    {
        $this->guardRole(['client']);

        $order = Order::findRawByDisplayId($id);
        if (!$order || $order['id_cliente'] !== Auth::id()) {
            $this->error('Pedido no encontrado.', 404);
        }
        if ($order['estado'] !== 'entregado') {
            $this->error('Solo puedes calificar un pedido ya entregado.', 409);
        }

        $rating = (int) $request->input('rating', 0);
        $reviewText = (string) $request->input('reviewText', '');
        if ($rating < 1 || $rating > 5) {
            $this->error('La calificación debe estar entre 1 y 5.', 422);
        }

        OrderReview::upsert($order['id_pedido'], $rating, $reviewText);

        $this->json(Order::find($id));
    }

    private function guardRole(array $roles): void
    {
        if (!in_array(Auth::role(), $roles, true)) {
            $this->error('No autorizado.', 403);
        }
    }

    private function applyTransition(string $displayId, callable $fn): void
    {
        $order = Order::findRawByDisplayId($displayId);
        if (!$order) {
            $this->error('Pedido no encontrado.', 404);
        }

        try {
            $fn($order['id_pedido']);
        } catch (Throwable $e) {
            $this->error($e->getMessage(), 409);
        }

        $this->json(Order::find($displayId));
    }
}
