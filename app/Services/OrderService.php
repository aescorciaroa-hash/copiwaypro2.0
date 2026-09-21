<?php

namespace App\Services;

use App\Core\Database;
use App\Core\Model;
use App\Models\Order;
use App\Models\OrderTransition;
use App\Models\Setting;
use App\Services\Exceptions\PaymentDeclinedException;
use App\Services\Exceptions\StoreClosedException;
use PDO;
use Throwable;

/**
 * Ciclo de vida completo del pedido. Aquí viven las reglas de negocio 1, 2, 3,
 * 5, 6, 7, 8, 12 y 13 — nunca en el controlador ni confiando en el cliente.
 */
class OrderService extends Model
{
    /**
     * Crea un pedido nuevo desde el checkout del cliente.
     *
     * @param array $payload {
     *   items: array<{productId: string, quantity: int, extras?: array<{id?:string,name:string}>, removed?: array<{id?:string,name:string}>}>,
     *   address: string,
     *   paymentMethod: 'cash'|'online',
     *   lat?: float, lng?: float
     * }
     * @throws StoreClosedException|PaymentDeclinedException|\App\Services\Exceptions\InsufficientStockException
     */
    public static function create(string $clientId, array $payload): array
    {
        if (!Setting::isStoreOpenNow()) {
            throw new StoreClosedException('La tienda está cerrada o pausada en este momento. No se pueden procesar pagos.');
        }

        $items = $payload['items'] ?? [];
        if (empty($items)) {
            throw new \InvalidArgumentException('El pedido no tiene ítems.');
        }

        $pdo = static::db();

        $clientStmt = $pdo->prepare('SELECT * FROM CLIENTE WHERE id_cliente = ? LIMIT 1');
        $clientStmt->execute([$clientId]);
        $client = $clientStmt->fetch();
        if (!$client) {
            throw new \InvalidArgumentException('Cliente no encontrado.');
        }

        // ---- Recalcula todo server-side; nunca confía en precios/totales del cliente (regla 2 y 6) ----
        $resolvedItems = [];
        $subtotal = 0.0;

        foreach ($items as $item) {
            $quantity = max(1, (int) ($item['quantity'] ?? 1));

            if (empty($item['productId']) && !empty($item['stack'])) {
                // "Creador interactivo": hamburguesa armada capa por capa, sin producto base (regla 12).
                $stack = self::resolveIngredients($pdo, $item['stack']);
                if (empty($stack)) {
                    throw new \InvalidArgumentException('La hamburguesa personalizada no tiene ingredientes válidos.');
                }

                $product = self::customBuilderProduct($pdo);
                $unitPrice = array_sum(array_map(fn($e) => (float) $e['precio_extra'], $stack));
                $subtotal += $unitPrice * $quantity;

                $resolvedItems[] = [
                    'product' => $product,
                    'quantity' => $quantity,
                    'unitPrice' => $unitPrice,
                    'extras' => $stack, // se registran como "agregar" y se descuentan del inventario igual que un extra
                    'removed' => [],
                ];
                continue;
            }

            $productStmt = $pdo->prepare("SELECT * FROM PRODUCTO WHERE id_producto = ? AND estado = 'activo' LIMIT 1");
            $productStmt->execute([$item['productId'] ?? '']);
            $product = $productStmt->fetch();
            if (!$product) {
                throw new \InvalidArgumentException('Uno de los productos del carrito ya no está disponible.');
            }

            $extras = self::resolveIngredients($pdo, $item['extras'] ?? []);
            $removed = self::resolveIngredients($pdo, $item['removed'] ?? []);

            $extrasCost = array_sum(array_map(fn($e) => (float) $e['precio_extra'], $extras));
            $unitPrice = (float) $product['precio'] + $extrasCost;
            $lineTotal = $unitPrice * $quantity;
            $subtotal += $lineTotal;

            $resolvedItems[] = [
                'product' => $product,
                'quantity' => $quantity,
                'unitPrice' => $unitPrice,
                'extras' => $extras,
                'removed' => $removed,
            ];
        }

        $shipping = (float) Setting::shippingRate();
        $discount = self::birthdayDiscount($client, $subtotal);
        $total = round($subtotal - $discount + $shipping, 2);
        $points = (int) floor($total / 1000);

        $isCash = ($payload['paymentMethod'] ?? 'online') === 'cash';
        $metodoPago = $isCash ? 'efectivo' : 'digital';
        $estadoPago = 'pendiente';
        $fechaPago = null;
        $comprobante = null;

        if (!$isCash) {
            $result = (new PaymentService())->charge($total, ['client_id' => $clientId]);
            if (!$result['approved']) {
                // Regla 1 (Cero Crédito): un pago digital rechazado NUNCA crea un pedido.
                throw new PaymentDeclinedException('El pago fue rechazado por la pasarela. Intenta con otro método.');
            }
            $estadoPago = 'aprobado';
            $fechaPago = date('Y-m-d H:i:s');
            $comprobante = $result['reference'];
        }
        // Si es efectivo: el pedido SÍ pasa a cocina (decisión del negocio), pero el pago queda
        // 'pendiente' hasta que el domiciliario liquide el efectivo en el cierre de caja.

        $pdo->beginTransaction();
        try {
            $idPedido = static::uuid();
            $insert = $pdo->prepare(
                'INSERT INTO PEDIDO
                    (id_pedido, id_cliente, direccion_entrega, destino_lat, destino_lng, estado,
                     canal_origen, metodo_pago, estado_pago, fecha_pago, comprobante_pago,
                     subtotal, costo_domicilio, descuento_cumpleanos, puntos_ganados, total)
                 VALUES (?, ?, ?, ?, ?, \'pendiente\', \'web\', ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $insert->execute([
                $idPedido, $clientId, $payload['address'] ?? $client['direccion'],
                $payload['lat'] ?? null, $payload['lng'] ?? null,
                $metodoPago, $estadoPago, $fechaPago, $comprobante,
                $subtotal, $shipping, $discount, $points, $total,
            ]);

            $deductionLines = [];

            foreach ($resolvedItems as $resolved) {
                $product = $resolved['product'];
                $idDetalle = static::uuid();

                $detalleStmt = $pdo->prepare(
                    'INSERT INTO DETALLE_PEDIDO (id_detalle, id_pedido, id_producto, nombre_producto, cantidad, precio_unitario, es_personalizado)
                     VALUES (?, ?, ?, ?, ?, ?, ?)'
                );
                $esPersonalizado = (!empty($resolved['extras']) || !empty($resolved['removed'])) ? 1 : 0;
                $detalleStmt->execute([
                    $idDetalle, $idPedido, $product['id_producto'], $product['nombre'],
                    $resolved['quantity'], $resolved['unitPrice'], $esPersonalizado,
                ]);

                foreach ($resolved['extras'] as $extra) {
                    $pdo->prepare(
                        'INSERT INTO PERSONALIZACION (id_personalizacion, id_detalle, id_ingrediente, nombre_ingrediente, accion_modificacion, cantidad, costo_aplicado)
                         VALUES (?, ?, ?, ?, \'agregar\', 1, ?)'
                    )->execute(['', $idDetalle, $extra['id_ingrediente'], $extra['nombre'], $extra['precio_extra']]);

                    $deductionLines[] = [
                        'id_ingrediente' => $extra['id_ingrediente'],
                        'cantidad' => $resolved['quantity'],
                        'motivo' => "Extra pedido " . Order::displayId(['numero_pedido' => self::pendingNumero($pdo, $idPedido)]),
                    ];
                }

                foreach ($resolved['removed'] as $removedIng) {
                    $pdo->prepare(
                        'INSERT INTO PERSONALIZACION (id_personalizacion, id_detalle, id_ingrediente, nombre_ingrediente, accion_modificacion, cantidad, costo_aplicado)
                         VALUES (?, ?, ?, ?, \'quitar\', 1, 0)'
                    )->execute(['', $idDetalle, $removedIng['id_ingrediente'], $removedIng['nombre']]);
                }

                // Receta base del producto (ingredientes + empaques), menos lo removido, por la cantidad pedida.
                $removedIds = array_column($resolved['removed'], 'id_ingrediente');
                $recetaStmt = $pdo->prepare('SELECT id_ingrediente, cantidad_necesaria FROM RECETA WHERE id_producto = ?');
                $recetaStmt->execute([$product['id_producto']]);
                foreach ($recetaStmt->fetchAll() as $receta) {
                    if (in_array($receta['id_ingrediente'], $removedIds, true)) {
                        continue;
                    }
                    $deductionLines[] = [
                        'id_ingrediente' => $receta['id_ingrediente'],
                        'cantidad' => (float) $receta['cantidad_necesaria'] * $resolved['quantity'],
                        'motivo' => "Venta pedido",
                    ];
                }
            }

            // Bolsa de empaque global (1 por pedido, configurable por el admin — extensión aprobada).
            $bolsaId = Setting::globalBagIngredientId();
            if ($bolsaId) {
                $deductionLines[] = ['id_ingrediente' => $bolsaId, 'cantidad' => 1, 'motivo' => 'Empaque global pedido'];
            }

            if (!empty($deductionLines)) {
                InventoryService::deduct($pdo, $deductionLines, $idPedido);
            }

            $pdo->prepare('UPDATE CLIENTE SET puntos_fidelidad = puntos_fidelidad + ?, total_gastado = total_gastado + ? WHERE id_cliente = ?')
                ->execute([$points, $total, $clientId]);

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        return Order::find($idPedido);
    }

    /**
     * Producto "sombra" (oculto del catálogo) usado como ancla de FK para los
     * ítems 100% personalizados del creador interactivo, que no parten de
     * ningún producto del menú. Se crea una sola vez de forma perezosa.
     */
    private static function customBuilderProduct(PDO $pdo): array
    {
        $stmt = $pdo->prepare("SELECT * FROM PRODUCTO WHERE nombre = 'Hamburguesa Personalizada' AND estado = 'oculto' LIMIT 1");
        $stmt->execute();
        $product = $stmt->fetch();
        if ($product) {
            return $product;
        }

        $catStmt = $pdo->prepare("SELECT id_categoria FROM CATEGORIA WHERE nombre = 'Personalizado' AND ambito = 'menu' LIMIT 1");
        $catStmt->execute();
        $categoryId = $catStmt->fetchColumn();
        if (!$categoryId) {
            $pdo->prepare("INSERT INTO CATEGORIA (id_categoria, nombre, ambito) VALUES ('', 'Personalizado', 'menu')")->execute();
            $catStmt->execute();
            $categoryId = $catStmt->fetchColumn();
        }

        $pdo->prepare(
            "INSERT INTO PRODUCTO (id_producto, id_categoria, nombre, precio, estado)
             VALUES ('', ?, 'Hamburguesa Personalizada', 0, 'oculto')"
        )->execute([$categoryId]);

        $stmt->execute();
        return $stmt->fetch();
    }

    private static function pendingNumero(PDO $pdo, string $idPedido): int
    {
        $stmt = $pdo->prepare('SELECT numero_pedido FROM PEDIDO WHERE id_pedido = ?');
        $stmt->execute([$idPedido]);
        return (int) $stmt->fetchColumn();
    }

    /** @return array<array{id_ingrediente:string, nombre:string, precio_extra:float}> */
    private static function resolveIngredients(PDO $pdo, array $refs): array
    {
        $resolved = [];
        foreach ($refs as $ref) {
            $row = null;
            if (!empty($ref['id'])) {
                $stmt = $pdo->prepare('SELECT * FROM INGREDIENTE WHERE id_ingrediente = ? LIMIT 1');
                $stmt->execute([$ref['id']]);
                $row = $stmt->fetch();
            }
            if (!$row && !empty($ref['name'])) {
                $stmt = $pdo->prepare('SELECT * FROM INGREDIENTE WHERE LOWER(nombre) = LOWER(?) LIMIT 1');
                $stmt->execute([$ref['name']]);
                $row = $stmt->fetch();
            }
            if (!$row) {
                continue; // ingrediente desconocido: se ignora en vez de romper el pedido
            }
            $resolved[] = [
                'id_ingrediente' => $row['id_ingrediente'],
                'nombre' => $row['nombre'],
                'precio_extra' => (float) $row['precio_extra'],
            ];
        }
        return $resolved;
    }

    private static function birthdayDiscount(array $client, float $subtotal): float
    {
        if (empty($client['fecha_nacimiento'])) {
            return 0.0;
        }
        $today = date('m-d');
        $birthday = date('m-d', strtotime($client['fecha_nacimiento']));
        return $birthday === $today ? round($subtotal * 0.15, 2) : 0.0;
    }

    // ---- Transiciones de estado (regla 7) ----

    public static function markPreparing(string $idPedido): void
    {
        OrderTransition::markPreparing($idPedido);
    }

    public static function markReady(string $idPedido): void
    {
        OrderTransition::markReady($idPedido);
    }

    public static function acceptDelivery(string $idPedido, string $driverId): void
    {
        OrderTransition::acceptDelivery($idPedido, $driverId);
    }

    /** Regla 8: entrega solo con PIN de 4 dígitos verificado en el servidor. */
    public static function confirmDelivery(string $idPedido, string $driverId, string $pin): void
    {
        OrderTransition::confirmDelivery($idPedido, $driverId, $pin);
    }

    /** Regla 3: punto de no retorno — el cliente no puede editar/cancelar tras el pago. */
    public static function assertClientCanStillModify(array $order): void
    {
        if ($order['status'] !== 'Pendiente') {
            throw new \RuntimeException('El pedido ya está en proceso y no puede modificarse.');
        }
    }
}
