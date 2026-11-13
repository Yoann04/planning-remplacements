<?php

namespace App\Entity;

use App\Enum\Slot;
use App\Repository\RestRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/** « Repos voulu » : jour ou demi-journée où l'utilisatrice ne souhaite pas travailler. Un seul par jour. */
#[ORM\Entity(repositoryClass: RestRepository::class)]
#[ORM\UniqueConstraint(name: 'uniq_rest_owner_date', columns: ['owner_id', 'date'])]
class Rest
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $owner;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $date;

    #[ORM\Column(length: 4, enumType: Slot::class)]
    private Slot $slot;

    public function __construct(User $owner, \DateTimeImmutable $date, Slot $slot, ?Uuid $id = null)
    {
        $this->id = $id ?? Uuid::v7();
        $this->owner = $owner;
        $this->date = $date;
        $this->slot = $slot;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getDate(): \DateTimeImmutable
    {
        return $this->date;
    }

    public function getSlot(): Slot
    {
        return $this->slot;
    }

    public function setSlot(Slot $slot): void
    {
        $this->slot = $slot;
    }

    /** @return array{id: string, date: string, slot: string} */
    public function toArray(): array
    {
        return ['id' => $this->id->toRfc4122(), 'date' => $this->date->format('Y-m-d'), 'slot' => $this->slot->value];
    }
}
