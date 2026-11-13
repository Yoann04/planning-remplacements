<?php

namespace App\Entity;

use App\Repository\SchoolHolidayRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Période de vacances scolaires. Données publiques communes à tous les utilisateurs,
 * importées depuis data/vacances-scolaires.json (commande app:holidays:import, une fois par an).
 * zone = A, B, C ou ALL (période commune aux trois zones).
 */
#[ORM\Entity(repositoryClass: SchoolHolidayRepository::class)]
class SchoolHoliday
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    public function __construct(
        #[ORM\Column(length: 3)]
        private string $zone,
        #[ORM\Column(length: 60)]
        private string $name,
        #[ORM\Column(type: Types::DATE_IMMUTABLE)]
        private \DateTimeImmutable $startDate,
        #[ORM\Column(type: Types::DATE_IMMUTABLE)]
        private \DateTimeImmutable $endDate,
    ) {
    }

    /** @return array{zone: string, name: string, start: string, end: string} */
    public function toArray(): array
    {
        return ['zone' => $this->zone, 'name' => $this->name, 'start' => $this->startDate->format('Y-m-d'), 'end' => $this->endDate->format('Y-m-d')];
    }
}
