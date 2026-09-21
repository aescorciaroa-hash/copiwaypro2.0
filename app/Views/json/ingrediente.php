<?php
// Shapes puros (sin SQL) de una fila INGREDIENTE -> JSON del frontend.
// Dos formas: InventoryItem (/api/inventory) e Ingredient (/api/ingredients).

function ingrediente_a_inventario($fila) {
    return [
        'id' => $fila['id_ingrediente'],
        'name' => $fila['nombre'],
        'stock' => (float) $fila['cantidad_stock'],
        'totalCost' => $fila['costo_total'] !== null ? (float) $fila['costo_total'] : null,
        'unitCost' => (float) $fila['costo_unitario'],
        'unit' => $fila['unidad_medida'],
        'category' => $fila['categoria_nombre'],
        'supplier' => $fila['proveedor'],
        'notes' => $fila['notas'],
        'createdAt' => $fila['creado_en'],
    ];
}

function ingrediente_a_catalogo($fila) {
    $precio = (float) $fila['precio_extra'];
    if ($precio <= 0) {
        $precio = (float) $fila['costo_unitario'];
    }
    return [
        'id' => $fila['id_ingrediente'],
        'name' => $fila['nombre'],
        'price' => $precio,
        'category' => $fila['categoria_nombre'],
        'stock' => (float) $fila['cantidad_stock'],
    ];
}
