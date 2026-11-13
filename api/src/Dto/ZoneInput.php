<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class ZoneInput
{
    public function __construct(
        #[Assert\Choice(choices: ['A', 'B', 'C', 'none'], message: 'Zone invalide.')]
        public string $zone = 'A',
    ) {
    }
}
