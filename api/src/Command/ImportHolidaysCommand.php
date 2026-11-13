<?php

namespace App\Command;

use App\Entity\SchoolHoliday;
use App\Repository\SchoolHolidayRepository;
use App\Service\Dates;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\Argument;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/** Remplace la table des vacances scolaires par le contenu de data/vacances-scolaires.json (mise à jour annuelle). */
#[AsCommand(name: 'app:holidays:import', description: 'Importe les vacances scolaires depuis le fichier JSON')]
final readonly class ImportHolidaysCommand
{
    public function __construct(
        private EntityManagerInterface $em,
        private SchoolHolidayRepository $repo,
        #[Autowire('%kernel.project_dir%/data/vacances-scolaires.json')] private string $defaultFile,
    ) {
    }

    public function __invoke(SymfonyStyle $io, #[Argument('Fichier JSON (par défaut : data/vacances-scolaires.json)')] ?string $file = null): int
    {
        $data = json_decode((string) file_get_contents($file ?? $this->defaultFile), true, flags: \JSON_THROW_ON_ERROR);
        $this->em->wrapInTransaction(function () use ($data): void {
            $this->repo->deleteAll();
            foreach ($data['periods'] as $p) {
                if (!\in_array($p['zone'], ['ALL', 'A', 'B', 'C'], true)) {
                    throw new \InvalidArgumentException('Zone inconnue : '.$p['zone']);
                }
                $this->em->persist(new SchoolHoliday($p['zone'], $p['name'], Dates::parse($p['start']), Dates::parse($p['end'])));
            }
        });
        $io->success(\count($data['periods']).' périodes de vacances importées.');

        return 0;
    }
}
