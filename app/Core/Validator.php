<?php

namespace App\Core;

class Validator
{
    private array $errors = [];

    public function __construct(private array $data)
    {
    }

    public static function make(array $data): self
    {
        return new self($data);
    }

    public function required(string $field): self
    {
        $value = $this->data[$field] ?? null;
        if ($value === null || $value === '') {
            $this->errors[$field][] = "El campo {$field} es obligatorio.";
        }
        return $this;
    }

    public function email(string $field): self
    {
        $value = $this->data[$field] ?? null;
        if ($value !== null && $value !== '' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field][] = "El campo {$field} debe ser un correo válido.";
        }
        return $this;
    }

    public function minLength(string $field, int $min): self
    {
        $value = $this->data[$field] ?? '';
        if (mb_strlen((string) $value) < $min) {
            $this->errors[$field][] = "El campo {$field} debe tener al menos {$min} caracteres.";
        }
        return $this;
    }

    public function numeric(string $field): self
    {
        $value = $this->data[$field] ?? null;
        if ($value !== null && !is_numeric($value)) {
            $this->errors[$field][] = "El campo {$field} debe ser numérico.";
        }
        return $this;
    }

    public function in(string $field, array $allowed): self
    {
        $value = $this->data[$field] ?? null;
        if ($value !== null && !in_array($value, $allowed, true)) {
            $this->errors[$field][] = "El campo {$field} tiene un valor no permitido.";
        }
        return $this;
    }

    public function fails(): bool
    {
        return !empty($this->errors);
    }

    public function errors(): array
    {
        return $this->errors;
    }
}
