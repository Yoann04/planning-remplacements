<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

/** Repos voulu sur une ou plusieurs dates. toggle = retirer le repos si toutes les dates l'ont déjà. */
final readonly class RestsInput
{
    /** @param list<string> $dates */
    public function __construct(
        #[Assert\Count(min: 1, max: 400, minMessage: 'Choisissez au moins un jour.', maxMessage: 'Trop de jours d\'un coup (400 au maximum).')]
        #[Assert\All([new Assert\Date(message: 'Date invalide.')])]
        public array $dates = [],
        #[Assert\Choice(choices: ['full', 'am', 'pm'], message: 'Durée invalide.')]
        public string $slot = 'full',
        public bool $toggle = false,
    ) {
    }
}
