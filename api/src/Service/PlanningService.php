<?php

namespace App\Service;

use App\Entity\Cabinet;
use App\Entity\Nurse;
use App\Entity\Rest;
use App\Entity\User;
use App\Entity\WorkDay;
use App\Enum\Slot;
use App\Exception\BusinessRuleException;
use App\Repository\NurseRepository;
use App\Repository\RestRepository;
use App\Repository\WorkDayRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Règles du planning (jours de cabinet et repos voulus).
 *
 *  - Journée = 1 jour, matin ou après-midi = 0,5 jour. Deux cabinets ou deux infirmières le même jour sont possibles.
 *  - Une journée de repos exclut tout cabinet ; une demi-journée de repos peut coexister avec un cabinet sur l'autre moitié.
 *  - Ajouter un cabinet qui chevauche un repos retire le repos (annulable).
 *  - Ajouter un repos sur une période déjà occupée par un cabinet est refusé.
 *
 * Chaque méthode renvoie un résumé et l'identifiant d'annulation.
 */
final class PlanningService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly WorkDayRepository $days,
        private readonly RestRepository $rests,
        private readonly NurseRepository $nurses,
        private readonly UndoService $undo,
    ) {
    }

    /** Un repos sur cette période heurte-t-il un des jours de cabinet de la date ? */
    public static function restClashes(Slot $rest, array $workDays): bool
    {
        foreach ($workDays as $w) {
            if ($w->getSlot()->overlaps($rest)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Ajoute un cabinet sur plusieurs dates. Les doublons exacts (même cabinet, infirmière, durée) sont ignorés.
     *
     * @param list<\DateTimeImmutable> $dates
     *
     * @return array{added: int, duplicates: int, restsRemoved: int, undoId: ?string}
     */
    public function addDays(User $user, array $dates, Cabinet $cabinet, ?Nurse $nurse, Slot $slot): array
    {
        $this->checkNurse($cabinet, $nurse);
        $ops = [];
        $added = $duplicates = $restsRemoved = 0;
        foreach ($dates as $date) {
            foreach ($this->days->findOnDate($user, $date) as $w) {
                if ($w->getCabinet() === $cabinet && $w->getNurse() === $nurse && $w->getSlot() === $slot) {
                    ++$duplicates;
                    continue 2;
                }
            }
            if ($this->dropClashingRest($user, $date, $slot, $ops)) {
                ++$restsRemoved;
            }
            $day = new WorkDay($date, $cabinet, $nurse, $slot);
            $this->em->persist($day);
            $ops[] = UndoService::delete('workday', $day->getId());
            ++$added;
        }

        return ['added' => $added, 'duplicates' => $duplicates, 'restsRemoved' => $restsRemoved, 'undoId' => $this->save($user, $ops)];
    }

    /** @return array{restRemoved: bool, undoId: ?string} */
    public function updateDay(User $user, WorkDay $day, Cabinet $cabinet, ?Nurse $nurse, Slot $slot): array
    {
        $this->checkNurse($cabinet, $nurse);
        $ops = [UndoService::put($day)];
        $day->assign($cabinet, $nurse, $slot);
        $removed = $this->dropClashingRest($user, $day->getDate(), $slot, $ops);

        return ['restRemoved' => $removed, 'undoId' => $this->save($user, $ops)];
    }

    /** @return array{undoId: ?string} */
    public function deleteDay(User $user, WorkDay $day): array
    {
        $ops = [UndoService::put($day)];
        $this->em->remove($day);

        return ['undoId' => $this->save($user, $ops)];
    }

    /**
     * Marque des jours en repos voulu. Les dates déjà occupées par un cabinet sur cette période sont ignorées.
     * Avec $toggle (mode « Ajouter des jours ») : si toutes les dates libres ont déjà ce repos, il est retiré.
     *
     * @param list<\DateTimeImmutable> $dates
     *
     * @return array{set: int, removed: int, skipped: int, undoId: ?string}
     */
    public function setRests(User $user, array $dates, Slot $slot, bool $toggle): array
    {
        $free = array_values(array_filter($dates, fn ($d) => !self::restClashes($slot, $this->days->findOnDate($user, $d))));
        $skipped = \count($dates) - \count($free);
        $current = array_map(fn ($d) => $this->rests->findOnDate($user, $d), $free);
        $allSame = $free && array_all($current, fn (?Rest $r) => $r?->getSlot() === $slot);

        $ops = [];
        foreach ($free as $i => $date) {
            $r = $current[$i];
            if ($toggle && $allSame) {
                $ops[] = UndoService::put($r);
                $this->em->remove($r);
            } elseif ($r) {
                $ops[] = UndoService::put($r);
                $r->setSlot($slot);
            } else {
                $r = new Rest($user, $date, $slot);
                $this->em->persist($r);
                $ops[] = UndoService::delete('rest', $r->getId());
            }
        }
        $removed = $toggle && $allSame ? \count($free) : 0;

        return ['set' => \count($free) - $removed, 'removed' => $removed, 'skipped' => $skipped, 'undoId' => $this->save($user, $ops)];
    }

    /** Repos voulu sur un jour (vue jour). Refusé si un cabinet occupe déjà la période. */
    public function setRest(User $user, \DateTimeImmutable $date, Slot $slot): array
    {
        if (self::restClashes($slot, $this->days->findOnDate($user, $date))) {
            throw new BusinessRuleException("Ce jour a déjà un cabinet sur cette période. Choisissez une autre durée ou supprimez d'abord le cabinet.");
        }

        return $this->setRests($user, [$date], $slot, false);
    }

    /** @return array{undoId: ?string} */
    public function deleteRest(User $user, Rest $rest): array
    {
        $ops = [UndoService::put($rest)];
        $this->em->remove($rest);

        return ['undoId' => $this->save($user, $ops)];
    }

    /** L'infirmière doit appartenir au cabinet, et elle est obligatoire si le cabinet en a. */
    private function checkNurse(Cabinet $cabinet, ?Nurse $nurse): void
    {
        if ($nurse && $nurse->getCabinet() !== $cabinet) {
            throw new BusinessRuleException("Cette infirmière n'appartient pas à ce cabinet.");
        }
        if (!$nurse && $this->nurses->findByCabinet($cabinet)) {
            throw new BusinessRuleException("Choisissez l'infirmière remplacée.");
        }
    }

    /** Retire le repos du jour s'il chevauche la période du cabinet ajouté. */
    private function dropClashingRest(User $user, \DateTimeImmutable $date, Slot $slot, array &$ops): bool
    {
        $rest = $this->rests->findOnDate($user, $date);
        if (!$rest || !$rest->getSlot()->overlaps($slot)) {
            return false;
        }
        $ops[] = UndoService::put($rest);
        $this->em->remove($rest);

        return true;
    }

    private function save(User $user, array $ops): ?string
    {
        $id = $this->undo->record($user, $ops);
        $this->em->flush();

        return $id;
    }
}
