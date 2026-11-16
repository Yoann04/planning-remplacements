<?php

namespace App\Entity;

use App\Enum\Slot;
use App\Repository\PersonalEventRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Rendez-vous perso (journée, matin ou après-midi), saisi par l'utilisatrice. Simple information :
 * plusieurs par jour possibles, jamais bloquant pour le travail ni compté dans les compteurs.
 * Rappel affiché dans l'interface : pas de détail médical dans le texte.
 */
#[ORM\Entity(repositoryClass: PersonalEventRepository::class)]
#[ORM\Index(name: 'idx_personal_event_owner_date', columns: ['owner_id', 'date'])]
class PersonalEvent
{
    public const DEFAULT_LABEL = 'RDV perso';

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

    #[ORM\Column(length: 80)]
    private string $label;

    public function __construct(User $owner, \DateTimeImmutable $date, Slot $slot, string $label, ?Uuid $id = null)
    {
        $this->id = $id ?? Uuid::v7();
        $this->owner = $owner;
        $this->date = $date;
        $this->update($slot, $label);
    }

    /** Texte vide → « RDV perso ». */
    public function update(Slot $slot, string $label): void
    {
        $this->slot = $slot;
        $this->label = trim($label) ?: self::DEFAULT_LABEL;
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    /** @return array{id: string, date: string, slot: string, label: string} */
    public function toArray(): array
    {
        return ['id' => $this->id->toRfc4122(), 'date' => $this->date->format('Y-m-d'), 'slot' => $this->slot->value, 'label' => $this->label];
    }
}
