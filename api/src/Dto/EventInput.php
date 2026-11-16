<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

/** Modifier un rendez-vous perso : durée et texte (la date ne change pas). */
final readonly class EventInput
{
    public function __construct(
        #[Assert\Choice(choices: ['full', 'am', 'pm'], message: 'Durée invalide.')]
        public string $slot = 'full',
        #[Assert\Length(max: 80, maxMessage: 'Texte trop long (80 caractères au maximum).')]
        public string $label = '',
    ) {
    }
}
