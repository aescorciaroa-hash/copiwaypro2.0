<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Controller;
use App\Core\Request;
use App\Core\Validator;
use App\Models\Ingredient;

class InventoryController extends Controller
{
    public function index(Request $request): void
    {
        $this->json(Ingredient::allAsInventory());
    }

    public function store(Request $request): void
    {
        $data = $request->all();

        $validator = Validator::make($data)
            ->required('name')
            ->required('category');

        if ($validator->fails()) {
            $this->validationError($validator->errors());
        }

        $id = Ingredient::createWithInitialStock($data, Auth::id());
        $this->json(Ingredient::toInventoryItem(Ingredient::find($id)), 201);
    }

    public function update(Request $request, string $id): void
    {
        if (!Ingredient::find($id)) {
            $this->error('Insumo no encontrado.', 404);
        }

        Ingredient::update($id, $request->all());
        $this->json(Ingredient::toInventoryItem(Ingredient::find($id)));
    }

    public function destroy(Request $request, string $id): void
    {
        if (!Ingredient::find($id)) {
            $this->error('Insumo no encontrado.', 404);
        }

        Ingredient::delete($id);
        $this->json(['ok' => true]);
    }

    public function adjustStock(Request $request, string $id): void
    {
        if (!Ingredient::find($id)) {
            $this->error('Insumo no encontrado.', 404);
        }

        $validator = Validator::make($request->all())
            ->required('amount')->numeric('amount');

        if ($validator->fails()) {
            $this->validationError($validator->errors());
        }

        $amount = (float) $request->input('amount');

        try {
            Ingredient::adjustStock($id, $amount, Auth::id());
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), 422);
        }

        $this->json(Ingredient::toInventoryItem(Ingredient::find($id)));
    }

    public function logs(Request $request): void
    {
        $this->json(Ingredient::inventoryLogs());
    }
}
