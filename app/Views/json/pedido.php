<?php
// Shape puro (sin SQL) de un PEDIDO -> JSON del frontend. $items ya viene armado
// (Pedido::itemsDe), esta funcion solo mapea $fila + $items al shape final.

const PEDIDO_ESTADO_BD_A_APP = [
    'pendiente' => 'Pendiente',
    'en_preparacion' => 'En Preparación',
    'listo' => 'Listos',
    'en_camino' => 'En Camino',
    'entregado' => 'Entregado',
    'cancelado' => 'Cancelado',
];

function pedido_a_json($fila, $items, $rolQueVe, $idQueVe) {
    $estado = PEDIDO_ESTADO_BD_A_APP[$fila['estado']] ?? $fila['estado'];

    // Regla: el telefono del cliente solo es visible al domiciliario asignado
    // mientras el pedido esta "En Camino"; admin/cocina/el propio cliente lo ven siempre.
    $mostrarTelefono = true;
    if ($rolQueVe === 'delivery') {
        $mostrarTelefono = $fila['estado'] === 'en_camino' && $fila['id_domiciliario'] === $idQueVe;
    }

    // Regla: el PIN de entrega es un secreto entre el cliente y el domiciliario
    // en la puerta -- el domiciliario debe PEDIRSELO al cliente, no leerlo de
    // la API (por eso confirmarEntrega() lo valida en servidor con
    // hash_equals). admin/cocina/otros clientes tampoco lo necesitan nunca.
    // requiresDeliveryPin es un booleano seguro de exponer a todos (el
    // frontend del domiciliario lo usa solo para decidir si pedir el PIN).
    return [
        'id' => '#ORD-' . $fila['numero_pedido'],
        'status' => $estado,
        'client' => $fila['cliente_nombre'],
        'clientPhone' => $mostrarTelefono ? $fila['cliente_telefono'] : null,
        'driverName' => $fila['domiciliario_nombre'],
        'driverPhone' => $fila['domiciliario_nombre'] ? $fila['domiciliario_telefono'] : null,
        'driverPlate' => $fila['domiciliario_placa'],
        'driverVehicle' => $fila['domiciliario_vehiculo'],
        'deliveryPin' => $rolQueVe === 'client' ? $fila['pin_entrega'] : null,
        'requiresDeliveryPin' => !empty($fila['pin_entrega']),
        'total' => (float) $fila['total'],
        'subtotal' => (float) $fila['subtotal'],
        'shipping' => (float) $fila['costo_domicilio'],
        'discount' => (float) $fila['descuento_cumpleanos'],
        'pointsEarned' => (int) $fila['puntos_ganados'],
        'items' => $items,
        'address' => $fila['direccion_entrega'],
        'date' => $fila['fecha_hora'],
        'time' => date('H:i', strtotime($fila['fecha_hora'])),
        'paymentMethod' => $fila['metodo_pago'] === 'efectivo' ? 'cash' : 'online',
        'paymentStatus' => $fila['estado_pago'] === 'aprobado' ? 'Pagado' : ucfirst($fila['estado_pago']),
    ];
}
