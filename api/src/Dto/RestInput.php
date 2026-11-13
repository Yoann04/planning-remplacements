<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class RestInput
{
    public function __construct(
        #[Assert\Choice(choices: ['full', 'am', 'pm'], message: 'Durée invalide.')]
        public string $slot = 'full',
    ) {
    }
}
