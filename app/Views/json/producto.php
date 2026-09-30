<?php
// Shape puro (sin SQL) de una fila PRODUCTO -> JSON del frontend. $ingredients y
// $packaging ya vienen armados (Producto::recetaDe), ya en su shape final.
//
// $esAdmin distingue el shape completo (panel de gestion: costPrice, receta con
// quantityDeduct exacto y packaging) del shape publico (catalogo del cliente,
// con o sin sesion, pero no admin): ahi solo van id+name de ingredients (lo que
// el customizer de hamburguesas necesita para "sin X"/"extra X"), sin costos ni
// cantidades internas de receta ni empaques.

// Inverso de Producto::BADGE_A_ENUM: la BD guarda el slug ('mas_vendido'),
// pero el frontend compara contra el texto mostrado ("Más Vendido") en
// varios lugares (íconos de la etiqueta, filtros). Sin este mapeo el
// producto se guardaba bien pero la insignia dejaba de reconocerse al
// releerlo.
const PRODUCTO_ENUM_A_BADGE = [
    'mas_vendido' => 'Más Vendido',
    'recomendado' => 'Recomendado',
    'nuevo' => 'Nuevo',
    'especialidad' => 'Especialidad',
];

function producto_a_json($fila, $ingredients, $packaging, $esAdmin = false) {
    $etiqueta = PRODUCTO_ENUM_A_BADGE[$fila['etiqueta_destacada']] ?? null;

    $resultado = [
        'id' => (string) $fila['id_producto'],
        'name' => $fila['nombre'],
        'description' => $fila['descripcion'],
        'price' => (float) $fila['precio'],
        'active' => $fila['estado'] === 'activo',
        'image' => $fila['imagen'],
        'category' => $fila['categoria_nombre'],
        'prepTime' => $fila['tiempo_preparacion'] !== null ? (int) $fila['tiempo_preparacion'] : null,
        'badge' => $etiqueta,
    ];

    if ($esAdmin) {
        $resultado['ingredients'] = $ingredients;
        $resultado['packaging'] = $packaging;
        $resultado['costPrice'] = $fila['costo_calculado'] !== null ? (float) $fila['costo_calculado'] : null;
    } else {
        $resultado['ingredients'] = array_map(function ($ing) {
            return ['id' => $ing['id'], 'name' => $ing['name']];
        }, $ingredients);
    }

    return $resultado;
}
