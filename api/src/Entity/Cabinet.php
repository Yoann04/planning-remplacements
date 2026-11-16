<?php

namespace App\Entity;

use App\Repository\CabinetRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Symfony\Component\Uid\Uuid;

/**
 * Cabinet infirmier où l'utilisatrice fait des remplacements. Nom, initiales et couleur sont libres.
 * Un cabinet « en veille » (remplacement terminé) garde ses jours et ses compteurs, mais ne reçoit plus de nouveaux jours.
 */
#[ORM\Entity(repositoryClass: CabinetRepository::class)]
class Cabinet
{
    #[ORM\Id]
    #[ORM\Column(type: UuidType::NAME, unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private User $owner;

    #[ORM\Column(length: 80)]
    private string $name;

    #[ORM\Column(length: 3)]
    private string $code;

    #[ORM\Column(length: 7)]
    private string $color;

    #[ORM\Column(options: ['default' => true])]
    private bool $active = true;

    public function __construct(User $owner, string $name, string $code, string $color, ?Uuid $id = null)
    {
        $this->id = $id ?? Uuid::v7();
        $this->owner = $owner;
        $this->update($name, $code, $color);
    }

    public function update(string $name, string $code, string $color): void
    {
        $this->name = trim($name);
        $this->code = mb_strtoupper(trim($code));
        $this->color = mb_strtoupper($color);
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getOwner(): User
    {
        return $this->owner;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getCode(): string
    {
        return $this->code;
    }

    public function getColor(): string
    {
        return $this->color;
    }

    public function isActive(): bool
    {
        return $this->active;
    }

    public function setActive(bool $active): void
    {
        $this->active = $active;
    }

    /** @return array{id: string, name: string, code: string, color: string, active: bool} */
    public function toArray(): array
    {
        return ['id' => $this->id->toRfc4122(), 'name' => $this->name, 'code' => $this->code, 'color' => $this->color, 'active' => $this->active];
    }
}
