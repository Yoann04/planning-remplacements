<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final readonly class NoteTextInput
{
    public function __construct(
        #[Assert\NotBlank(message: 'Le pense-bête ne peut pas être vide.', normalizer: 'trim')]
        #[Assert\Length(max: 500, maxMessage: 'Pense-bête trop long (500 caractères au maximum).')]
        public string $text = '',
    ) {
    }
}
