<?php

namespace App\Repository;

use App\Entity\Cabinet;
use App\Entity\Nurse;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<Nurse> */
class NurseRepository extends ServiceEntityRepository
{
    use OwnedRepositoryTrait;

    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Nurse::class);
    }

    /** @return list<Nurse> */
    public function findAllFor(User $owner): array
    {
        return $this->findBy(['owner' => $owner], ['name' => 'ASC']);
    }

    /** @return list<Nurse> */
    public function findByCabinet(Cabinet $cabinet): array
    {
        return $this->findBy(['cabinet' => $cabinet], ['name' => 'ASC']);
    }
}
