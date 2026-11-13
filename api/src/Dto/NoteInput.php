<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class NoteInput
{
    public function __construct(
        #[Assert\NotBlank(message: "Écrivez d'abord le pense-bête.", normalizer: 'trim')]
        #[Assert\Length(max: 500, maxMessage: 'Pense-bête trop long (500 caractères au maximum).')]
        public string $text = '',
        #[Assert\Choice(choices: ['day', 'cabinet', 'nurse'], message: 'Rattachement invalide.')]
        public string $scope = 'day',
        #[Assert\Date(message: 'Date invalide.')]
        public ?string $date = null,
        #[Assert\Uuid(message: 'Cabinet inconnu.')]
        public ?string $cabinetId = null,
        #[Assert\Uuid(message: 'Infirmière inconnue.')]
        public ?string $nurseId = null,
    ) {
    }
}
