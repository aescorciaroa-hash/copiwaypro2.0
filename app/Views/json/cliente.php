<?php
// Shapes puros (sin SQL) de CLIENTE / CLIENTE_NOTIFICACION -> JSON del frontend.

/**
 * $datosCrudos = ['fila' => ..., 'ordersCount' => int, 'lastOrderDate' => ?string,
 *                 'notifications' => array ya formada]
 */
function cliente_a_json($datosCrudos) {
    $fila = $datosCrudos['fila'];
    return [
        'id' => $fila['id_cliente'],
        'name' => $fila['nombre'],
        'phone' => $fila['telefono'],
        'email' => $fila['correo'],
        'address' => $fila['direccion'],
        'ordersCount' => $datosCrudos['ordersCount'],
        'totalSpent' => (float) $fila['total_gastado'],
        'points' => (int) $fila['puntos_fidelidad'],
        'lastOrderDate' => $datosCrudos['lastOrderDate'],
        'notifications' => $datosCrudos['notifications'],
        'birthday' => $fila['fecha_nacimiento'],
        'preferences' => null,
    ];
}

function notificacion_a_json($fila) {
    return [
        'id' => $fila['id_notificacion_cliente'],
        'title' => $fila['titulo'],
        'message' => $fila['mensaje'],
        'date' => $fila['fecha'],
        'read' => (bool) $fila['leida'],
        'type' => $fila['tipo'],
    ];
}
