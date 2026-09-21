<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Models\Setting;

class SettingController extends Controller
{
    public function show(Request $request): void
    {
        $this->json(Setting::get());
    }

    public function update(Request $request): void
    {
        Setting::update($request->all());
        $this->json(Setting::get());
    }

    public function addCategory(Request $request): void
    {
        $category = trim((string) $request->input('category', ''));
        if ($category === '') {
            $this->validationError(['category' => ['El campo category es obligatorio.']]);
        }

        Setting::addCategory($category);
        $this->json(Setting::get());
    }

    public function removeCategory(Request $request, string $category): void
    {
        try {
            Setting::removeCategory(urldecode($category));
        } catch (\RuntimeException $e) {
            $this->error($e->getMessage(), 409);
        }

        $this->json(Setting::get());
    }
}
