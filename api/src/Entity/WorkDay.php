<?php

namespace App\Entity;

use App\Enum\Slot;
use App\Repository\WorkDayRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/** Un jour (ou une demi-journée) de remplacement dans un cabinet. Plusieurs possibles le même jour. */
#[ORM\Entity(repositoryClass: WorkDayRepository::class)]
#[ORM\Index(name: 'idx_workday_owner_date', columns: ['owner_id', 'date'])]
class WorkDay
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $owner;

    #[ORM\Column(type: Types::DATE_IMMUTABLE)]
    private \DateTimeImmutable $date;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Cabinet $cabinet;

    /** Infirmière remplacée ; reste null si elle a été supprimée (le jour reste dans le planning). */
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Nurse $nurse;

    #[ORM\Column(length: 4, enumType: Slot::class)]
    private Slot $slot;

    public function __construct(\DateTimeImmutable $date, Cabinet $cabinet, ?Nurse $nurse, Slot $slot, ?Uuid $id = null)
    {
        $this->id = $id ?? Uuid::v7();
        $this->owner = $cabinet->getOwner();
        $this->date = $date;
        $this->assign($cabinet, $nurse, $slot);
    }

    public function assign(Cabinet $cabinet, ?Nurse $nurse, Slot $slot): void
    {
        $this->cabinet = $cabinet;
        $this->nurse = $nurse;
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

    public function getCabinet(): Cabinet
    {
        return $this->cabinet;
    }

    public function getNurse(): ?Nurse
    {
        return $this->nurse;
    }

    public function getSlot(): Slot
    {
        return $this->slot;
    }

    /** @return array{id: string, date: string, cabinetId: string, nurseId: ?string, slot: string} */
    public function toArray(): array
    {
        return [
            'id' => $this->id->toRfc4122(),
            'date' => $this->date->format('Y-m-d'),
            'cabinetId' => $this->cabinet->getId()->toRfc4122(),
            'nurseId' => $this->nurse?->getId()->toRfc4122(),
            'slot' => $this->slot->value,
        ];
    }
}
