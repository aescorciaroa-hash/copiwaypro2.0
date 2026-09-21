<?php
// Tabla de rutas: 'METODO /ruta' => [Controlador, accion, roles].
// roles = [] significa publica (sin sesion). Los {parametros} se pasan a la
// accion del controlador en el mismo orden en que aparecen en la ruta.

$TODOS_LOS_ROLES = ['admin', 'kitchen', 'delivery', 'client'];

return [

    // ---- Autenticacion ----
    'POST /api/auth/login' => ['AuthController', 'login', []],
    'POST /api/auth/logout' => ['AuthController', 'logout', []],
    'GET /api/auth/me' => ['AuthController', 'me', []],
    'POST /api/auth/register' => ['AuthController', 'register', []],
    'POST /api/auth/forgot-password/request' => ['AuthController', 'forgotPasswordRequest', []],
    'POST /api/auth/forgot-password/reset' => ['AuthController', 'forgotPasswordReset', []],

    // ---- Configuracion de la tienda ----
    'GET /api/settings' => ['SettingController', 'show', []],
    'PUT /api/settings' => ['SettingController', 'update', ['admin']],
    'POST /api/settings/categories' => ['SettingController', 'addCategory', ['admin']],
    'DELETE /api/settings/categories/{category}' => ['SettingController', 'removeCategory', ['admin']],

    // ---- Productos ----
    'GET /api/products' => ['ProductController', 'index', []],
    'GET /api/products/{id}' => ['ProductController', 'show', []],
    'POST /api/products' => ['ProductController', 'store', ['admin']],
    'PUT /api/products/{id}' => ['ProductController', 'update', ['admin']],
    'DELETE /api/products/{id}' => ['ProductController', 'destroy', ['admin']],

    // ---- Ingredientes (catalogo de personalizacion) ----
    'GET /api/ingredients' => ['IngredientController', 'index', []],
    'POST /api/ingredients' => ['IngredientController', 'store', ['admin']],
    'PUT /api/ingredients/{id}' => ['IngredientController', 'update', ['admin']],
    'DELETE /api/ingredients/{id}' => ['IngredientController', 'destroy', ['admin']],

    // ---- Inventario ----
    'GET /api/inventory' => ['InventoryController', 'index', ['admin', 'kitchen']],
    'POST /api/inventory' => ['InventoryController', 'store', ['admin']],
    'PUT /api/inventory/{id}' => ['InventoryController', 'update', ['admin']],
    'DELETE /api/inventory/{id}' => ['InventoryController', 'destroy', ['admin']],
    'PATCH /api/inventory/{id}/stock' => ['InventoryController', 'adjustStock', ['admin']],
    'GET /api/inventory-logs' => ['InventoryController', 'logs', ['admin', 'kitchen']],

    // ---- Clientes ----
    'GET /api/clients' => ['ClientController', 'index', ['admin']],
    'GET /api/clients/{id}' => ['ClientController', 'show', $TODOS_LOS_ROLES],
    'PUT /api/clients/{id}' => ['ClientController', 'update', $TODOS_LOS_ROLES],
    'GET /api/clients/{id}/notifications' => ['ClientController', 'notifications', $TODOS_LOS_ROLES],
    'PATCH /api/clients/{id}/notifications/{notifId}/read' => ['ClientController', 'markNotificationRead', $TODOS_LOS_ROLES],

    // ---- Personal ----
    'GET /api/staff' => ['StaffController', 'index', ['admin']],
    'POST /api/staff' => ['StaffController', 'store', ['admin']],
    'PUT /api/staff/{id}' => ['StaffController', 'update', ['admin']],
    'DELETE /api/staff/{id}' => ['StaffController', 'destroy', ['admin']],
    'PATCH /api/staff/{id}/location' => ['StaffController', 'updateLocation', ['delivery']],

    // ---- Pedidos ----
    'GET /api/orders' => ['OrderController', 'index', $TODOS_LOS_ROLES],
    'GET /api/orders/{id}' => ['OrderController', 'show', $TODOS_LOS_ROLES],
    'POST /api/orders' => ['OrderController', 'store', ['client']],
    'PATCH /api/orders/{id}/preparing' => ['OrderController', 'markPreparing', ['admin', 'kitchen']],
    'PATCH /api/orders/{id}/ready' => ['OrderController', 'markReady', ['admin', 'kitchen']],
    'PATCH /api/orders/{id}/accept' => ['OrderController', 'accept', ['delivery']],
    'PATCH /api/orders/{id}/deliver' => ['OrderController', 'deliver', ['delivery']],
    'PATCH /api/orders/{id}/review' => ['OrderController', 'review', ['client']],

    // ---- Cierre de caja / Dashboard ----
    'POST /api/cash-closing' => ['CashClosingController', 'store', ['admin']],
    'GET /api/cash-closing' => ['CashClosingController', 'index', ['admin']],
    'GET /api/cash-closing/{id}' => ['CashClosingController', 'show', ['admin']],
    'GET /api/dashboard' => ['DashboardController', 'summary', ['admin']],

    // ---- Sync (reemplaza onSnapshot de Firestore) ----
    'GET /api/sync' => ['SyncController', 'index', []],

];
