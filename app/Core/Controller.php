<?php

namespace App\Core;

abstract class Controller
{
    protected function json(mixed $data, int $status = 200): never
    {
        Response::json($data, $status);
    }

    protected function error(string $message, int $status = 400, array $extra = []): never
    {
        Response::error($message, $status, $extra);
    }

    protected function validationError(array $errors): never
    {
        Response::error('Datos inválidos.', 422, ['errors' => $errors]);
    }
}
