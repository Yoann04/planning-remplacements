<?php

namespace App\Entity;

use App\Repository\UndoLogRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Opérations inverses d'une modification, pour le bouton « Annuler » affiché après chaque changement.
 * Exemple : ajouter 3 jours enregistre « supprimer ces 3 jours, remettre le repos retiré ».
 */
#[ORM\Entity(repositoryClass: UndoLogRepository::class)]
class UndoLog
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $owner;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    /**
     * @param list<array<string, mixed>> $operations
     */
    public function __construct(
        User $owner,
        #[ORM\Column(type: Types::JSON)]
        private array $operations,
        \DateTimeImmutable $now,
    ) {
        $this->id = Uuid::v7();
        $this->owner = $owner;
        $this->createdAt = $now;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getOwner(): User
    {
        return $this->owner;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    /** @return list<array<string, mixed>> */
    public function getOperations(): array
    {
        return $this->operations;
    }
}
