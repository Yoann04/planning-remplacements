<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class ActiveInput
{
    public function __construct(
        #[Assert\NotNull(message: 'Indiquez si le cabinet est actif.')]
        public ?bool $active = null,
    ) {
    }
}
