<?php

namespace App\Enum;

/** Période d'une journée : journée entière (1 jour) ou demi-journée (0,5 jour). */
enum Slot: string
{
    case Full = 'full';
    case Morning = 'am';
    case Afternoon = 'pm';

    public function value(): float
    {
        return self::Full === $this ? 1.0 : 0.5;
    }

    /** Deux périodes se chevauchent si l'une est la journée entière ou si elles sont identiques. */
    public function overlaps(self $other): bool
    {
        return self::Full === $this || self::Full === $other || $this === $other;
    }
}
