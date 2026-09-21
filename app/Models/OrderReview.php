<?php

namespace App\Models;

use App\Core\Model;

class OrderReview extends Model
{
    public static function upsert(string $orderId, int $rating, string $reviewText): void
    {
        $pdo = static::db();
        $stmt = $pdo->prepare(
            'INSERT INTO RESENA (id_resena, id_pedido, puntaje, comentario)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE puntaje = VALUES(puntaje), comentario = VALUES(comentario)'
        );
        $stmt->execute(['', $orderId, $rating, $reviewText]);
    }
}
