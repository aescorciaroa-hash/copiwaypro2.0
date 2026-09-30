<?php
// Sube archivos de imagen (fotos de producto) al servidor. Antes el frontend
// convertia la foto a base64 y la guardaba directo en PRODUCTO.imagen
// (VARCHAR(255)) -- cualquier foto real supera por mucho ese limite y el
// INSERT/UPDATE fallaba con "Data too long for column 'imagen'". La imagen
// ahora se guarda como archivo en public/uploads/productos/ y solo se
// persiste la URL (corta) en la base de datos.

class UploadController {

    private const EXTENSIONES_PERMITIDAS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    private const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB

    public function productImage() {
        if (empty($_FILES['image']) || !isset($_FILES['image']['tmp_name']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            responderError('No se recibió ninguna imagen válida.', 422, ['image' => ['El campo image es obligatorio.']]);
        }

        $archivo = $_FILES['image'];

        if ($archivo['size'] > self::TAMANO_MAXIMO_BYTES) {
            responderError('La imagen supera el tamaño máximo permitido (5 MB).', 422, ['image' => ['La imagen es demasiado grande.']]);
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $archivo['tmp_name']);
        finfo_close($finfo);

        $mimeAExtension = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
        ];

        if (!isset($mimeAExtension[$mime])) {
            responderError('Formato de imagen no soportado. Usa JPG, PNG, WEBP o GIF.', 422, ['image' => ['Formato no soportado.']]);
        }

        $extension = $mimeAExtension[$mime];
        $nombreArchivo = bin2hex(random_bytes(16)) . '.' . $extension;

        $directorio = dirname(__DIR__, 2) . '/public/uploads/productos';
        if (!is_dir($directorio)) {
            mkdir($directorio, 0755, true);
        }

        $rutaDestino = $directorio . '/' . $nombreArchivo;
        if (!move_uploaded_file($archivo['tmp_name'], $rutaDestino)) {
            responderError('No se pudo guardar la imagen en el servidor.', 500);
        }

        responderJson(['url' => rutaBase() . '/uploads/productos/' . $nombreArchivo], 201);
    }
}
