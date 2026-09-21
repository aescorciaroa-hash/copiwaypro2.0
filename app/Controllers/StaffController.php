<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Controller;
use App\Core\Request;
use App\Core\Validator;
use App\Models\Staff;

class StaffController extends Controller
{
    public function index(Request $request): void
    {
        $this->json(Staff::all());
    }

    public function store(Request $request): void
    {
        $data = $request->all();

        $validator = Validator::make($data)
            ->required('name')
            ->required('email')->email('email')
            ->required('password')->minLength('password', 8)
            ->required('role')->in('role', ['Ayudante de cocina', 'Domiciliario']);

        if ($validator->fails()) {
            $this->validationError($validator->errors());
        }

        try {
            $id = Staff::create($data, Auth::id());
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), 422);
        }

        $all = Staff::all();
        $created = array_values(array_filter($all, fn($s) => $s['id'] === $id));
        $this->json($created[0] ?? ['id' => $id], 201);
    }

    public function update(Request $request, string $id): void
    {
        $table = Staff::update($id, $request->all());
        if ($table === null) {
            $this->error('Miembro de staff no encontrado.', 404);
        }

        $all = Staff::all();
        $updated = array_values(array_filter($all, fn($s) => $s['id'] === $id));
        $this->json($updated[0] ?? ['id' => $id]);
    }

    public function destroy(Request $request, string $id): void
    {
        $table = Staff::softDelete($id);
        if ($table === null) {
            $this->error('Miembro de staff no encontrado.', 404);
        }

        $this->json(['ok' => true]);
    }

    public function updateLocation(Request $request, string $id): void
    {
        if (!Auth::check() || Auth::role() !== 'delivery' || Auth::id() !== $id) {
            $this->error('No autorizado para este recurso.', 403);
        }

        $validator = Validator::make($request->all())
            ->required('lat')->numeric('lat')
            ->required('lng')->numeric('lng');

        if ($validator->fails()) {
            $this->validationError($validator->errors());
        }

        $lat = (float) $request->input('lat');
        $lng = (float) $request->input('lng');

        $ok = Staff::updateLocation($id, $lat, $lng);
        if (!$ok) {
            $this->error('Domiciliario no encontrado.', 404);
        }

        $this->json(['ok' => true]);
    }
}
