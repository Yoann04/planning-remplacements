<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

/** Cabinet avec ses infirmières et ses pense-bêtes, tels qu'ils sont dans l'écran « Modifier le cabinet ». */
final readonly class CabinetInput
{
    /**
     * @param list<array{id?: ?string, name: string}> $nurses
     * @param list<array{id?: ?string, text: string}> $notes
     */
    public function __construct(
        #[Assert\NotBlank(message: 'Donnez un nom au cabinet.', normalizer: 'trim')]
        #[Assert\Length(max: 80, maxMessage: 'Nom trop long (80 caractères au maximum).')]
        public string $name = '',
        #[Assert\Regex('/^\p{L}{0,3}$/u', message: 'Les initiales doivent faire 1 à 3 lettres.')]
        public ?string $code = null,
        #[Assert\Regex('/^#[0-9A-Fa-f]{6}$/', message: 'Couleur invalide.')]
        public string $color = '#3B82F6',
        #[Assert\Count(max: 50)]
        #[Assert\All([new Assert\Collection(fields: [
            'id' => new Assert\Optional([new Assert\Uuid()]),
            'name' => [new Assert\NotBlank(message: "Donnez un nom à l'infirmière.", normalizer: 'trim'), new Assert\Length(max: 80)],
        ])])]
        public array $nurses = [],
        #[Assert\Count(max: 50)]
        #[Assert\All([new Assert\Collection(fields: [
            'id' => new Assert\Optional([new Assert\Uuid()]),
            'text' => [new Assert\NotBlank(normalizer: 'trim'), new Assert\Length(max: 500)],
        ])])]
        public array $notes = [],
    ) {
    }

    public function toArray(): array
    {
        return ['name' => $this->name, 'code' => $this->code, 'color' => $this->color, 'nurses' => $this->nurses, 'notes' => $this->notes];
    }
}
