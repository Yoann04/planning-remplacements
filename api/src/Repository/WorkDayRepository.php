<?php

namespace App\Repository;

use App\Entity\Cabinet;
use App\Entity\User;
use App\Entity\WorkDay;
use Doctrine\DBAL\Types\Types;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<WorkDay> */
class WorkDayRepository extends ServiceEntityRepository
{
    use OwnedRepositoryTrait;

    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, WorkDay::class);
    }

    /** @return list<WorkDay> */
    public function findAllFor(User $owner): array
    {
        return $this->findBy(['owner' => $owner], ['date' => 'ASC']);
    }

    /** @return list<WorkDay> */
    public function findOnDate(User $owner, \DateTimeImmutable $date): array
    {
        return $this->findBy(['owner' => $owner, 'date' => $date]);
    }

    /** @return list<WorkDay> */
    public function findBetween(User $owner, \DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        return $this->createQueryBuilder('x')
            ->andWhere('x.owner = :o')->setParameter('o', $owner->getId(), UuidType::NAME)
            ->andWhere('x.date BETWEEN :f AND :t')
            ->setParameter('f', $from, Types::DATE_IMMUTABLE)->setParameter('t', $to, Types::DATE_IMMUTABLE)
            ->orderBy('x.date')->getQuery()->getResult();
    }

    /** @return list<WorkDay> */
    public function findByCabinet(Cabinet $cabinet): array
    {
        return $this->findBy(['cabinet' => $cabinet], ['date' => 'ASC']);
    }
}
