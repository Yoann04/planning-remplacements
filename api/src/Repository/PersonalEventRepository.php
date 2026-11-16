<?php

namespace App\Repository;

use App\Entity\PersonalEvent;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<PersonalEvent> */
class PersonalEventRepository extends ServiceEntityRepository
{
    use OwnedRepositoryTrait;

    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, PersonalEvent::class);
    }

    /** @return list<PersonalEvent> */
    public function findAllFor(User $owner): array
    {
        return $this->findBy(['owner' => $owner], ['date' => 'ASC', 'id' => 'ASC']);
    }
}
