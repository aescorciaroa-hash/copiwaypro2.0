<?php

/**
 * CLI para que el rol Programador cree el primer Administrador (y, de paso,
 * a sí mismo si aún no existe). Nunca se hace desde la web ni hay credenciales
 * hardcodeadas en el código — este script es la única puerta de entrada inicial.
 *
 * Uso (desde la raíz del proyecto):
 *   php bin/create-admin.php
 */

declare(strict_types=1);

use App\Core\Database;
use App\Core\Env;

require __DIR__ . '/../vendor/autoload.php';
Env::load(__DIR__ . '/..');

function prompt(string $label, bool $hidden = false): string
{
    echo $label;
    if ($hidden && PHP_OS_FAMILY !== 'Windows') {
        system('stty -echo');
        $value = trim((string) fgets(STDIN));
        system('stty echo');
        echo PHP_EOL;
    } else {
        $value = trim((string) fgets(STDIN));
    }
    return $value;
}

echo "=== CopiwayPRO — Creación del primer Administrador (rol Programador) ===\n\n";

$pdo = Database::connection();

$programadorEmail = prompt('Correo del Programador (quien crea la cuenta): ');
$programadorStmt = $pdo->prepare('SELECT * FROM ADMINISTRADOR WHERE correo = ?');
$programadorStmt->execute([$programadorEmail]);
$programador = $programadorStmt->fetch();

if (!$programador) {
    echo "No existe un Programador con ese correo. Vamos a crearlo primero.\n";
    $nombre = prompt('Nombre del Programador: ');
    $telefono = prompt('Teléfono del Programador: ');
    $password = prompt('Contraseña del Programador (mínimo 8 caracteres): ', true);

    if (strlen($password) < 8) {
        fwrite(STDERR, "La contraseña debe tener al menos 8 caracteres.\n");
        exit(1);
    }

    $stmt = $pdo->prepare(
        "INSERT INTO ADMINISTRADOR (id_admin, nombre, correo, telefono, contrasena, nivel_acceso, creado_por)
         VALUES ('', ?, ?, ?, ?, 'programador', NULL)"
    );
    $stmt->execute([$nombre, $programadorEmail, $telefono, password_hash($password, PASSWORD_BCRYPT)]);

    $programadorStmt->execute([$programadorEmail]);
    $programador = $programadorStmt->fetch();
    echo "Programador creado.\n\n";
}

echo "Ahora, datos del Administrador (rol 'maestro') que usará el panel /admin:\n";
$nombreAdmin = prompt('Nombre del Administrador: ');
$correoAdmin = prompt('Correo del Administrador: ');
$telefonoAdmin = prompt('Teléfono del Administrador: ');
$passwordAdmin = prompt('Contraseña del Administrador (mínimo 8 caracteres): ', true);

if (strlen($passwordAdmin) < 8) {
    fwrite(STDERR, "La contraseña debe tener al menos 8 caracteres.\n");
    exit(1);
}

$checkStmt = $pdo->prepare('SELECT COUNT(*) FROM ADMINISTRADOR WHERE correo = ? OR telefono = ?');
$checkStmt->execute([$correoAdmin, $telefonoAdmin]);
if ((int) $checkStmt->fetchColumn() > 0) {
    fwrite(STDERR, "Ya existe un administrador con ese correo o teléfono.\n");
    exit(1);
}

$stmt = $pdo->prepare(
    "INSERT INTO ADMINISTRADOR (id_admin, nombre, correo, telefono, contrasena, nivel_acceso, creado_por)
     VALUES ('', ?, ?, ?, ?, 'maestro', ?)"
);
$stmt->execute([$nombreAdmin, $correoAdmin, $telefonoAdmin, password_hash($passwordAdmin, PASSWORD_BCRYPT), $programador['id_admin']]);

echo "\nAdministrador '{$nombreAdmin}' creado correctamente. Ya puede iniciar sesión en /login.\n";
