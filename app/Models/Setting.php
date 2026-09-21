<?php

namespace App\Models;

use App\Core\Model;

class Setting extends Model
{
    public static function get(): array
    {
        return StoreSettings::get();
    }

    public static function update(array $fields): void
    {
        StoreSettings::update($fields);
    }

    public static function addCategory(string $name): void
    {
        StoreSettings::addCategory($name);
    }

    public static function removeCategory(string $name): void
    {
        StoreSettings::removeCategory($name);
    }

    public static function isStoreOpenNow(): bool
    {
        return StoreSettings::isStoreOpenNow();
    }

    public static function shippingRate(): float
    {
        return StoreSettings::shippingRate();
    }

    public static function globalBagIngredientId(): ?string
    {
        return StoreSettings::globalBagIngredientId();
    }
}
