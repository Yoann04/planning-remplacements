<?php

namespace App\Repository;

use App\Entity\Cabinet;
use App\Entity\Note;
use App\Entity\Nurse;
use App\Entity\User;
use App\Enum\NoteScope;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<Note> */
class NoteRepository extends ServiceEntityRepository
{
    use OwnedRepositoryTrait;

    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Note::class);
    }

    /** @return list<Note> */
    public function findAllFor(User $owner): array
    {
        return $this->findBy(['owner' => $owner], ['createdAt' => 'ASC']);
    }

    /** @return list<Note> */
    public function findForCabinet(Cabinet $cabinet): array
    {
        return $this->findBy(['cabinet' => $cabinet, 'scope' => NoteScope::Cabinet], ['createdAt' => 'ASC']);
    }

    /** @return list<Note> */
    public function findForNurse(Nurse $nurse): array
    {
        return $this->findBy(['nurse' => $nurse], ['createdAt' => 'ASC']);
    }
}
