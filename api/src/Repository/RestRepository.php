<?php

namespace App\Repository;

use App\Entity\Rest;
use App\Entity\User;
use Doctrine\DBAL\Types\Types;
use Symfony\Bridge\Doctrine\Types\UuidType;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<Rest> */
class RestRepository extends ServiceEntityRepository
{
    use OwnedRepositoryTrait;

    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Rest::class);
    }

    /** @return list<Rest> */
    public function findAllFor(User $owner): array
    {
        return $this->findBy(['owner' => $owner], ['date' => 'ASC']);
    }

    public function findOnDate(User $owner, \DateTimeImmutable $date): ?Rest
    {
        return $this->findOneBy(['owner' => $owner, 'date' => $date]);
    }

    /** @return list<Rest> */
    public function findBetween(User $owner, \DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        return $this->createQueryBuilder('x')
            ->andWhere('x.owner = :o')->setParameter('o', $owner->getId(), UuidType::NAME)
            ->andWhere('x.date BETWEEN :f AND :t')
            ->setParameter('f', $from, Types::DATE_IMMUTABLE)->setParameter('t', $to, Types::DATE_IMMUTABLE)
            ->orderBy('x.date')->getQuery()->getResult();
    }
}
