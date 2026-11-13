<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

/** Modification d'un jour de cabinet. */
final readonly class DayInput
{
    public function __construct(
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
