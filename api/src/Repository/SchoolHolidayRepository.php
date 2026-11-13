<?php

namespace App\Repository;

use App\Entity\SchoolHoliday;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<SchoolHoliday> */
class SchoolHolidayRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, SchoolHoliday::class);
    }

    /** @return list<SchoolHoliday> */
    public function findAllOrdered(): array
    {
        return $this->findBy([], ['startDate' => 'ASC']);
    }

    public function deleteAll(): void
    {
        $this->createQueryBuilder('h')->delete()->getQuery()->execute();
    }
}
