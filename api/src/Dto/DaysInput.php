<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

/** Ajout d'un cabinet sur une ou plusieurs dates. */
final readonly class DaysInput
{
    /** @param list<string> $dates */
    public function __construct(
        #[Assert\Count(min: 1, max: 400, minMessage: 'Choisissez au moins un jour.', maxMessage: 'Trop de jours d\'un coup (400 au maximum).')]
        #[Assert\All([new Assert\Date(message: 'Date invalide.')])]
        public array $dates = [],
        #[Assert\NotBlank(message: "Choisissez d'abord un cabinet.")]
        #[Assert\Uuid(message: 'Cabinet inconnu.')]
        public string $cabinetId = '',
        #[Assert\Uuid(message: 'Infirmière inconnue.')]
        public ?string $nurseId = null,
        #[Assert\Choice(choices: ['full', 'am', 'pm'], message: 'Durée invalide.')]
        public string $slot = 'full',
    ) {
    }
}
