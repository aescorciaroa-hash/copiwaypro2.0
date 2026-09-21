<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Controller;
use App\Core\Request;
use App\Core\Validator;
use App\Models\Product;

class ProductController extends Controller
{
    public function index(Request $request): void
    {
        $isAdmin = Auth::check() && Auth::role() === 'admin';
        $this->json(Product::all(!$isAdmin));
    }

    public function show(Request $request, string $id): void
    {
        $product = Product::find($id);
        if (!$product) {
            $this->error('Producto no encontrado.', 404);
        }
        $this->json($product);
    }

    public function store(Request $request): void
    {
        $data = $request->all();

        $validator = Validator::make($data)
            ->required('name')
            ->required('price')->numeric('price')
            ->required('category');

        if ($validator->fails()) {
            $this->validationError($validator->errors());
        }

        try {
            $id = Product::create($data);
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), 422);
        }

        $this->json(Product::find($id), 201);
    }

    public function update(Request $request, string $id): void
    {
        if (!Product::find($id)) {
            $this->error('Producto no encontrado.', 404);
        }

        $data = $request->all();

        if (array_key_exists('price', $data)) {
            $validator = Validator::make($data)->numeric('price');
            if ($validator->fails()) {
                $this->validationError($validator->errors());
            }
        }

        try {
            Product::update($id, $data);
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), 422);
        }

        $this->json(Product::find($id));
    }

    public function destroy(Request $request, string $id): void
    {
        if (!Product::find($id)) {
            $this->error('Producto no encontrado.', 404);
        }

        Product::delete($id);
        $this->json(['ok' => true]);
    }
}
