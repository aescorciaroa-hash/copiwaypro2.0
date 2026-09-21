<?php

namespace App\Services;

interface PaymentDriver
{
    /** @return array{approved: bool, reference: ?string} */
    public function charge(float $amount, array $context): array;
}

/**
 * Driver de desarrollo: aprueba pagos digitales de forma determinística (sin
 * aleatoriedad, a diferencia de la simulación actual del frontend). Se
 * reemplaza por un driver real (Wompi/ePayco/Mercado Pago, etc.) implementando
 * la misma interfaz PaymentDriver; el webhook del proveedor real actualizaría
 * PEDIDO.estado_pago de forma asíncrona en vez de aprobar en la misma petición.
 */
class SimulatedPaymentDriver implements PaymentDriver
{
    public function charge(float $amount, array $context): array
    {
        return [
            'approved' => true,
            'reference' => 'SIM-' . strtoupper(bin2hex(random_bytes(6))),
        ];
    }
}

class PaymentService
{
    public function __construct(private PaymentDriver $driver = new SimulatedPaymentDriver())
    {
    }

    /**
     * @return array{approved: bool, reference: ?string}
     */
    public function charge(float $amount, array $context = []): array
    {
        return $this->driver->charge($amount, $context);
    }
}
