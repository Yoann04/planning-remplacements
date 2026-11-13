<?php

namespace App\Entity;

use App\Repository\NurseRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/** Infirmière remplacée, rattachée à un cabinet. Seul son nom (libre) est enregistré. */
#[ORM\Entity(repositoryClass: NurseRepository::class)]
class Nurse
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $owner;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Cabinet $cabinet;

    #[ORM\Column(length: 80)]
    private string $name;

    public function __construct(Cabinet $cabinet, string $name, ?Uuid $id = null)
    {
        $this->id = $id ?? Uuid::v7();
        $this->owner = $cabinet->getOwner();
        $this->cabinet = $cabinet;
        $this->rename($name);
    }

    public function rename(string $name): void
    {
        $this->name = trim($name);
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getCabinet(): Cabinet
    {
        return $this->cabinet;
    }

    public function getName(): string
    {
        return $this->name;
    }

    /** @return array{id: string, cabinetId: string, name: string} */
    public function toArray(): array
    {
        return ['id' => $this->id->toRfc4122(), 'cabinetId' => $this->cabinet->getId()->toRfc4122(), 'name' => $this->name];
    }
}
