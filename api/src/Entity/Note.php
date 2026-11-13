<?php

namespace App\Entity;

use App\Enum\NoteScope;
use App\Repository\NoteRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Pense-bête en texte libre, rattaché à un jour, à un cabinet ou à une infirmière.
 * Rappel affiché dans l'interface : ni nom de patient ni information de santé.
 */
#[ORM\Entity(repositoryClass: NoteRepository::class)]
class Note
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $owner;

    #[ORM\Column(length: 10, enumType: NoteScope::class)]
    private NoteScope $scope;

    #[ORM\Column(type: Types::DATE_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $date = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?Cabinet $cabinet = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?Nurse $nurse = null;

    #[ORM\Column(length: 500)]
    private string $text;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    private function __construct(User $owner, NoteScope $scope, string $text, ?Uuid $id)
    {
        $this->id = $id ?? Uuid::v7();
        $this->owner = $owner;
        $this->scope = $scope;
        $this->setText($text);
        $this->createdAt = new \DateTimeImmutable();
    }

    public static function forDay(User $owner, \DateTimeImmutable $date, string $text, ?Uuid $id = null): self
    {
        $n = new self($owner, NoteScope::Day, $text, $id);
        $n->date = $date;

        return $n;
    }

    public static function forCabinet(Cabinet $cabinet, string $text, ?Uuid $id = null): self
    {
        $n = new self($cabinet->getOwner(), NoteScope::Cabinet, $text, $id);
        $n->cabinet = $cabinet;

        return $n;
    }

    public static function forNurse(Nurse $nurse, string $text, ?Uuid $id = null): self
    {
        $n = new self($nurse->getCabinet()->getOwner(), NoteScope::Nurse, $text, $id);
        $n->nurse = $nurse;

        return $n;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getScope(): NoteScope
    {
        return $this->scope;
    }

    public function getCabinet(): ?Cabinet
    {
        return $this->cabinet;
    }

    public function getText(): string
    {
        return $this->text;
    }

    public function setText(string $text): void
    {
        $this->text = trim($text);
    }

    /** @return array{id: string, scope: string, date: ?string, cabinetId: ?string, nurseId: ?string, text: string} */
    public function toArray(): array
    {
        return [
            'id' => $this->id->toRfc4122(),
            'scope' => $this->scope->value,
            'date' => $this->date?->format('Y-m-d'),
            'cabinetId' => $this->cabinet?->getId()->toRfc4122(),
            'nurseId' => $this->nurse?->getId()->toRfc4122(),
            'text' => $this->text,
        ];
    }
}
