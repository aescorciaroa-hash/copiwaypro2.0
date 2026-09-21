<?php

use App\Controllers\AuthController;
use App\Controllers\ClientController;
use App\Controllers\IngredientController;
use App\Controllers\InventoryController;
use App\Controllers\OrderController;
use App\Controllers\ProductController;
use App\Controllers\SettingController;
use App\Controllers\StaffController;
use App\Middleware\RateLimitMiddleware;
use App\Middleware\RoleMiddleware;

/** @var \App\Core\Router $router */

// ---- Auth ----
$router->post('/api/auth/login', [AuthController::class, 'login'], [RateLimitMiddleware::class]);
$router->post('/api/auth/logout', [AuthController::class, 'logout']);
$router->get('/api/auth/me', [AuthController::class, 'me']);
$router->post('/api/auth/register', [AuthController::class, 'register']);
$router->post('/api/auth/forgot-password/request', [AuthController::class, 'forgotPasswordRequest']);
$router->post('/api/auth/forgot-password/reset', [AuthController::class, 'forgotPasswordReset']);

// ---- Settings ----
$router->get('/api/settings', [SettingController::class, 'show']);
$router->put('/api/settings', [SettingController::class, 'update'], [[RoleMiddleware::class, 'admin']]);
$router->post('/api/settings/categories', [SettingController::class, 'addCategory'], [[RoleMiddleware::class, 'admin']]);
$router->delete('/api/settings/categories/{category}', [SettingController::class, 'removeCategory'], [[RoleMiddleware::class, 'admin']]);

// ---- Products ----
$router->get('/api/products', [ProductController::class, 'index']);
$router->get('/api/products/{id}', [ProductController::class, 'show']);
$router->post('/api/products', [ProductController::class, 'store'], [[RoleMiddleware::class, 'admin']]);
$router->put('/api/products/{id}', [ProductController::class, 'update'], [[RoleMiddleware::class, 'admin']]);
$router->delete('/api/products/{id}', [ProductController::class, 'destroy'], [[RoleMiddleware::class, 'admin']]);

// ---- Ingredients (catálogo de personalización) ----
$router->get('/api/ingredients', [IngredientController::class, 'index']);
$router->post('/api/ingredients', [IngredientController::class, 'store'], [[RoleMiddleware::class, 'admin']]);
$router->put('/api/ingredients/{id}', [IngredientController::class, 'update'], [[RoleMiddleware::class, 'admin']]);
$router->delete('/api/ingredients/{id}', [IngredientController::class, 'destroy'], [[RoleMiddleware::class, 'admin']]);

// ---- Inventory ----
$router->get('/api/inventory', [InventoryController::class, 'index'], [[RoleMiddleware::class, 'admin', 'kitchen']]);
$router->post('/api/inventory', [InventoryController::class, 'store'], [[RoleMiddleware::class, 'admin']]);
$router->put('/api/inventory/{id}', [InventoryController::class, 'update'], [[RoleMiddleware::class, 'admin']]);
$router->delete('/api/inventory/{id}', [InventoryController::class, 'destroy'], [[RoleMiddleware::class, 'admin']]);
$router->patch('/api/inventory/{id}/stock', [InventoryController::class, 'adjustStock'], [[RoleMiddleware::class, 'admin']]);
$router->get('/api/inventory-logs', [InventoryController::class, 'logs'], [[RoleMiddleware::class, 'admin', 'kitchen']]);

// ---- Clients ----
$router->get('/api/clients', [ClientController::class, 'index'], [[RoleMiddleware::class, 'admin']]);
$router->get('/api/clients/{id}', [ClientController::class, 'show']);
$router->put('/api/clients/{id}', [ClientController::class, 'update']);
$router->get('/api/clients/{id}/notifications', [ClientController::class, 'notifications']);
$router->patch('/api/clients/{id}/notifications/{notifId}/read', [ClientController::class, 'markNotificationRead']);

// ---- Staff ----
$router->get('/api/staff', [StaffController::class, 'index'], [[RoleMiddleware::class, 'admin']]);
$router->post('/api/staff', [StaffController::class, 'store'], [[RoleMiddleware::class, 'admin']]);
$router->put('/api/staff/{id}', [StaffController::class, 'update'], [[RoleMiddleware::class, 'admin']]);
$router->delete('/api/staff/{id}', [StaffController::class, 'destroy'], [[RoleMiddleware::class, 'admin']]);
$router->patch('/api/staff/{id}/location', [StaffController::class, 'updateLocation']);

// ---- Orders ----
$router->get('/api/orders', [OrderController::class, 'index'], [\App\Middleware\AuthMiddleware::class]);
$router->get('/api/orders/{id}', [OrderController::class, 'show'], [\App\Middleware\AuthMiddleware::class]);
$router->post('/api/orders', [OrderController::class, 'store'], [[RoleMiddleware::class, 'client']]);
$router->patch('/api/orders/{id}/preparing', [OrderController::class, 'markPreparing'], [[RoleMiddleware::class, 'admin', 'kitchen']]);
$router->patch('/api/orders/{id}/ready', [OrderController::class, 'markReady'], [[RoleMiddleware::class, 'admin', 'kitchen']]);
$router->patch('/api/orders/{id}/accept', [OrderController::class, 'accept'], [[RoleMiddleware::class, 'delivery']]);
$router->patch('/api/orders/{id}/deliver', [OrderController::class, 'deliver'], [[RoleMiddleware::class, 'delivery']]);
$router->patch('/api/orders/{id}/review', [OrderController::class, 'review'], [[RoleMiddleware::class, 'client']]);

// ---- Cash closing / Dashboard ----
$router->post('/api/cash-closing', [\App\Controllers\CashClosingController::class, 'store'], [[RoleMiddleware::class, 'admin']]);
$router->get('/api/cash-closing', [\App\Controllers\CashClosingController::class, 'index'], [[RoleMiddleware::class, 'admin']]);
$router->get('/api/cash-closing/{id}', [\App\Controllers\CashClosingController::class, 'show'], [[RoleMiddleware::class, 'admin']]);
$router->get('/api/dashboard', [\App\Controllers\DashboardController::class, 'summary'], [[RoleMiddleware::class, 'admin']]);

// ---- Sync (reemplaza onSnapshot de Firestore) ----
$router->get('/api/sync', [\App\Controllers\SyncController::class, 'index']);
