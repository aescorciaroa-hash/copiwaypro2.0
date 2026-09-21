<?php

namespace App\Core;

use PDO;

/**
 * Autenticación unificada para los 4 roles que inician sesión desde la SPA
 * (admin, kitchen, delivery, client). El rol "Programador" no tiene dashboard
 * propio: solo existe para crear al primer Administrador vía CLI (bin/create-admin.php).
 */
class Auth
{
    private const TABLES = [
        'admin' => ['table' => 'ADMINISTRADOR', 'pk' => 'id_admin', 'active' => 'activo'],
        'kitchen' => ['table' => 'AYUDANTE_COCINA', 'pk' => 'id_ayudante', 'active' => 'activo'],
        'delivery' => ['table' => 'DOMICILIARIO', 'pk' => 'id_domiciliario', 'active' => 'activo'],
        'client' => ['table' => 'CLIENTE', 'pk' => 'id_cliente', 'active' => 'activo'],
    ];

    public static function attempt(string $correo, string $password): ?array
    {
        $pdo = Database::connection();

        foreach (self::TABLES as $role => $meta) {
            $stmt = $pdo->prepare("SELECT * FROM {$meta['table']} WHERE correo = ? LIMIT 1");
            $stmt->execute([$correo]);
            $row = $stmt->fetch();

            if (!$row) {
                continue;
            }

            if (!password_verify($password, $row['contrasena'])) {
                return null;
            }

            if (!$row[$meta['active']]) {
                return null;
            }

            return self::login($role, $row);
        }

        return null;
    }

    public static function login(string $role, array $row): array
    {
        $meta = self::TABLES[$role];
        Session::regenerate();
        Session::put('auth_role', $role);
        Session::put('auth_id', $row[$meta['pk']]);
        return [
            'id' => $row[$meta['pk']],
            'role' => $role,
            'name' => $row['nombre'],
            'email' => $row['correo'],
        ];
    }

    public static function check(): bool
    {
        return Session::has('auth_role') && Session::has('auth_id');
    }

    public static function role(): ?string
    {
        return Session::get('auth_role');
    }

    public static function id(): ?string
    {
        return Session::get('auth_id');
    }

    public static function isAdminMaestro(): bool
    {
        if (self::role() !== 'admin') {
            return false;
        }
        $pdo = Database::connection();
        $stmt = $pdo->prepare('SELECT nivel_acceso FROM ADMINISTRADOR WHERE id_admin = ?');
        $stmt->execute([self::id()]);
        return $stmt->fetchColumn() !== false;
    }

    public static function user(): ?array
    {
        if (!self::check()) {
            return null;
        }
        $meta = self::TABLES[self::role()];
        $pdo = Database::connection();
        $stmt = $pdo->prepare("SELECT * FROM {$meta['table']} WHERE {$meta['pk']} = ? LIMIT 1");
        $stmt->execute([self::id()]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }
        unset($row['contrasena']);
        $row['role'] = self::role();
        return $row;
    }

    public static function logout(): void
    {
        Session::forget('auth_role');
        Session::forget('auth_id');
        Session::destroy();
    }
}
