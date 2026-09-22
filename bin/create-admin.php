<?php

/**
 * CLI para que el rol Programador cree el primer Administrador (y, de paso,
 * a si mismo si aun no existe). Nunca se hace desde la web ni hay credenciales
 * hardcodeadas en el codigo — este script es la unica puerta de entrada inicial.
 *
 * Uso (desde la raiz del proyecto):
 *   php bin/create-admin.php
 */

require __DIR__ . '/../config/database.php';
require __DIR__ . '/../app/Core/helpers.php';
require __DIR__ . '/../app/Models/Usuario.php';

function prompt($etiqueta, $oculto = false) {
    echo $etiqueta;
    if ($oculto && PHP_OS_FAMILY !== 'Windows') {
        system('stty -echo');
        $valor = trim((string) fgets(STDIN));
        system('stty echo');
        echo PHP_EOL;
    } else {
        $valor = trim((string) fgets(STDIN));
    }
    return $valor;
}

echo "=== CopiwayPRO — Creación del primer Administrador (rol Programador) ===\n\n";

$usuarioModelo = new Usuario($conn);

$correoProgramador = prompt('Correo del Programador (quien crea la cuenta): ');
$programador = $usuarioModelo->buscarPorCorreo($correoProgramador);

if (!$programador) {
    echo "No existe un Programador con ese correo. Vamos a crearlo primero.\n";
    $nombre = prompt('Nombre del Programador: ');
    $telefono = prompt('Teléfono del Programador: ');
    $password = prompt('Contraseña del Programador (mínimo 8 caracteres): ', true);

    if (strlen($password) < 8) {
        fwrite(STDERR, "La contraseña debe tener al menos 8 caracteres.\n");
        exit(1);
    }

    if (correoUsadoEnCualquierTabla($conn, $correoProgramador)) {
        fwrite(STDERR, "Ya existe una cuenta con ese correo.\n");
        exit(1);
    }

    $programador = $usuarioModelo->crear([
        'nombre' => $nombre,
        'correo' => $correoProgramador,
        'telefono' => $telefono,
        'password' => $password,
        'nivel_acceso' => 'programador',
        'creado_por' => null,
    ]);
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

if ($usuarioModelo->esUsado($correoAdmin, $telefonoAdmin) || correoUsadoEnCualquierTabla($conn, $correoAdmin)) {
    fwrite(STDERR, "Ya existe una cuenta con ese correo o teléfono.\n");
    exit(1);
}

$usuarioModelo->crear([
    'nombre' => $nombreAdmin,
    'correo' => $correoAdmin,
    'telefono' => $telefonoAdmin,
    'password' => $passwordAdmin,
    'nivel_acceso' => 'maestro',
    'creado_por' => $programador['id_admin'],
]);

echo "\nAdministrador '{$nombreAdmin}' creado correctamente. Ya puede iniciar sesión en /login.\n";
