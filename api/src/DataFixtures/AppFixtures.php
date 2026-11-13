<?php

namespace App\DataFixtures;

use App\Entity\Cabinet;
use App\Entity\Note;
use App\Entity\Nurse;
use App\Entity\Rest;
use App\Entity\User;
use App\Entity\WorkDay;
use App\Enum\Slot;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Données de démonstration (développement et présentation uniquement), reprises du prototype :
 * 4 cabinets fictifs, 6 infirmières fictives, une année 2026 remplie.
 * Compte : demo@planning.test, mot de passe lu dans DEMO_PASSWORD (.env.local, jamais dans git).
 *   php bin/console doctrine:fixtures:load
 */
final class AppFixtures extends Fixture
{
    public function __construct(
        private readonly UserPasswordHasherInterface $hasher,
        #[Autowire('%env(default::DEMO_PASSWORD)%')] private readonly ?string $demoPassword,
    ) {
    }

    public function load(ObjectManager $om): void
    {
        if (!$this->demoPassword) {
            throw new \RuntimeException('Définissez DEMO_PASSWORD dans .env.local avant de charger les données de démonstration.');
        }
        $user = new User('demo@planning.test');
        $user->setPassword($this->hasher->hashPassword($user, $this->demoPassword));
        $om->persist($user);

        $cabs = [];
        foreach ([['TI', 'Les Tilleuls', '#3B82F6'], ['PO', 'Cabinet du Pont', '#F76B15'], ['SR', 'Saint-Roch', '#12A594'], ['AC', 'Les Acacias', '#8E4EC6']] as [$code, $name, $color]) {
            $om->persist($cabs[$code] = new Cabinet($user, $name, $code, $color));
        }
        $n = [];
        foreach ([['n1', 'Hélène A.', 'TI'], ['n2', 'Isabelle R.', 'TI'], ['n3', 'Camille P.', 'PO'], ['n4', 'Laure V.', 'PO'], ['n5', 'Anne G.', 'SR'], ['n6', 'Sophie C.', 'AC']] as [$id, $name, $cab]) {
            $om->persist($n[$id] = new Nurse($cabs[$cab], $name));
        }
        $om->persist(Note::forCabinet($cabs['PO'], 'Prévoir 20 minutes pour récupérer la clé.'));

        $day = static fn (string $d) => new \DateTimeImmutable($d);
        $add = static function (string $d, string $cab, string $nurse, Slot $slot = Slot::Full) use ($om, $cabs, $n, $day): void {
            $om->persist(new WorkDay($day($d), $cabs[$cab], $n[$nurse], $slot));
        };
        $rest = static function (string $d, Slot $slot = Slot::Full) use ($om, $user, $day): void {
            $om->persist(new Rest($user, $day($d), $slot));
        };

        // Novembre 2026, détaillé comme dans le prototype
        $range = static function (int $a, int $b, string $cab, string $nurse) use ($add): void {
            for ($d = $a; $d <= $b; ++$d) {
                $add(sprintf('2026-11-%02d', $d), $cab, $nurse);
            }
        };
        $range(2, 6, 'TI', 'n1');
        $range(9, 13, 'PO', 'n3');
        $range(14, 15, 'SR', 'n5');
        $range(16, 20, 'TI', 'n2');
        $range(23, 25, 'AC', 'n6');
        $add('2026-11-26', 'AC', 'n6', Slot::Morning);
        $add('2026-11-26', 'PO', 'n4', Slot::Afternoon);
        $add('2026-11-27', 'PO', 'n4', Slot::Afternoon);
        $add('2026-11-30', 'TI', 'n1');
        foreach ([7, 8, 21, 22, 28, 29] as $d) {
            $rest(sprintf('2026-11-%02d', $d));
        }
        $rest('2026-11-01', Slot::Morning);
        $rest('2026-11-27', Slot::Morning);
        $om->persist(Note::forDay($user, $day('2026-11-25'), 'Dernier jour aux Acacias : rendre la clé du local.'));
        $om->persist(Note::forDay($user, $day('2026-11-26'), 'Récupérer la clé du local avant 13 h.'));

        // Le reste de 2026 : un roulement régulier
        $pattern = [['TI', 'TI', 'TI', 'TI', 'TI', 'R', 'R'], ['PO', 'PO', 'PO', 'SR', 'SR', 'SR', 'R'], ['AC', 'AC', 'AC', 'AC', 'R', 'R', 'R'], ['TI', 'TI', 'PO', 'PO', 'PO', 'R', 'R'], ['SR', 'SR', 'SR', 'SR', 'SR', 'PO', 'PO'], [null, null, null, null, null, 'R', 'R']];
        $first = ['TI' => 'n1', 'PO' => 'n3', 'SR' => 'n5', 'AC' => 'n6'];
        $second = ['TI' => 'n2', 'PO' => 'n4'];
        $base = new \DateTimeImmutable('2025-12-29');
        for ($d = new \DateTimeImmutable('2026-01-01'); $d <= new \DateTimeImmutable('2026-12-31'); $d = $d->modify('+1 day')) {
            if ('11' === $d->format('m')) {
                continue;
            }
            $wk = intdiv((int) $base->diff($d)->days, 7);
            $v = $pattern[($wk * 3 + intdiv($wk, 5)) % 6][(int) $d->format('N') - 1];
            if ('R' === $v) {
                $rest($d->format('Y-m-d'));
            } elseif ($v) {
                $add($d->format('Y-m-d'), $v, ($wk % 2 && isset($second[$v])) ? $second[$v] : $first[$v]);
            }
        }

        $om->flush();
    }
}
