<?php

namespace App\Repository;

use App\Entity\UndoLog;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<UndoLog> */
class UndoLogRepository extends ServiceEntityRepository
{
    use OwnedRepositoryTrait;

    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, UndoLog::class);
    }

    public function purgeOlderThan(\DateTimeImmutable $limit): void
    {
        $this->createQueryBuilder('u')->delete()->where('u.createdAt < :l')
            ->setParameter('l', $limit, Types::DATETIME_IMMUTABLE)->getQuery()->execute();
    }
}
