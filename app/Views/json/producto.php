<?php
// Shape puro (sin SQL) de una fila PRODUCTO -> JSON del frontend. $ingredients y
// $packaging ya vienen armados (Producto::recetaDe), ya en su shape final.

function producto_a_json($fila, $ingredients, $packaging) {
    $etiqueta = $fila['etiqueta_destacada'];
    if ($etiqueta === 'ninguna') {
        $etiqueta = null;
    }

    return [
        'id' => $fila['id_producto'],
        'name' => $fila['nombre'],
        'description' => $fila['descripcion'],
        'price' => (float) $fila['precio'],
        'active' => $fila['estado'] === 'activo',
        'image' => $fila['imagen'],
        'ingredients' => $ingredients,
        'packaging' => $packaging,
        'category' => $fila['categoria_nombre'],
        'prepTime' => $fila['tiempo_preparacion'] !== null ? (int) $fila['tiempo_preparacion'] : null,
        'badge' => $etiqueta,
        'costPrice' => $fila['costo_calculado'] !== null ? (float) $fila['costo_calculado'] : null,
    ];
}
