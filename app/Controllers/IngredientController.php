<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Controller;
use App\Core\Request;
use App\Core\Validator;
use App\Models\Ingredient;

class IngredientController extends Controller
{
    public function index(Request $request): void
    {
        $this->json(Ingredient::allAsIngredients());
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
        $ingredient = Ingredient::find($id);
        $this->json(Ingredient::toIngredient($ingredient), 201);
    }

    public function update(Request $request, string $id): void
    {
        if (!Ingredient::find($id)) {
            $this->error('Ingrediente no encontrado.', 404);
        }

        Ingredient::update($id, $request->all());
        $this->json(Ingredient::toIngredient(Ingredient::find($id)));
    }

    public function destroy(Request $request, string $id): void
    {
        if (!Ingredient::find($id)) {
            $this->error('Ingrediente no encontrado.', 404);
        }

        Ingredient::delete($id);
        $this->json(['ok' => true]);
    }
}
