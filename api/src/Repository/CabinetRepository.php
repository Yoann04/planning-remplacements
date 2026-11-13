<?php

namespace App\Repository;

use App\Entity\Cabinet;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<Cabinet> */
class CabinetRepository extends ServiceEntityRepository
{
    use OwnedRepositoryTrait;

    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Cabinet::class);
    }

    /** @return list<Cabinet> */
    public function findAllFor(User $owner): array
    {
        return $this->findBy(['owner' => $owner], ['name' => 'ASC']);
    }
}
