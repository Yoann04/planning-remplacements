<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

/** Rendez-vous perso sur une ou plusieurs dates (même durée, même texte). */
final readonly class EventsInput
{
    /** @param list<string> $dates */
    public function __construct(
        #[Assert\Count(min: 1, max: 400, minMessage: 'Choisissez au moins un jour.', maxMessage: 'Trop de jours d\'un coup (400 au maximum).')]
        #[Assert\All([new Assert\Date(message: 'Date invalide.')])]
        public array $dates = [],
        #[Assert\Choice(choices: ['full', 'am', 'pm'], message: 'Durée invalide.')]
        public string $slot = 'full',
        #[Assert\Length(max: 80, maxMessage: 'Texte trop long (80 caractères au maximum).')]
        public string $label = '',
    ) {
    }
}
